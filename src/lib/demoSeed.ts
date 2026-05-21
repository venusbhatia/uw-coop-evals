/** Whether demo roster seeding is allowed (Next.js API + Convex mutation). */
export function isDemoSeedEnabled(): boolean {
  const raw = process.env.ALLOW_SEED_DEMO?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export const DEMO_SEED_DISABLED_MESSAGE =
  "Demo data is not available on this server. Contact your administrator.";
