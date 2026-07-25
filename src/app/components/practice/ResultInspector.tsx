'use client';

import Link from 'next/link';
import {
  ArrowCounterClockwise,
  ArrowRight,
  CheckCircle,
  Eye,
  LockKey,
  NotePencil,
  PencilSimpleLine,
  WarningCircle,
} from '@phosphor-icons/react';
import { buildPracticeReviewReport, type PracticeReviewTone } from '@/lib/practice-session-report';
import type { PracticeQuestion } from '@/lib/types';

function queueToneClass(tone: PracticeReviewTone) {
  return {
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
  }[tone];
}

export default function ResultInspector({
  questions,
  answers,
  showResults,
  flaggedQuestionIds,
  reviewNotesByQuestionId,
  rubricRatingsByQuestionId,
  annotationCount,
  elapsedSeconds,
  onReveal,
  onEditAnswers,
  onReset,
  onClearLocalData,
  onSelectQuestion,
}: {
  questions: PracticeQuestion[];
  answers: Record<string, string>;
  showResults: boolean;
  flaggedQuestionIds: string[];
  reviewNotesByQuestionId: Record<string, string>;
  rubricRatingsByQuestionId: Record<string, Record<string, number>>;
  annotationCount: number;
  elapsedSeconds: number;
  onReveal: () => void;
  onEditAnswers: () => void;
  onReset: () => void;
  onClearLocalData: () => void;
  onSelectQuestion: (questionId: string) => void;
}) {
  const report = buildPracticeReviewReport({
    questions,
    answers,
    showResults,
    flaggedQuestionIds,
    reviewNotesByQuestionId,
    rubricRatingsByQuestionId,
    elapsedSeconds,
  });
  const { score, canReveal, manualOnly, noteCount, elapsedLabel, queue, completionPercent, questionTypeStats, focusSummary, nextSteps, rubricSummary } = report;
  const headline = showResults ? 'Local attempt complete' : '只读预览模式';
  const summary = showResults
    ? manualOnly
      ? `当前有 ${score.manualReview}/${score.total} 份回应进入本地待反馈状态。这里不会写入 history、错题本或 Supabase。`
      : `当前本地命中 ${score.correct}/${score.objectiveTotal} 道客观题，accuracy ${score.accuracy}%。这里不会写入 history、错题本或 Supabase。`
    : '完成本地检查后，这里会生成本机 Review Report 和复盘队列。';

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-line bg-ink text-white shadow-[0_22px_58px_-38px_rgba(24,24,27,0.85)]">
      <div className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
            <Eye size={20} weight="regular" />
          </span>
          <div>
            <p className="text-sm font-semibold">{headline}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">{summary}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PreviewMetric label="已填写" value={`${score.answered}/${score.total}`} />
          <PreviewMetric label="完成度" value={`${completionPercent}%`} />
          <PreviewMetric label={manualOnly ? '待反馈' : '正确率'} value={showResults ? manualOnly ? String(score.manualReview) : `${score.accuracy}%` : '待检查'} />
          <PreviewMetric label="用时" value={elapsedLabel} />
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <StatusChip icon={WarningCircle} label="Skipped" value={String(score.skipped)} tone="amber" />
          <StatusChip icon={NotePencil} label="Flags / Notes" value={`${flaggedQuestionIds.length} / ${noteCount}`} tone="sky" />
          <StatusChip icon={PencilSimpleLine} label="Annotations" value={String(annotationCount)} tone="zinc" />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/65">
            <LockKey size={14} weight="regular" />
            {showResults ? '本地 Review Report' : '下一阶段'}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/55">
            {showResults
              ? focusSummary
              : '点击本地检查后会锁定当前答案，生成本机复盘队列；你仍可返回编辑并重新检查。'}
          </p>
        </div>

        {showResults && questionTypeStats.length > 0 && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs font-semibold text-white/65">Question Type Breakdown</p>
            <div className="mt-3 space-y-2">
              {questionTypeStats.map((stat) => (
                <div key={stat.questionType} className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-semibold text-white/75">{stat.label}</span>
                    <span className="font-semibold tabular-nums text-white/55">
                      {stat.accuracy === null ? `${stat.answered}/${stat.total} done` : `${stat.correct}/${stat.total - stat.manualReview} · ${stat.accuracy}%`}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-white/70"
                      style={{ width: `${stat.accuracy ?? Math.round((stat.answered / stat.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showResults && rubricSummary.ratedQuestions > 0 && (
          <div className="mt-5 rounded-2xl border border-sky-200/20 bg-sky-200/10 p-4">
            <p className="text-xs font-semibold text-sky-100">Rubric Self-rating</p>
            <p className="mt-2 text-xs leading-relaxed text-sky-100/70">
              已完成 {rubricSummary.ratedQuestions} 份主观回应自评
              {rubricSummary.averageBand ? ` · 平均 Band ${rubricSummary.averageBand}` : ''}。这是本地自评，不代表正式评分。
            </p>
          </div>
        )}

        {showResults && nextSteps.length > 0 && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-xs font-semibold text-white/65">Next Actions</p>
            <ol className="mt-3 space-y-2 text-xs leading-relaxed text-white/55">
              {nextSteps.map((step, index) => (
                <li key={step} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-white/70">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={showResults ? onEditAnswers : onReveal}
            disabled={!canReveal && !showResults}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/12 disabled:text-white/35 disabled:hover:translate-y-0"
          >
            {showResults ? <PencilSimpleLine size={17} weight="bold" /> : <CheckCircle size={17} weight="bold" />}
            {showResults ? '编辑答案' : '生成本地 Report'}
          </button>
          <button
            type="button"
            onClick={showResults ? onReveal : onReset}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/12 px-4 py-3 text-sm font-semibold text-white/75 transition-all hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.98]"
          >
            <ArrowCounterClockwise size={17} weight="bold" />
            {showResults ? '重新检查' : '清空重做'}
          </button>
        </div>

        {showResults && (
          <Link
            href="/practice/sessions"
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl border border-white/12 px-4 py-3 text-sm font-semibold text-white/75 transition-all hover:-translate-y-0.5 hover:bg-white/10 active:scale-[0.98]"
          >
            返回 Session Library
            <ArrowRight size={16} weight="bold" />
          </Link>
        )}

        <button
          type="button"
          onClick={onClearLocalData}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200/20 bg-red-200/10 px-4 py-3 text-sm font-semibold text-red-100 transition-all hover:-translate-y-0.5 hover:bg-red-200/15 active:scale-[0.98]"
        >
          清空本地 Session 数据
        </button>
      </div>

      {showResults && (
        <div className="border-t border-white/10 bg-white/[0.04] p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Review Queue</p>
              <p className="mt-1 text-xs text-white/45">优先显示错题、跳过、待反馈、标记和有笔记的题。</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/60">
              {queue.length} items
            </span>
          </div>

          {queue.length > 0 ? (
            <div className="space-y-2">
              {queue.map(({ question, label, tone, userAnswer, acceptedAnswer, note }) => {
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => onSelectQuestion(question.id)}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-white/[0.09] active:scale-[0.99]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">Question {question.question_number}</span>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${queueToneClass(tone)}`}>{label}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/55">{question.question_text}</p>
                    <div className="mt-2 grid gap-2 text-xs text-white/45 sm:grid-cols-2">
                      <p>你的答案：{userAnswer.trim() || '未作答'}</p>
                      <p>参考：{acceptedAnswer}</p>
                    </div>
                    {note && <p className="mt-2 rounded-xl bg-white/[0.06] px-3 py-2 text-xs leading-relaxed text-sky-100">{note}</p>}
                    {question.explanation && <p className="mt-2 text-xs leading-relaxed text-white/45">{question.explanation}</p>}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-white/60">
              没有需要优先复盘的题。可以返回 Library，或编辑答案后重新检查。
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
      <div className="flex items-center gap-2 text-white/45">
        <CheckCircle size={14} weight="regular" />
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function StatusChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof WarningCircle;
  label: string;
  value: string;
  tone: 'amber' | 'sky' | 'zinc';
}) {
  const toneClass = {
    amber: 'border-amber-200/20 bg-amber-200/10 text-amber-100',
    sky: 'border-sky-200/20 bg-sky-200/10 text-sky-100',
    zinc: 'border-white/10 bg-white/[0.06] text-white/65',
  }[tone];

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-70">
        <Icon size={13} weight="regular" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
