import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  rateLimitJsonResponse,
  routeToRateLimitGroup,
} from "@/lib/rateLimit";
import { verifySessionToken } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/sessionConstants";

const PUBLIC_API_PREFIXES = ["/api/auth/session", "/api/auth/convex-token"];

function isPublicApi(pathname: string, method: string): boolean {
  if (pathname === "/api/auth/session") {
    return method === "GET" || method === "POST" || method === "OPTIONS";
  }
  if (pathname === "/api/evaluations/export") {
    return true;
  }
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function requiresSession(pathname: string): boolean {
  if (pathname.startsWith("/api/evaluation/")) return true;
  if (pathname === "/api/transcribe") return true;
  if (pathname === "/api/seed-demo") return true;
  if (pathname.startsWith("/api/evaluations/") && pathname !== "/api/evaluations/export") {
    return true;
  }
  if (pathname === "/api/auth/convex-token") return true;
  return false;
}

function readSessionToken(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const rateGroup = routeToRateLimitGroup(pathname);
  if (rateGroup) {
    const rate = await checkRateLimit(request, rateGroup);
    if (!rate.allowed) {
      return rateLimitJsonResponse(rate.retryAfterSeconds);
    }
  }

  if (isPublicApi(pathname, request.method)) {
    return NextResponse.next();
  }

  if (!requiresSession(pathname)) {
    return NextResponse.next();
  }

  const token = readSessionToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Session not configured.", code: "SESSION_MISCONFIGURED" },
      { status: 503 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
