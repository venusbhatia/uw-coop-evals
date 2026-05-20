type WizardProgressProps = {
  current: number;
  total: number;
  label: string;
};

export function WizardProgress({ current, total, label }: WizardProgressProps) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="mb-8">
      <div className="flex justify-between text-[12px] text-[var(--muted)] mb-2">
        <span>{label}</span>
        <span>
          Step {current} of {total}
        </span>
      </div>
      <div className="h-1 rounded-full bg-[var(--surface)] overflow-hidden">
        <div
          className="h-full bg-[var(--foreground)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
