import { Link } from 'react-router-dom';
import { LEVEL_BADGES, LEVEL_LABELS, type LessonMeta } from '../../core/models/lesson';
import { useProgress } from '../../core/context/ProgressContext';

/**
 * The title anchor is stretched over the whole card via a ::before overlay, so
 * the bookmark button can sit beside it as a real sibling control rather than
 * being nested inside the link.
 */
export function LessonCard({ lesson }: { lesson: LessonMeta }) {
  const progress = useProgress();

  const completed = progress.isCompleted(lesson.id);
  const bookmarked = progress.isBookmarked(lesson.id);
  const quiz = progress.quizResult(lesson.id);

  return (
    <article className="card-interactive group relative isolate flex h-full flex-col p-5 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-brand-500 has-[a:focus-visible]:ring-offset-2 has-[a:focus-visible]:ring-offset-ink-50 dark:has-[a:focus-visible]:ring-offset-ink-950">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={LEVEL_BADGES[lesson.level]}>
          {completed && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {LEVEL_LABELS[lesson.level]}
        </span>

        <button
          type="button"
          onClick={() => progress.toggleBookmark(lesson.id)}
          className={`focusable relative z-10 -mt-1.5 -mr-1.5 grid h-11 w-11 cursor-pointer place-items-center rounded-full transition hover:bg-ink-100 active:scale-90 dark:hover:bg-ink-800 ${
            bookmarked ? 'text-cyan-500' : 'text-ink-400 hover:text-cyan-500'
          }`}
          aria-label={bookmarked ? `Remove bookmark from ${lesson.title}` : `Bookmark ${lesson.title}`}
          aria-pressed={bookmarked}
        >
          <svg
            className={`h-5 w-5 transition-transform duration-200 ${bookmarked ? 'scale-110' : ''}`}
            fill={bookmarked ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 4h12v16l-6-4-6 4V4Z" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <h3 className="mb-1 font-bold text-ink-900 dark:text-white">
        <Link
          to={`/lesson/${lesson.slug}`}
          className="outline-none transition-colors before:absolute before:inset-0 before:z-0 before:rounded-2xl group-hover:text-brand-600 dark:group-hover:text-brand-300"
        >
          {lesson.title}
        </Link>
      </h3>

      {lesson.summary && <p className="prose-muted mb-3 line-clamp-2 text-sm">{lesson.summary}</p>}

      <div className="prose-muted mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 text-xs font-medium">
        <span className="flex items-center gap-1">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
          </svg>
          {lesson.duration} min
        </span>

        {completed && (
          <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Completed
          </span>
        )}

        {quiz && (
          <span
            className={`ml-auto rounded-full px-2 py-0.5 font-bold tabular-nums ${
              quiz.passed
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
            }`}
          >
            Quiz {quiz.score}%
          </span>
        )}
      </div>
    </article>
  );
}
