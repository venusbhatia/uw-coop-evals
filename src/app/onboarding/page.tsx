"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DEMO_EVALUATOR_EMAIL,
  isValid8090Email,
  setEvaluatorEmail,
} from "@/lib/evaluatorSession";
import {
  createServerSession,
  fetchServerSessionEmail,
  waitForConvexAuth,
} from "@/lib/evaluatorApi";
import { runSeedDemo } from "@/lib/seedDemo";

function isSafeReturnTo(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToParam = searchParams.get("returnTo")?.trim() ?? "";
  const returnTo = isSafeReturnTo(returnToParam) ? returnToParam : "/";

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const serverEmail = await fetchServerSessionEmail();
        if (serverEmail) {
          router.replace(returnTo);
        }
      } catch {
        /* stay on onboarding */
      }
    })();
  }, [router, returnTo]);

  const signIn = async (signedInEmail: string) => {
    await createServerSession(signedInEmail);
    setEvaluatorEmail(signedInEmail);
    await waitForConvexAuth();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValid8090Email(trimmed)) {
      setError("Enter your 8090 work email ending with @8090.inc");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signIn(trimmed);
      router.replace(returnTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setLoading(false);
    }
  };

  const handleSeeDemo = async () => {
    setError("");
    setLoadingDemo(true);
    try {
      await signIn(DEMO_EVALUATOR_EMAIL);
      await runSeedDemo();
      router.replace(returnTo);
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Could not load demo data. Is the app connected to Convex?";
      setError(msg);
      setLoadingDemo(false);
    }
  };

  const busy = loading || loadingDemo;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-[28px] font-semibold tracking-tight">Employee Evals</h1>
        <p className="text-[15px] text-[var(--muted)] mt-2 leading-relaxed">
          Simple performance evaluations for your team.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-10 space-y-4">
          <div>
            <label
              htmlFor="work-email"
              className="text-[12px] text-[var(--muted)] uppercase tracking-wide"
            >
              Work email
            </label>
            <input
              id="work-email"
              type="email"
              autoComplete="email"
              placeholder="you@8090.inc"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              className="input-field w-full mt-1.5 px-4 py-3 text-[16px]"
              required
            />
            <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">
              Use your 8090 work email.
            </p>
          </div>

          {error && (
            <p className="text-[14px] text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full py-3 text-[15px] disabled:opacity-40"
          >
            {loading ? "Signing in…" : "Continue"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => void handleSeeDemo()}
            disabled={busy}
            className="btn-secondary w-full py-3 text-[15px] disabled:opacity-40"
          >
            {loadingDemo ? "Loading demo…" : "See demo"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[14px] text-[var(--muted)]">Loading…</p>
        </div>
      }
    >
      <OnboardingForm />
    </Suspense>
  );
}
