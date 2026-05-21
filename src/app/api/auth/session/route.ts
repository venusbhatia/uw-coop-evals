import { NextResponse } from "next/server";
import { isValidSignInEmail } from "@/lib/evaluatorSession";
import {
  createSessionToken,
  getSessionFromCookieStore,
  sessionCookieOptions,
  verifySessionToken,
} from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/sessionConstants";

export async function GET() {
  try {
    const session = await getSessionFromCookieStore();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({ authenticated: true, email: session.email });
  } catch {
    return NextResponse.json(
      { error: "Session not configured.", code: "SESSION_MISCONFIGURED" },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim() ?? "";

    if (!isValidSignInEmail(email)) {
      return NextResponse.json(
        { error: "Invalid work email.", code: "INVALID_EMAIL" },
        { status: 400 },
      );
    }

    const token = await createSessionToken(email);
    const response = NextResponse.json({ ok: true, email: email.toLowerCase() });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Session error";
    const status = msg.includes("SESSION_SECRET") ? 503 : 500;
    return NextResponse.json({ error: msg, code: "SESSION_ERROR" }, { status });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
