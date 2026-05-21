"use client";

import { ReactNode } from "react";
import { useConvexAuth } from "convex/react";

export function ConvexAuthGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) {
    return (
      fallback ?? (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-[14px] text-[var(--muted)]">Connecting…</p>
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return (
      fallback ?? (
        <div className="min-h-screen flex items-center justify-center px-6 text-center">
          <p className="text-[14px] text-[var(--muted)] max-w-sm">
            Your sign-in could not connect to the database. This usually clears after signing in
            again.{" "}
            <a href="/onboarding" className="underline">
              Sign in again
            </a>
          </p>
        </div>
      )
    );
  }

  return children;
}
