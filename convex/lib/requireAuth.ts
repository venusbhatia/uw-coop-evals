import type { MutationCtx, QueryCtx } from "../_generated/server";

const DEMO_EMAIL = "demo@8090.inc";

export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<{ email: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const raw =
    (typeof identity.email === "string" && identity.email) ||
    (typeof identity.subject === "string" && identity.subject) ||
    identity.tokenIdentifier ||
    "";

  const email = raw.trim().toLowerCase();
  if (!email.endsWith("@8090.inc")) {
    throw new Error("Forbidden");
  }

  return { email };
}

export async function requireSeedDemoAuth(
  ctx: MutationCtx,
): Promise<{ email: string }> {
  const { email } = await requireAuth(ctx);
  const allowAll = process.env.ALLOW_SEED_DEMO === "true";
  const isDemo = email === DEMO_EMAIL;

  if (!allowAll && !isDemo) {
    throw new Error("Demo seed is only available for the demo account.");
  }

  return { email };
}
