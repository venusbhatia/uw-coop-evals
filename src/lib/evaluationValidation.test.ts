import { describe, expect, it } from "vitest";
import { validateDraftPayload } from "@/lib/evaluationValidation";

const validPayload = {
  ratings: {
    learnJobDuties: 3,
    locateInfo: 3,
    drawConclusions: 3,
    employTechSkills: 3,
    applyPriorKnowledge: 3,
    deliverQualityWork: 3,
    meetDeadlines: 3,
    analyzeProblems: 3,
    engageWithCuriosity: 3,
    identifyImprovements: 3,
    adaptToChange: 3,
    recognizeLimits: 3,
    respondToFeedback: 3,
    seekTasks: 3,
    seekOpportunitiesToLearn: 3,
    writeClearly: 3,
    orallyConveyIdeas: 3,
    collaborateWell: 3,
    ethicalConduct: 3,
    showSensitivity: 3,
  },
  strengths: {
    selections: [
      "Communication",
      "Collaboration",
      "Self-assessment",
    ],
    comments: "Strong communicator.",
  },
  developments: {
    selections: ["Critical thinking", "Implementation", "Self-management"],
    comments: "Continue building depth.",
  },
  sdgs: [8],
  overallRating: "very_good",
  overallComments: "Solid term.",
  outstandingComments: "",
  recommendations: "Keep learning.",
  reviewedWithStudent: true,
  studentComments: "Agreed.",
  futureEmployment: {
    returnTerm: "yes",
    offeredReemployment: "to_be_determined",
    response: "is_undecided",
    datesFrom: "",
    datesTo: "",
  },
};

describe("validateDraftPayload", () => {
  it("accepts a complete payload", () => {
    const result = validateDraftPayload(validPayload);
    expect(result.ok).toBe(true);
  });

  it("rejects missing ratings", () => {
    const result = validateDraftPayload({ ...validPayload, ratings: {} });
    expect(result.ok).toBe(false);
  });
});
