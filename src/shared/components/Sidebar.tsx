import { NavLink } from 'react-router-dom';
import { useCourse } from '../../core/context/CourseContext';
import { useProgress } from '../../core/context/ProgressContext';
import { LEVELS, LEVEL_LABELS } from '../../core/models/lesson';

/** Course outline shown beside the lesson reader. Highlights the active slug. */
export function Sidebar() {
  const course = useCourse();
  const progress = useProgress();

  return (
    <nav className="text-sm" aria-label="Course outline">
      {LEVELS.map((level) => {
        const lessons = course.lessonsByLevel(level);
        if (!lessons.length) return null;
        return (
          <div key={level} className="mb-6">
            <p className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wider text-ink-400 uppercase">
              <span className="gradient-rule h-0.5 w-3 shrink-0" />
              {LEVEL_LABELS[level]}
            </p>
            <ul className="space-y-0.5">
              {lessons.map((lesson) => (
                <li key={lesson.id}>
                  <NavLink
                    to={`/lesson/${lesson.slug}`}
                    className={({ isActive }) =>
                      `focusable flex items-center gap-2.5 rounded-xl px-3 py-2 font-medium transition ${
                        isActive
                          ? 'bg-brand-50 font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                          : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white'
                      }`
                    }
                  >
                    {progress.isCompleted(lesson.id) ? (
                      <>
                        <svg
                          className="h-3.5 w-3.5 shrink-0 text-emerald-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          aria-hidden="true"
                        >
                          <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="sr-only">Completed:</span>
                      </>
                    ) : (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300 dark:bg-ink-600" />
                    )}
                    <span className="truncate">{lesson.title}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
