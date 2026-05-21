"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { EvalFormWizard } from "@/components/evaluation/EvalFormWizard";
import { fetchServerSessionEmail } from "@/lib/evaluatorApi";
import { canEditForm } from "@/lib/workflowLabels";

export default function EvalFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const evalType = (searchParams.get("type") === "final" ? "final" : "midterm") as
    | "midterm"
    | "final";

  const studentData = useQuery(api.students.get, { studentId: id as Id<"students"> });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const email = await fetchServerSessionEmail();
      if (!email) router.replace("/onboarding");
      else setReady(true);
    })();
  }, [router]);

  if (!ready || studentData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="min-h-screen p-8">
        <p>Student not found.</p>
        <Link href="/" className="text-sm underline mt-4 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const { student, reconciled } = studentData;
  const submission = reconciled.find((r) => r.type === evalType);
  const status = evalType === "midterm" ? student.midtermStatus : student.finalStatus;
  const editable = canEditForm(status, submission?.workflowStatus);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] px-6 py-4">
        <Link
          href={`/student/${id}`}
          className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {student.name}
        </Link>
        <h1 className="text-xl font-semibold mt-2">
          {evalType === "midterm" ? "Midterm" : "Final"} evaluation — {student.name}
        </h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Complete each section thoughtfully. Save your draft anytime before submitting to HR.
        </p>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-8">
        <EvalFormWizard
          studentId={student._id}
          evalType={evalType}
          initialData={submission ?? undefined}
          readOnly={!editable}
          onSubmitted={() => router.push(`/student/${id}`)}
        />
      </main>
    </div>
  );
}
