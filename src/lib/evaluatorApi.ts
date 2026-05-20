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
}

export async function destroyServerSession(): Promise<void> {
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "include",
  });
}

export async function fetchServerSessionEmail(): Promise<string | null> {
  const res = await fetch("/api/auth/session", {
    credentials: "include",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string; authenticated?: boolean };
  return data.authenticated && data.email ? data.email : null;
}
