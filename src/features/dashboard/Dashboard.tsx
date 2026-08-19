import { Link } from 'react-router-dom';
import { useCourse } from '../../core/context/CourseContext';
import { useProgress } from '../../core/context/ProgressContext';
import { useDocumentTitle } from '../../core/hooks/useDocumentTitle';
import { LEVELS, LEVEL_ACCENTS, LEVEL_LABELS, type LessonLevel } from '../../core/models/lesson';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function Dashboard() {
  useDocumentTitle('Dashboard · Go Learning Portal');
  const course = useCourse();
  const progress = useProgress();

  const totalLessons = course.lessons.length;
  const completionPct =
    totalLessons === 0 ? 0 : Math.round((progress.completedCount / totalLessons) * 100);

  const completedLessons = course.lessons.filter((l) => progress.isCompleted(l.id));

  const quizHistory = Object.entries(progress.quizResults)
    .map(([lessonId, r]) => ({
      lesson: course.getById(lessonId),
      score: r.score,
      passed: r.passed,
      completedAt: r.completedAt,
    }))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  const levelProgress = (level: LessonLevel) => {
    const lessons = course.lessonsByLevel(level);
    const done = lessons.filter((l) => progress.isCompleted(l.id)).length;
    const total = lessons.length;
    return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
  };

  const resetProgress = () => {
    if (confirm('Reset all progress, bookmarks and quiz history? This cannot be undone.')) {
      progress.reset();
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="heading text-4xl">
            Your <span className="gradient-text">dashboard</span>
          </h1>
          <p className="prose-muted mt-3 text-lg">Track your learning progress and quiz history.</p>
        </div>
        <button type="button" onClick={resetProgress} className="btn-danger">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Reset progress
        </button>
      </header>

      {/* Top stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-5">
          <p className="text-3xl font-extrabold tabular-nums text-ink-900 dark:text-white">
            {progress.completedCount}
            <span className="text-ink-400">/{totalLessons}</span>
          </p>
          <p className="prose-muted mt-0.5 text-sm font-medium">Lessons done</p>
        </div>
        <div className="card p-5">
          <p className="gradient-text text-3xl font-extrabold tabular-nums">{completionPct}%</p>
          <p className="prose-muted mt-0.5 text-sm font-medium">Course complete</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-extrabold tabular-nums text-ink-900 dark:text-white">
            {progress.averageScore}%
          </p>
          <p className="prose-muted mt-0.5 text-sm font-medium">Avg quiz score</p>
        </div>
        <div className="card p-5">
          <p className="text-3xl font-extrabold tabular-nums text-ink-900 dark:text-white">
            {progress.bookmarks.length}
          </p>
          <p className="prose-muted mt-0.5 text-sm font-medium">Bookmarks</p>
        </div>
      </section>

      {/* Progress by level */}
      <section className="mt-12">
        <h2 className="heading mb-5 text-xl">Progress by level</h2>
        <div className="card divide-y divide-ink-100 dark:divide-ink-800">
          {LEVELS.map((level) => {
            const lp = levelProgress(level);
            if (!lp.total) return null;
            return (
              <div key={level} className="p-5">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-bold text-ink-800 dark:text-ink-100">
                    <span className={`h-2.5 w-2.5 rounded-full bg-gradient-to-r ${LEVEL_ACCENTS[level]}`} />
                    {LEVEL_LABELS[level]}
                  </span>
                  <span className="prose-muted font-semibold tabular-nums">
                    {lp.done}/{lp.total}
                  </span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800"
                  role="progressbar"
                  aria-valuenow={lp.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${LEVEL_LABELS[level]} progress`}
                >
                  <div
                    className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${LEVEL_ACCENTS[level]}`}
                    style={{ width: `${lp.pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quiz history */}
      <section className="mt-12">
        <h2 className="heading mb-5 text-xl">Quiz history</h2>
        {quizHistory.length > 0 ? (
          <div className="card overflow-hidden">
            {/* Wide tables must scroll inside their own container, not the page. */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50 text-left dark:bg-ink-950/50">
                  <tr className="prose-muted">
                    <th scope="col" className="px-4 py-3 font-bold">Lesson</th>
                    <th scope="col" className="px-4 py-3 font-bold">Score</th>
                    <th scope="col" className="px-4 py-3 font-bold">Result</th>
                    <th scope="col" className="px-4 py-3 font-bold">Taken</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {quizHistory.map((row) => (
                    <tr key={row.completedAt} className="transition hover:bg-ink-50 dark:hover:bg-ink-800/50">
                      <td className="px-4 py-3">
                        {row.lesson ? (
                          <Link
                            to={`/lesson/${row.lesson.slug}`}
                            className="focusable rounded font-bold text-brand-600 hover:text-cyan-600 dark:text-brand-300 dark:hover:text-cyan-400"
                          >
                            {row.lesson.title}
                          </Link>
                        ) : (
                          <span className="text-ink-400">Unknown lesson</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold tabular-nums text-ink-800 dark:text-ink-100">
                        {row.score}%
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            row.passed
                              ? 'badge bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'badge bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }
                        >
                          {row.passed ? (
                            <>
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                                <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              Passed
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                              </svg>
                              Failed
                            </>
                          )}
                        </span>
                      </td>
                      <td className="prose-muted px-4 py-3 whitespace-nowrap">{formatDate(row.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card border-dashed p-10 text-center">
            <p className="font-semibold text-ink-700 dark:text-ink-200">No quizzes taken yet.</p>
            <p className="prose-muted mt-1 text-sm">Finish a lesson and take its quiz to see scores here.</p>
          </div>
        )}
      </section>

      {/* Completed lessons */}
      {completedLessons.length > 0 && (
        <section className="mt-12">
          <h2 className="heading mb-5 text-xl">Completed lessons</h2>
          <ul className="flex flex-wrap gap-2">
            {completedLessons.map((lesson) => (
              <li key={lesson.id}>
                <Link to={`/lesson/${lesson.slug}`} className="chip">
                  <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {lesson.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
