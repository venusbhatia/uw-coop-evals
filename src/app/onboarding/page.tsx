"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import {
  build8090Email,
  DEMO_EVALUATOR_EMAIL,
  EMAIL_DOMAIN,
  getEvaluatorEmail,
  isValid8090Username,
  MAX_USERNAME_LENGTH,
  sanitize8090Username,
  setEvaluatorEmail,
} from "@/lib/evaluatorSession";

const USERNAME_PLACEHOLDER = "username";
const USERNAME_FIELD_CH = Math.max(USERNAME_PLACEHOLDER.length, 8);

export default function OnboardingPage() {
  const router = useRouter();
  const seedDemo = useMutation(api.students.seedDemo);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loadingDemo, setLoadingDemo] = useState(false);

  useEffect(() => {
    if (getEvaluatorEmail()) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid8090Username(username)) {
      setError("Enter a username (max 25 characters, . allowed)");
      return;
    }
    setEvaluatorEmail(build8090Email(username));
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
              htmlFor="work-email-username"
              className="text-[12px] text-[var(--muted)] uppercase tracking-wide"
            >
              Work email
            </label>
            <div className="inline-flex items-center mt-1.5 max-w-full rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 py-3 focus-within:border-[var(--foreground)] transition-colors">
              <input
                id="work-email-username"
                type="text"
                autoComplete="username"
                inputMode="email"
                placeholder={USERNAME_PLACEHOLDER}
                value={username}
                maxLength={MAX_USERNAME_LENGTH}
                onChange={(e) => {
                  setUsername(sanitize8090Username(e.target.value));
                  setError("");
                }}
                className="p-0 text-[16px] leading-none bg-transparent border-0 outline-none text-[var(--foreground)]"
                style={{
                  width: `${Math.max(username.length || USERNAME_FIELD_CH, USERNAME_FIELD_CH)}ch`,
                  minWidth: `${USERNAME_FIELD_CH}ch`,
                  maxWidth: `${MAX_USERNAME_LENGTH}ch`,
                }}
                required
              />
              <span className="text-[16px] leading-none text-[var(--foreground)] select-none -ml-px">
                {EMAIL_DOMAIN}
              </span>
            </div>
            <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">
              Use your 8090 work email.
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
        </div>
      </div>
    </div>
  );
}
