import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { generateEvaluationPdf } from "@/lib/pdfGenerator";
import { sanitizeFilename } from "@/lib/sanitizeFilename";
import {
  convexTokenForSession,
  isSessionPayload,
  requireApiSession,
} from "@/lib/apiAuth";
import type { Id } from "convex/_generated/dataModel";

export async function GET(request: NextRequest) {
  const sessionOrResponse = await requireApiSession(request);
  if (!isSessionPayload(sessionOrResponse)) {
    return sessionOrResponse;
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const type = searchParams.get("type");

  if (!studentId || !type) {
    return NextResponse.json({ error: "Missing studentId or type parameters" }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 });
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const token = await convexTokenForSession(sessionOrResponse);
    client.setAuth(token);

    const student = await client.query(api.students.get, {
      studentId: studentId as Id<"students">,
    });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    let evaluation = student.reconciled.find((r) => r.type === type);

    if (!evaluation) {
      const draft = student.drafts.find((d) => d.type === type && d.status === "completed");
      if (!draft) {
        return NextResponse.json(
          { error: "No completed evaluation or reconciliation found for this student" },
          { status: 404 },
        );
      }
      evaluation = draft as unknown as (typeof student.reconciled)[number];
    }

    const pdfBytes = await generateEvaluationPdf({
      student: student.student,
      evaluation,
    });

    const safeBase = sanitizeFilename(student.student.name);
    const filename = `${safeBase}_${type}_evaluation.pdf`;
    return new NextResponse(pdfBytes as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `PDF generation failed: ${msg}` }, { status: 500 });
  }
}
