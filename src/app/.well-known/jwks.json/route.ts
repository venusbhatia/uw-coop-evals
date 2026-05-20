import { NextResponse } from "next/server";
import { getJwksJson } from "@/lib/jwtKeys";

export async function GET() {
  try {
    const jwks = getJwksJson();
    return new NextResponse(jwks, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "JWKS not configured" }, { status: 503 });
  }
}
