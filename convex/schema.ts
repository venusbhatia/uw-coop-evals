import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  students: defineTable({
    name: v.string(),
    studentId: v.string(),
    jobTitle: v.string(),
    term: v.string(), // "Winter" | "Spring" | "Fall"
    year: v.string(),
    midtermStatus: v.string(), // "not_started" | "drafting" | "ready_reconcile" | "completed"
    finalStatus: v.string(), // "not_started" | "drafting" | "ready_reconcile" | "completed"
  }),
  evaluations: defineTable({
    studentId: v.id("students"),
    evaluatorName: v.string(),
    type: v.string(), // "midterm" | "final"
    ratings: v.object({
      learnJobDuties: v.number(), // 0 = Not Observed, 1-4
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
    }),
    strengths: v.object({
      selections: v.array(v.string()), // 3 competencies from list of 12
      comments: v.string(),
    }),
    developments: v.object({
      selections: v.array(v.string()), // 3 competencies from list of 12
      comments: v.string(),
    }),
    sdgs: v.array(v.number()), // array of numbers from 1 to 17
    overallRating: v.string(), // "outstanding", "excellent", "very_good", "good", "satisfactory", "marginal", "unsatisfactory"
    overallComments: v.string(),
    outstandingComments: v.string(),
    recommendations: v.string(),
    reviewedWithStudent: v.boolean(),
    studentComments: v.string(),
    futureEmployment: v.object({
      returnTerm: v.string(), // "yes" | "no" | "not_applicable"
      offeredReemployment: v.string(), // "yes" | "no" | "to_be_determined"
      response: v.string(), // "accepted" | "declined" | "is_undecided"
      datesFrom: v.string(),
      datesTo: v.string(),
    }),
    status: v.string(), // "draft" | "completed"
    createdAt: v.number(),
  }),
  reconciledEvaluations: defineTable({
    studentId: v.id("students"),
    type: v.string(), // "midterm" | "final"
    ratings: v.object({
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
    }),
    strengths: v.object({
      selections: v.array(v.string()),
      comments: v.string(),
    }),
    developments: v.object({
      selections: v.array(v.string()),
      comments: v.string(),
    }),
    sdgs: v.array(v.number()),
    overallRating: v.string(),
    overallComments: v.string(),
    outstandingComments: v.string(),
    recommendations: v.string(),
    reviewedWithStudent: v.boolean(),
    studentComments: v.string(),
    futureEmployment: v.object({
      returnTerm: v.string(),
      offeredReemployment: v.string(),
      response: v.string(),
      datesFrom: v.string(),
      datesTo: v.string(),
    }),
    signOffs: v.array(v.string()), // list of evaluators who signed off
    status: v.string(), // "draft" | "completed"
    createdAt: v.number(),
  }),
});
