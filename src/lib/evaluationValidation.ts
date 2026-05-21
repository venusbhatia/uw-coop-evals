import { FUTURE_READY_COMPETENCIES } from "@/lib/evaluationConfig";
import type { DraftPayload } from "@/lib/evaluationConfig";

const RATING_KEYS = [
  "learnJobDuties",
  "locateInfo",
  "drawConclusions",
  "employTechSkills",
  "applyPriorKnowledge",
  "deliverQualityWork",
  "meetDeadlines",
  "analyzeProblems",
  "engageWithCuriosity",
  "identifyImprovements",
  "adaptToChange",
  "recognizeLimits",
  "respondToFeedback",
  "seekTasks",
  "seekOpportunitiesToLearn",
  "writeClearly",
  "orallyConveyIdeas",
  "collaborateWell",
  "ethicalConduct",
  "showSensitivity",
] as const;

const OVERALL_RATINGS = new Set([
  "outstanding",
  "excellent",
  "very_good",
  "good",
  "satisfactory",
  "marginal",
  "unsatisfactory",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateDraftPayload(raw: unknown): { ok: true; data: DraftPayload } | { ok: false; error: string } {
  if (!isRecord(raw)) {
    return { ok: false, error: "Invalid evaluation payload." };
  }

  const ratings = raw.ratings;
  if (!isRecord(ratings)) {
    return { ok: false, error: "Missing ratings." };
  }

  const parsedRatings: Record<string, number> = {};
  for (const key of RATING_KEYS) {
    const val = ratings[key];
    if (typeof val !== "number" || val < 0 || val > 4) {
      return { ok: false, error: `Invalid rating: ${key}.` };
    }
    parsedRatings[key] = val;
  }

  const strengths = raw.strengths;
  const developments = raw.developments;
  if (!isRecord(strengths) || !isRecord(developments)) {
    return { ok: false, error: "Missing strengths or developments." };
  }

  if (!Array.isArray(strengths.selections) || strengths.selections.length !== 3) {
    return { ok: false, error: "Select exactly 3 strength competencies." };
  }
  if (!Array.isArray(developments.selections) || developments.selections.length !== 3) {
    return { ok: false, error: "Select exactly 3 development competencies." };
  }

  for (const sel of [...strengths.selections, ...developments.selections]) {
    if (typeof sel !== "string" || !FUTURE_READY_COMPETENCIES.includes(sel)) {
      return { ok: false, error: "Invalid competency selection." };
    }
  }

  if (typeof strengths.comments !== "string" || typeof developments.comments !== "string") {
    return { ok: false, error: "Strength and development comments are required." };
  }

  if (!Array.isArray(raw.sdgs) || !raw.sdgs.every((n) => typeof n === "number" && n >= 1 && n <= 17)) {
    return { ok: false, error: "Invalid SDG selections." };
  }

  if (typeof raw.overallRating !== "string" || !OVERALL_RATINGS.has(raw.overallRating)) {
    return { ok: false, error: "Invalid overall rating." };
  }

  if (typeof raw.overallComments !== "string" || !raw.overallComments.trim()) {
    return { ok: false, error: "Overall comments are required." };
  }

  const fe = raw.futureEmployment;
  if (!isRecord(fe)) {
    return { ok: false, error: "Missing future employment section." };
  }

  const data: DraftPayload = {
    ratings: parsedRatings,
    strengths: {
      selections: strengths.selections as string[],
      comments: strengths.comments,
    },
    developments: {
      selections: developments.selections as string[],
      comments: developments.comments,
    },
    sdgs: raw.sdgs as number[],
    overallRating: raw.overallRating,
    overallComments: raw.overallComments,
    outstandingComments: typeof raw.outstandingComments === "string" ? raw.outstandingComments : "",
    recommendations: typeof raw.recommendations === "string" ? raw.recommendations : "",
    reviewedWithStudent: Boolean(raw.reviewedWithStudent),
    studentComments: typeof raw.studentComments === "string" ? raw.studentComments : "",
    futureEmployment: {
      returnTerm: String(fe.returnTerm ?? "not_applicable"),
      offeredReemployment: String(fe.offeredReemployment ?? "to_be_determined"),
      response: String(fe.response ?? "is_undecided"),
      datesFrom: String(fe.datesFrom ?? ""),
      datesTo: String(fe.datesTo ?? ""),
    },
  };

  return { ok: true, data };
}
