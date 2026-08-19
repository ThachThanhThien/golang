import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCourse } from '../../core/context/CourseContext';
import { useProgress } from '../../core/context/ProgressContext';
import { evaluate, loadQuizForLesson } from '../../core/services/quizService';
import type { AnswerValue, Quiz, QuizEvaluation } from '../../core/models/quiz';
import type { LessonMeta } from '../../core/models/lesson';
import { QuizQuestion } from '../../shared/components/QuizQuestion';
import { QuizProgress } from '../../shared/components/QuizProgress';
import { QuizResult } from '../../shared/components/QuizResult';
import { useDocumentTitle } from '../../core/hooks/useDocumentTitle';

type Phase = 'taking' | 'results' | 'reviewing';

/** Fisher–Yates shuffle that avoids returning the exact correct order. */
function shuffle(ids: string[], avoid: string[]): string[] {
  const arr = [...ids];
  for (let attempt = 0; attempt < 5; attempt++) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (arr.length < 2 || arr.some((id, i) => id !== avoid[i])) break;
  }
  return arr;
}

/**
 * Ordering questions need an initial answer so the displayed order is what gets
 * graded. We present a shuffled order (so it isn't trivially correct) and store
 * it as the starting answer.
 */
function buildInitialAnswers(quiz: Quiz | null): Record<string, AnswerValue> {
  if (!quiz) return {};
  const defaults: Record<string, AnswerValue> = {};
  for (const q of quiz.questions) {
    if (q.type === 'ordering') {
      defaults[q.id] = shuffle(
        q.items.map((i) => i.id),
        q.answer,
      );
    }
  }
  return defaults;
}

function hasAnswer(v: AnswerValue | undefined): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return Object.values(v).some((x) => x);
}

export function QuizPage() {
  const { slug = '' } = useParams();
  const course = useCourse();
  const progress = useProgress();

  const [loading, setLoading] = useState(true);
  const [lessonMeta, setLessonMeta] = useState<LessonMeta | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [phase, setPhase] = useState<Phase>('taking');
  const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);

  useDocumentTitle(
    quiz?.title ? `${quiz.title} · Quiz` : 'Quiz · Go Learning Portal',
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    setQuiz(null);
    setLessonMeta(null);
    setAnswers({});
    setPhase('taking');
    setEvaluation(null);

    if (!course.loaded) return;

    const meta = course.getBySlug(slug);
    setLessonMeta(meta ?? null);
    if (!meta) {
      setLoading(false);
      return;
    }

    loadQuizForLesson(meta.id).then((q) => {
      if (!active) return;
      setQuiz(q);
      setAnswers(buildInitialAnswers(q));
      setLoading(false);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, course.loaded, course.lessons]);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((v) => hasAnswer(v)).length,
    [answers],
  );

  const resultByQuestion = useMemo(() => {
    const map = new Map<string, QuizEvaluation['results'][number]>();
    evaluation?.results.forEach((r) => map.set(r.questionId, r));
    return map;
  }, [evaluation]);

  const setAnswer = (questionId: string, value: AnswerValue) => {
    setAnswers((a) => ({ ...a, [questionId]: value }));
  };

  const handleSubmit = () => {
    if (!quiz || !lessonMeta) return;
    const ev = evaluate(quiz, answers);
    setEvaluation(ev);
    progress.recordQuizResult(lessonMeta.id, ev.score, ev.passed);
    setPhase('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRetry = () => {
    setAnswers(buildInitialAnswers(quiz));
    setPhase('taking');
    setEvaluation(null);
  };

  const resultFor = (questionId: string) =>
    phase === 'reviewing' ? resultByQuestion.get(questionId) : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      {loading ? (
        <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading quiz">
          <div className="h-5 w-40 rounded-full bg-ink-200 dark:bg-ink-800" />
          <div className="h-9 w-1/2 rounded-xl bg-ink-200 dark:bg-ink-800" />
          <div className="h-32 w-full rounded-2xl bg-ink-200 dark:bg-ink-800" />
          <div className="h-32 w-full rounded-2xl bg-ink-200 dark:bg-ink-800" />
        </div>
      ) : !lessonMeta ? (
        <div className="card border-dashed p-12 text-center">
          <h1 className="heading text-2xl">Lesson not found</h1>
          <Link to="/roadmap" className="btn-primary mt-5">
            Back to roadmap
          </Link>
        </div>
      ) : !quiz ? (
        <div className="card border-dashed p-12 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 9a3 3 0 1 1 4 2.8c-.7.3-1 .9-1 1.7v.5M12 17v.5" strokeLinecap="round" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <h1 className="heading text-2xl">No quiz yet</h1>
          <p className="prose-muted mx-auto mt-2 max-w-sm">
            This lesson doesn’t have a quiz. Add{' '}
            <code className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-[0.85em] text-brand-700 dark:bg-ink-800 dark:text-brand-300">
              quizzes/{lessonMeta.id}.json
            </code>{' '}
            to create one.
          </p>
          <Link to={`/lesson/${lessonMeta.slug}`} className="btn-secondary mt-5">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 12H5m6 6-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to lesson
          </Link>
        </div>
      ) : (
        <>
          <header className="mb-6">
            <Link
              to={`/lesson/${lessonMeta.slug}`}
              className="focusable inline-flex items-center gap-1.5 rounded text-sm font-bold text-brand-600 hover:text-cyan-600 dark:text-brand-300 dark:hover:text-cyan-400"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path d="M19 12H5m6 6-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {lessonMeta.title}
            </Link>
            <h1 className="heading mt-2 text-4xl">{quiz.title || 'Quiz'}</h1>
            <p className="prose-muted mt-2 text-sm font-medium">
              {quiz.questions.length} questions · pass mark {quiz.passingScore}%
            </p>
          </header>

          {/* Result summary */}
          {phase !== 'taking' && evaluation && (
            <div className="mb-8">
              <QuizResult
                evaluation={evaluation}
                passingScore={quiz.passingScore}
                onRetry={handleRetry}
                onReview={() => setPhase('reviewing')}
              />
            </div>
          )}

          {/* Progress (while taking) */}
          {phase === 'taking' && (
            <div className="sticky top-[4.5rem] z-10 mb-6 rounded-2xl border border-ink-200 bg-ink-50/90 p-3 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
              <QuizProgress answered={answeredCount} total={quiz.questions.length} />
            </div>
          )}

          {/* Questions: shown while taking or reviewing */}
          {phase !== 'results' && (
            <div className="space-y-5">
              {quiz.questions.map((q, i) => (
                <QuizQuestion
                  key={q.id}
                  question={q}
                  index={i}
                  answer={answers[q.id]}
                  result={resultFor(q.id)}
                  onAnswerChange={(value) => setAnswer(q.id, value)}
                />
              ))}
            </div>
          )}

          {phase === 'taking' ? (
            <div className="mt-8 flex items-center justify-between gap-4">
              <p className="prose-muted text-sm font-medium tabular-nums">
                {answeredCount} of {quiz.questions.length} answered
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={answeredCount === 0}
                className="btn-gradient"
              >
                Submit quiz
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : (
            phase === 'reviewing' && (
              <div className="mt-8 text-center">
                <button type="button" onClick={handleRetry} className="btn-primary">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12a8 8 0 1 1 2.3 5.7M4 20v-5h5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Try again
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
