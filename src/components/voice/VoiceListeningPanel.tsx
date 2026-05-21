"use client";

import { formatVoiceDuration } from "@/hooks/useSpeechToText";
import { AudioWaveform } from "@/components/voice/AudioWaveform";

type VoiceListeningPanelProps = {
  elapsedMs: number;
  audioLevels: number[];
  onCancel: () => void;
};

export function VoiceListeningPanel({
  elapsedMs,
  audioLevels,
  onCancel,
}: VoiceListeningPanelProps) {
  const durationLabel = formatVoiceDuration(elapsedMs);
  const statusText = `Listening, ${durationLabel}`;

  return (
    <div
      className="voice-listening-panel rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4"
      role="status"
      aria-live="polite"
      aria-label={statusText}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="voice-listening-dot h-2 w-2 shrink-0 rounded-full bg-[var(--foreground)]" />
          <span className="text-[15px] font-medium text-[var(--foreground)]">
            Listening…
          </span>
        </div>
        <span className="text-[15px] font-medium tabular-nums text-[var(--foreground)]">
          {durationLabel}
        </span>
      </div>

      <div className="mt-5 px-2">
        <AudioWaveform levels={audioLevels} animated />
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="mt-4 text-[12px] text-[var(--muted)] underline hover:text-[var(--foreground)]"
      >
        Cancel
      </button>
    </div>
  );
}
