"use client";

import { Loader2, Mic, MicOff } from "lucide-react";
import type { UseSpeechToTextReturn } from "@/hooks/useSpeechToText";
import { VoiceListeningBar } from "@/components/voice/VoiceListeningPanel";

type VoiceAnswerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  speech: UseSpeechToTextReturn;
  onToggleMic: () => void | Promise<void>;
  loading?: boolean;
  minAnswerLength: number;
};

export function VoiceAnswerField({
  value,
  onChange,
  speech,
  onToggleMic,
  loading = false,
  minAnswerLength,
}: VoiceAnswerFieldProps) {
  const voiceBusy = speech.isRecording || speech.isTranscribing;
  const trimmedLength = value.trim().length;

  const textareaClass = [
    "input-field w-full flex-1 min-h-[160px] px-4 py-4 text-[16px] leading-relaxed resize-none",
    speech.isRecording ? "voice-textarea-active" : "",
    speech.isTranscribing ? "voice-textarea-transcribing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const helperText = speech.isRecording
    ? "Tap mic when done"
    : speech.isTranscribing
      ? "Transcribing…"
      : trimmedLength < minAnswerLength
        ? `At least ${minAnswerLength} characters to continue`
        : "Tap mic to speak, or type above";

  return (
    <div className="flex-1 flex flex-col gap-3">
      <div className="relative flex-1 flex flex-col">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            speech.isRecording
              ? "Listening…"
              : speech.isTranscribing
                ? "Transcribing…"
                : "Share your thoughts here…"
          }
          rows={6}
          disabled={loading || voiceBusy}
          className={textareaClass}
        />
        {speech.isTranscribing && (
          <div className="voice-transcribe-overlay pointer-events-none absolute inset-0 rounded-[10px] overflow-hidden">
            <span className="voice-shimmer-line" style={{ top: "18%" }} />
            <span className="voice-shimmer-line" style={{ top: "38%" }} />
            <span className="voice-shimmer-line" style={{ top: "58%" }} />
            <span className="voice-shimmer-line" style={{ top: "78%" }} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onToggleMic()}
            disabled={loading || speech.isTranscribing}
            className={`p-3 rounded-full border border-[var(--border)] shrink-0 ${
              speech.isRecording
                ? "bg-[var(--foreground)] text-[var(--background)]"
                : "hover:bg-[var(--surface)]"
            }`}
            aria-label={speech.isRecording ? "Stop recording" : "Record answer"}
          >
            {speech.isTranscribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : speech.isRecording ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {speech.isRecording ? (
            <VoiceListeningBar
              elapsedMs={speech.recordingElapsedMs}
              audioLevels={speech.audioLevels}
              onCancel={speech.cancelRecording}
            />
          ) : (
            <p className="text-[12px] text-[var(--muted)]">{helperText}</p>
          )}
        </div>

        {speech.isRecording && (
          <p className="text-[11px] text-[var(--muted)] pl-[52px]">{helperText}</p>
        )}
      </div>

      {speech.error && (
        <p className="text-[12px] text-[var(--muted)]">{speech.error}</p>
      )}
    </div>
  );
}
