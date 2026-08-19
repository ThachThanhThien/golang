import type { QuizEvaluation } from '../../core/models/quiz';

interface Props {
  evaluation: QuizEvaluation;
  passingScore: number;
  onRetry: () => void;
  onReview: () => void;
}

export function QuizResult({ evaluation, passingScore, onRetry, onReview }: Props) {
  const passed = evaluation.passed;

  return (
    <div
      className={`animate-pop rounded-2xl border p-8 text-center ${
        passed
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
          : 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
      }`}
      role="status"
    >
      <span
        className={`mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-white ${
          passed ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      >
        {passed ? (
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v5M12 16.5v.5" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        )}
      </span>

      <p
        className={`text-5xl font-extrabold tabular-nums ${
          passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
        }`}
      >
        {evaluation.score}%
      </p>

      <p className="mt-2 text-lg font-bold text-ink-900 dark:text-white">
        {passed ? 'Nice work — you passed!' : 'Almost there'}
      </p>
      <p className="prose-muted mt-1 text-sm">
        {evaluation.correctCount} of {evaluation.total} correct · need {passingScore}% to pass
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onRetry} className="btn-secondary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M4 12a8 8 0 1 1 2.3 5.7M4 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Try again
        </button>
        <button type="button" onClick={onReview} className="btn-primary">
          Review answers
        </button>
      </div>
    </div>
  );
}
