import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get drafts and reconciled evaluations for a specific student and term type
export const getByStudentAndType = query({
  args: { studentId: v.id("students"), type: v.string() },
  handler: async (ctx, args) => {
    const drafts = await ctx.db
      .query("evaluations")
      .filter((q) =>
        q.and(
          q.eq(q.field("studentId"), args.studentId),
          q.eq(q.field("type"), args.type)
        )
      )
      .collect();

    const reconciled = await ctx.db
      .query("reconciledEvaluations")
      .filter((q) =>
        q.and(
          q.eq(q.field("studentId"), args.studentId),
          q.eq(q.field("type"), args.type)
        )
      )
      .first();

    return { drafts, reconciled };
  },
});

// Submit a new evaluator draft
export const submitDraft = mutation({
  args: {
    studentId: v.id("students"),
    evaluatorName: v.string(),
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
  },
  handler: async (ctx, args) => {
    // Check if evaluator already submitted a draft for this student + type
    const existing = await ctx.db
      .query("evaluations")
      .filter((q) =>
        q.and(
          q.eq(q.field("studentId"), args.studentId),
          q.eq(q.field("type"), args.type),
          q.eq(q.field("evaluatorName"), args.evaluatorName)
        )
      )
      .first();

    if (existing) {
      await ctx.db.replace(existing._id, {
        studentId: args.studentId,
        evaluatorName: args.evaluatorName,
        type: args.type,
        ratings: args.ratings,
        strengths: args.strengths,
        developments: args.developments,
        sdgs: args.sdgs,
        overallRating: args.overallRating,
        overallComments: args.overallComments,
        outstandingComments: args.outstandingComments,
        recommendations: args.recommendations,
        reviewedWithStudent: args.reviewedWithStudent,
        studentComments: args.studentComments,
        futureEmployment: args.futureEmployment,
        status: "completed",
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert("evaluations", {
        studentId: args.studentId,
        evaluatorName: args.evaluatorName,
        type: args.type,
        ratings: args.ratings,
        strengths: args.strengths,
        developments: args.developments,
        sdgs: args.sdgs,
        overallRating: args.overallRating,
        overallComments: args.overallComments,
        outstandingComments: args.outstandingComments,
        recommendations: args.recommendations,
        reviewedWithStudent: args.reviewedWithStudent,
        studentComments: args.studentComments,
        futureEmployment: args.futureEmployment,
        status: "completed",
        createdAt: Date.now(),
      });
    }

    // Recalculate student status
    const allDrafts = await ctx.db
      .query("evaluations")
      .filter((q) =>
        q.and(
          q.eq(q.field("studentId"), args.studentId),
          q.eq(q.field("type"), args.type)
        )
      )
      .collect();

    let newStatus = "drafting";
    if (allDrafts.length >= 2) {
      newStatus = "ready_reconcile";
    }

    const student = await ctx.db.get(args.studentId);
    if (student) {
      if (args.type === "midterm") {
        if (student.midtermStatus !== "completed" && student.midtermStatus !== "ready_reconcile") {
          await ctx.db.patch(args.studentId, { midtermStatus: newStatus });
        }
      } else {
        if (student.finalStatus !== "completed" && student.finalStatus !== "ready_reconcile") {
          await ctx.db.patch(args.studentId, { finalStatus: newStatus });
        }
      }
    }

    return { success: true };
  },
});

// Submit reconciled evaluation (consensus)
export const submitReconciliation = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("reconciledEvaluations")
      .filter((q) =>
        q.and(
          q.eq(q.field("studentId"), args.studentId),
          q.eq(q.field("type"), args.type)
        )
      )
      .first();

    if (existing) {
      await ctx.db.replace(existing._id, {
        studentId: args.studentId,
        type: args.type,
        ratings: args.ratings,
        strengths: args.strengths,
        developments: args.developments,
        sdgs: args.sdgs,
        overallRating: args.overallRating,
        overallComments: args.overallComments,
        outstandingComments: args.outstandingComments,
        recommendations: args.recommendations,
        reviewedWithStudent: args.reviewedWithStudent,
        studentComments: args.studentComments,
        futureEmployment: args.futureEmployment,
        signOffs: existing.signOffs,
        status: existing.status,
        createdAt: existing.createdAt,
      });
    } else {
      await ctx.db.insert("reconciledEvaluations", {
        studentId: args.studentId,
        type: args.type,
        ratings: args.ratings,
        strengths: args.strengths,
        developments: args.developments,
        sdgs: args.sdgs,
        overallRating: args.overallRating,
        overallComments: args.overallComments,
        outstandingComments: args.outstandingComments,
        recommendations: args.recommendations,
        reviewedWithStudent: args.reviewedWithStudent,
        studentComments: args.studentComments,
        futureEmployment: args.futureEmployment,
        signOffs: [],
        status: "draft",
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Sign off on a reconciliation, locking it and completing the student evaluation
export const signOff = mutation({
  args: {
    studentId: v.id("students"),
    type: v.string(),
    evaluatorName: v.string(),
  },
  handler: async (ctx, args) => {
    const reconciled = await ctx.db
      .query("reconciledEvaluations")
      .filter((q) =>
        q.and(
          q.eq(q.field("studentId"), args.studentId),
          q.eq(q.field("type"), args.type)
        )
      )
      .first();

    if (!reconciled) {
      throw new Error("No reconciled evaluation draft found to sign off.");
    }

    // Add name if not already signed off
    const signOffs = [...reconciled.signOffs];
    if (!signOffs.includes(args.evaluatorName)) {
      signOffs.push(args.evaluatorName);
    }

    // For demo purposes, we will say that if we get 1 or more sign-offs (or explicitly lock it), we mark it complete
    // Let's mark it complete on sign-off
    await ctx.db.patch(reconciled._id, {
      signOffs,
      status: "completed",
    });

    // Update student status
    const student = await ctx.db.get(args.studentId);
    if (student) {
      if (args.type === "midterm") {
        await ctx.db.patch(args.studentId, { midtermStatus: "completed" });
      } else {
        await ctx.db.patch(args.studentId, { finalStatus: "completed" });
      }
    }

    return { success: true, signOffs };
  },
});

// Get completed reconciled evaluations for export (to WaterlooWorks extension)
export const getCompletedForExport = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // Find student by case-insensitive name match
    const student = await ctx.db
      .query("students")
      .collect();
    
    const matchedStudent = student.find(s => s.name.toLowerCase().includes(args.name.toLowerCase()));
    
    if (!matchedStudent) {
      return null;
    }

    // Prefer final, then midterm
    let evalData = await ctx.db
      .query("reconciledEvaluations")
      .filter((q) =>
        q.and(
          q.eq(q.field("studentId"), matchedStudent._id),
          q.eq(q.field("type"), "final")
        )
      )
      .first();

    if (!evalData) {
      evalData = await ctx.db
        .query("reconciledEvaluations")
        .filter((q) =>
          q.and(
            q.eq(q.field("studentId"), matchedStudent._id),
            q.eq(q.field("type"), "midterm")
          )
        )
        .first();
    }

    if (!evalData) {
      return null;
    }

    return {
      student: matchedStudent,
      evaluation: evalData,
    };
  },
});
