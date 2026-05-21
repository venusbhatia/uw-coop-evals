"use client";

import { motion, useReducedMotion } from "framer-motion";
import { WAVEFORM_BAR_COUNT } from "@/hooks/useSpeechToText";

type AudioWaveformProps = {
  levels?: number[];
  animated?: boolean;
};

const FALLBACK_HEIGHTS = [0.35, 0.55, 0.75, 0.95, 0.75, 0.55, 0.35, 0.5, 0.7, 0.9, 0.7, 0.5, 0.35, 0.55, 0.75, 0.55];

export function AudioWaveform({ levels, animated = false }: AudioWaveformProps) {
  const reduceMotion = useReducedMotion();
  const barCount = levels?.length ?? WAVEFORM_BAR_COUNT;
  const useLiveLevels = levels != null && levels.some((level) => level > 0.15);

  return (
    <div
      className="flex items-center justify-center gap-[3px] h-12 w-full"
      aria-hidden
    >
      {Array.from({ length: barCount }, (_, index) => {
        const liveHeight = levels?.[index] ?? FALLBACK_HEIGHTS[index % FALLBACK_HEIGHTS.length];
        const heightPercent = `${Math.round(liveHeight * 100)}%`;
        const showCssPulse = animated && !useLiveLevels && !reduceMotion;

        return (
          <div
            key={index}
            className="flex h-full w-[3px] items-center justify-center"
          >
            {showCssPulse ? (
              <span
                className="voice-wave-bar w-full rounded-full bg-[var(--foreground)]"
                style={{
                  animationDelay: `${index * 0.05}s`,
                  height: `${Math.round(FALLBACK_HEIGHTS[index % FALLBACK_HEIGHTS.length] * 100)}%`,
                }}
              />
            ) : (
              <motion.span
                className="block w-full self-center rounded-full bg-[var(--foreground)]"
                initial={false}
                animate={{ height: heightPercent }}
                transition={{ duration: reduceMotion ? 0 : 0.08, ease: "easeOut" }}
                style={{ minHeight: "12%", maxHeight: "100%" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
