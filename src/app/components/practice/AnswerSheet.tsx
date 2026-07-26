'use client';

import { Flag, Heart, NotePencil } from '@phosphor-icons/react';
import { getPracticeAcceptedAnswers, getPracticeAnswerState } from '@/lib/practice-answer-check';
import { analyzeWritingResponse, type WritingFeedbackStatus } from '@/lib/practice-writing-feedback';
import type { PracticeQuestion } from '@/lib/types';
import { useFavoriteQuestions } from './useFavoriteQuestions';

const MISTAKE_REASONS = [
  { id: 'location', label: '定位错误' },
  { id: 'paraphrase', label: '同义替换' },
  { id: 'grammar', label: '语法/词形' },
  { id: 'careless', label: '粗心' },
  { id: 'time', label: '时间不够' },
];

const WRITING_RUBRIC = [
  { id: 'taskResponse', label: 'Task Response' },
  { id: 'coherence', label: 'Coherence' },
  { id: 'lexical', label: 'Lexical' },
  { id: 'grammar', label: 'Grammar' },
];

const SPEAKING_RUBRIC = [
  { id: 'fluency', label: 'Fluency' },
  { id: 'lexical', label: 'Lexical' },
  { id: 'grammar', label: 'Grammar' },
  { id: 'pronunciation', label: 'Pronunciation' },
];

function optionMarker(index: number) {
  return String.fromCharCode(65 + index);
}

function labelQuestionType(type: PracticeQuestion['question_type']) {
  const labels: Record<PracticeQuestion['question_type'], string> = {
    multiple_choice: 'Multiple Choice',
    true_false_not_given: 'True / False / Not Given',
    sentence_completion: 'Sentence Completion',
    short_answer: 'Short Answer',
    writing_task: 'Writing Task',
    speaking_response: 'Speaking Response',
  };

  return labels[type] ?? type;
}

function isExtendedResponse(question: PracticeQuestion) {
  return question.question_type === 'writing_task' || question.question_type === 'speaking_response';
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function getSpeakingChecklist(answer: string) {
  return [
    { label: 'What / when / who covered', done: /\b(what|when|who|because|benefit|improve|changed?)\b/i.test(answer) || countWords(answer) >= 30 },
    { label: 'Reason or example included', done: /\b(for example|because|for instance|as a result|so that)\b/i.test(answer) },
    { label: 'Self-review note present', done: /\b(fluency|pronunciation|grammar|vocabulary|improve|next time)\b/i.test(answer) },
  ];
}

const WRITING_STATUS_TONES: Record<WritingFeedbackStatus, { chip: string; bar: string }> = {
  empty: { chip: 'bg-white text-amber-800/80', bar: 'bg-amber-300' },
  under: { chip: 'bg-white text-amber-800', bar: 'bg-amber-400' },
  near: { chip: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
  met: { chip: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
};

function WritingMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/75 px-3 py-2 text-center">
      <p className="text-base font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-amber-900/60">{label}</p>
    </div>
  );
}

function WritingFeedbackPanel({ question, answer }: { question: PracticeQuestion; answer: string }) {
  const analysis = analyzeWritingResponse(answer, question.metadata?.wordTarget);
  const tone = WRITING_STATUS_TONES[analysis.status];
  const statusLabel =
    analysis.status === 'empty'
      ? '开始写作'
      : analysis.status === 'met'
        ? `已达标 · 多 ${analysis.wordCount - analysis.wordTarget} 词`
        : `还差 ${analysis.remainingWords} 词`;

  return (
    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-amber-950">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-amber-900/80">Writing 实时反馈</p>
          <p className="mt-1 text-2xl font-semibold leading-none tabular-nums text-ink">
            {analysis.wordCount}
            <span className="text-sm font-medium text-ink-subtle"> / {analysis.wordTarget}+ words</span>
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.chip}`}>{statusLabel}</span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
        <div
          className={`h-full rounded-full transition-all duration-300 ${tone.bar}`}
          style={{ width: `${analysis.progressPercent}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <WritingMetric label="句子" value={String(analysis.sentenceCount)} />
        <WritingMetric label="段落" value={String(analysis.paragraphCount)} />
        <WritingMetric label="平均句长" value={`${analysis.avgWordsPerSentence} 词`} />
      </div>

      {analysis.longSentenceCount > 0 && (
        <p className="mt-2 rounded-xl bg-white/60 px-3 py-2 text-[11px] leading-relaxed text-amber-900/80">
          ⚠️ 有 {analysis.longSentenceCount} 个句子超过 40 词，可考虑拆分以提升 Coherence。
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-amber-900/80">结构自检</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold opacity-75">
          {analysis.checklistCompleted}/{analysis.checklist.length}
        </span>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {analysis.checklist.map((item) => (
          <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-2 text-xs">
            <span className={`h-2 w-2 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
            <span className={item.done ? 'font-semibold' : 'opacity-70'}>{item.label}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-amber-900/60">
        本地字数与结构提示，非自动评分；正式版本会接 rubric / AI 反馈。提交后可在下方做 band 自评。
      </p>
    </div>
  );
}

function ExtendedResponseCoach({ answer }: { answer: string }) {
  const checklist = getSpeakingChecklist(answer);
  const completed = checklist.filter((item) => item.done).length;

  return (
    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-950">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold">Speaking rehearsal check</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold opacity-75">{completed}/{checklist.length}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {checklist.map((item) => (
          <div key={item.label} className="flex items-center gap-2 rounded-xl bg-white/75 px-3 py-2 text-xs">
            <span className={`h-2 w-2 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
            <span className={item.done ? 'font-semibold' : 'opacity-70'}>{item.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed opacity-70">
        这不是录音评分，只帮助你检查是否完成 cue card 回答和自评。
      </p>
    </div>
  );
}

function RubricSelfRating({
  question,
  ratings,
  onRate,
}: {
  question: PracticeQuestion;
  ratings: Record<string, number>;
  onRate: (criterion: string, rating: number) => void;
}) {
  const rubric = question.question_type === 'writing_task' ? WRITING_RUBRIC : SPEAKING_RUBRIC;

  return (
    <div className="mt-4 rounded-2xl border border-line bg-zinc-50/70 p-3">
      <p className="text-xs font-semibold text-ink-subtle">IELTS self-rating rubric</p>
      <div className="mt-3 grid gap-2">
        {rubric.map((criterion) => (
          <div key={criterion.id} className="rounded-2xl border border-line bg-surface px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-ink">{criterion.label}</span>
              <span className="text-xs font-semibold tabular-nums text-ink-subtle">
                Band {ratings[criterion.id] ?? '未评'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[5, 5.5, 6, 6.5, 7, 7.5, 8].map((band) => (
                <button
                  key={band}
                  type="button"
                  onClick={() => onRate(criterion.id, band)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-[0.98] ${
                    ratings[criterion.id] === band
                      ? 'border-ink bg-ink text-white'
                      : 'border-line bg-zinc-50 text-ink-subtle hover:border-zinc-300 hover:text-ink'
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MistakeReasonPicker({
  selectedReasons,
  onToggle,
}: {
  selectedReasons: string[];
  onToggle: (reason: string) => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-line bg-zinc-50/70 p-3">
      <p className="text-xs font-semibold text-ink-subtle">错因标签</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {MISTAKE_REASONS.map((reason) => {
          const selected = selectedReasons.includes(reason.id);

          return (
            <button
              key={reason.id}
              type="button"
              onClick={() => onToggle(reason.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] ${
                selected
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-line bg-surface text-ink-subtle hover:border-red-200 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              {reason.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AnswerSheet({
  questions,
  answers,
  activeQuestionId,
  showResults,
  flaggedQuestionIds,
  reviewNotesByQuestionId,
  mistakeReasonsByQuestionId,
  rubricRatingsByQuestionId,
  onAnswer,
  onToggleFlag,
  onReviewNote,
  onToggleMistakeReason,
  onRubricRating,
}: {
  questions: PracticeQuestion[];
  answers: Record<string, string>;
  activeQuestionId: string;
  showResults: boolean;
  flaggedQuestionIds: string[];
  reviewNotesByQuestionId: Record<string, string>;
  mistakeReasonsByQuestionId: Record<string, string[]>;
  rubricRatingsByQuestionId: Record<string, Record<string, number>>;
  onAnswer: (questionId: string, answer: string) => void;
  onToggleFlag: (questionId: string) => void;
  onReviewNote: (questionId: string, note: string) => void;
  onToggleMistakeReason: (questionId: string, reason: string) => void;
  onRubricRating: (questionId: string, criterion: string, rating: number) => void;
}) {
  const favorites = useFavoriteQuestions(questions);

  return (
    <div className="space-y-4">
      {questions.map((question) => {
        const active = question.id === activeQuestionId;
        const answer = answers[question.id] ?? '';
        const answered = Boolean(answer.trim());
        const state = getPracticeAnswerState(question, answer, showResults);
        const correct = state === 'correct';
        const skipped = state === 'skipped';
        const manualReview = state === 'manual_review';
        const acceptedAnswers = showResults ? getPracticeAcceptedAnswers(question) : [];
        const extendedResponse = isExtendedResponse(question);
        const flagged = flaggedQuestionIds.includes(question.id);
        const reviewNote = reviewNotesByQuestionId[question.id] ?? '';
        const answerLocked = showResults;
        const mistakeReasons = mistakeReasonsByQuestionId[question.id] ?? [];
        const rubricRatings = rubricRatingsByQuestionId[question.id] ?? {};

        return (
          <section
            key={question.id}
            id={`question-${question.id}`}
            className={`scroll-mt-6 overflow-hidden rounded-[1.5rem] border bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_14px_42px_-36px_rgba(24,24,27,0.34)] transition-colors ${
              showResults
                ? correct
                  ? 'border-emerald-200'
                  : manualReview
                    ? 'border-sky-200'
                    : skipped
                      ? 'border-amber-200'
                      : 'border-red-200'
                : active
                  ? 'border-accent/35'
                  : 'border-line'
            }`}
          >
            <div className="border-b border-line bg-zinc-50/75 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent">
                    Question {question.question_number}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleFlag(question.id)}
                    aria-pressed={flagged}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all active:scale-[0.98] ${
                      flagged
                        ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        : 'border-line bg-surface text-ink-subtle hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700'
                    }`}
                  >
                    <Flag size={13} weight={flagged ? 'fill' : 'regular'} />
                    {flagged ? '已标记' : '稍后回看'}
                  </button>
                  {favorites.ready && favorites.canSave(question.id) && (
                    <button
                      type="button"
                      onClick={() => void favorites.toggleFavorite(question.id)}
                      disabled={favorites.pendingId === question.id}
                      aria-pressed={favorites.savedIds.has(question.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-60 ${
                        favorites.savedIds.has(question.id)
                          ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'border-line bg-surface text-ink-subtle hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
                      }`}
                    >
                      <Heart size={13} weight={favorites.savedIds.has(question.id) ? 'fill' : 'regular'} />
                      {favorites.savedIds.has(question.id) ? '已收藏' : '收藏'}
                    </button>
                  )}
                </div>
                <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-subtle">
                  {labelQuestionType(question.question_type)}
                </span>
              </div>
              <h2 className="mt-4 text-base font-semibold leading-relaxed text-ink">
                {question.question_text}
              </h2>
            </div>

            <div className="p-5">
              {question.options ? (
                <div className="overflow-hidden rounded-2xl border border-line" role="radiogroup" aria-label={`Question ${question.question_number}`}>
                  {question.options.map((option, index) => {
                    const selected = answer === option;
                    const optionCorrect = showResults && acceptedAnswers.includes(option);
                    return (
                      <button
                        key={`${question.id}-${option}-${index}`}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onAnswer(question.id, option)}
                        disabled={answerLocked}
                        className={`group flex w-full items-start gap-4 border-b border-line px-4 py-4 text-left text-sm transition-colors last:border-b-0 active:scale-[0.995] disabled:cursor-default disabled:active:scale-100 ${
                          showResults && optionCorrect
                            ? 'bg-emerald-50 text-emerald-900'
                            : showResults && selected && !correct
                              ? 'bg-red-50 text-red-900'
                              : selected
                                ? 'bg-accent-tint text-ink'
                                : 'bg-surface text-ink-muted hover:bg-zinc-50 hover:text-ink'
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                            showResults && optionCorrect
                              ? 'border-emerald-600 bg-emerald-600 text-white'
                              : showResults && selected && !correct
                                ? 'border-red-500 bg-red-500 text-white'
                                : selected
                                  ? 'border-accent bg-accent text-white'
                                  : 'border-zinc-300 bg-zinc-50 text-ink-subtle group-hover:border-accent/35 group-hover:text-accent'
                          }`}
                          aria-hidden="true"
                        >
                          {optionMarker(index)}
                        </span>
                        <span className="leading-relaxed">{option}</span>
                      </button>
                    );
                  })}
                </div>
              ) : extendedResponse ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink">你的回应</span>
                  <textarea
                    value={answer}
                    onChange={(event) => onAnswer(question.id, event.target.value)}
                    rows={question.question_type === 'writing_task' ? 10 : 6}
                    placeholder={
                      question.question_type === 'writing_task'
                        ? '写下 Task response 草稿，当前只保存在本机预览'
                        : '写下 speaking response 要点或自评，当前只保存在本机预览'
                    }
                    disabled={answerLocked}
                    className="w-full resize-y rounded-2xl border border-line bg-zinc-50 px-4 py-3 text-sm leading-7 text-ink outline-none transition-all placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10 disabled:cursor-default disabled:bg-zinc-100 disabled:text-ink-muted"
                  />
                  {question.question_type === 'writing_task' ? (
                    <WritingFeedbackPanel question={question} answer={answer} />
                  ) : (
                    <>
                      <p className="mt-2 text-xs text-ink-subtle">
                        {countWords(answer)} words · 本地 draft，不会提交数据库
                      </p>
                      <ExtendedResponseCoach answer={answer} />
                    </>
                  )}
                </label>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink">你的答案</span>
                  <input
                    type="text"
                    value={answer}
                    onChange={(event) => onAnswer(question.id, event.target.value)}
                    placeholder="输入答案，当前预览不会提交数据库"
                    disabled={answerLocked}
                    className="w-full rounded-2xl border border-line bg-zinc-50 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10 disabled:cursor-default disabled:bg-zinc-100 disabled:text-ink-muted"
                  />
                </label>
              )}

              <div className="mt-4 rounded-2xl border border-line bg-zinc-50/70 p-3">
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-ink-subtle">
                    <NotePencil size={14} weight="regular" />
                    本题复盘笔记
                  </span>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => onReviewNote(question.id, event.target.value)}
                    rows={2}
                    placeholder="记录为什么要回看、对应 passage 证据、或写作/口语自评..."
                    className="w-full resize-none rounded-2xl border border-line bg-surface px-3 py-2 text-xs leading-relaxed text-ink outline-none transition-all placeholder:text-ink-subtle focus:border-accent focus:ring-4 focus:ring-accent/10"
                  />
                </label>
              </div>

              {showResults && (
                <div
                  className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
                    correct
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : manualReview
                        ? 'border-sky-200 bg-sky-50 text-sky-800'
                        : skipped
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {correct ? '回答正确' : manualReview ? '等待人工 / AI 反馈' : answered ? '需要复盘' : '尚未作答'}
                    </p>
                    <p className="text-xs opacity-75">只读本地检查，不会保存</p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed opacity-85">
                    {state === 'manual_review'
                      ? '这类题目没有标准单字符串答案，正式版本会进入 rubric / AI feedback / 自评流程。'
                      : `参考答案：${acceptedAnswers[0] ?? '未提供'}${
                          acceptedAnswers.length > 1 ? `（可接受：${acceptedAnswers.slice(1).join(' / ')}）` : ''
                        }`}
                  </p>
                  {question.explanation && (
                    <p className="mt-2 border-t border-current/15 pt-2 text-xs leading-relaxed opacity-85">
                      {question.explanation}
                    </p>
                  )}
                </div>
              )}

              {showResults && !manualReview && !correct && (
                <MistakeReasonPicker
                  selectedReasons={mistakeReasons}
                  onToggle={(reason) => onToggleMistakeReason(question.id, reason)}
                />
              )}

              {showResults && manualReview && extendedResponse && (
                <RubricSelfRating
                  question={question}
                  ratings={rubricRatings}
                  onRate={(criterion, rating) => onRubricRating(question.id, criterion, rating)}
                />
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
