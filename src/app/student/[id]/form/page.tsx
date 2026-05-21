"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Id } from "convex/_generated/dataModel";
import { EvalFormWizard } from "@/components/evaluation/EvalFormWizard";
import { ConvexAuthGate } from "@/components/ConvexAuthGate";
import { fetchServerSessionEmail } from "@/lib/evaluatorApi";
import { resolveFormInitialData } from "@/lib/evaluationPayload";
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
  const me = useQuery(api.users.getMe);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const email = await fetchServerSessionEmail();
      if (!email) router.replace("/onboarding");
      else {
        setSessionEmail(email);
        setReady(true);
      }
    })();
  }, [router]);

  if (!ready || studentData === undefined || me === undefined) {
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

  const { student, drafts, reconciled } = studentData;
  const { initialData, source } = resolveFormInitialData({
    reconciled,
    drafts,
    evalType,
    evaluatorEmail: sessionEmail,
  });
  const submission = reconciled.find((r) => r.type === evalType);
  const status = evalType === "midterm" ? student.midtermStatus : student.finalStatus;
  const editable = canEditForm(status, submission?.workflowStatus);
  const isSupervisor = me?.role === "supervisor";

  const subtitle =
    source === "evaluator_draft"
      ? "Review and edit your AI draft below, then save or submit to HR."
      : source === "reconciled"
        ? "Review your saved draft, then submit to HR when ready."
        : "Complete each section thoughtfully. Save your draft anytime before submitting to HR.";

  return (
    <ConvexAuthGate>
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
          <p className="text-sm text-[var(--muted)] mt-1">{subtitle}</p>
        </header>

        {!isSupervisor ? (
          <main className="max-w-3xl mx-auto px-6 py-12">
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              This form is for supervisor accounts. You are signed in as{" "}
              <span className="font-medium">{me?.email ?? sessionEmail}</span> (
              {me?.role ?? "unknown"}).
            </p>
            <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">
              Sign in with a supervisor email on{" "}
              <Link href="/onboarding" className="underline">
                onboarding
              </Link>
              , or open the{" "}
              <Link href="/reviews" className="underline">
                HR/VP review queue
              </Link>
              .
            </p>
          </main>
        ) : (
          <main className="max-w-3xl mx-auto px-6 py-8">
            {source === "evaluator_draft" && (
              <p className="text-sm text-green-800 dark:text-green-300 bg-green-50 dark:bg-green-950/30 rounded-xl p-3 mb-6">
                Loaded from your AI draft — review each step, then save or submit to HR.
              </p>
            )}
            <EvalFormWizard
              studentId={student._id}
              evalType={evalType}
              initialData={initialData}
              readOnly={!editable}
              onSubmitted={() => router.push(`/student/${id}`)}
            />
          </main>
        )}
      </div>
    </ConvexAuthGate>
  );
}
