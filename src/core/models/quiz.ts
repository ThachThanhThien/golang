export type QuestionType =
  | 'single-choice'
  | 'multiple-choice'
  | 'fill-blank'
  | 'ordering'
  | 'match-pair';

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  explanation?: string;
}

export interface ChoiceOption {
  id: string;
  text: string;
}

export interface SingleChoiceQuestion extends BaseQuestion {
  type: 'single-choice';
  options: ChoiceOption[];
  /** id of the correct option */
  answer: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: ChoiceOption[];
  /** ids of every correct option */
  answer: string[];
}

export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill-blank';
  /** accepted answers, compared case-insensitively after trim */
  answer: string[];
}

export interface OrderingQuestion extends BaseQuestion {
  type: 'ordering';
  items: ChoiceOption[];
  /** option ids in the correct order */
  answer: string[];
}

export interface MatchPair {
  left: string;
  right: string;
}

export interface MatchPairQuestion extends BaseQuestion {
  type: 'match-pair';
  pairs: MatchPair[];
}

export type QuizQuestion =
  | SingleChoiceQuestion
  | MultipleChoiceQuestion
  | FillBlankQuestion
  | OrderingQuestion
  | MatchPairQuestion;

export interface Quiz {
  id: string;
  lessonId: string;
  title?: string;
  passingScore: number;
  questions: QuizQuestion[];
}

/** A user's answer to one question. Shape depends on the question type. */
export type AnswerValue = string | string[] | Record<string, string>;

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  userAnswer: AnswerValue;
}

export interface QuizEvaluation {
  total: number;
  correctCount: number;
  /** 0–100 */
  score: number;
  passed: boolean;
  results: QuestionResult[];
}
