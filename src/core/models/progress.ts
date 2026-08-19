export interface QuizResultRecord {
  score: number;
  passed: boolean;
  completedAt: string;
}

export interface UserProgress {
  completedLessons: string[];
  bookmarkedLessons: string[];
  lastOpenedLesson?: string;
  quizResults: Record<string, QuizResultRecord>;
}

export const EMPTY_PROGRESS: UserProgress = {
  completedLessons: [],
  bookmarkedLessons: [],
  quizResults: {},
};

export const PROGRESS_STORAGE_KEY = 'golang-learning-progress';
