"use client";

import { useCallback, useRef, useState } from "react";

const MIN_BLOB_BYTES = 1000;

function pickMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined;
}

function mergeSeedAndTranscript(seed: string, transcript: string): string {
  const base = seed.trim();
  const part = transcript.trim();
  if (base && part) return `${base} ${part}`;
  return base || part;
}

function mapTranscribeError(status: number, body: { code?: string; error?: string }): string {
  const code = body.code ?? "";
  const msg = body.error ?? "Transcription failed.";

  if (code === "DEEPGRAM_API_KEY_MISSING") {
    return "Voice input is not configured on the server.";
  }
  if (code === "MISSING_AUDIO" || code === "INVALID_AUDIO_PAYLOAD") {
    return "Could not send audio. Try recording again.";
  }
  if (code === "RATE_LIMITED") {
    return "Too many voice requests. Wait a minute and try again.";
  }
  if (status === 401) return "Session expired. Refresh the page.";
  if (status === 403) return "You do not have permission to transcribe.";
  if (status === 429) return "Too many voice requests. Wait a minute and try again.";
  return msg;
}

export interface UseSpeechToTextReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  transcript: string;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: (seedText?: string) => Promise<string>;
  cancelRecording: () => void;
  reset: () => void;
}

export function useSpeechToText(): UseSpeechToTextReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopMedia = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* already stopped */
      }
    }
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    chunksRef.current = [];
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.onstop = null;
      stopMedia();
    } else {
      stopMedia();
    }
    setIsRecording(false);
    setIsTranscribing(false);
  }, [stopMedia]);

  const reset = useCallback(() => {
    cancelRecording();
    setTranscript("");
    setError(null);
  }, [cancelRecording]);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript("");
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(250);
      setIsRecording(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not access microphone.";
      setError(msg);
      stopMedia();
      setIsRecording(false);
    }
  }, [stopMedia]);

  const stopRecording = useCallback(
    async (seedText = ""): Promise<string> => {
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state !== "recording") {
        setIsRecording(false);
        return mergeSeedAndTranscript(seedText, transcript);
      }

      setIsRecording(false);

      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const mime = recorder.mimeType || "audio/webm";
          resolve(new Blob(chunksRef.current, { type: mime }));
        };
        recorder.onerror = () => reject(new Error("Recording failed."));
        recorder.stop();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
      });

      chunksRef.current = [];

      if (blob.size < MIN_BLOB_BYTES) {
        const msg = "Recording too short. Hold the mic a bit longer.";
        setError(msg);
        return mergeSeedAndTranscript(seedText, "");
      }

      setIsTranscribing(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const data = (await res.json()) as {
          transcript?: string;
          error?: string;
          code?: string;
        };

        if (!res.ok) {
          const msg = mapTranscribeError(res.status, data);
          setError(msg);
          return mergeSeedAndTranscript(seedText, "");
        }

        const merged = mergeSeedAndTranscript(seedText, data.transcript ?? "");
        setTranscript(merged);
        return merged;
      } catch (err: unknown) {
        const msg =
          err instanceof TypeError
            ? "Network error — check that the dev server is running."
            : err instanceof Error
              ? err.message
              : "Transcription failed.";
        setError(msg);
        return mergeSeedAndTranscript(seedText, "");
      } finally {
        setIsTranscribing(false);
      }
    },
    [transcript],
  );

  return {
    isRecording,
    isTranscribing,
    transcript,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}
