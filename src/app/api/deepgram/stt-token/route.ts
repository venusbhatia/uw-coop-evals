import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.DEEPGRAM_API_KEY;

  if (!apiKey?.trim() || apiKey === "your_deepgram_api_key_here") {
    return NextResponse.json(
      {
        error:
          "DEEPGRAM_API_KEY is not configured. Add it to .env.local for voice input.",
        enabled: false,
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch("https://api.deepgram.com/v1/auth/grant", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: 3600 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (
        response.status === 403 ||
        errorText.includes("FORBIDDEN") ||
        errorText.includes("Insufficient permissions")
      ) {
        return NextResponse.json({ token: apiKey, enabled: true });
      }
      return NextResponse.json(
        { error: `Deepgram token failed: ${errorText}`, enabled: false },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json({
      token: data.access_token,
      enabled: true,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal server error: ${msg}`, enabled: false },
      { status: 500 },
    );
  }
}
