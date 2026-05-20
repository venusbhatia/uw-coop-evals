"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import {
  DEMO_EVALUATOR_EMAIL,
  getEvaluatorEmail,
  isValid8090Email,
  setEvaluatorEmail,
} from "@/lib/evaluatorSession";

export default function OnboardingPage() {
  const router = useRouter();
  const seedDemo = useMutation(api.students.seedDemo);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loadingDemo, setLoadingDemo] = useState(false);

  useEffect(() => {
    if (getEvaluatorEmail()) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValid8090Email(trimmed)) {
      setError("Enter your 8090 work email ending with @8090.inc");
      return;
    }
    setEvaluatorEmail(trimmed);
    router.replace("/");
  };

  const handleSeeDemo = async () => {
    setError("");
    setLoadingDemo(true);
    try {
      setEvaluatorEmail(DEMO_EVALUATOR_EMAIL);
      await seedDemo();
      router.replace("/");
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Could not load demo data. Is the app connected to Convex?";
      setError(msg);
      setLoadingDemo(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-[28px] font-semibold tracking-tight">Employee Evals</h1>
        <p className="text-[15px] text-[var(--muted)] mt-2 leading-relaxed">
          Simple performance evaluations for your team.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-4">
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
              Use your 8090 work email — it must end with{" "}
              <span className="text-[var(--foreground)]">@8090.inc</span>
            </p>
          </div>

          {error && (
            <p className="text-[14px] text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loadingDemo}
            className="btn-primary w-full py-3 text-[15px] disabled:opacity-40"
          >
            Continue
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={() => void handleSeeDemo()}
            disabled={loadingDemo}
            className="btn-secondary w-full py-3 text-[15px] disabled:opacity-40"
          >
            {loadingDemo ? "Loading demo…" : "See demo"}
          </button>
          <p className="text-[12px] text-[var(--muted)] mt-2 text-center leading-relaxed">
            Loads 20 sample students — no email required.
          </p>
        </div>
      </div>
    </div>
  );
}
