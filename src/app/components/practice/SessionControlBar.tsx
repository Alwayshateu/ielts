'use client';

import { useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';
import { motion } from 'motion/react';
import {
  ArrowCounterClockwise,
  CheckCircle,
  Clock,
  Eye,
  Flag,
  ListChecks,
  PauseCircle,
  Timer,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import type { PracticeUnit } from '@/lib/types';
import { formatClock } from '@/lib/practice-clock';
import { springSnap } from '../ui/motion-presets';

type SessionScore = {
  answered: number;
  correct: number;
  total: number;
  accuracy: number;
  manualReview?: number;
  objectiveTotal?: number;
};

export default function SessionControlBar({
  unit,
  score,
  showResults,
  elapsedSeconds,
  unansweredCount,
  flaggedCount,
  examMode,
  examDurationSeconds,
  autoSubmitted,
  onElapsedChange,
  onReveal,
  onReviewUnanswered,
  onReset,
  onStartExam,
  onExitExam,
  onExamExpire,
}: {
  unit: PracticeUnit;
  score: SessionScore;
  showResults: boolean;
  elapsedSeconds: number;
  unansweredCount: number;
  flaggedCount: number;
  examMode: boolean;
  examDurationSeconds: number;
  autoSubmitted: boolean;
  onElapsedChange: Dispatch<SetStateAction<number>>;
  onReveal: () => void;
  onReviewUnanswered: () => void;
  onReset: () => void;
  onStartExam: () => void;
  onExitExam: () => void;
  onExamExpire: () => void;
}) {
  const progress = score.total > 0 ? Math.round((score.answered / score.total) * 100) : 0;
  const manualReviewCount = score.manualReview ?? 0;
  const objectiveTotal = score.objectiveTotal ?? score.total;
  const reviewSummary = manualReviewCount > 0 && objectiveTotal === 0
    ? `本地复盘：${manualReviewCount}/${score.total} 份回应已进入待反馈状态，正式版本后续会写入 session attempt。`
    : `本地复盘：${score.correct}/${objectiveTotal} 道客观题命中，正式版本后续会写入 session attempt。`;
  const timeLimit = unit.time_limit_seconds;
  const examDeadline = examMode ? examDurationSeconds : typeof timeLimit === 'number' ? timeLimit : null;
  const remainingSeconds = examDeadline === null ? null : Math.max(0, examDeadline - elapsedSeconds);
  const examExpired = examMode && remainingSeconds !== null && remainingSeconds <= 0;
  const timeLabel = remainingSeconds === null ? '不限时' : formatClock(remainingSeconds);
  const timeTone = remainingSeconds !== null && remainingSeconds <= (examMode ? 60 : 180) ? 'urgent' : 'default';
  const canReveal = score.answered > 0;
  const hasUnanswered = unansweredCount > 0;
  const canUsePrimary = hasUnanswered || canReveal;
  const primaryLabel = showResults
    ? '重新检查'
    : examMode
      ? '交卷'
      : hasUnanswered
        ? '查看未完成'
        : '检查答案';
  const primaryAction = examMode || showResults || !hasUnanswered ? onReveal : onReviewUnanswered;

  useEffect(() => {
    if (showResults) return;
    if (remainingSeconds !== null && remainingSeconds <= 0) return;

    const timer = window.setInterval(() => {
      onElapsedChange((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [onElapsedChange, remainingSeconds, showResults]);

  useEffect(() => {
    if (examMode && examExpired && !showResults) {
      onExamExpire();
    }
  }, [examExpired, examMode, onExamExpire, showResults]);

  const status = useMemo(() => {
    if (showResults) return 'Review Mode';
    if (examMode) return 'Exam Mode';
    if (score.answered === score.total && score.total > 0) return 'Ready to Check';
    return 'Drafting';
  }, [examMode, score.answered, score.total, showResults]);

  return (
    <motion.section
      layout
      transition={springSnap}
      className="sticky top-3 z-10 mb-6 overflow-hidden rounded-[1.75rem] border border-line bg-surface/92 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_20px_54px_-34px_rgba(24,24,27,0.32)] backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-accent/12 blur-3xl" aria-hidden="true" />

      {autoSubmitted && showResults && (
        <div className="relative mb-3 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          <WarningCircle size={15} weight="fill" />
          时间到，已自动交卷。下面是本次限时结果。
        </div>
      )}
      {examMode && !showResults && (
        <div className="relative mb-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          <Timer size={15} weight="fill" />
          限时考试模式：倒计时归零会自动交卷，中途离开或刷新会重置。
        </div>
      )}

      <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[30rem]">
          <ControlMetric icon={examMode ? Timer : Clock} label={examMode ? '考试剩余' : '剩余时间'} value={timeLabel} tone={timeTone} />
          <ControlMetric icon={ListChecks} label="完成进度" value={`${score.answered}/${score.total}`} tone="default" />
          <ControlMetric icon={flaggedCount > 0 ? Flag : examMode ? Timer : showResults ? Eye : PauseCircle} label={flaggedCount > 0 ? '待回看' : 'Session 状态'} value={flaggedCount > 0 ? `${flaggedCount} flagged` : status} tone={showResults ? 'review' : examMode || flaggedCount > 0 ? 'urgent' : 'default'} />
        </div>

        <div className="min-w-0 flex-1 xl:max-w-sm">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-ink-subtle">
            <span>Answer sheet progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
            <motion.div
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={springSnap}
              className={`h-full rounded-full ${showResults ? 'bg-emerald-600' : 'bg-accent'}`}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
            {showResults
              ? reviewSummary
              : examMode
                ? `限时 ${formatClock(examDurationSeconds)}：模拟真实考试节奏，时间用完自动交卷。所有数据仍只留在本地。`
                : '这是只读预览控制条：计时、进度和检查都只在本地发生。'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
          <button
            type="button"
            onClick={primaryAction}
            disabled={!canUsePrimary}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_-24px_rgba(24,24,27,0.78)] transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:hover:translate-y-0"
          >
            <CheckCircle size={17} weight="bold" />
            {primaryLabel}
          </button>
          {examMode ? (
            <button
              type="button"
              onClick={onExitExam}
              className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition-all hover:-translate-y-0.5 hover:border-amber-300 active:scale-[0.98]"
            >
              <XCircle size={17} weight="bold" />
              退出限时
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartExam}
              disabled={showResults}
              className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink-muted transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:text-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <Timer size={17} weight="bold" />
              开始限时
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink-muted transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:text-ink active:scale-[0.98]"
          >
            <ArrowCounterClockwise size={17} weight="bold" />
            重做答题
          </button>
        </div>
      </div>
    </motion.section>
  );
}

function ControlMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tone: 'default' | 'review' | 'urgent';
}) {
  const toneClass = {
    default: 'bg-zinc-50 text-ink-muted',
    review: 'bg-emerald-50 text-emerald-700',
    urgent: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <div className={`rounded-2xl border border-line px-3 py-2 ${toneClass}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold opacity-70">
        <Icon size={13} weight="regular" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
