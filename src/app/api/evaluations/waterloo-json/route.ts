import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { buildWaterlooSpeExport } from "@/lib/waterlooFormExport";
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

    const { student, drafts, reconciled } = studentData;
    const reconciledRow = reconciled?.find((r) => r.type === evalType);
    const typeDrafts = drafts?.filter((d) => d.type === evalType) ?? [];
    const evaluatorEmail = sessionOrResponse.email;
    let draftRow = typeDrafts.find((d) => d.evaluatorName === evaluatorEmail);
    if (!draftRow && typeDrafts.length > 0) {
      draftRow = typeDrafts[typeDrafts.length - 1];
    }

    const evaluation = reconciledRow ?? draftRow;
    const sourceType: "reconciled" | "draft" = reconciledRow ? "reconciled" : "draft";

    if (!evaluation) {
      return NextResponse.json(
        { error: `No ${evalType} evaluation found for this student.` },
        { status: 404 },
      );
    }

    const payload = buildWaterlooSpeExport({
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
