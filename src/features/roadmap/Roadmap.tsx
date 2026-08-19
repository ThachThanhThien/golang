import { useCourse } from '../../core/context/CourseContext';
import { useProgress } from '../../core/context/ProgressContext';
import { LessonCard } from '../../shared/components/LessonCard';
import { useDocumentTitle } from '../../core/hooks/useDocumentTitle';
import {
  LEVELS,
  LEVEL_ACCENTS,
  LEVEL_BLURBS,
  LEVEL_LABELS,
  type LessonLevel,
} from '../../core/models/lesson';

export function Roadmap() {
  useDocumentTitle('Roadmap · Go Learning Portal');
  const course = useCourse();
  const progress = useProgress();

  const doneCount = (level: LessonLevel) =>
    course.lessonsByLevel(level).filter((l) => progress.isCompleted(l.id)).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-12 max-w-2xl">
        <h1 className="heading text-4xl">
          Course <span className="gradient-text">roadmap</span>
        </h1>
        <p className="prose-muted mt-3 text-lg text-pretty">
          Work through the levels in order, or jump straight to a topic you need.
        </p>
      </header>

      {LEVELS.map((level, idx) => {
        const lessons = course.lessonsByLevel(level);
        const done = doneCount(level);
        const last = idx === LEVELS.length - 1;

        return (
          <div key={level}>
            <section id={level} className="mb-14 scroll-mt-24">
              <div className="mb-5">
                <span className={`mb-3 block h-1.5 w-16 rounded-full bg-gradient-to-r ${LEVEL_ACCENTS[level]}`} />

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h2 className="heading text-2xl">{LEVEL_LABELS[level]}</h2>
                  <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-sm font-bold tabular-nums text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                    {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'}
                  </span>
                  {lessons.length > 0 && done === lessons.length ? (
                    <span className="badge bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                        <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      All done
                    </span>
                  ) : (
                    done > 0 && (
                      <span className="prose-muted text-sm font-semibold tabular-nums">
                        {done}/{lessons.length} done
                      </span>
                    )
                  )}
                </div>

                <p className="prose-muted mt-2 max-w-xl">{LEVEL_BLURBS[level]}</p>
              </div>

              {lessons.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {lessons.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              ) : (
                <div className="card border-dashed p-10 text-center">
                  <p className="prose-muted text-sm">No lessons in this level yet.</p>
                </div>
              )}
            </section>

            {!last && <hr className="mb-14 border-ink-200 dark:border-ink-800" />}
          </div>
        );
      })}
    </div>
  );
}
