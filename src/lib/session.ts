import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { getSigningKey, getVerificationJwks } from "@/lib/jwtKeys";
import {
  CONVEX_TOKEN_MAX_AGE_SECONDS,
  SESSION_APPLICATION_ID,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  sessionIssuer,
} from "@/lib/sessionConstants";
import { isValid8090Email } from "@/lib/evaluatorSession";

export type SessionPayload = {
  email: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function createSessionToken(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!isValid8090Email(normalized)) {
    throw new Error("Invalid evaluator email.");
  }

  const key = await getSigningKey();
  return new SignJWT({ email: normalized })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setSubject(normalized)
    .setIssuedAt()
    .setIssuer(sessionIssuer())
    .setAudience(SESSION_APPLICATION_ID)
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(key);
}

export async function createConvexToken(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!isValid8090Email(normalized)) {
    throw new Error("Invalid evaluator email.");
  }

  const key = await getSigningKey();
  return new SignJWT({ email: normalized })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setSubject(normalized)
    .setIssuedAt()
    .setIssuer(sessionIssuer())
    .setAudience(SESSION_APPLICATION_ID)
    .setExpirationTime(`${CONVEX_TOKEN_MAX_AGE_SECONDS}s`)
    .sign(key);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const jwks = await getVerificationJwks();
    const { payload } = await jwtVerify(token, jwks, {
      issuer: sessionIssuer(),
      audience: SESSION_APPLICATION_ID,
    });
    const email = extractEmail(payload);
    if (!email || !isValid8090Email(email)) return null;
    return { email: normalizeEmail(email) };
  } catch {
    return null;
  }
}

function extractEmail(payload: JWTPayload): string | null {
  if (typeof payload.email === "string" && payload.email.trim()) {
    return payload.email;
  }
  if (typeof payload.sub === "string" && payload.sub.trim()) {
    return payload.sub;
  }
  return null;
}

export async function getSessionFromCookieStore(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export function getSessionFromRequest(request: Request): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return Promise.resolve(null);

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!match) return Promise.resolve(null);
  const token = decodeURIComponent(match.slice(SESSION_COOKIE_NAME.length + 1));
  return verifySessionToken(token);
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE_SECONDS) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
