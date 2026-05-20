import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { generateEvaluationPdf } from "@/lib/pdfGenerator";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  const type = searchParams.get("type"); // "midterm" | "final"

  if (!studentId || !type) {
    return NextResponse.json({ error: "Missing studentId or type parameters" }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 });
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    
    // 1. Get student details
    const student = await client.query(api.students.get, { studentId: studentId as any });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // 2. Find evaluation data
    // Prefer reconciled, fallback to first completed evaluator draft
    let evaluation = student.reconciled.find(r => r.type === type);
    
    if (!evaluation) {
      // Find completed draft
      const draft = student.drafts.find(d => d.type === type && d.status === "completed");
      if (!draft) {
        return NextResponse.json({ error: "No completed evaluation or reconciliation found for this student" }, { status: 404 });
      }
      evaluation = draft as any;
    }

    // 3. Generate PDF
    const pdfBytes = await generateEvaluationPdf({
      student: student.student,
      evaluation: evaluation
    });

    // 4. Return PDF response
    const filename = `${student.student.name.replace(/\s+/g, "_")}_${type}_evaluation.pdf`;
    return new NextResponse(pdfBytes as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: `PDF generation failed: ${error.message}` }, { status: 500 });
  }
}
