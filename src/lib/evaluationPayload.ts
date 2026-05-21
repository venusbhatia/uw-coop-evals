import type { Id } from "convex/_generated/dataModel";
import { ALL_RATING_KEYS, type DraftPayload } from "@/lib/evaluationConfig";

export type ConvexRatings = {
  learnJobDuties: number;
  locateInfo: number;
  drawConclusions: number;
  employTechSkills: number;
  applyPriorKnowledge: number;
  deliverQualityWork: number;
  meetDeadlines: number;
  analyzeProblems: number;
  engageWithCuriosity: number;
  identifyImprovements: number;
  adaptToChange: number;
  recognizeLimits: number;
  respondToFeedback: number;
  seekTasks: number;
  seekOpportunitiesToLearn: number;
  writeClearly: number;
  orallyConveyIdeas: number;
  collaborateWell: number;
  ethicalConduct: number;
  showSensitivity: number;
};

export type EvalMutationPayload = {
  ratings: ConvexRatings;
  strengths: DraftPayload["strengths"];
  developments: DraftPayload["developments"];
  sdgs: number[];
  overallRating: string;
  overallComments: string;
  outstandingComments: string;
  recommendations: string;
  reviewedWithStudent: boolean;
  studentComments: string;
  futureEmployment: DraftPayload["futureEmployment"];
  sectionProgress?: string[];
};

const PAYLOAD_KEYS = [
  "ratings",
  "strengths",
  "developments",
  "sdgs",
  "overallRating",
  "overallComments",
  "outstandingComments",
  "recommendations",
  "reviewedWithStudent",
  "studentComments",
  "futureEmployment",
  "sectionProgress",
] as const;

export function normalizeRatings(
  ratings: Record<string, number>,
): ConvexRatings {
  const out = {} as Record<string, number>;
  for (const key of ALL_RATING_KEYS) {
    const val = ratings[key];
    out[key] = typeof val === "number" && !Number.isNaN(val) ? val : 0;
  }
  return out as ConvexRatings;
}

/** Build Convex mutation args from an AI or form payload. */
export function draftPayloadToMutationArgs(
  studentId: Id<"students">,
  type: string,
  payload: DraftPayload | EvalMutationPayload,
): {
  studentId: Id<"students">;
  type: string;
} & EvalMutationPayload {
  return {
    studentId,
    type,
    ratings: normalizeRatings(payload.ratings),
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
  };
}

/** Strip Convex metadata before reconciliation / submission mutations. */
export function stripToEvalMutationPayload(
  source: Record<string, unknown>,
): EvalMutationPayload {
  const out: Record<string, unknown> = {};
  for (const key of PAYLOAD_KEYS) {
    if (key in source && source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  const payload = out as EvalMutationPayload;
  return {
    ...payload,
    ratings: normalizeRatings(payload.ratings as Record<string, number>),
  };
}

/** Map a per-evaluator draft row into wizard initialData. */
export function evaluatorDraftToInitialData(
  draft: Record<string, unknown>,
): Record<string, unknown> {
  return stripToEvalMutationPayload(draft) as Record<string, unknown>;
}

export function normalizeEvaluatorEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findEvaluatorDraft(
  drafts: Array<{ type: string; evaluatorName: string } & Record<string, unknown>>,
  evalType: string,
  evaluatorEmail: string,
): Record<string, unknown> | undefined {
  const normalized = normalizeEvaluatorEmail(evaluatorEmail);
  const match = drafts.find(
    (d) =>
      d.type === evalType &&
      normalizeEvaluatorEmail(String(d.evaluatorName)) === normalized,
  );
  return match ? evaluatorDraftToInitialData(match) : undefined;
}

export type FormInitialSource = "reconciled" | "evaluator_draft" | "none";

export function resolveFormInitialData(params: {
  reconciled: Array<{ type: string } & Record<string, unknown>>;
  drafts: Array<{ type: string; evaluatorName: string } & Record<string, unknown>>;
  evalType: string;
  evaluatorEmail: string | null;
}): { initialData: Record<string, unknown> | undefined; source: FormInitialSource } {
  const submission = params.reconciled.find((r) => r.type === params.evalType);
  if (submission) {
    return {
      initialData: stripToEvalMutationPayload(submission) as Record<string, unknown>,
      source: "reconciled",
    };
  }

  if (params.evaluatorEmail) {
    const fromDraft = findEvaluatorDraft(
      params.drafts,
      params.evalType,
      params.evaluatorEmail,
    );
    if (fromDraft) {
      return { initialData: fromDraft, source: "evaluator_draft" };
    }
  }

  return { initialData: undefined, source: "none" };
}
