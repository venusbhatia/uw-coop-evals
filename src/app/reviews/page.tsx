"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { EvalFormWizard } from "@/components/evaluation/EvalFormWizard";
import { fetchServerSessionEmail } from "@/lib/evaluatorApi";

export default function ReviewsPage() {
  const router = useRouter();
  const me = useQuery(api.users.getMe);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"midterm" | "final">("midterm");
  const [comments, setComments] = useState("");
  const [actionError, setActionError] = useState("");
  const [acting, setActing] = useState(false);

  const role = me?.role ?? "supervisor";
  const queue = useQuery(
    api.evaluations.listReviewQueue,
    me && (role === "hr" || role === "vp") ? { role } : "skip",
  );

  const hrReview = useMutation(api.evaluations.hrReview);
  const vpReview = useMutation(api.evaluations.vpReview);

  useEffect(() => {
    void (async () => {
      const email = await fetchServerSessionEmail();
      if (!email) router.replace("/onboarding");
      else setReady(true);
    })();
  }, [router]);

  const selected = queue?.find(
    (item) => item.student._id === selectedId && item.submission.type === selectedType,
  );

  const handleDecision = async (decision: "approved" | "returned") => {
    if (!selected) return;
    setActing(true);
    setActionError("");
    try {
      if (role === "hr") {
        await hrReview({
          studentId: selected.student._id,
          type: selected.submission.type,
          decision,
          comments,
        });
      } else if (role === "vp") {
        await vpReview({
          studentId: selected.student._id,
          type: selected.submission.type,
          decision,
          comments,
        });
      }
      setComments("");
      setSelectedId(null);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setActing(false);
    }
  };

  if (!ready || me === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  if (role !== "hr" && role !== "vp") {
    return (
      <div className="min-h-screen p-8 max-w-lg mx-auto">
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          Review queue is for HR and VP accounts. In the demo, sign in as{" "}
          <span className="font-medium">demo-hr@evals.com</span> or{" "}
          <span className="font-medium">demo-vp@evals.com</span> on the onboarding page.
        </p>
        <Link href="/" className="text-sm underline mt-4 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-[var(--muted)] hover:text-[var(--foreground)]">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold">
            {role === "vp" ? "VP" : "HR"} review queue
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Read the full evaluation before approving or returning for revision.
          </p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)]">
        <aside className="lg:w-80 border-b lg:border-b-0 lg:border-r border-[var(--border)] p-4 space-y-2">
          {(queue ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No evaluations waiting.</p>
          ) : (
            queue?.map((item) => (
              <button
                key={`${item.student._id}-${item.submission.type}`}
                type="button"
                onClick={() => {
                  setSelectedId(item.student._id);
                  setSelectedType(item.submission.type as "midterm" | "final");
                }}
                className={`w-full text-left p-3 rounded-xl border text-sm ${
                  selectedId === item.student._id &&
                  selectedType === item.submission.type
                    ? "border-[var(--foreground)] bg-[var(--surface)]"
                    : "border-[var(--border)]"
                }`}
              >
                <p className="font-medium">{item.student.name}</p>
                <p className="text-[var(--muted)] capitalize">
                  {item.submission.type} · {item.student.term} {item.student.year}
                </p>
              </button>
            ))
          )}
        </aside>

        <main className="flex-1 p-6 overflow-y-auto">
          {!selected ? (
            <p className="text-sm text-[var(--muted)]">Select an evaluation to review.</p>
          ) : (
            <div className="max-w-3xl space-y-6">
              <EvalFormWizard
                studentId={selected.student._id}
                evalType={selectedType}
                initialData={selected.submission}
                readOnly
              />
              <div className="border-t border-[var(--border)] pt-6 space-y-3">
                <label className="text-sm font-medium" htmlFor="review-comments">
                  Review comments
                </label>
                <textarea
                  id="review-comments"
                  className="w-full min-h-[100px] rounded-xl border border-[var(--border)] p-3 text-sm"
                  placeholder="Feedback for the supervisor (required when returning)…"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                />
                {actionError && (
                  <p className="text-sm text-red-600">{actionError}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => void handleDecision("approved")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--foreground)] text-[var(--background)] text-sm"
                  >
                    <Check className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={acting || !comments.trim()}
                    onClick={() => void handleDecision("returned")}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Return for revision
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
