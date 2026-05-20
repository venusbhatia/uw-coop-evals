import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import {
  convexTokenForSession,
  isSessionPayload,
  requireApiSession,
} from "@/lib/apiAuth";

export async function POST(request: Request) {
  const sessionOrResponse = await requireApiSession(request);
  if (!isSessionPayload(sessionOrResponse)) {
    return sessionOrResponse;
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_CONVEX_URL is not configured." },
      { status: 500 },
    );
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const token = await convexTokenForSession(sessionOrResponse);
    client.setAuth(token);
    await client.mutation(api.students.seedDemo, {});
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Seed failed.";
    return NextResponse.json({ error: msg, code: "SEED_FAILED" }, { status: 500 });
  }
}
