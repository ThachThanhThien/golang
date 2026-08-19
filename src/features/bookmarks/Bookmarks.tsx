import { Link } from 'react-router-dom';
import { useCourse } from '../../core/context/CourseContext';
import { useProgress } from '../../core/context/ProgressContext';
import { LessonCard } from '../../shared/components/LessonCard';
import { useDocumentTitle } from '../../core/hooks/useDocumentTitle';

export function Bookmarks() {
  useDocumentTitle('Bookmarks · Go Learning Portal');
  const course = useCourse();
  const progress = useProgress();

  const bookmarked = course.lessons.filter((l) => progress.isBookmarked(l.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-8 max-w-2xl">
        <h1 className="heading text-4xl">
          <span className="gradient-text">Bookmarks</span>
        </h1>
        <p className="prose-muted mt-3 text-lg">Lessons you’ve saved for later.</p>
      </header>

      {bookmarked.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarked.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      ) : (
        <div className="card border-dashed p-12 text-center">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-cyan-500 dark:bg-cyan-950 dark:text-cyan-300">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 4h12v16l-6-4-6 4V4Z" strokeLinejoin="round" />
            </svg>
          </span>
          <p className="font-semibold text-ink-700 dark:text-ink-200">No bookmarks yet.</p>
          <p className="prose-muted mx-auto mt-1 max-w-sm text-sm">
            Tap the bookmark icon on any lesson card to pin it here.
          </p>
          <Link to="/roadmap" className="btn-primary mt-5">
            Browse lessons
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
