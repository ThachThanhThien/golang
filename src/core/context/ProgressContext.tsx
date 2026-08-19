import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  EMPTY_PROGRESS,
  PROGRESS_STORAGE_KEY,
  type QuizResultRecord,
  type UserProgress,
} from '../models/progress';

interface ProgressContextValue {
  progress: UserProgress;
  completedCount: number;
  bookmarks: string[];
  quizResults: Record<string, QuizResultRecord>;
  lastOpenedLesson?: string;
  averageScore: number;
  isCompleted: (lessonId: string) => boolean;
  isBookmarked: (lessonId: string) => boolean;
  quizResult: (lessonId: string) => QuizResultRecord | undefined;
  setCompleted: (lessonId: string, completed: boolean) => void;
  toggleCompleted: (lessonId: string) => void;
  toggleBookmark: (lessonId: string) => void;
  setLastOpened: (lessonId: string) => void;
  recordQuizResult: (lessonId: string, score: number, passed: boolean) => void;
  reset: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

function read(): UserProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return structuredClone(EMPTY_PROGRESS);
    return { ...structuredClone(EMPTY_PROGRESS), ...JSON.parse(raw) };
  } catch {
    return structuredClone(EMPTY_PROGRESS);
  }
}

/**
 * Persists the user's learning progress to localStorage. State lives in React
 * state so components react automatically; an effect writes through on change.
 */
export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(read);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch {
      /* storage may be unavailable (private mode); ignore */
    }
  }, [progress]);

  const isCompleted = useCallback(
    (lessonId: string) => progress.completedLessons.includes(lessonId),
    [progress],
  );
  const isBookmarked = useCallback(
    (lessonId: string) => progress.bookmarkedLessons.includes(lessonId),
    [progress],
  );
  const quizResult = useCallback(
    (lessonId: string) => progress.quizResults[lessonId],
    [progress],
  );

  const setCompleted = useCallback((lessonId: string, completed: boolean) => {
    setProgress((p) => {
      const set = new Set(p.completedLessons);
      if (completed) set.add(lessonId);
      else set.delete(lessonId);
      return { ...p, completedLessons: [...set] };
    });
  }, []);

  const toggleCompleted = useCallback((lessonId: string) => {
    setProgress((p) => {
      const set = new Set(p.completedLessons);
      if (set.has(lessonId)) set.delete(lessonId);
      else set.add(lessonId);
      return { ...p, completedLessons: [...set] };
    });
  }, []);

  const toggleBookmark = useCallback((lessonId: string) => {
    setProgress((p) => {
      const set = new Set(p.bookmarkedLessons);
      if (set.has(lessonId)) set.delete(lessonId);
      else set.add(lessonId);
      return { ...p, bookmarkedLessons: [...set] };
    });
  }, []);

  const setLastOpened = useCallback((lessonId: string) => {
    setProgress((p) => (p.lastOpenedLesson === lessonId ? p : { ...p, lastOpenedLesson: lessonId }));
  }, []);

  const recordQuizResult = useCallback((lessonId: string, score: number, passed: boolean) => {
    setProgress((p) => ({
      ...p,
      quizResults: {
        ...p.quizResults,
        [lessonId]: { score, passed, completedAt: new Date().toISOString() },
      },
    }));
  }, []);

  const reset = useCallback(() => {
    setProgress({ ...structuredClone(EMPTY_PROGRESS) });
  }, []);

  const averageScore = useMemo(() => {
    const scores = Object.values(progress.quizResults).map((r) => r.score);
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [progress.quizResults]);

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      completedCount: progress.completedLessons.length,
      bookmarks: progress.bookmarkedLessons,
      quizResults: progress.quizResults,
      lastOpenedLesson: progress.lastOpenedLesson,
      averageScore,
      isCompleted,
      isBookmarked,
      quizResult,
      setCompleted,
      toggleCompleted,
      toggleBookmark,
      setLastOpened,
      recordQuizResult,
      reset,
    }),
    [
      progress,
      averageScore,
      isCompleted,
      isBookmarked,
      quizResult,
      setCompleted,
      toggleCompleted,
      toggleBookmark,
      setLastOpened,
      recordQuizResult,
      reset,
    ],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider');
  return ctx;
}
