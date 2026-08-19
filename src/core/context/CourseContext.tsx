import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LessonLevel, LessonMeta } from '../models/lesson';
import { assetUrl } from '../services/asset';

interface CourseContextValue {
  /** All lessons, sorted by course order. */
  lessons: LessonMeta[];
  /** True once the manifest has finished loading (even if empty). */
  loaded: boolean;
  lessonsByLevel: (level: LessonLevel) => LessonMeta[];
  getBySlug: (slug: string) => LessonMeta | undefined;
  getById: (id: string) => LessonMeta | undefined;
  /** Previous/next lesson in global course order, for in-lesson navigation. */
  neighbours: (slug: string) => { prev?: LessonMeta; next?: LessonMeta };
}

const CourseContext = createContext<CourseContextValue | null>(null);

/**
 * Loads and caches the course manifest — the single source of truth for which
 * lessons exist. Adding a lesson is just a manifest entry plus a markdown file;
 * no code change required.
 */
export function CourseProvider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<LessonMeta[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(assetUrl('content/course-manifest.json'));
        const data = res.ok ? ((await res.json()) as LessonMeta[]) : [];
        if (active) setRaw(data ?? []);
      } catch {
        if (active) setRaw([]);
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const lessons = useMemo(() => [...raw].sort((a, b) => a.order - b.order), [raw]);

  const lessonsByLevel = useCallback(
    (level: LessonLevel) => lessons.filter((l) => l.level === level),
    [lessons],
  );
  const getBySlug = useCallback(
    (slug: string) => lessons.find((l) => l.slug === slug),
    [lessons],
  );
  const getById = useCallback((id: string) => lessons.find((l) => l.id === id), [lessons]);

  const neighbours = useCallback(
    (slug: string) => {
      const idx = lessons.findIndex((l) => l.slug === slug);
      if (idx === -1) return {};
      return {
        prev: idx > 0 ? lessons[idx - 1] : undefined,
        next: idx < lessons.length - 1 ? lessons[idx + 1] : undefined,
      };
    },
    [lessons],
  );

  const value = useMemo<CourseContextValue>(
    () => ({ lessons, loaded, lessonsByLevel, getBySlug, getById, neighbours }),
    [lessons, loaded, lessonsByLevel, getBySlug, getById, neighbours],
  );

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

export function useCourse(): CourseContextValue {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error('useCourse must be used within a CourseProvider');
  return ctx;
}
