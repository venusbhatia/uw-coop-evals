import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  DEMO_EVALUATOR_1,
  DEMO_EVALUATOR_2,
  DEMO_STUDENTS,
  teamFromJobTitle,
} from "./seedData";
import {
  requireAuth,
  requireAuthMutation,
  requireSeedDemoAuth,
} from "./lib/requireAuth";

// List all students (newest first)
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const students = await ctx.db.query("students").collect();
    return students.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get student details and all evaluations (drafts and reconciled)
export const get = query({
  args: { studentId: v.id("students") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const student = await ctx.db.get(args.studentId);
    if (!student) {
      return null;
    }

    const drafts = await ctx.db
      .query("evaluations")
      .filter((q) => q.eq(q.field("studentId"), args.studentId))
      .collect();

    const reconciled = await ctx.db
      .query("reconciledEvaluations")
      .filter((q) => q.eq(q.field("studentId"), args.studentId))
      .collect();

    return {
      student,
      drafts,
      reconciled,
    };
  },
});

// Add a new student
export const add = mutation({
  args: {
    name: v.string(),
    studentId: v.string(),
    team: v.string(),
    term: v.string(),
    year: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthMutation(ctx);
    const year = args.year ?? String(new Date().getFullYear());
    return await ctx.db.insert("students", {
      name: args.name,
      studentId: args.studentId,
      jobTitle: args.jobTitle ?? "Co-op Student",
      team: args.team,
      term: args.term,
      year,
      midtermStatus: "not_started",
      finalStatus: "not_started",
    });
  },
});

// Clean and Seed DB for Demo Mode
export const seedDemo = mutation({
  args: {},
  handler: async (ctx) => {
    await requireSeedDemoAuth(ctx);
    // 1. Delete all existing records
    const allStudents = await ctx.db.query("students").collect();
    for (const s of allStudents) {
      await ctx.db.delete(s._id);
    }
    const allEvals = await ctx.db.query("evaluations").collect();
    for (const e of allEvals) {
      await ctx.db.delete(e._id);
    }
    const allReconciled = await ctx.db.query("reconciledEvaluations").collect();
    for (const r of allReconciled) {
      await ctx.db.delete(r._id);
    }
    const allUsers = await ctx.db.query("users").collect();
    for (const u of allUsers) {
      await ctx.db.delete(u._id);
    }

    // 2. Insert 20 demo students
    const idByStudentNumber: Record<string, Id<"students">> = {};

    for (const s of DEMO_STUDENTS) {
      const id = await ctx.db.insert("students", {
        name: s.name,
        studentId: s.studentId,
        jobTitle: s.jobTitle,
        team: s.team ?? teamFromJobTitle(s.jobTitle),
        term: s.term,
        year: s.year,
        midtermStatus: s.midtermStatus,
        finalStatus: s.finalStatus,
      });
      idByStudentNumber[s.studentId] = id;
    }

    const idJohn = idByStudentNumber["20875412"]!;
    const idAlice = idByStudentNumber["21043928"]!;
    const idBob = idByStudentNumber["20773950"]!;

    // 3. Add evaluations for John Smith (Only Evaluator 1 done)
    const baseRatings = {
      learnJobDuties: 3,
      locateInfo: 3,
      drawConclusions: 3,
      employTechSkills: 3,
      applyPriorKnowledge: 3,
      deliverQualityWork: 3,
      meetDeadlines: 3,
      analyzeProblems: 3,
      engageWithCuriosity: 4,
      identifyImprovements: 3,
      adaptToChange: 3,
      recognizeLimits: 3,
      respondToFeedback: 4,
      seekTasks: 3,
      seekOpportunitiesToLearn: 4,
      writeClearly: 3,
      orallyConveyIdeas: 3,
      collaborateWell: 4,
      ethicalConduct: 4,
      showSensitivity: 4,
    };

    await ctx.db.insert("evaluations", {
      studentId: idJohn,
      evaluatorName: DEMO_EVALUATOR_1,
      type: "midterm",
      ratings: baseRatings,
      strengths: {
        selections: ["Collaboration", "Self-assessment", "Technological agility"],
        comments: "John has shown exceptional growth in self-assessment. He is curious and collaborates very well with the team.",
      },
      developments: {
        selections: ["Critical thinking", "Implementation"],
        comments: "Needs to focus on delivering work more independently. Sometimes gets stuck on small issues before seeking help.",
      },
      sdgs: [4, 8],
      overallRating: "very_good",
      overallComments: "John is performing very well during his midterm. He fits in great with our team and has completed several key tasks.",
      outstandingComments: "",
      recommendations: "Continue taking ownership of features and pair program with senior engineers on complex database design.",
      reviewedWithStudent: true,
      studentComments: "I agree with this evaluation and will focus on independent implementation.",
      futureEmployment: {
        returnTerm: "yes",
        offeredReemployment: "to_be_determined",
        response: "is_undecided",
        datesFrom: "",
        datesTo: "",
      },
      status: "completed",
      createdAt: Date.now() - 86400000 * 3, // 3 days ago
    });

    // 4. Add evaluations for Alice Johnson (Evaluator 1 and Evaluator 2 completed, with conflicts)
    // Sarah's draft: High scores, very positive
    await ctx.db.insert("evaluations", {
      studentId: idAlice,
      evaluatorName: DEMO_EVALUATOR_1,
      type: "midterm",
      ratings: {
        ...baseRatings,
        deliverQualityWork: 4, // CONFLICT (4 vs 2)
        meetDeadlines: 4,      // CONFLICT (4 vs 2)
        learnJobDuties: 4,
      },
      strengths: {
        selections: ["Implementation", "Technological agility", "Critical thinking"],
        comments: "Alice works incredibly fast and builds solid code. Her implementations are neat and clean.",
      },
      developments: {
        selections: ["Communication", "Self-management"],
        comments: "Could work on explaining technical designs in sync calls.",
      },
      sdgs: [9],
      overallRating: "excellent",
      overallComments: "Alice has exceeded our expectations for output quality and speed. Exceptional engineer.",
      outstandingComments: "",
      recommendations: "Focus on presenting designs in engineering reviews.",
      reviewedWithStudent: false,
      studentComments: "",
      futureEmployment: {
        returnTerm: "yes",
        offeredReemployment: "yes",
        response: "accepted",
        datesFrom: "2026-09-01",
        datesTo: "2026-12-24",
      },
      status: "completed",
      createdAt: Date.now() - 86400000 * 2, // 2 days ago
    });

    // Marcus's draft: Critical scores, notes missed deadlines
    await ctx.db.insert("evaluations", {
      studentId: idAlice,
      evaluatorName: DEMO_EVALUATOR_2,
      type: "midterm",
      ratings: {
        ...baseRatings,
        deliverQualityWork: 2, // CONFLICT
        meetDeadlines: 2,      // CONFLICT
        learnJobDuties: 3,
      },
      strengths: {
        selections: ["Communication", "Collaboration", "Discipline and context specific skills"],
        comments: "Alice is pleasant to collaborate with and is highly skilled technically.",
      },
      developments: {
        selections: ["Self-management", "Critical thinking"],
        comments: "Alice missed two release deadlines in the last sprint. She needs to manage commitments better and raise flags earlier when blocked.",
      },
      sdgs: [8],
      overallRating: "satisfactory",
      overallComments: "While Alice writes good code, her missed deadlines impacted our feature timeline. She needs to improve predictability.",
      outstandingComments: "",
      recommendations: "Improve daily task breakdown and communication of blocker status.",
      reviewedWithStudent: false,
      studentComments: "",
      futureEmployment: {
        returnTerm: "not_applicable",
        offeredReemployment: "no",
        response: "is_undecided",
        datesFrom: "",
        datesTo: "",
      },
      status: "completed",
      createdAt: Date.now() - 86400000, // 1 day ago
    });

    // 5. Add fully reconciled final evaluation for Bob Williams
    const finalRatings = {
      learnJobDuties: 4,
      locateInfo: 4,
      drawConclusions: 4,
      employTechSkills: 4,
      applyPriorKnowledge: 4,
      deliverQualityWork: 4,
      meetDeadlines: 4,
      analyzeProblems: 4,
      engageWithCuriosity: 4,
      identifyImprovements: 4,
      adaptToChange: 4,
      recognizeLimits: 3,
      respondToFeedback: 4,
      seekTasks: 4,
      seekOpportunitiesToLearn: 4,
      writeClearly: 4,
      orallyConveyIdeas: 4,
      collaborateWell: 4,
      ethicalConduct: 4,
      showSensitivity: 4,
    };

    const reconciledData = {
      studentId: idBob,
      type: "final",
      ratings: finalRatings,
      strengths: {
        selections: ["Self-management", "Collaboration", "Communication"],
        comments: "Bob was a stellar co-op. He took full ownership of the user research initiative and presented findings directly to stakeholders.",
      },
      developments: {
        selections: ["Self-assessment", "Technological agility"],
        comments: "Can continue broadening his knowledge of frontend technologies to prototype ideas directly.",
      },
      sdgs: [4, 8, 10],
      overallRating: "outstanding",
      overallComments: "Bob was outstanding. He acted as a full-time researcher, producing work that immediately shaped our Q3 roadmap.",
      outstandingComments: "Bob did outstanding work by running 15 user interviews independently and delivering a synthesis deck that was shared with the executive team. His contributions are well beyond a standard intern role.",
      recommendations: "Broaden UX design skill set using Figma.",
      reviewedWithStudent: true,
      studentComments: "An amazing co-op experience. Loved working with this team and learned a lot about research methods.",
      futureEmployment: {
        returnTerm: "yes",
        offeredReemployment: "yes",
        response: "accepted",
        datesFrom: "2026-09-01",
        datesTo: "2026-12-24",
      },
      signOffs: [DEMO_EVALUATOR_1, DEMO_EVALUATOR_2],
      status: "completed",
      workflowStatus: "finalized",
      submittedAt: Date.now() - 86400000 * 4,
      submittedBy: DEMO_EVALUATOR_1,
      createdAt: Date.now() - 86400000 * 5,
    };

    await ctx.db.insert("reconciledEvaluations", {
      ...reconciledData,
      type: "midterm",
      overallRating: "excellent",
      outstandingComments: "",
      status: "completed",
      workflowStatus: "finalized",
      submittedAt: Date.now() - 86400000 * 6,
      submittedBy: DEMO_EVALUATOR_1,
    });

    await ctx.db.insert("reconciledEvaluations", reconciledData);

    // Demo: one student pending HR (Carol placeholder — use Priya)
    const idPriya = idByStudentNumber["20930112"]!;
    await ctx.db.insert("reconciledEvaluations", {
      ...reconciledData,
      studentId: idPriya,
      type: "midterm",
      overallRating: "very_good",
      outstandingComments: "",
      signOffs: [DEMO_EVALUATOR_1],
      status: "draft",
      workflowStatus: "pending_hr",
      submittedAt: Date.now() - 3600000,
      submittedBy: DEMO_EVALUATOR_1,
      createdAt: Date.now() - 86400000,
    });
    await ctx.db.patch(idPriya, { midtermStatus: "pending_hr" });

    return { success: true };
  },
});
