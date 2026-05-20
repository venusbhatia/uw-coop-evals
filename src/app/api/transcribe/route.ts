import { NextResponse } from "next/server";

const DEEPGRAM_LISTEN_URL = "https://api.deepgram.com/v1/listen";

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();

  if (!apiKey || apiKey === "your_deepgram_api_key_here") {
    return jsonError(
      "DEEPGRAM_API_KEY_MISSING",
      "DEEPGRAM_API_KEY is not configured. Add it to .env.local for voice input.",
      500,
    );
  }

  try {
    const formData = await request.formData();
    const audio = formData.get("audio");

    if (audio === null) {
      return jsonError("MISSING_AUDIO", "Missing audio field.", 400);
    }

    if (!(audio instanceof Blob) || audio.size === 0) {
      return jsonError("INVALID_AUDIO_PAYLOAD", "Invalid or empty audio.", 400);
    }

    const params = new URLSearchParams({
      model: "nova-3",
      language: "en",
      smart_format: "true",
      punctuate: "true",
    });

    const upstream = await fetch(`${DEEPGRAM_LISTEN_URL}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": audio.type || "audio/webm",
      },
      body: audio,
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("Deepgram upstream error:", upstream.status, detail);
      return jsonError(
        "DEEPGRAM_UPSTREAM_ERROR",
        "Transcription service failed. Try again.",
        500,
      );
    }

    const data = (await upstream.json()) as {
      results?: {
        channels?: Array<{
          alternatives?: Array<{ transcript?: string }>;
        }>;
      };
    };

    const transcript =
      data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";

    return NextResponse.json({ transcript });
  } catch (error: unknown) {
    console.error("Transcribe error:", error);
    return jsonError(
      "TRANSCRIBE_UNEXPECTED",
      "Unexpected error during transcription.",
      500,
    );
  }
}
