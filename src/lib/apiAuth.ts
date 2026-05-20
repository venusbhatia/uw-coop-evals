import { NextResponse } from "next/server";
import {
  createConvexToken,
  getSessionFromRequest,
  type SessionPayload,
} from "@/lib/session";
import { EXTENSION_SERVICE_EMAIL } from "@/lib/sessionConstants";

export async function requireApiSession(
  request: Request,
): Promise<SessionPayload | NextResponse> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  return session;
}

export function isSessionPayload(
  value: SessionPayload | NextResponse,
): value is SessionPayload {
  return "email" in value && !(value instanceof NextResponse);
}

export async function convexTokenForSession(
  session: SessionPayload,
): Promise<string> {
  return createConvexToken(session.email);
}

export async function convexTokenForExtension(): Promise<string> {
  return createConvexToken(EXTENSION_SERVICE_EMAIL);
}

export function requireExtensionKey(request: Request): boolean {
  const expected = process.env.EXTENSION_API_KEY?.trim();
  if (!expected) return false;
  const provided = request.headers.get("x-extension-key")?.trim();
  return provided === expected;
}
