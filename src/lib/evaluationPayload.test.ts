import { describe, expect, it } from "vitest";
import {
  resolveFormInitialData,
  stripToEvalMutationPayload,
} from "@/lib/evaluationPayload";

describe("stripToEvalMutationPayload", () => {
  it("removes Convex system fields", () => {
    const stripped = stripToEvalMutationPayload({
      _id: "abc",
      _creationTime: 1,
      workflowStatus: "in_progress",
      signOffs: ["a@b.com"],
      ratings: { learnJobDuties: 3 },
      strengths: { selections: [], comments: "" },
      developments: { selections: [], comments: "" },
      sdgs: [],
      overallRating: "good",
      overallComments: "x",
      outstandingComments: "",
      recommendations: "",
      reviewedWithStudent: false,
      studentComments: "",
      futureEmployment: {
        returnTerm: "not_applicable",
        offeredReemployment: "to_be_determined",
        response: "is_undecided",
        datesFrom: "",
        datesTo: "",
      },
    });
    expect(stripped).not.toHaveProperty("_id");
    expect(stripped).not.toHaveProperty("workflowStatus");
    expect(stripped.ratings.learnJobDuties).toBe(3);
  });
});

describe("resolveFormInitialData", () => {
  it("prefers reconciled over evaluator draft", () => {
    const result = resolveFormInitialData({
      reconciled: [
        {
          type: "midterm",
          overallRating: "excellent",
          ratings: {},
          strengths: { selections: [], comments: "" },
          developments: { selections: [], comments: "" },
          sdgs: [],
          overallComments: "",
          outstandingComments: "",
          recommendations: "",
          reviewedWithStudent: false,
          studentComments: "",
          futureEmployment: {
            returnTerm: "not_applicable",
            offeredReemployment: "to_be_determined",
            response: "is_undecided",
            datesFrom: "",
            datesTo: "",
          },
        },
      ],
      drafts: [
        {
          type: "midterm",
          evaluatorName: "demo@evals.com",
          overallRating: "good",
          ratings: {},
          strengths: { selections: [], comments: "" },
          developments: { selections: [], comments: "" },
          sdgs: [],
          overallComments: "",
          outstandingComments: "",
          recommendations: "",
          reviewedWithStudent: false,
          studentComments: "",
          futureEmployment: {
            returnTerm: "not_applicable",
            offeredReemployment: "to_be_determined",
            response: "is_undecided",
            datesFrom: "",
            datesTo: "",
          },
        },
      ],
      evalType: "midterm",
      evaluatorEmail: "demo@evals.com",
    });
    expect(result.source).toBe("reconciled");
    expect(result.initialData?.overallRating).toBe("excellent");
  });

  it("falls back to evaluator draft when no reconciled row", () => {
    const result = resolveFormInitialData({
      reconciled: [],
      drafts: [
        {
          type: "midterm",
          evaluatorName: "sarah@gmail.com",
          overallRating: "very_good",
          ratings: { learnJobDuties: 4 },
          strengths: { selections: ["Communication"], comments: "Great" },
          developments: { selections: [], comments: "" },
          sdgs: [4],
          overallComments: "Solid term",
          outstandingComments: "",
          recommendations: "",
          reviewedWithStudent: true,
          studentComments: "",
          futureEmployment: {
            returnTerm: "not_applicable",
            offeredReemployment: "to_be_determined",
            response: "is_undecided",
            datesFrom: "",
            datesTo: "",
          },
        },
      ],
      evalType: "midterm",
      evaluatorEmail: "sarah@gmail.com",
    });
    expect(result.source).toBe("evaluator_draft");
    expect(result.initialData?.overallRating).toBe("very_good");
  });
});
