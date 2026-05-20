import { NextResponse } from "next/server";
import { convexTokenForSession, requireApiSession, isSessionPayload } from "@/lib/apiAuth";

export async function GET(request: Request) {
  const sessionOrResponse = await requireApiSession(request);
  if (!isSessionPayload(sessionOrResponse)) {
    return sessionOrResponse;
  }

  try {
    const token = await convexTokenForSession(sessionOrResponse);
    return NextResponse.json({ token });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Token error";
    return NextResponse.json({ error: msg, code: "TOKEN_ERROR" }, { status: 503 });
  }
}
