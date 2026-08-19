import { Link } from 'react-router-dom';
import { useCourse } from '../../core/context/CourseContext';
import { useProgress } from '../../core/context/ProgressContext';
import { LessonCard } from '../../shared/components/LessonCard';
import { useDocumentTitle } from '../../core/hooks/useDocumentTitle';
import { LEVELS, LEVEL_ACCENTS, LEVEL_BLURBS, LEVEL_LABELS } from '../../core/models/lesson';

const ICON_BOOK =
  'M4 5.5A2.5 2.5 0 0 1 6.5 3H19v14H6.5A2.5 2.5 0 0 0 4 19.5V5.5ZM4 19.5A2.5 2.5 0 0 1 6.5 17H19v4H6.5A2.5 2.5 0 0 1 4 19.5Z';
const ICON_CHECK = 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3.5-9.2 2.4 2.4 4.6-4.6';
const ICON_CHART = 'M4 20V10M10 20V4M16 20v-7M22 20H2';
const ICON_TROPHY =
  'M8 4h8v5a4 4 0 1 1-8 0V4ZM8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M10 17h4M9 21h6M12 13v4';

export function Home() {
  useDocumentTitle('Go Learning Portal');
  const course = useCourse();
  const progress = useProgress();

  const totalLessons = course.lessons.length;
  const completionPct =
    totalLessons === 0 ? 0 : Math.round((progress.completedCount / totalLessons) * 100);

  const continueLesson = (() => {
    const last = progress.lastOpenedLesson;
    if (last) {
      const meta = course.getById(last);
      if (meta) return meta;
    }
    return course.lessons.find((l) => !progress.isCompleted(l.id));
  })();

  const featured = course.lessons.slice(0, 3);

  const stats = [
    { label: 'Lessons', value: `${totalLessons}`, icon: ICON_BOOK },
    { label: 'Completed', value: `${progress.completedCount}`, icon: ICON_CHECK },
    { label: 'Progress', value: `${completionPct}%`, icon: ICON_CHART },
    { label: 'Avg quiz score', value: `${progress.averageScore}%`, icon: ICON_TROPHY },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden border-b border-ink-200 dark:border-ink-800">
        <div
          aria-hidden="true"
          className="surface-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_65%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -left-32 -z-10 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl dark:bg-cyan-600/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 right-0 -z-10 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl dark:bg-brand-600/20"
        />

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-sm font-bold text-brand-700 backdrop-blur dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-300">
              <span className="gradient-rule h-2 w-2 rounded-full" />
              Frontend-only · File-driven
            </span>

            <h1 className="heading mt-5 text-4xl text-balance sm:text-6xl">
              Master <span className="gradient-text">Go</span>, one focused lesson at a time.
            </h1>

            <p className="prose-muted mt-5 max-w-xl text-lg text-pretty">
              Read bite-sized lessons, test yourself with quizzes, and track your progress — all in
              the browser. No sign-up, no backend.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/roadmap" className="btn-gradient px-6 py-3 text-base">
                Explore the roadmap
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>

              {continueLesson && (
                <Link to={`/lesson/${continueLesson.slug}`} className="btn-secondary max-w-full px-6 py-3 text-base">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M8 5.5v13l11-6.5-11-6.5Z" strokeLinejoin="round" />
                  </svg>
                  <span className="truncate">
                    {progress.lastOpenedLesson ? 'Continue' : 'Start'}: {continueLesson.title}
                  </span>
                </Link>
              )}
            </div>

            {completionPct > 0 && (
              <div className="mt-8 max-w-sm">
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink-700 dark:text-ink-200">Your progress</span>
                  <span className="font-bold text-brand-600 dark:text-brand-300">{completionPct}%</span>
                </div>
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800"
                  role="progressbar"
                  aria-valuenow={completionPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Course completion"
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ backgroundImage: 'var(--gradient-brand)', width: `${completionPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        {/* Statistics */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card p-5">
              <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path d={stat.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <p className="text-3xl font-extrabold tabular-nums text-ink-900 dark:text-white">{stat.value}</p>
              <p className="prose-muted mt-0.5 text-sm font-medium">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Roadmap overview */}
        <section className="mt-14">
          <h2 className="heading text-2xl">Roadmap overview</h2>
          <p className="prose-muted mt-1">Three levels, built to be taken in order.</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {LEVELS.map((level) => (
              <Link
                key={level}
                to={`/roadmap#${level}`}
                className="card-interactive group overflow-hidden p-6"
              >
                <span className={`mb-4 block h-1.5 w-12 rounded-full bg-gradient-to-r ${LEVEL_ACCENTS[level]}`} />
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-ink-900 dark:text-white">{LEVEL_LABELS[level]}</h3>
                  <span className="shrink-0 rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-bold tabular-nums text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {course.lessonsByLevel(level).length}
                  </span>
                </div>
                <p className="prose-muted mt-2 text-sm">{LEVEL_BLURBS[level]}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-600 transition-transform duration-200 group-hover:translate-x-1 dark:text-brand-300">
                  Browse lessons
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured lessons */}
        {featured.length > 0 ? (
          <section className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="heading text-2xl">Start here</h2>
                <p className="prose-muted mt-1">The first few lessons, in order.</p>
              </div>
              <Link
                to="/roadmap"
                className="focusable inline-flex items-center gap-1 rounded-full text-sm font-bold text-brand-600 hover:text-cyan-600 dark:text-brand-300 dark:hover:text-cyan-400"
              >
                View all
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </section>
        ) : (
          course.loaded && (
            <section className="card mt-14 border-dashed p-12 text-center">
              <p className="prose-muted">
                No lessons found. Add entries to{' '}
                <code className="font-mono text-brand-600">content/course-manifest.json</code>.
              </p>
            </section>
          )
        )}
      </div>
    </>
  );
}
