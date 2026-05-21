"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { WizardProgress } from "@/components/evaluation/WizardProgress";
import { RatingPicker } from "@/components/evaluation/RatingPicker";
import { ChipPicker } from "@/components/evaluation/ChipPicker";
import {
  ALL_RATING_KEYS,
  COMPETENCY_LABELS,
  FUTURE_READY_COMPETENCIES,
  OVERALL_RATING_OPTIONS,
  SDG_LIST,
  WIZARD_DOMAINS,
  emptyRatings,
} from "@/lib/evaluationConfig";

type FormState = {
  ratings: Record<string, number | null>;
  strengths: { selections: string[]; comments: string };
  developments: { selections: string[]; comments: string };
  sdgs: number[];
  overallRating: string;
  overallComments: string;
  outstandingComments: string;
  recommendations: string;
  reviewedWithStudent: boolean;
  studentComments: string;
  futureEmployment: {
    returnTerm: string;
    offeredReemployment: string;
    response: string;
    datesFrom: string;
    datesTo: string;
  };
};

const SECTION_GUIDANCE = [
  "Rate each competency based on observed workplace behaviour this term. Use \"Not observed\" only when you have not seen enough to judge.",
  "Consider quality of deliverables, deadlines, and how the student approaches problems.",
  "Reflect on adaptability, feedback, and motivation to learn.",
  "Communication, collaboration, ethics, and respect for others belong here.",
  "Choose three Future-Ready competencies that best describe this student's strengths, with specific examples.",
  "Choose three areas for development with constructive, actionable feedback.",
  "Select SDGs their work meaningfully supported (if any).",
  "Summarize overall performance. Be specific and professional — this text may be shared with the student and your organization.",
  "Confirm whether you reviewed this evaluation with the student and capture their comments if applicable.",
  "Indicate future employment intentions if known.",
];

function buildInitialState(source?: Record<string, unknown> | null): FormState {
  const ratings = emptyRatings();
  if (source?.ratings && typeof source.ratings === "object") {
    for (const key of ALL_RATING_KEYS) {
      const val = (source.ratings as Record<string, number>)[key];
      if (typeof val === "number") ratings[key] = val;
    }
  }
  const strengths = source?.strengths as FormState["strengths"] | undefined;
  const developments = source?.developments as FormState["developments"] | undefined;
  const fe = source?.futureEmployment as FormState["futureEmployment"] | undefined;

  return {
    ratings,
    strengths: strengths ?? { selections: [], comments: "" },
    developments: developments ?? { selections: [], comments: "" },
    sdgs: Array.isArray(source?.sdgs) ? (source.sdgs as number[]) : [],
    overallRating: typeof source?.overallRating === "string" ? source.overallRating : "",
    overallComments: typeof source?.overallComments === "string" ? source.overallComments : "",
    outstandingComments: typeof source?.outstandingComments === "string" ? source.outstandingComments : "",
    recommendations: typeof source?.recommendations === "string" ? source.recommendations : "",
    reviewedWithStudent: Boolean(source?.reviewedWithStudent),
    studentComments: typeof source?.studentComments === "string" ? source.studentComments : "",
    futureEmployment: fe ?? {
      returnTerm: "not_applicable",
      offeredReemployment: "to_be_determined",
      response: "is_undecided",
      datesFrom: "",
      datesTo: "",
    },
  };
}

function toPayload(form: FormState) {
  const ratings = {
    learnJobDuties: form.ratings.learnJobDuties ?? 0,
    locateInfo: form.ratings.locateInfo ?? 0,
    drawConclusions: form.ratings.drawConclusions ?? 0,
    employTechSkills: form.ratings.employTechSkills ?? 0,
    applyPriorKnowledge: form.ratings.applyPriorKnowledge ?? 0,
    deliverQualityWork: form.ratings.deliverQualityWork ?? 0,
    meetDeadlines: form.ratings.meetDeadlines ?? 0,
    analyzeProblems: form.ratings.analyzeProblems ?? 0,
    engageWithCuriosity: form.ratings.engageWithCuriosity ?? 0,
    identifyImprovements: form.ratings.identifyImprovements ?? 0,
    adaptToChange: form.ratings.adaptToChange ?? 0,
    recognizeLimits: form.ratings.recognizeLimits ?? 0,
    respondToFeedback: form.ratings.respondToFeedback ?? 0,
    seekTasks: form.ratings.seekTasks ?? 0,
    seekOpportunitiesToLearn: form.ratings.seekOpportunitiesToLearn ?? 0,
    writeClearly: form.ratings.writeClearly ?? 0,
    orallyConveyIdeas: form.ratings.orallyConveyIdeas ?? 0,
    collaborateWell: form.ratings.collaborateWell ?? 0,
    ethicalConduct: form.ratings.ethicalConduct ?? 0,
    showSensitivity: form.ratings.showSensitivity ?? 0,
  };
  return {
    ratings,
    strengths: form.strengths,
    developments: form.developments,
    sdgs: form.sdgs,
    overallRating: form.overallRating,
    overallComments: form.overallComments,
    outstandingComments: form.outstandingComments,
    recommendations: form.recommendations,
    reviewedWithStudent: form.reviewedWithStudent,
    studentComments: form.studentComments,
    futureEmployment: form.futureEmployment,
  };
}

const TOTAL_STEPS = 10;

type EvalFormWizardProps = {
  studentId: Id<"students">;
  evalType: "midterm" | "final";
  initialData?: Record<string, unknown> | null;
  readOnly?: boolean;
  onSubmitted?: () => void;
};

export function EvalFormWizard({
  studentId,
  evalType,
  initialData,
  readOnly = false,
  onSubmitted,
}: EvalFormWizardProps) {
  const saveDraft = useMutation(api.evaluations.saveSubmissionDraft);
  const submitForReview = useMutation(api.evaluations.submitForReview);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => buildInitialState(initialData));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await saveDraft({
        studentId,
        type: evalType,
        ...toPayload(form),
      });
      setSuccess("Draft saved.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save draft.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await saveDraft({ studentId, type: evalType, ...toPayload(form) });
      await submitForReview({ studentId, type: evalType });
      setSuccess("Submitted to HR for review.");
      onSubmitted?.();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not submit for review.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSdg = (n: number) => {
    if (readOnly) return;
    setForm((f) => ({
      ...f,
      sdgs: f.sdgs.includes(n) ? f.sdgs.filter((x) => x !== n) : [...f.sdgs, n],
    }));
  };

  let body: React.ReactNode = null;

  if (step < 4) {
    const domain = WIZARD_DOMAINS[step];
    body = (
      <div className="space-y-6">
        <p className="text-sm text-[var(--muted)]">{SECTION_GUIDANCE[step]}</p>
        {domain.keys.map((key) => (
          <div key={key}>
            <p className="text-sm font-medium mb-2">{COMPETENCY_LABELS[key]?.label ?? key}</p>
            <RatingPicker
              value={form.ratings[key] ?? null}
              onChange={(v) =>
                setForm((f) => ({ ...f, ratings: { ...f.ratings, [key]: v } }))
              }
            />
          </div>
        ))}
      </div>
    );
  } else if (step === 4) {
    body = (
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">{SECTION_GUIDANCE[4]}</p>
        <ChipPicker
          options={[...FUTURE_READY_COMPETENCIES]}
          selected={form.strengths.selections}
          max={3}
          onToggle={(option) => {
            if (readOnly) return;
            const current = form.strengths.selections;
            const next = current.includes(option)
              ? current.filter((s) => s !== option)
              : current.length < 3
                ? [...current, option]
                : current;
            setForm((f) => ({ ...f, strengths: { ...f.strengths, selections: next } }));
          }}
        />
        <textarea
          className="w-full min-h-[120px] rounded-xl border border-[var(--border)] p-3 text-sm"
          placeholder="Strength comments with specific examples…"
          value={form.strengths.comments}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              strengths: { ...f.strengths, comments: e.target.value },
            }))
          }
          readOnly={readOnly}
        />
      </div>
    );
  } else if (step === 5) {
    body = (
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">{SECTION_GUIDANCE[5]}</p>
        <ChipPicker
          options={[...FUTURE_READY_COMPETENCIES]}
          selected={form.developments.selections}
          max={3}
          onToggle={(option) => {
            if (readOnly) return;
            const current = form.developments.selections;
            const next = current.includes(option)
              ? current.filter((s) => s !== option)
              : current.length < 3
                ? [...current, option]
                : current;
            setForm((f) => ({ ...f, developments: { ...f.developments, selections: next } }));
          }}
        />
        <textarea
          className="w-full min-h-[120px] rounded-xl border border-[var(--border)] p-3 text-sm"
          placeholder="Development comments — constructive and specific…"
          value={form.developments.comments}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              developments: { ...f.developments, comments: e.target.value },
            }))
          }
          readOnly={readOnly}
        />
      </div>
    );
  } else if (step === 6) {
    body = (
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">{SECTION_GUIDANCE[6]}</p>
        <div className="flex flex-wrap gap-2">
          {SDG_LIST.map((label, i) => {
            const n = i + 1;
            const on = form.sdgs.includes(n);
            return (
              <button
                key={n}
                type="button"
                disabled={readOnly}
                onClick={() => toggleSdg(n)}
                className={`px-3 py-2 rounded-lg text-xs border ${
                  on
                    ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
                    : "border-[var(--border)]"
                }`}
              >
                {n}. {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  } else if (step === 7) {
    body = (
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">{SECTION_GUIDANCE[7]}</p>
        <div className="flex flex-wrap gap-2">
          {OVERALL_RATING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={readOnly}
              onClick={() => setForm((f) => ({ ...f, overallRating: opt.value }))}
              className={`px-3 py-2 rounded-lg text-sm border ${
                form.overallRating === opt.value
                  ? "bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--border)]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <textarea
          className="w-full min-h-[100px] rounded-xl border border-[var(--border)] p-3 text-sm"
          placeholder="Overall comments…"
          value={form.overallComments}
          onChange={(e) => setForm((f) => ({ ...f, overallComments: e.target.value }))}
          readOnly={readOnly}
        />
        <textarea
          className="w-full min-h-[80px] rounded-xl border border-[var(--border)] p-3 text-sm"
          placeholder="Outstanding comments (if applicable)…"
          value={form.outstandingComments}
          onChange={(e) => setForm((f) => ({ ...f, outstandingComments: e.target.value }))}
          readOnly={readOnly}
        />
        <textarea
          className="w-full min-h-[80px] rounded-xl border border-[var(--border)] p-3 text-sm"
          placeholder="Recommendations…"
          value={form.recommendations}
          onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))}
          readOnly={readOnly}
        />
      </div>
    );
  } else if (step === 8) {
    body = (
      <div className="space-y-4">
        <p className="text-sm text-[var(--muted)]">{SECTION_GUIDANCE[8]}</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.reviewedWithStudent}
            disabled={readOnly}
            onChange={(e) =>
              setForm((f) => ({ ...f, reviewedWithStudent: e.target.checked }))
            }
          />
          Reviewed with student
        </label>
        <textarea
          className="w-full min-h-[100px] rounded-xl border border-[var(--border)] p-3 text-sm"
          placeholder="Student comments…"
          value={form.studentComments}
          onChange={(e) => setForm((f) => ({ ...f, studentComments: e.target.value }))}
          readOnly={readOnly}
        />
      </div>
    );
  } else {
    body = (
      <div className="space-y-3 text-sm">
        <p className="text-[var(--muted)]">{SECTION_GUIDANCE[9]}</p>
        {(
          [
            ["returnTerm", "Return next term?", ["yes", "no", "not_applicable"]],
            ["offeredReemployment", "Offered re-employment?", ["yes", "no", "to_be_determined"]],
            ["response", "Student response", ["accepted", "declined", "is_undecided"]],
          ] as const
        ).map(([key, label, opts]) => (
          <div key={key}>
            <p className="font-medium mb-1">{label}</p>
            <select
              className="w-full rounded-lg border border-[var(--border)] p-2"
              value={form.futureEmployment[key]}
              disabled={readOnly}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  futureEmployment: { ...f.futureEmployment, [key]: e.target.value },
                }))
              }
            >
              {opts.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        ))}
        <input
          type="text"
          placeholder="Dates from"
          className="w-full rounded-lg border border-[var(--border)] p-2"
          value={form.futureEmployment.datesFrom}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              futureEmployment: { ...f.futureEmployment, datesFrom: e.target.value },
            }))
          }
          readOnly={readOnly}
        />
        <input
          type="text"
          placeholder="Dates to"
          className="w-full rounded-lg border border-[var(--border)] p-2"
          value={form.futureEmployment.datesTo}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              futureEmployment: { ...f.futureEmployment, datesTo: e.target.value },
            }))
          }
          readOnly={readOnly}
        />
      </div>
    );
  }

  const stepTitles = [
    ...WIZARD_DOMAINS.map((d) => d.title),
    "Strengths",
    "Development",
    "SDGs",
    "Overall",
    "Student review",
    "Future employment",
  ];

  return (
    <div className="space-y-6">
      <WizardProgress
        current={step + 1}
        total={TOTAL_STEPS}
        label={stepTitles[step]}
      />
      <h2 className="text-lg font-semibold">{stepTitles[step]}</h2>
      {body}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg p-3">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 dark:bg-green-950/30 rounded-lg p-3">{success}</p>
      )}

      <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--border)]">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm"
        >
          Back
        </button>
        {step < TOTAL_STEPS - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
            className="px-4 py-2 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-sm"
          >
            Continue
          </button>
        ) : null}
        {!readOnly && (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-sm"
            >
              {saving ? "Saving…" : "Save draft"}
            </button>
            {step === TOTAL_STEPS - 1 && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleSubmitForReview()}
                className="px-4 py-2 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-sm font-medium"
              >
                {submitting ? "Submitting…" : "Submit for HR review"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
