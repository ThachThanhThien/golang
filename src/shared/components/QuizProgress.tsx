export function QuizProgress({ answered, total }: { answered: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);

  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Questions answered"
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ backgroundImage: 'var(--gradient-brand)', width: `${pct}%` }}
        />
      </div>
      <span className="prose-muted shrink-0 text-sm font-bold tabular-nums">
        {answered}/{total} answered
      </span>
    </div>
  );
}
