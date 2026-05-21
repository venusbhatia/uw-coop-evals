export function isDemoSeedEnabled(): boolean {
  const raw = process.env.ALLOW_SEED_DEMO?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
