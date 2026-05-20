export async function runSeedDemo(): Promise<void> {
  const res = await fetch("/api/seed-demo", {
    method: "POST",
    credentials: "include",
  });

  const data = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Could not load demo data.");
  }
}
