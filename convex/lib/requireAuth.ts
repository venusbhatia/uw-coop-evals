import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ensureUser, getUserRole, type UserRole } from "../users";

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

export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<{ email: string; role: UserRole }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const email = resolveEvaluatorEmail(identity);
  if (!email.includes("@")) {
    throw new Error("Forbidden");
  }

  const role = await getUserRole(ctx, email);
  return { email, role };
}

export async function requireAuthMutation(
  ctx: MutationCtx,
): Promise<{ email: string; role: UserRole }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const email = resolveEvaluatorEmail(identity);
  if (!email.includes("@")) {
    throw new Error("Forbidden");
  }

  const role = await ensureUser(ctx, email);
  return { email, role };
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowed: UserRole[],
): Promise<{ email: string; role: UserRole }> {
  const auth = await requireAuth(ctx);
  if (!allowed.includes(auth.role)) {
    throw new Error("Forbidden: insufficient role");
  }
  return auth;
}

export async function requireSeedDemoAuth(ctx: MutationCtx): Promise<{ email: string }> {
  const allow =
    process.env.ALLOW_SEED_DEMO === "true" || process.env.ALLOW_SEED_DEMO === "1";
  if (!allow) {
    throw new Error("Demo seed is disabled. Set ALLOW_SEED_DEMO=true to enable.");
  }
  const auth = await requireAuthMutation(ctx);
  return { email: auth.email };
}
