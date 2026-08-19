import { Link } from 'react-router-dom';
import type { LessonMeta } from '../../core/models/lesson';

export function LessonNavigation({ prev, next }: { prev?: LessonMeta; next?: LessonMeta }) {
  return (
    <nav
      className="mt-14 grid gap-4 border-t border-ink-200 pt-8 sm:grid-cols-2 dark:border-ink-800"
      aria-label="Lesson navigation"
    >
      {prev ? (
        <Link to={`/lesson/${prev.slug}`} className="card-interactive group flex items-center gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-500 transition group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-ink-800 dark:text-ink-400 dark:group-hover:bg-brand-950 dark:group-hover:text-brand-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5m6 6-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold tracking-wide text-ink-400 uppercase">Previous</span>
            <span className="block truncate font-bold text-ink-800 group-hover:text-brand-600 dark:text-ink-100 dark:group-hover:text-brand-300">
              {prev.title}
            </span>
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}

      {next && (
        <Link
          to={`/lesson/${next.slug}`}
          className="card-interactive group flex items-center justify-end gap-3 p-4 text-right"
        >
          <span className="min-w-0">
            <span className="block text-xs font-bold tracking-wide text-ink-400 uppercase">Next</span>
            <span className="block truncate font-bold text-ink-800 group-hover:text-brand-600 dark:text-ink-100 dark:group-hover:text-brand-300">
              {next.title}
            </span>
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-500 transition group-hover:bg-brand-50 group-hover:text-brand-600 dark:bg-ink-800 dark:text-ink-400 dark:group-hover:bg-brand-950 dark:group-hover:text-brand-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </Link>
      )}
    </nav>
  );
}
