"use client";

type ChipPickerProps = {
  options: string[];
  selected: string[];
  max: number;
  onToggle: (option: string) => void;
};

export function ChipPicker({ options, selected, max, onToggle }: ChipPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        const atMax = selected.length >= max && !isSelected;
        return (
          <button
            key={option}
            type="button"
            disabled={atMax}
            onClick={() => onToggle(option)}
            className={`px-3 py-2 rounded-full text-[13px] font-medium border transition-all ${
              isSelected
                ? "bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]"
                : atMax
                  ? "opacity-35 border-[var(--border)] cursor-not-allowed"
                  : "border-[var(--border)] hover:bg-[var(--surface)]"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
