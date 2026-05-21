import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  developmentsValidator,
  futureEmploymentValidator,
  ratingsValidator,
  reviewDecisionValidator,
  revisionNoteValidator,
  strengthsValidator,
} from "./lib/evaluationFields";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    role: v.string(), // "supervisor" | "hr" | "vp"
    displayName: v.optional(v.string()),
  }).index("by_email", ["email"]),

  students: defineTable({
    name: v.string(),
    studentId: v.string(),
    jobTitle: v.string(),
    team: v.optional(v.string()),
    term: v.string(),
    year: v.string(),
    midtermStatus: v.string(),
    finalStatus: v.string(),
  }),

  evaluations: defineTable({
    studentId: v.id("students"),
    evaluatorName: v.string(),
    type: v.string(),
    ratings: ratingsValidator,
    strengths: strengthsValidator,
    developments: developmentsValidator,
    sdgs: v.array(v.number()),
    overallRating: v.string(),
    overallComments: v.string(),
    outstandingComments: v.string(),
    recommendations: v.string(),
    reviewedWithStudent: v.boolean(),
    studentComments: v.string(),
    futureEmployment: futureEmploymentValidator,
    status: v.string(), // "in_progress" | "completed"
    createdAt: v.number(),
  })
    .index("by_student_type", ["studentId", "type"])
    .index("by_student_type_evaluator", ["studentId", "type", "evaluatorName"]),

  reconciledEvaluations: defineTable({
    studentId: v.id("students"),
    type: v.string(),
    ratings: ratingsValidator,
    strengths: strengthsValidator,
    developments: developmentsValidator,
    sdgs: v.array(v.number()),
    overallRating: v.string(),
    overallComments: v.string(),
    outstandingComments: v.string(),
    recommendations: v.string(),
    reviewedWithStudent: v.boolean(),
    studentComments: v.string(),
    futureEmployment: futureEmploymentValidator,
    signOffs: v.array(v.string()),
    status: v.string(), // legacy: "draft" | "completed"
    workflowStatus: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    submittedBy: v.optional(v.string()),
    hrReview: v.optional(reviewDecisionValidator),
    vpReview: v.optional(reviewDecisionValidator),
    revisionHistory: v.optional(v.array(revisionNoteValidator)),
    sectionProgress: v.optional(v.array(v.string())),
    createdAt: v.number(),
  }).index("by_student_type", ["studentId", "type"]),
});
