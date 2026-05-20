"use client";

import { RATING_OPTIONS } from "@/lib/evaluationConfig";

type RatingPickerProps = {
  value: number | null;
  onChange: (value: number) => void;
};

export function RatingPicker({ value, onChange }: RatingPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {RATING_OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`min-w-[4.5rem] px-3 py-2.5 rounded-xl text-[13px] font-medium border transition-all ${
              selected
                ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
                : "border-[var(--border)] hover:bg-[var(--surface)]"
            }`}
          >
            <span className="block text-[11px] opacity-70">{opt.short}</span>
            <span className="block">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
