import { useMemo, useState } from 'react';
import { useCourse } from '../../core/context/CourseContext';
import { LessonCard } from '../../shared/components/LessonCard';
import { searchLessons } from '../../core/services/search';
import { useDocumentTitle } from '../../core/hooks/useDocumentTitle';

export function SearchPage() {
  useDocumentTitle('Search · Go Learning Portal');
  const course = useCourse();
  const [query, setQuery] = useState('');

  const results = useMemo(() => searchLessons(course.lessons, query), [course.lessons, query]);
  const trimmed = query.trim();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-6 max-w-2xl">
        <h1 className="heading text-4xl">
          Search <span className="gradient-text">lessons</span>
        </h1>
        <p className="prose-muted mt-3 text-lg">Find lessons by title, topic, or tag.</p>
      </header>

      <div className="relative">
        <svg
          className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-ink-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          aria-label="Search lessons"
          placeholder="Search for hooks, components, state…"
          className="input-field py-4 pr-4 pl-12"
        />
      </div>

      <div className="mt-8">
        {trimmed.length === 0 ? (
          <div className="card border-dashed p-12 text-center">
            <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-500 dark:bg-brand-950 dark:text-brand-300">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
            </span>
            <p className="font-semibold text-ink-700 dark:text-ink-200">Start typing to search the course.</p>
            <p className="prose-muted mt-1 text-sm">Try “hooks”, “routing”, or “components”.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="card border-dashed p-12 text-center">
            <p className="font-semibold text-ink-700 dark:text-ink-200">No lessons match “{query}”.</p>
            <p className="prose-muted mt-1 text-sm">Check the spelling, or try a broader word.</p>
          </div>
        ) : (
          <>
            <p className="prose-muted mb-4 text-sm font-semibold" aria-live="polite">
              {results.length} result{results.length === 1 ? '' : 's'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((result) => (
                <LessonCard key={result.lesson.id} lesson={result.lesson} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
