import type { MutationCtx, QueryCtx } from "../_generated/server";

export function resolveEvaluatorEmail(identity: {
  email?: string | null;
  subject?: string | null;
  tokenIdentifier?: string | null;
}): string {
  let raw =
    (typeof identity.email === "string" && identity.email) ||
    (typeof identity.subject === "string" && identity.subject) ||
    identity.tokenIdentifier ||
    "";

  if (raw.includes("|")) {
    raw = raw.split("|").pop() ?? raw;
  }

  return raw.trim().toLowerCase();
}

export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<{ email: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const email = resolveEvaluatorEmail(identity);
  if (!email.endsWith("@8090.inc")) {
    throw new Error("Forbidden");
  }

  return { email };
}

/** Any signed-in @8090.inc user may reload demo data. */
export async function requireSeedDemoAuth(ctx: MutationCtx): Promise<{ email: string }> {
  return requireAuth(ctx);
}
