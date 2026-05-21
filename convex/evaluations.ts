import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  developmentsValidator,
  futureEmploymentValidator,
  ratingsValidator,
  strengthsValidator,
  validateEvalPayload,
  type EvalPayload,
} from "./lib/evaluationFields";
import { requireAuth, requireAuthMutation, requireRole } from "./lib/requireAuth";
import {
  canExport,
  canSupervisorEdit,
  deriveStatusFromDrafts,
  statusFieldForType,
} from "./lib/workflow";

const evalPayloadArgs = {
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
  sectionProgress: v.optional(v.array(v.string())),
};

async function getReconciled(
  ctx: QueryCtx | MutationCtx,
  studentId: Id<"students">,
  type: string,
) {
  return await ctx.db
    .query("reconciledEvaluations")
    .withIndex("by_student_type", (q) =>
      q.eq("studentId", studentId).eq("type", type),
    )
    .first();
}

async function patchStudentStatus(
  ctx: MutationCtx,
  studentId: Id<"students">,
  type: string,
  status: string,
) {
  const field = statusFieldForType(type);
  await ctx.db.patch(studentId, { [field]: status });
}

export const getByStudentAndType = query({
  args: { studentId: v.id("students"), type: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const drafts = await ctx.db
      .query("evaluations")
      .withIndex("by_student_type", (q) =>
        q.eq("studentId", args.studentId).eq("type", args.type),
      )
      .collect();

    const reconciled = await getReconciled(ctx, args.studentId, args.type);
    return { drafts, reconciled };
  },
});

export const listReviewQueue = query({
  args: { role: v.string() },
  handler: async (ctx, args) => {
    const { role } = await requireAuth(ctx);
    const targetStatus = args.role === "vp" ? "pending_vp" : "pending_hr";
    if (args.role === "hr" && role !== "hr") throw new Error("Forbidden");
    if (args.role === "vp" && role !== "vp") throw new Error("Forbidden");

    const all = await ctx.db.query("reconciledEvaluations").collect();
    const pending = all.filter((r) => r.workflowStatus === targetStatus);
    const results = [];
    for (const rec of pending) {
      const student = await ctx.db.get(rec.studentId);
      if (student) {
        results.push({ student, submission: rec });
      }
    }
    return results;
  },
});

export const saveSubmissionDraft = mutation({
  args: {
    studentId: v.id("students"),
    type: v.string(),
    ...evalPayloadArgs,
  },
  handler: async (ctx, args) => {
    const { role } = await requireAuthMutation(ctx);
    if (role !== "supervisor") {
      throw new Error("Only supervisors can edit evaluation drafts.");
    }

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student not found.");

    const statusField = statusFieldForType(args.type);
    const currentStatus = student[statusField];
    const reconciledCheck = await getReconciled(ctx, args.studentId, args.type);
    const wf = reconciledCheck?.workflowStatus ?? currentStatus;
    if (!canSupervisorEdit(currentStatus) && !canSupervisorEdit(wf)) {
      throw new Error("Evaluation is locked while under review.");
    }

    const existing = await getReconciled(ctx, args.studentId, args.type);
    const payload = {
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
      sectionProgress: args.sectionProgress,
    };

    if (existing) {
      await ctx.db.replace(existing._id, {
        ...payload,
        signOffs: existing.signOffs,
        status: existing.status,
        workflowStatus: existing.workflowStatus === "returned" ? "returned" : "in_progress",
        submittedAt: existing.submittedAt,
        submittedBy: existing.submittedBy,
        hrReview: existing.hrReview,
        vpReview: existing.vpReview,
        revisionHistory: existing.revisionHistory,
        createdAt: existing.createdAt,
      });
    } else {
      await ctx.db.insert("reconciledEvaluations", {
        ...payload,
        signOffs: [],
        status: "draft",
        workflowStatus: "in_progress",
        createdAt: Date.now(),
      });
    }

    if (currentStatus === "not_started") {
      await patchStudentStatus(ctx, args.studentId, args.type, "in_progress");
    } else if (currentStatus === "returned") {
      await patchStudentStatus(ctx, args.studentId, args.type, "returned");
    }

    return { success: true };
  },
});

export const submitForReview = mutation({
  args: {
    studentId: v.id("students"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const { email, role } = await requireAuthMutation(ctx);
    if (role !== "supervisor") {
      throw new Error("Only supervisors can submit for review.");
    }

    const reconciled = await getReconciled(ctx, args.studentId, args.type);
    if (!reconciled) {
      throw new Error("No evaluation draft found. Complete the form first.");
    }

    const validationError = validateEvalPayload(reconciled as unknown as EvalPayload);
    if (validationError) {
      throw new Error(validationError);
    }

    const drafts = await ctx.db
      .query("evaluations")
      .withIndex("by_student_type", (q) =>
        q.eq("studentId", args.studentId).eq("type", args.type),
      )
      .collect();

    const student = await ctx.db.get(args.studentId);
    if (!student) throw new Error("Student not found.");
    const statusField = statusFieldForType(args.type);
    if (student[statusField] === "ready_reconcile" && drafts.length >= 2) {
      if (reconciled.signOffs.length < 2) {
        throw new Error("Both supervisors must sign off on the reconciliation before submitting to HR.");
      }
    }

    await ctx.db.patch(reconciled._id, {
      workflowStatus: "pending_hr",
      submittedAt: Date.now(),
      submittedBy: email,
      status: "draft",
    });

    await patchStudentStatus(ctx, args.studentId, args.type, "pending_hr");
    return { success: true };
  },
});

export const hrReview = mutation({
  args: {
    studentId: v.id("students"),
    type: v.string(),
    decision: v.string(),
    comments: v.string(),
  },
  handler: async (ctx, args) => {
    const { email } = await requireRole(ctx, ["hr"]);
    const reconciled = await getReconciled(ctx, args.studentId, args.type);
    if (!reconciled || reconciled.workflowStatus !== "pending_hr") {
      throw new Error("No evaluation pending HR review.");
    }

    const review = {
      reviewerEmail: email,
      decision: args.decision,
      comments: args.comments,
      reviewedAt: Date.now(),
    };

    const history = [...(reconciled.revisionHistory ?? [])];
    history.push({ fromRole: "hr", comments: args.comments, at: Date.now() });

    if (args.decision === "returned") {
      await ctx.db.patch(reconciled._id, {
        workflowStatus: "returned",
        hrReview: review,
        revisionHistory: history,
      });
      await patchStudentStatus(ctx, args.studentId, args.type, "returned");
    } else {
      await ctx.db.patch(reconciled._id, {
        workflowStatus: "pending_vp",
        hrReview: review,
        revisionHistory: history,
      });
      await patchStudentStatus(ctx, args.studentId, args.type, "pending_vp");
    }

    return { success: true };
  },
});

export const vpReview = mutation({
  args: {
    studentId: v.id("students"),
    type: v.string(),
    decision: v.string(),
    comments: v.string(),
  },
  handler: async (ctx, args) => {
    const { email } = await requireRole(ctx, ["vp"]);
    const reconciled = await getReconciled(ctx, args.studentId, args.type);
    if (!reconciled || reconciled.workflowStatus !== "pending_vp") {
      throw new Error("No evaluation pending VP review.");
    }

    const review = {
      reviewerEmail: email,
      decision: args.decision,
      comments: args.comments,
      reviewedAt: Date.now(),
    };

    const history = [...(reconciled.revisionHistory ?? [])];
    history.push({ fromRole: "vp", comments: args.comments, at: Date.now() });

    if (args.decision === "returned") {
      await ctx.db.patch(reconciled._id, {
        workflowStatus: "returned",
        vpReview: review,
        revisionHistory: history,
      });
      await patchStudentStatus(ctx, args.studentId, args.type, "returned");
    } else {
      await ctx.db.patch(reconciled._id, {
        workflowStatus: "finalized",
        vpReview: review,
        revisionHistory: history,
        status: "completed",
      });
      await patchStudentStatus(ctx, args.studentId, args.type, "finalized");
    }

    return { success: true };
  },
});

export const submitDraft = mutation({
  args: {
    studentId: v.id("students"),
    type: v.string(),
    ...evalPayloadArgs,
  },
  handler: async (ctx, args) => {
    const { email: evaluatorName } = await requireAuthMutation(ctx);

    const existing = await ctx.db
      .query("evaluations")
      .withIndex("by_student_type_evaluator", (q) =>
        q
          .eq("studentId", args.studentId)
          .eq("type", args.type)
          .eq("evaluatorName", evaluatorName),
      )
      .first();

    const row = {
      studentId: args.studentId,
      evaluatorName,
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
    };

    if (existing) {
      await ctx.db.replace(existing._id, row);
    } else {
      await ctx.db.insert("evaluations", row);
    }

    const allDrafts = await ctx.db
      .query("evaluations")
      .withIndex("by_student_type", (q) =>
        q.eq("studentId", args.studentId).eq("type", args.type),
      )
      .collect();

    const student = await ctx.db.get(args.studentId);
    if (student) {
      const field = statusFieldForType(args.type);
      const current = student[field];
      if (current !== "pending_hr" && current !== "pending_vp" && current !== "finalized" && current !== "returned") {
        const next = deriveStatusFromDrafts(allDrafts.length, current);
        await patchStudentStatus(ctx, args.studentId, args.type, next);
      }
    }

    return { success: true };
  },
});

export const submitReconciliation = mutation({
  args: {
    studentId: v.id("students"),
    type: v.string(),
    ...evalPayloadArgs,
  },
  handler: async (ctx, args) => {
    await requireAuthMutation(ctx);
    const existing = await getReconciled(ctx, args.studentId, args.type);

    const base = {
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
      sectionProgress: args.sectionProgress,
    };

    if (existing) {
      await ctx.db.replace(existing._id, {
        ...base,
        signOffs: existing.signOffs,
        status: existing.status,
        workflowStatus: canSupervisorEdit(existing.workflowStatus)
          ? "in_progress"
          : existing.workflowStatus,
        submittedAt: existing.submittedAt,
        submittedBy: existing.submittedBy,
        hrReview: existing.hrReview,
        vpReview: existing.vpReview,
        revisionHistory: existing.revisionHistory,
        createdAt: existing.createdAt,
      });
    } else {
      await ctx.db.insert("reconciledEvaluations", {
        ...base,
        signOffs: [],
        status: "draft",
        workflowStatus: "in_progress",
        createdAt: Date.now(),
      });
    }

    const student = await ctx.db.get(args.studentId);
    if (student) {
      const field = statusFieldForType(args.type);
      const current = student[field];
      if (current === "ready_reconcile") {
        await patchStudentStatus(ctx, args.studentId, args.type, "in_progress");
      }
    }

    return { success: true };
  },
});

export const signOff = mutation({
  args: {
    studentId: v.id("students"),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    const { email: evaluatorName } = await requireAuthMutation(ctx);
    const reconciled = await getReconciled(ctx, args.studentId, args.type);

    if (!reconciled) {
      throw new Error("No reconciled evaluation draft found to sign off.");
    }

    const signOffs = [...reconciled.signOffs];
    if (!signOffs.includes(evaluatorName)) {
      signOffs.push(evaluatorName);
    }

    await ctx.db.patch(reconciled._id, {
      signOffs,
      status: "draft",
    });

    return { success: true, signOffs };
  },
});

export const getCompletedForExport = query({
  args: {
    name: v.optional(v.string()),
    studentId: v.optional(v.id("students")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    let matchedStudent = null;
    if (args.studentId) {
      matchedStudent = await ctx.db.get(args.studentId);
    } else if (args.name?.trim()) {
      const students = await ctx.db.query("students").collect();
      const queryName = args.name.trim().toLowerCase();
      matchedStudent =
        students.find((s) => s.name.toLowerCase() === queryName) ??
        students.find((s) => s.name.toLowerCase().includes(queryName)) ??
        null;
    }

    if (!matchedStudent) return null;

    let evalData = await ctx.db
      .query("reconciledEvaluations")
      .withIndex("by_student_type", (q) =>
        q.eq("studentId", matchedStudent!._id).eq("type", "final"),
      )
      .first();

    if (!evalData) {
      evalData = await ctx.db
        .query("reconciledEvaluations")
        .withIndex("by_student_type", (q) =>
          q.eq("studentId", matchedStudent!._id).eq("type", "midterm"),
        )
        .first();
    }

    if (!evalData) {
      return null;
    }

    const termStatus =
      evalData.type === "final"
        ? matchedStudent.finalStatus
        : matchedStudent.midtermStatus;

    if (!canExport(evalData.workflowStatus, termStatus)) {
      return null;
    }

    return {
      student: matchedStudent,
      evaluation: evalData,
    };
  },
});
