import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { resolveEvaluatorEmail } from "./lib/requireAuth";

export type UserRole = "supervisor" | "hr" | "vp";

function parseEmailList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveRoleFromEnv(email: string): UserRole {
  const normalized = email.trim().toLowerCase();
  const vpEmails = parseEmailList(process.env.VP_REVIEWER_EMAILS);
  const hrEmails = parseEmailList(process.env.HR_REVIEWER_EMAILS);
  if (vpEmails.includes(normalized)) return "vp";
  if (hrEmails.includes(normalized)) return "hr";
  return "supervisor";
}

export async function getUserRole(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<UserRole> {
  const envRole = resolveRoleFromEnv(email);
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();
  if (existing) {
    return existing.role as UserRole;
  }
  return envRole;
}

export async function ensureUser(
  ctx: MutationCtx,
  email: string,
): Promise<UserRole> {
  const envRole = resolveRoleFromEnv(email);
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .unique();

  if (existing) {
    if (existing.role !== envRole) {
      await ctx.db.patch(existing._id, { role: envRole });
    }
    return envRole;
  }

  await ctx.db.insert("users", { email, role: envRole });
  return envRole;
}

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const email = resolveEvaluatorEmail(identity);
    const role = await getUserRole(ctx, email);
    return { email, role };
  },
});

export const syncRole = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    const email = resolveEvaluatorEmail(identity);
    if (!email.endsWith("@8090.inc")) throw new Error("Forbidden");
    const role = await ensureUser(ctx, email);
    return { email, role };
  },
});
