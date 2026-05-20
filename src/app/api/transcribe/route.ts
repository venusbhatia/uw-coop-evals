import { NextResponse } from "next/server";
import { isSessionPayload, requireApiSession } from "@/lib/apiAuth";

const DEEPGRAM_LISTEN_URL = "https://api.deepgram.com/v1/listen";
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

function jsonError(code: string, message: string, status: number) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  const sessionOrResponse = await requireApiSession(request);
  if (!isSessionPayload(sessionOrResponse)) {
    return sessionOrResponse;
  }

  const apiKey = process.env.DEEPGRAM_API_KEY?.trim();

  if (!apiKey || apiKey === "your_deepgram_api_key_here") {
    return jsonError(
      "DEEPGRAM_API_KEY_MISSING",
      "DEEPGRAM_API_KEY is not configured. Add it to .env.local for voice input.",
      500,
    );
  }

  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const size = Number.parseInt(contentLength, 10);
      if (Number.isFinite(size) && size > MAX_AUDIO_BYTES) {
        return jsonError("AUDIO_TOO_LARGE", "Audio file is too large (max 5 MB).", 413);
      }
    }

    const formData = await request.formData();
    const audio = formData.get("audio");

    if (audio === null) {
      return jsonError("MISSING_AUDIO", "Missing audio field.", 400);
    }

    if (!(audio instanceof Blob) || audio.size === 0) {
      return jsonError("INVALID_AUDIO_PAYLOAD", "Invalid or empty audio.", 400);
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return jsonError("AUDIO_TOO_LARGE", "Audio file is too large (max 5 MB).", 413);
    }

    const mime = audio.type || "audio/webm";
    if (!mime.startsWith("audio/")) {
      return jsonError("INVALID_AUDIO_TYPE", "Unsupported audio type.", 400);
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
        "Content-Type": mime,
      },
      body: audio,
    });

    if (!upstream.ok) {
      console.error("Deepgram upstream error:", upstream.status);
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
