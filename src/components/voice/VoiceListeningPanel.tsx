"use client";

import { formatVoiceDuration } from "@/hooks/useSpeechToText";
import { AudioWaveform } from "@/components/voice/AudioWaveform";

type VoiceListeningBarProps = {
  elapsedMs: number;
  audioLevels: number[];
  onCancel: () => void;
};

/** Compact inline listening indicator — sits beside the mic button. */
export function VoiceListeningBar({
  elapsedMs,
  audioLevels,
  onCancel,
}: VoiceListeningBarProps) {
  const durationLabel = formatVoiceDuration(elapsedMs);
  const statusText = `Listening, ${durationLabel}`;

  return (
    <div
      className="voice-listening-bar flex flex-1 min-w-0 items-center gap-2.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5"
      role="status"
      aria-live="polite"
      aria-label={statusText}
    >
      <span className="voice-listening-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--foreground)]" />
      <span className="text-[13px] font-medium text-[var(--foreground)] shrink-0">
        Listening
      </span>
      <span className="text-[12px] tabular-nums text-[var(--muted)] shrink-0">
        {durationLabel}
      </span>
      <div className="flex-1 min-w-0 flex justify-center px-1">
        <AudioWaveform levels={audioLevels} animated compact />
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="text-[11px] text-[var(--muted)] underline shrink-0 hover:text-[var(--foreground)]"
      >
        Cancel
      </button>
    </div>
  );
}
