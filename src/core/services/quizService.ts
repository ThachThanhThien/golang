import type {
  AnswerValue,
  Quiz,
  QuizEvaluation,
  QuizQuestion,
  QuestionResult,
} from '../models/quiz';
import { assetUrl } from './asset';

/** Loads quiz definitions and grades a set of answers. */
const cache = new Map<string, Quiz | null>();

/** Returns the quiz for a lesson, or null if none exists. */
export async function loadQuizForLesson(lessonId: string): Promise<Quiz | null> {
  if (cache.has(lessonId)) return cache.get(lessonId)!;
  try {
    const res = await fetch(assetUrl(`quizzes/${lessonId}.json`));
    if (!res.ok) throw new Error('not found');
    const quiz = (await res.json()) as Quiz;
    cache.set(lessonId, quiz);
    return quiz;
  } catch {
    cache.set(lessonId, null);
    return null;
  }
}

export function evaluate(quiz: Quiz, answers: Record<string, AnswerValue>): QuizEvaluation {
  const results: QuestionResult[] = quiz.questions.map((q) => ({
    questionId: q.id,
    userAnswer: answers[q.id] ?? '',
    correct: isCorrect(q, answers[q.id]),
  }));

  const correctCount = results.filter((r) => r.correct).length;
  const total = quiz.questions.length;
  const score = total === 0 ? 0 : Math.round((correctCount / total) * 100);

  return {
    total,
    correctCount,
    score,
    passed: score >= quiz.passingScore,
    results,
  };
}

function isCorrect(q: QuizQuestion, answer: AnswerValue | undefined): boolean {
  if (answer == null) return false;
  switch (q.type) {
    case 'single-choice':
      return answer === q.answer;

    case 'multiple-choice': {
      const a = asArray(answer);
      return a.length === q.answer.length && q.answer.every((id) => a.includes(id));
    }

    case 'fill-blank': {
      const text = String(answer).trim().toLowerCase();
      return q.answer.some((acc) => acc.trim().toLowerCase() === text);
    }

    case 'ordering': {
      const a = asArray(answer);
      return a.length === q.answer.length && q.answer.every((id, i) => a[i] === id);
    }

    case 'match-pair': {
      if (typeof answer !== 'object' || Array.isArray(answer)) return false;
      return q.pairs.every((p) => answer[p.left] === p.right);
    }
  }
}

function asArray(v: AnswerValue): string[] {
  return Array.isArray(v) ? v : [String(v)];
}
