import type { AnswerValue, QuestionResult, QuizQuestion as QuizQuestionModel } from '../../core/models/quiz';

interface Props {
  question: QuizQuestionModel;
  index: number;
  answer?: AnswerValue;
  /** When provided (review mode), renders correct/incorrect styling. */
  result?: QuestionResult;
  onAnswerChange: (value: AnswerValue) => void;
}

/**
 * Renders one quiz question of any supported type and emits answer changes.
 * The parent owns the answer state; this component is otherwise presentational.
 */
export function QuizQuestion({ question, index, answer, result, onAnswerChange }: Props) {
  const reviewing = result !== undefined;

  // ---- single-choice -------------------------------------------------------
  const selectSingle = (optionId: string) => {
    if (reviewing) return;
    onAnswerChange(optionId);
  };
  const isSingleSelected = (optionId: string) => answer === optionId;

  // ---- multiple-choice -----------------------------------------------------
  const toggleMultiple = (optionId: string) => {
    if (reviewing) return;
    const current = Array.isArray(answer) ? [...answer] : [];
    const idx = current.indexOf(optionId);
    if (idx === -1) current.push(optionId);
    else current.splice(idx, 1);
    onAnswerChange(current);
  };
  const isMultipleSelected = (optionId: string) =>
    Array.isArray(answer) && answer.includes(optionId);

  // ---- ordering ------------------------------------------------------------
  const orderedIds = (): string[] => {
    if (question.type !== 'ordering') return [];
    const current = Array.isArray(answer) ? answer : [];
    return current.length ? current : question.items.map((i) => i.id);
  };
  const orderedItemText = (id: string): string => {
    if (question.type !== 'ordering') return '';
    return question.items.find((i) => i.id === id)?.text ?? '';
  };
  const move = (id: string, dir: -1 | 1) => {
    if (reviewing) return;
    const ids = [...orderedIds()];
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onAnswerChange(ids);
  };

  // ---- match-pair ----------------------------------------------------------
  const matchOptions = (): string[] => {
    if (question.type !== 'match-pair') return [];
    return [...question.pairs.map((p) => p.right)].sort((a, b) => a.localeCompare(b));
  };
  const matchValue = (left: string): string =>
    answer && typeof answer === 'object' && !Array.isArray(answer) ? (answer[left] ?? '') : '';
  const onMatchSelect = (left: string, value: string) => {
    const current =
      answer && typeof answer === 'object' && !Array.isArray(answer) ? { ...answer } : {};
    current[left] = value;
    onAnswerChange(current);
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition duration-200 ${
        reviewing
          ? result?.correct
            ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30'
            : 'border-rose-300 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/30'
          : 'border-ink-200 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900'
      }`}
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold ${
            reviewing
              ? result?.correct
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
              : 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
          }`}
        >
          {reviewing ? (
            result?.correct ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                  <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="sr-only">Correct. Question {index + 1}</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5">
                  <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                </svg>
                <span className="sr-only">Incorrect. Question {index + 1}</span>
              </>
            )
          ) : (
            index + 1
          )}
        </span>
        <p className="pt-1 font-bold text-ink-900 dark:text-white">{question.prompt}</p>
      </div>

      {/* single-choice */}
      {question.type === 'single-choice' && (
        <div className="space-y-2 sm:pl-11">
          {question.options.map((opt) => (
            <label
              key={opt.id}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                isSingleSelected(opt.id) && !reviewing
                  ? 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/60'
                  : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                className="h-4 w-4 shrink-0 accent-brand-600"
                checked={isSingleSelected(opt.id)}
                disabled={reviewing}
                onChange={() => selectSingle(opt.id)}
              />
              <span className="text-ink-700 dark:text-ink-200">{opt.text}</span>
              {reviewing && opt.id === question.answer && (
                <span className="ml-auto flex shrink-0 items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  correct
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      {/* multiple-choice */}
      {question.type === 'multiple-choice' && (
        <div className="space-y-2 sm:pl-11">
          {question.options.map((opt) => (
            <label
              key={opt.id}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                isMultipleSelected(opt.id) && !reviewing
                  ? 'border-brand-400 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/60'
                  : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800'
              }`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 accent-brand-600"
                checked={isMultipleSelected(opt.id)}
                disabled={reviewing}
                onChange={() => toggleMultiple(opt.id)}
              />
              <span className="text-ink-700 dark:text-ink-200">{opt.text}</span>
              {reviewing && question.answer.includes(opt.id) && (
                <span className="ml-auto flex shrink-0 items-center gap-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  correct
                </span>
              )}
            </label>
          ))}
        </div>
      )}

      {/* fill-blank */}
      {question.type === 'fill-blank' && (
        <div className="sm:pl-11">
          <input
            type="text"
            value={typeof answer === 'string' ? answer : ''}
            disabled={reviewing}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Type your answer…"
            aria-label={question.prompt}
            className="input-field max-w-md disabled:opacity-60"
          />
          {reviewing && (
            <p className="prose-muted mt-2 text-sm">
              Accepted:{' '}
              <span className="font-bold text-ink-700 dark:text-ink-200">
                {question.answer.join(', ')}
              </span>
            </p>
          )}
        </div>
      )}

      {/* ordering */}
      {question.type === 'ordering' && (
        <>
          <ol className="space-y-2 sm:pl-11">
            {orderedIds().map((id, i) => (
              <li
                key={id}
                className="flex items-center gap-3 rounded-xl border border-ink-200 px-4 py-2 dark:border-ink-700"
              >
                <span className="w-5 shrink-0 font-mono text-sm font-bold text-ink-400 tabular-nums">
                  {i + 1}.
                </span>
                <span className="min-w-0 text-ink-700 dark:text-ink-200">{orderedItemText(id)}</span>
                <span className="ml-auto flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => move(id, -1)}
                    disabled={reviewing || i === 0}
                    className="focusable grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-ink-800"
                    aria-label={`Move ${orderedItemText(id)} up`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="m6 15 6-6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(id, 1)}
                    disabled={reviewing || i === orderedIds().length - 1}
                    className="focusable grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-ink-800"
                    aria-label={`Move ${orderedItemText(id)} down`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </span>
              </li>
            ))}
          </ol>
          {reviewing && (
            <p className="prose-muted mt-3 text-sm sm:pl-11">
              Correct order:{' '}
              <span className="font-bold text-ink-700 dark:text-ink-200">
                {question.answer.map((id, i) => (
                  <span key={id}>
                    {orderedItemText(id)}
                    {i === question.answer.length - 1 ? '' : ' → '}
                  </span>
                ))}
              </span>
            </p>
          )}
        </>
      )}

      {/* match-pair */}
      {question.type === 'match-pair' && (
        <div className="space-y-2 sm:pl-11">
          {question.pairs.map((pair) => (
            <div
              key={pair.left}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-ink-200 px-4 py-2.5 dark:border-ink-700"
            >
              <span className="min-w-32 font-bold text-ink-700 dark:text-ink-200">{pair.left}</span>
              <svg className="h-4 w-4 shrink-0 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <select
                value={matchValue(pair.left)}
                disabled={reviewing}
                onChange={(e) => onMatchSelect(pair.left, e.target.value)}
                aria-label={`Match for ${pair.left}`}
                className="focusable min-h-11 flex-1 cursor-pointer rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-ink-800 transition focus:border-brand-500 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-100"
              >
                <option value="">— choose —</option>
                {matchOptions().map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {reviewing && (
                <span className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  = {pair.right}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {reviewing && question.explanation && (
        <div className="mt-4 flex gap-2.5 rounded-xl bg-ink-100 p-3.5 text-sm text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          <svg
            className="h-4 w-4 shrink-0 translate-y-0.5 text-brand-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 16v-4M12 8.5v.5" strokeLinecap="round" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <span>
            <span className="font-bold">Explanation:</span> {question.explanation}
          </span>
        </div>
      )}
    </div>
  );
}
