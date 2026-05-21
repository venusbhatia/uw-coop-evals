import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { convexTokenForExtension, requireExtensionKey } from "@/lib/apiAuth";

const ALLOWED_EXTENSION_ORIGINS = [
  "chrome-extension://",
  "https://employee-evals.vercel.app",
  "http://localhost:8090",
];

function corsOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (ALLOWED_EXTENSION_ORIGINS.some((allowed) => origin.startsWith(allowed))) {
    return origin;
  }
  return null;
}

function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = corsOrigin(request);
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Extension-Key",
  );
  return response;
}

export async function GET(request: NextRequest) {
  if (!requireExtensionKey(request)) {
    return withCors(
      request,
      NextResponse.json(
        { error: "Unauthorized", code: "EXTENSION_KEY_REQUIRED" },
        { status: 401 },
      ),
    );
  }

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const studentId = searchParams.get("studentId");

  if (!name?.trim() && !studentId?.trim()) {
    return withCors(
      request,
      NextResponse.json(
        { error: "Missing 'name' or 'studentId' query parameter" },
        { status: 400 },
      ),
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return withCors(
      request,
      NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 }),
    );
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const token = await convexTokenForExtension();
    client.setAuth(token);
    const data = await client.query(api.evaluations.getCompletedForExport, {
      name: name?.trim() || undefined,
      studentId: studentId?.trim() ? (studentId as import("convex/_generated/dataModel").Id<"students">) : undefined,
    });

    if (!data) {
      return withCors(
        request,
        NextResponse.json(
          { error: `No completed evaluation found for student: ${name}` },
          { status: 404 },
        ),
      );
    }

    return withCors(request, NextResponse.json(data));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return withCors(
      request,
      NextResponse.json({ error: `Failed to query database: ${msg}` }, { status: 500 }),
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return withCors(request, new NextResponse(null, { status: 204 }));
}
