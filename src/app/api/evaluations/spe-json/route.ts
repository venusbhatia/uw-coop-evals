import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { buildSpeExport } from "@/lib/speFormExport";
import {
  convexTokenForSession,
  isSessionPayload,
  requireApiSession,
} from "@/lib/apiAuth";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireApiSession(request);
  if (!isSessionPayload(sessionOrResponse)) {
    return sessionOrResponse;
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const evalType = searchParams.get("type") ?? "midterm";

  if (!studentId) {
    return NextResponse.json(
      { error: "Missing studentId query parameter." },
      { status: 400 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONVEX_URL is not configured." },
      { status: 500 },
    );
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const token = await convexTokenForSession(sessionOrResponse);
    client.setAuth(token);

    const studentData = await client.query(api.students.get, {
      studentId: studentId as Id<"students">,
    });

    if (!studentData?.student) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 });
    }

    const { student, reconciled } = studentData;
    const reconciledRow = reconciled?.find((r) => r.type === evalType);

    const termStatus =
      evalType === "midterm" ? student.midtermStatus : student.finalStatus;
    const exportAllowed =
      termStatus === "finalized" ||
      termStatus === "completed" ||
      reconciledRow?.workflowStatus === "finalized";

    if (!exportAllowed || !reconciledRow) {
      return NextResponse.json(
        {
          error:
            "Evaluation is not finalized. Complete HR/VP review before exporting.",
        },
        { status: 403 },
      );
    }

    const evaluation = reconciledRow;
    const sourceType = "reconciled" as const;

    if (!evaluation) {
      return NextResponse.json(
        { error: `No ${evalType} evaluation found for this student.` },
        { status: 404 },
      );
    }

    const payload = buildSpeExport({
      student,
      evaluation,
      sourceType,
      organization: "",
    });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Export failed: ${msg}` },
      { status: 500 },
    );
  }
}
