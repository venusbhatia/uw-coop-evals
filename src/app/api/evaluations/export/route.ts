import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "Missing 'name' query parameter" }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_CONVEX_URL is not configured" }, { status: 500 });
  }

  try {
    const client = new ConvexHttpClient(convexUrl);
    const data = await client.query(api.evaluations.getCompletedForExport, { name });

    if (!data) {
      const errorResponse = NextResponse.json({ error: `No completed evaluation found for student: ${name}` }, { status: 404 });
      errorResponse.headers.set("Access-Control-Allow-Origin", "*");
      return errorResponse;
    }

    const response = NextResponse.json(data);
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    return response;
  } catch (error: any) {
    const errorResponse = NextResponse.json({ error: `Failed to query Convex database: ${error.message}` }, { status: 500 });
    errorResponse.headers.set("Access-Control-Allow-Origin", "*");
    return errorResponse;
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

