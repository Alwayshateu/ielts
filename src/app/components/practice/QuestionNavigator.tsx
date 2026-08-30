'use client';

import { getPracticeAnswerState, scorePracticeAnswers } from '@/lib/practice-answer-check';
import type { PracticeQuestion } from '@/lib/types';
import { CheckCircle, Circle, Flag, MinusCircle, NotePencil, PencilSimpleLine, XCircle } from '@phosphor-icons/react';

export default function QuestionNavigator({
  questions,
  answers,
  activeQuestionId,
  showResults,
  flaggedQuestionIds,
  reviewNotesByQuestionId,
  onSelect,
}: {
  questions: PracticeQuestion[];
  answers: Record<string, string>;
  activeQuestionId: string;
  showResults: boolean;
  flaggedQuestionIds: string[];
  reviewNotesByQuestionId: Record<string, string>;
  onSelect: (questionId: string) => void;
}) {
  const answeredCount = questions.filter((question) => answers[question.id]?.trim()).length;
  const flaggedCount = flaggedQuestionIds.length;
  const noteCount = Object.values(reviewNotesByQuestionId).filter((note) => note.trim()).length;
  const score = showResults ? scorePracticeAnswers(questions, answers) : null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">题组导航</p>
          <p className="mt-1 text-xs text-ink-subtle">
            {showResults && score
              ? score.manualReview > 0 && score.objectiveTotal === 0
                ? `${score.manualReview}/${questions.length} 待反馈`
                : `${score.correct}/${score.objectiveTotal} 正确`
              : `${answeredCount}/${questions.length} 已作答`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="rounded-full border border-line bg-zinc-50 px-2.5 py-1 text-ink-subtle">
            未完成 {questions.length - answeredCount}
          </span>
          <span className={`rounded-full border px-2.5 py-1 ${flaggedCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-line bg-zinc-50 text-ink-subtle'}`}>
            标记 {flaggedCount}
          </span>
          <span className={`rounded-full border px-2.5 py-1 ${noteCount > 0 ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-line bg-zinc-50 text-ink-subtle'}`}>
            笔记 {noteCount}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((question) => {
          const active = question.id === activeQuestionId;
          const state = getPracticeAnswerState(question, answers[question.id] ?? '', showResults);
          const flagged = flaggedQuestionIds.includes(question.id);
          const hasNote = Boolean(reviewNotesByQuestionId[question.id]?.trim());
          const Icon = state === 'correct'
            ? CheckCircle
            : state === 'incorrect'
              ? XCircle
              : state === 'manual_review'
                ? PencilSimpleLine
                : state === 'skipped'
                  ? MinusCircle
                  : state === 'answered'
                    ? CheckCircle
                    : Circle;
          const stateLabel = {
            unanswered: 'unanswered',
            answered: 'answered',
            correct: 'correct',
            incorrect: 'incorrect',
            skipped: 'skipped',
            manual_review: 'manual review',
          }[state];
          const stateClass = {
            unanswered: 'border-line bg-zinc-50 text-ink-muted hover:border-accent/30 hover:bg-accent-tint hover:text-accent',
            answered: 'border-accent/25 bg-accent-tint text-accent hover:border-accent/40',
            correct: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300',
            incorrect: 'border-red-200 bg-red-50 text-red-700 hover:border-red-300',
            skipped: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300',
            manual_review: 'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300',
          }[state];

          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelect(question.id)}
              aria-current={active ? 'step' : undefined}
              aria-label={`Question ${question.question_number}, ${stateLabel}${flagged ? ', flagged' : ''}${hasNote ? ', has review note' : ''}${active ? ', current' : ''}`}
              className={`relative flex h-11 items-center justify-center gap-1 rounded-xl border text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-[0.97] ${stateClass} ${
                active ? 'ring-2 ring-ink/75 ring-offset-2 ring-offset-surface' : ''
              }`}
            >
              <Icon size={14} weight={state === 'unanswered' ? 'regular' : 'bold'} />
              {question.question_number}
              {flagged && <Flag size={10} weight="fill" className="absolute right-1 top-1 text-amber-500" aria-hidden="true" />}
              {hasNote && <NotePencil size={10} weight="fill" className="absolute bottom-1 right-1 text-sky-500" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
