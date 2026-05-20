"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, Loader2, Mic, MicOff } from "lucide-react";
import { downloadJsonFile } from "@/lib/waterlooFormExport";
import type { Id } from "convex/_generated/dataModel";
import {
  SIMPLE_EVALUATION_QUESTION_COUNT,
  type ChatMessage,
  type DraftPayload,
} from "@/lib/evaluationConfig";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { WizardProgress } from "@/components/evaluation/WizardProgress";

const MIN_ANSWER_LENGTH = 20;
const TOTAL_UI_STEPS = 6;

function formatFetchError(e: unknown): string {
  if (e instanceof TypeError) {
    return "Network error — check that the dev server is running.";
  }
  return e instanceof Error ? e.message : "Something went wrong.";
}

function buildMessages(questions: string[], answers: string[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (let i = 0; i < answers.length; i++) {
    messages.push({ role: "assistant", content: questions[i] });
    messages.push({ role: "user", content: answers[i] });
  }
  return messages;
}

function SimpleEvaluation() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const studentId = searchParams.get("studentId");
  const evaluatorName = searchParams.get("evaluator");
  const evalType = searchParams.get("type") || "midterm";

  const studentData = useQuery(
    api.students.get,
    studentId ? { studentId: studentId as Id<"students"> } : "skip",
  );
  const submitDraft = useMutation(api.evaluations.submitDraft);

  const [step, setStep] = useState(0);
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [exportError, setExportError] = useState("");
  const [error, setError] = useState("");

  const student = studentData?.student;
  const speech = useSpeechToText();

  const callChat = async (history: ChatMessage[]) => {
    let res: Response;
    try {
      res = await fetch("/api/evaluation/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          studentName: student?.name ?? "Student",
          evaluatorName: evaluatorName ?? "Evaluator",
          evalType,
        }),
      });
    } catch (e) {
      throw new Error(formatFetchError(e));
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error((data.error as string) ?? "Request failed.");
    }
    return data;
  };

  const downloadWaterlooJson = async () => {
    if (!studentId || !evaluatorName || !student) return;
    setExportError("");
    try {
      const params = new URLSearchParams({
        studentId,
        type: evalType,
        evaluator: evaluatorName,
      });
      const res = await fetch(`/api/evaluations/waterloo-json?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data.error as string) ?? "Export failed.");
      }
      const safeName = student.name.replace(/\s+/g, "-").toLowerCase();
      downloadJsonFile(data, `${safeName}-${evalType}-waterloo-spe.json`);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Export failed.");
    }
  };

  const submitEvaluation = async (payload: DraftPayload) => {
    if (!studentId || !evaluatorName) return;
    setSubmitting(true);
    setError("");
    setExportError("");
    try {
      await submitDraft({
        studentId: studentId as Id<"students">,
        evaluatorName,
        type: evalType,
        ratings: payload.ratings as Parameters<typeof submitDraft>[0]["ratings"],
        strengths: payload.strengths,
        developments: payload.developments,
        sdgs: payload.sdgs,
        overallRating: payload.overallRating,
        overallComments: payload.overallComments,
        outstandingComments: payload.outstandingComments,
        recommendations: payload.recommendations,
        reviewedWithStudent: payload.reviewedWithStudent,
        studentComments: payload.studentComments,
        futureEmployment: payload.futureEmployment,
      });
      await downloadWaterlooJson();
      setCompleted(true);
      setSubmitting(false);
      setTimeout(() => router.push(`/student/${studentId}`), 4000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save draft.");
      setSubmitting(false);
    }
  };

  const fetchNextQuestion = async (history: ChatMessage[]) => {
    const data = await callChat(history);
    if (data.type === "tool_call") {
      return { kind: "submit" as const, payload: data.draftPayload as DraftPayload };
    }
    const content = (data.message as ChatMessage).content;
    return { kind: "question" as const, content };
  };

  const startFlow = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchNextQuestion([]);
      if (result.kind === "submit") {
        await submitEvaluation(result.payload);
        return;
      }
      setCurrentQuestion(result.content);
      setQuestions([result.content]);
      setAnswers([]);
      setCurrentAnswer("");
      setStep(1);
    } catch (e: unknown) {
      setError(formatFetchError(e));
    } finally {
      setLoading(false);
    }
  };

  const continueFromQuestion = async () => {
    const trimmed = currentAnswer.trim();
    if (trimmed.length < MIN_ANSWER_LENGTH) return;

    const qIndex = step - 1;
    const updatedAnswers = [...answers];
    updatedAnswers[qIndex] = trimmed;
    setAnswers(updatedAnswers);

    const history = buildMessages(
      questions.slice(0, qIndex + 1),
      updatedAnswers.slice(0, qIndex + 1),
    );

    setLoading(true);
    setError("");

    try {
      if (step < SIMPLE_EVALUATION_QUESTION_COUNT) {
        const result = await fetchNextQuestion(history);
        if (result.kind === "submit") {
          await submitEvaluation(result.payload);
          return;
        }
        const nextQ = result.content;
        setQuestions((prev) => {
          const next = [...prev];
          next[step] = nextQ;
          return next;
        });
        setCurrentQuestion(nextQ);
        setCurrentAnswer("");
        speech.reset();
        setStep(step + 1);
      } else {
        const result = await fetchNextQuestion(history);
        if (result.kind === "submit") {
          await submitEvaluation(result.payload);
        } else {
          throw new Error("Expected evaluation to be compiled after 5 answers.");
        }
      }
    } catch (e: unknown) {
      setError(formatFetchError(e));
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step <= 1) {
      setStep(0);
      setError("");
      return;
    }
    const prev = step - 1;
    setStep(prev);
    setCurrentQuestion(questions[prev - 1] ?? "");
    setCurrentAnswer(answers[prev - 1] ?? "");
    speech.reset();
    setError("");
  };

  const toggleMic = async () => {
    if (speech.isRecording) {
      const merged = await speech.stopRecording(currentAnswer);
      setCurrentAnswer(merged);
    } else {
      await speech.startRecording();
    }
  };

  const voiceBusy = speech.isRecording || speech.isTranscribing;

  const progressLabel =
    step === 0
      ? "Getting started"
      : `Question ${step} of ${SIMPLE_EVALUATION_QUESTION_COUNT}`;

  const canContinue =
    step === 0
      ? !loading && !submitting
      : currentAnswer.trim().length >= MIN_ANSWER_LENGTH && !loading && !submitting;

  if (!studentId || !evaluatorName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-[14px] text-[var(--muted)]">Missing evaluation parameters.</p>
      </div>
    );
  }

  if (studentData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-[14px] text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8">
        <p className="text-[14px] text-[var(--muted)]">Student not found.</p>
        <Link href="/" className="text-[13px] underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <Link
            href={`/student/${studentId}`}
            className="p-2 -ml-2 rounded-full hover:bg-[var(--surface)]"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-[17px] font-semibold">{student.name}</h1>
            <p className="text-[13px] text-[var(--muted)]">
              {evaluatorName} · {evalType}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-xl mx-auto w-full flex flex-col">
        <WizardProgress
          current={step === 0 ? 1 : step + 1}
          total={TOTAL_UI_STEPS}
          label={progressLabel}
        />

        {error && (
          <div className="mb-6 p-4 border border-[var(--border)] rounded-2xl text-[14px] bg-[var(--surface)]">
            {error}
          </div>
        )}

        {submitting ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[17px] font-medium">Saving your evaluation…</p>
          </div>
        ) : completed ? (
          <section className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-12">
            <p className="text-[22px] font-semibold">Evaluation saved</p>
            <p className="text-[15px] text-[var(--muted)] max-w-sm">
              Your Waterloo SPE JSON export was downloaded. It includes every
              field from the official performance evaluation form.
            </p>
            {exportError && (
              <p className="text-[14px] text-red-600 dark:text-red-400">{exportError}</p>
            )}
            <button
              type="button"
              onClick={() => void downloadWaterlooJson()}
              className="btn-secondary px-5 py-2.5 text-[14px] flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download JSON again
            </button>
            <Link href={`/student/${studentId}`} className="text-[14px] underline">
              Back to student page
            </Link>
          </section>
        ) : step === 0 ? (
          <section className="flex-1 space-y-6">
            <h2 className="text-[28px] font-semibold tracking-tight leading-tight">
              5 quick questions about {student.name}
            </h2>
            <p className="text-[15px] text-[var(--muted)] leading-relaxed">
              Answer in your own words — one question at a time. AI will draft the
              full evaluation from your responses. About 5 minutes.
            </p>
            <ul className="text-[14px] space-y-2 text-[var(--muted)] list-disc pl-5">
              <li>Plain language, no forms or rating grids</li>
              <li>Type or use the mic for each answer</li>
              <li>Questions adapt based on what you share</li>
            </ul>
          </section>
        ) : (
          <section className="flex-1 flex flex-col gap-6">
            <h2 className="text-[22px] font-semibold leading-snug tracking-tight">
              {currentQuestion}
            </h2>
            <div className="flex-1 flex flex-col gap-3">
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder={
                  speech.isRecording
                    ? "Listening…"
                    : speech.isTranscribing
                      ? "Transcribing…"
                      : "Share your thoughts here…"
                }
                rows={6}
                disabled={loading || voiceBusy}
                className="input-field w-full flex-1 min-h-[160px] px-4 py-4 text-[16px] leading-relaxed resize-none"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void toggleMic()}
                  disabled={loading || speech.isTranscribing}
                  className={`p-3 rounded-full border border-[var(--border)] shrink-0 ${
                    speech.isRecording
                      ? "bg-[var(--foreground)] text-[var(--background)]"
                      : "hover:bg-[var(--surface)]"
                  }`}
                  aria-label={
                    speech.isRecording ? "Stop recording" : "Record answer"
                  }
                >
                  {speech.isTranscribing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : speech.isRecording ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>
                {speech.isRecording && (
                  <button
                    type="button"
                    onClick={speech.cancelRecording}
                    className="text-[12px] text-[var(--muted)] underline"
                  >
                    Cancel
                  </button>
                )}
                <p className="text-[12px] text-[var(--muted)]">
                  {speech.isRecording
                    ? "Listening… tap mic when done"
                    : speech.isTranscribing
                      ? "Transcribing…"
                      : currentAnswer.trim().length < MIN_ANSWER_LENGTH
                        ? `At least ${MIN_ANSWER_LENGTH} characters to continue`
                        : "Tap mic to speak, or type above"}
                </p>
              </div>
              {speech.error && (
                <p className="text-[12px] text-[var(--muted)]">{speech.error}</p>
              )}
            </div>
          </section>
        )}
      </main>

      {!submitting && !completed && (
        <footer className="border-t border-[var(--border)] p-4 pb-8 sticky bottom-0 bg-[var(--background)]">
          <div className="max-w-xl mx-auto flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={goBack}
                disabled={loading}
                className="btn-secondary flex-1 py-3 text-[15px] flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (step === 0 ? void startFlow() : void continueFromQuestion())}
              disabled={!canContinue}
              className="btn-primary flex-[2] py-3 text-[15px] flex items-center justify-center gap-2 disabled:opacity-35"
            >
              {loading
                ? "Please wait…"
                : step === 0
                  ? "Begin"
                  : step === SIMPLE_EVALUATION_QUESTION_COUNT
                    ? "Finish"
                    : "Continue"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function EvaluationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[14px] text-[var(--muted)]">Loading…</p>
        </div>
      }
    >
      <SimpleEvaluation />
    </Suspense>
  );
}
