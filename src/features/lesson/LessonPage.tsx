import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCourse } from '../../core/context/CourseContext';
import { useProgress } from '../../core/context/ProgressContext';
import { loadLesson } from '../../core/services/lessonService';
import { type Lesson, LEVEL_BADGES, LEVEL_LABELS } from '../../core/models/lesson';
import { Sidebar } from '../../shared/components/Sidebar';
import { TableOfContents } from '../../shared/components/TableOfContents';
import { LessonNavigation } from '../../shared/components/LessonNavigation';
import { LessonContent } from '../../shared/components/LessonContent';
import { useDocumentTitle } from '../../core/hooks/useDocumentTitle';

export function LessonPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const course = useCourse();
  const progress = useProgress();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useDocumentTitle(lesson ? `${lesson.meta.title} · Go Learning Portal` : 'Lesson · Go Learning Portal');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);

    // Wait for the manifest; the effect re-runs when `loaded` flips true.
    if (!course.loaded) return;

    const meta = course.getBySlug(slug);
    if (!meta) {
      setLesson(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    progress.setLastOpened(meta.id);
    loadLesson(meta)
      .then((l) => {
        if (!active) return;
        setLesson(l);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setNotFound(true);
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, course.loaded, course.lessons]);

  const neighbours = course.neighbours(slug);
  const completed = lesson ? progress.isCompleted(lesson.meta.id) : false;
  const bookmarked = lesson ? progress.isBookmarked(lesson.meta.id) : false;

  return (
    <div className="mx-auto max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)_14rem]">
      {/* Course outline */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto pr-2">
          <Sidebar />
        </div>
      </aside>

      {/* Main content */}
      <article className="min-w-0">
        {loading ? (
          <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading lesson">
            <div className="h-5 w-24 rounded-full bg-ink-200 dark:bg-ink-800" />
            <div className="h-10 w-2/3 rounded-xl bg-ink-200 dark:bg-ink-800" />
            <div className="h-4 w-full rounded bg-ink-200 dark:bg-ink-800" />
            <div className="h-4 w-5/6 rounded bg-ink-200 dark:bg-ink-800" />
            <div className="h-40 w-full rounded-2xl bg-ink-200 dark:bg-ink-800" />
          </div>
        ) : notFound ? (
          <div className="card border-dashed p-12 text-center">
            <h1 className="heading text-2xl">Lesson not found</h1>
            <p className="prose-muted mt-2">The lesson “{slug}” doesn’t exist.</p>
            <Link to="/roadmap" className="btn-primary mt-5">
              Back to roadmap
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        ) : (
          lesson && (
            <>
              {/* Header */}
              <header className="mb-8 animate-fade-up border-b border-ink-200 pb-6 dark:border-ink-800">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={LEVEL_BADGES[lesson.meta.level]}>{LEVEL_LABELS[lesson.meta.level]}</span>
                  <span className="prose-muted flex items-center gap-1 text-sm font-medium">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" strokeLinecap="round" />
                    </svg>
                    {lesson.meta.duration} min read
                  </span>
                  {completed && (
                    <span className="flex items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Completed
                    </span>
                  )}
                </div>

                <h1 className="heading mt-3 text-4xl text-balance">{lesson.meta.title}</h1>

                {lesson.meta.summary && (
                  <p className="prose-muted mt-3 text-lg text-pretty">{lesson.meta.summary}</p>
                )}

                <div className="mt-6 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => progress.toggleCompleted(lesson.meta.id)}
                    aria-pressed={completed}
                    className={completed ? 'btn bg-emerald-600 text-white hover:bg-emerald-700' : 'btn-secondary'}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {completed ? 'Completed' : 'Mark complete'}
                  </button>

                  <button
                    type="button"
                    onClick={() => progress.toggleBookmark(lesson.meta.id)}
                    aria-pressed={bookmarked}
                    className={`btn-secondary ${bookmarked ? 'text-cyan-600!' : ''}`}
                  >
                    <svg
                      className="h-4 w-4"
                      fill={bookmarked ? 'currentColor' : 'none'}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 4h12v16l-6-4-6 4V4Z" strokeLinejoin="round" />
                    </svg>
                    {bookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(`/lesson/${lesson.meta.slug}/quiz`)}
                    className="btn-gradient"
                  >
                    Take the quiz
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </header>

              {/* Mobile TOC */}
              {lesson.toc.length > 0 && (
                <details className="card group mb-6 p-4 lg:hidden">
                  <summary className="focusable flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg font-bold text-ink-700 dark:text-ink-200">
                    On this page
                    <svg
                      className="h-4 w-4 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </summary>
                  <div className="mt-3">
                    <TableOfContents entries={lesson.toc} />
                  </div>
                </details>
              )}

              <LessonContent content={lesson.content} />

              <LessonNavigation prev={neighbours.prev} next={neighbours.next} />
            </>
          )
        )}
      </article>

      {/* Table of contents */}
      <aside className="hidden lg:block">
        {lesson && (
          <div className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto">
            <TableOfContents entries={lesson.toc} />
          </div>
        )}
      </aside>
    </div>
  );
}
