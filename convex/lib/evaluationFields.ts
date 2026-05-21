import { v } from "convex/values";

export const ratingsValidator = v.object({
  learnJobDuties: v.number(),
  locateInfo: v.number(),
  drawConclusions: v.number(),
  employTechSkills: v.number(),
  applyPriorKnowledge: v.number(),
  deliverQualityWork: v.number(),
  meetDeadlines: v.number(),
  analyzeProblems: v.number(),
  engageWithCuriosity: v.number(),
  identifyImprovements: v.number(),
  adaptToChange: v.number(),
  recognizeLimits: v.number(),
  respondToFeedback: v.number(),
  seekTasks: v.number(),
  seekOpportunitiesToLearn: v.number(),
  writeClearly: v.number(),
  orallyConveyIdeas: v.number(),
  collaborateWell: v.number(),
  ethicalConduct: v.number(),
  showSensitivity: v.number(),
});

export const strengthsValidator = v.object({
  selections: v.array(v.string()),
  comments: v.string(),
});

export const developmentsValidator = v.object({
  selections: v.array(v.string()),
  comments: v.string(),
});

export const futureEmploymentValidator = v.object({
  returnTerm: v.string(),
  offeredReemployment: v.string(),
  response: v.string(),
  datesFrom: v.string(),
  datesTo: v.string(),
});

export const reviewDecisionValidator = v.object({
  reviewerEmail: v.string(),
  decision: v.string(),
  comments: v.string(),
  reviewedAt: v.number(),
});

export const revisionNoteValidator = v.object({
  fromRole: v.string(),
  comments: v.string(),
  at: v.number(),
});

export const RATING_KEYS = [
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

export type RatingsRecord = Record<(typeof RATING_KEYS)[number], number>;

export type EvalPayload = {
  ratings: RatingsRecord;
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

export function validateEvalPayload(payload: EvalPayload): string | null {
  for (const key of RATING_KEYS) {
    const val = payload.ratings[key];
    if (typeof val !== "number" || val < 0 || val > 4) {
      return `Invalid rating for ${key}.`;
    }
  }
  if (payload.strengths.selections.length !== 3) {
    return "Select exactly 3 strength competencies.";
  }
  if (payload.developments.selections.length !== 3) {
    return "Select exactly 3 development competencies.";
  }
  if (!payload.overallRating.trim()) {
    return "Overall rating is required.";
  }
  if (!payload.overallComments.trim()) {
    return "Overall comments are required.";
  }
  return null;
}
