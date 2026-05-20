"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
      <h1 className="text-[22px] font-semibold">Something went wrong</h1>
      <p className="text-[14px] text-[var(--muted)] max-w-md leading-relaxed">
        {error.message || "The app hit an unexpected error."}
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={() => reset()} className="btn-primary px-5 py-2.5 text-[14px]">
          Reload
        </button>
        <a href="/onboarding" className="btn-secondary px-5 py-2.5 text-[14px]">
          Sign in again
        </a>
      </div>
    </div>
  );
}
