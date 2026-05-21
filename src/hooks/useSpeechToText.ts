"use client";

import { useCallback, useRef, useState } from "react";

const MIN_BLOB_BYTES = 1000;
export const WAVEFORM_BAR_COUNT = 16;

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

export function formatVoiceDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const IDLE_LEVELS = Array.from({ length: WAVEFORM_BAR_COUNT }, () => 0.35);

export interface UseSpeechToTextReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingElapsedMs: number;
  audioLevels: number[];
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
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(IDLE_LEVELS);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartedAtRef = useRef<number>(0);

  const stopAudioAnalysis = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerIntervalRef.current != null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setRecordingElapsedMs(0);
    setAudioLevels(IDLE_LEVELS);
  }, []);

  const stopMedia = useCallback(() => {
    stopAudioAnalysis();

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
  }, [stopAudioAnalysis]);

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

  const startAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const context = new AudioCtx();
      const analyser = context.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.75;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = context;
      analyserRef.current = analyser;

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(frequencyData);

        const sliceSize = Math.max(1, Math.floor(frequencyData.length / WAVEFORM_BAR_COUNT));
        const levels = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
          const start = index * sliceSize;
          let sum = 0;
          for (let i = start; i < start + sliceSize && i < frequencyData.length; i++) {
            sum += frequencyData[i];
          }
          const average = sum / sliceSize;
          return Math.min(1, Math.max(0.12, average / 128));
        });

        setAudioLevels(levels);
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* waveform falls back to CSS animation in AudioWaveform */
    }
  }, []);

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

      recordingStartedAtRef.current = Date.now();
      setRecordingElapsedMs(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingElapsedMs(Date.now() - recordingStartedAtRef.current);
      }, 100);

      startAudioAnalysis(stream);
      recorder.start(250);
      setIsRecording(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Could not access microphone.";
      setError(msg);
      stopMedia();
      setIsRecording(false);
    }
  }, [startAudioAnalysis, stopMedia]);

  const stopRecording = useCallback(
    async (seedText = ""): Promise<string> => {
      const recorder = mediaRecorderRef.current;

      if (!recorder || recorder.state !== "recording") {
        stopAudioAnalysis();
        setIsRecording(false);
        return mergeSeedAndTranscript(seedText, transcript);
      }

      stopAudioAnalysis();
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
    [stopAudioAnalysis, transcript],
  );

  return {
    isRecording,
    isTranscribing,
    recordingElapsedMs,
    audioLevels,
    transcript,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  };
}
