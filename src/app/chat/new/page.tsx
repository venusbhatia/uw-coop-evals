"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ensureEvaluationAuth,
  buildEvaluationReturnTo,
  buildOnboardingUrl,
  fetchServerSessionEmail,
  formatEvaluationError,
  isEvaluationAuthError,
} from "@/lib/evaluatorApi";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { downloadJsonFile } from "@/lib/speFormExport";
import type { Id } from "convex/_generated/dataModel";
import {
  SIMPLE_EVALUATION_QUESTION_COUNT,
  type ChatMessage,
  type DraftPayload,
} from "@/lib/evaluationConfig";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { WizardProgress } from "@/components/evaluation/WizardProgress";
import { VoiceAnswerField } from "@/components/voice/VoiceAnswerField";

const MIN_ANSWER_LENGTH = 20;
const TOTAL_UI_STEPS = 6;
const CHAT_REQUEST_TIMEOUT_MS = 90_000;

function formatFetchError(e: unknown): string {
  if (isEvaluationAuthError(e)) {
    return e.message;
  }
  if (e instanceof Error && e.name === "AbortError") {
    return "The AI request timed out. Wait a moment and try again.";
  }
  if (e instanceof TypeError) {
    return "Network error — check your connection and try again.";
  }
  return formatEvaluationError(e);
}

function mapChatHttpError(status: number, err: { error?: string; code?: string }): string {
  if (status === 401 || err.code === "UNAUTHORIZED") {
    return "Your session expired. Sign in again to save this evaluation.";
  }
  if (status === 429 || err.code === "RATE_LIMITED") {
    return "Too many AI requests. Wait a minute and try again.";
  }
  if (status === 502 || status === 503) {
    return err.error ?? "AI service unavailable. Try again shortly.";
  }
  return err.error ?? "Request failed.";
}

function buildMessages(questions: string[], answers: string[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (let i = 0; i < answers.length; i++) {
    messages.push({ role: "assistant", content: questions[i] });
    messages.push({ role: "user", content: answers[i] });
  }
  return messages;
}

function AuthErrorBanner({
  message,
  signInHref,
}: {
  message: string;
  signInHref: string;
}) {
  return (
    <div className="mb-6 p-4 border border-red-500/40 rounded-2xl text-[14px] bg-[var(--surface)]">
      <p>{message}</p>
      <Link href={signInHref} className="mt-2 inline-block text-[14px] underline">
        Sign in again
      </Link>
    </div>
  );
}

function SimpleEvaluation() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const studentId = searchParams.get("studentId");
  const evalType = searchParams.get("type") || "midterm";
  const returnTo =
    studentId != null
      ? buildEvaluationReturnTo(studentId, evalType)
      : undefined;
  const signInHref = buildOnboardingUrl(returnTo);

  const { isLoading: convexLoading, isAuthenticated } = useConvexAuth();
  const [evaluatorEmail, setEvaluatorEmail] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [authBanner, setAuthBanner] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const serverEmail = await fetchServerSessionEmail();
        if (!serverEmail) {
          router.replace(signInHref);
          return;
        }
        setEvaluatorEmail(serverEmail);
        setSessionReady(true);
      } catch {
        router.replace(signInHref);
      }
    })();
  }, [router, signInHref]);

  const evaluatorName = evaluatorEmail ?? "";

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

  const handleAuthFailure = (e: unknown) => {
    const message = formatFetchError(e);
    setError(message);
    if (isEvaluationAuthError(e)) {
      setAuthBanner(message);
    }
  };

  const callChat = async (history: ChatMessage[]) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHAT_REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch("/api/evaluation/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          messages: history,
          studentName: student?.name ?? "Student",
          evalType,
        }),
      });
    } catch (e) {
      throw new Error(formatFetchError(e));
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await res.json();
    if (!res.ok) {
      const err = data as { error?: string; code?: string };
      throw new Error(mapChatHttpError(res.status, err));
    }
    return data;
  };

  const downloadSpeJson = async () => {
    if (!studentId || !evaluatorName || !student) return;
    setExportError("");
    try {
      const params = new URLSearchParams({
        studentId,
        type: evalType,
      });
      const res = await fetch(`/api/evaluations/spe-json?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data.error as string) ?? "Export failed.");
      }
      const safeName = student.name.replace(/\s+/g, "-").toLowerCase();
      downloadJsonFile(data, `${safeName}-${evalType}-spe-export.json`);
    } catch (e: unknown) {
      setExportError(e instanceof Error ? e.message : "Export failed.");
    }
  };

  const submitEvaluation = async (payload: DraftPayload) => {
    if (!studentId || !evaluatorName) return;
    setSubmitting(true);
    setError("");
    setAuthBanner(null);
    setExportError("");
    try {
      await ensureEvaluationAuth();
      await submitDraft({
        studentId: studentId as Id<"students">,
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
      setCompleted(true);
      setSubmitting(false);
      setTimeout(
        () => router.push(`/student/${studentId}/form?type=${evalType}`),
        1500,
      );
    } catch (e: unknown) {
      handleAuthFailure(e);
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
    setAuthBanner(null);
    try {
      await ensureEvaluationAuth();
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
      handleAuthFailure(e);
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
    setAuthBanner(null);

    try {
      await ensureEvaluationAuth();
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
      handleAuthFailure(e);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step <= 1) {
      setStep(0);
      setError("");
      setAuthBanner(null);
      return;
    }
    const prev = step - 1;
    setStep(prev);
    setCurrentQuestion(questions[prev - 1] ?? "");
    setCurrentAnswer(answers[prev - 1] ?? "");
    speech.reset();
    setError("");
    setAuthBanner(null);
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
      ? !loading && !submitting && !voiceBusy
      : currentAnswer.trim().length >= MIN_ANSWER_LENGTH &&
        !loading &&
        !submitting &&
        !voiceBusy;

  if (!sessionReady || convexLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-[14px] text-[var(--muted)]">Connecting…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-[14px] text-[var(--muted)]">
          Session not connected to the database.
        </p>
        <Link href={signInHref} className="text-[14px] underline">
          Sign in again
        </Link>
      </div>
    );
  }

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
              {evaluatorEmail ?? evaluatorName} · {evalType}
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

        {authBanner && (
          <AuthErrorBanner message={authBanner} signInHref={signInHref} />
        )}

        {error && !authBanner && (
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
              Your SPE JSON export was downloaded. It includes every
              field from the official performance evaluation form.
            </p>
            {exportError && (
              <p className="text-[14px] text-red-600 dark:text-red-400">{exportError}</p>
            )}
            <button
              type="button"
              onClick={() => void downloadSpeJson()}
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
            <VoiceAnswerField
              value={currentAnswer}
              onChange={setCurrentAnswer}
              speech={speech}
              onToggleMic={toggleMic}
              loading={loading}
              minAnswerLength={MIN_ANSWER_LENGTH}
            />
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
