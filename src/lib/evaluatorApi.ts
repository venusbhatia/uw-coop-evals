import { notifySessionUpdated } from "@/lib/sessionEvents";

export async function createServerSession(email: string): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
    credentials: "include",
  });

  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Could not start session.");
  }

  notifySessionUpdated();
}

/** Wait until Convex client can use the httpOnly session (after sign-in). */
export async function waitForConvexAuth(maxAttempts = 40): Promise<void> {
  notifySessionUpdated();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch("/api/auth/convex-token", { credentials: "include" });
    if (res.ok) {
      notifySessionUpdated();
      await new Promise((resolve) => setTimeout(resolve, 80));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Could not connect your session to the database. Try again.");
}

export async function destroyServerSession(): Promise<void> {
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
  });
  notifySessionUpdated();
}

export async function fetchServerSessionEmail(): Promise<string | null> {
  const res = await fetch("/api/auth/session", {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string; authenticated?: boolean };
  return data.authenticated && data.email ? data.email : null;
}
