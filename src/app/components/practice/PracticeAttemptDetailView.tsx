'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUUpLeft,
  BookOpenText,
  CheckCircle,
  Clock,
  Headphones,
  Microphone,
  MinusCircle,
  NotePencil,
  PenNib,
  SealCheck,
  Target,
  TrendDown,
  TrendUp,
  XCircle,
} from '@phosphor-icons/react';
import {
  buildPracticeAttemptComparison,
  findPracticeAttempt,
  selectPracticeAttemptRetryAnswers,
  summarizePracticeAttemptOutcomes,
} from '@/lib/practice-attempt-detail';
import {
  readPracticeSessionHistory,
  type PracticeAttemptAnswer,
  type PracticeAttemptOutcome,
  type PracticeSessionHistoryEntry,
} from '@/lib/practice-session-history';
import { PRACTICE_HISTORY_HREF, PRACTICE_SESSIONS_HREF } from '@/lib/practice-session-links';
import { formatDifficulty } from '@/lib/question-labels';
import { formatClock } from '@/lib/practice-clock';
import type { PracticeQuestionType, PracticeSkill } from '@/lib/types';
import { riseChild, staggerParent } from '../ui/motion-presets';
import { deltaTone, formatSignedPercent, formatSignedSeconds } from './attempt-delta';

const SKILL_TONES: Record<PracticeSkill, { Icon: typeof BookOpenText; label: string; badge: string }> = {
  foundation: { Icon: Target, label: 'Foundation', badge: 'bg-zinc-100 text-ink-muted' },
  reading: { Icon: BookOpenText, label: 'Reading', badge: 'bg-emerald-50 text-emerald-700' },
  listening: { Icon: Headphones, label: 'Listening', badge: 'bg-sky-50 text-sky-700' },
  writing: { Icon: PenNib, label: 'Writing', badge: 'bg-amber-50 text-amber-700' },
  speaking: { Icon: Microphone, label: 'Speaking', badge: 'bg-rose-50 text-rose-700' },
};

const OUTCOME_TONES: Record<
  PracticeAttemptOutcome,
  { Icon: typeof CheckCircle; label: string; badge: string; card: string; text: string }
> = {
  correct: {
    Icon: CheckCircle,
    label: '正确',
    badge: 'bg-emerald-50 text-emerald-700',
    card: 'border-emerald-100',
    text: 'text-emerald-700',
  },
  incorrect: {
    Icon: XCircle,
    label: '错误',
    badge: 'bg-rose-50 text-rose-700',
    card: 'border-rose-100',
    text: 'text-rose-700',
  },
  skipped: {
    Icon: MinusCircle,
    label: '未作答',
    badge: 'bg-amber-50 text-amber-700',
    card: 'border-amber-100',
    text: 'text-amber-700',
  },
  manual_review: {
    Icon: NotePencil,
    label: '待人工评',
    badge: 'bg-sky-50 text-sky-700',
    card: 'border-sky-100',
    text: 'text-sky-700',
  },
};

const QUESTION_TYPE_LABELS: Record<PracticeQuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false_not_given: 'True / False / NG',
  sentence_completion: 'Sentence Completion',
  short_answer: 'Short Answer',
  writing_task: 'Writing Task',
  speaking_response: 'Speaking Response',
};

type OutcomeFilter = 'all' | PracticeAttemptOutcome;

function formatStamp(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PracticeAttemptDetailView({ attemptId }: { attemptId: string }) {
  const [entries] = useState<PracticeSessionHistoryEntry[]>(() => readPracticeSessionHistory());
  const [filter, setFilter] = useState<OutcomeFilter>('all');

  const attempt = useMemo(() => findPracticeAttempt(entries, attemptId), [attemptId, entries]);

  if (!attempt) {
    return <AttemptMissing />;
  }

  return <AttemptDetail attempt={attempt} entries={entries} filter={filter} onFilterChange={setFilter} />;
}

function AttemptMissing() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <BackLink />
      <div className="rounded-2xl border border-dashed border-line bg-canvas p-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-tint text-accent">
          <Clock size={26} weight="regular" />
        </span>
        <h1 className="mt-5 text-lg font-semibold text-ink">找不到这次复盘记录</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-subtle">
          记录只保存在本机 localStorage。如果你换了浏览器、清过缓存，或刚点了“清空记录”，这条快照就不在了。
        </p>
        <Link
          href={PRACTICE_HISTORY_HREF}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
        >
          回到 Session History
          <ArrowRight size={16} weight="bold" />
        </Link>
      </div>
    </main>
  );
}

function AttemptDetail({
  attempt,
  entries,
  filter,
  onFilterChange,
}: {
  attempt: PracticeSessionHistoryEntry;
  entries: PracticeSessionHistoryEntry[];
  filter: OutcomeFilter;
  onFilterChange: (next: OutcomeFilter) => void;
}) {
  const answers = useMemo(() => attempt.answers ?? [], [attempt.answers]);
  const tone = SKILL_TONES[attempt.skill] ?? SKILL_TONES.reading;
  const ToneIcon = tone.Icon;

  const outcomes = useMemo(() => summarizePracticeAttemptOutcomes(answers), [answers]);
  const retryAnswers = useMemo(() => selectPracticeAttemptRetryAnswers(answers), [answers]);
  const comparison = useMemo(() => buildPracticeAttemptComparison(entries, attempt), [attempt, entries]);

  const visibleAnswers = useMemo(
    () => (filter === 'all' ? answers : answers.filter((answer) => answer.outcome === filter)),
    [answers, filter]
  );

  const sessionHref = `/practice/session/${attempt.slug}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.header variants={riseChild} className="mb-7">
          <BackLink />
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
              <ToneIcon size={14} weight="regular" />
              {tone.label}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle">
              {formatDifficulty(attempt.difficulty)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle">
              第 {comparison.attemptIndex} / {comparison.unitAttempts} 次
            </span>
            {comparison.isPersonalBest && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <SealCheck size={14} weight="fill" />
                个人最佳
              </span>
            )}
          </div>
          <h1 className="text-tight mt-4 max-w-3xl text-3xl font-semibold text-ink sm:text-4xl">{attempt.title}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-ink-subtle">
            <span>{formatStamp(attempt.recordedAt)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock size={13} weight="regular" />
              用时 {formatClock(attempt.elapsedSeconds)}
            </span>
            <span>·</span>
            <span>完成 {attempt.completionPercent}%</span>
          </p>
        </motion.header>

        <motion.section variants={riseChild} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="正确率"
            value={attempt.accuracy === null ? '—' : `${attempt.accuracy}%`}
            hint={
              attempt.accuracy === null
                ? '本组无客观题'
                : comparison.accuracyDelta === null
                  ? '首次记录'
                  : `${formatSignedPercent(comparison.accuracyDelta)} 较上次`
            }
            hintTone={deltaTone(comparison.accuracyDelta)}
            hintIcon={deltaIcon(comparison.accuracyDelta)}
          />
          <StatTile
            label="客观题得分"
            value={attempt.objectiveTotal > 0 ? `${attempt.correct}/${attempt.objectiveTotal}` : '—'}
            hint={attempt.incorrect > 0 ? `${attempt.incorrect} 题做错` : '没有做错的题'}
          />
          <StatTile
            label="自评 Band"
            value={attempt.selfRatedBand === null ? '—' : attempt.selfRatedBand.toFixed(1)}
            hint={
              attempt.selfRatedBand === null
                ? '写作 / 口语'
                : comparison.bandDelta === null
                  ? '首次自评'
                  : `${comparison.bandDelta > 0 ? '+' : comparison.bandDelta < 0 ? '−' : '±'}${Math.abs(comparison.bandDelta).toFixed(1)} 较上次`
            }
            hintTone={deltaTone(comparison.bandDelta)}
            hintIcon={deltaIcon(comparison.bandDelta)}
          />
          <StatTile
            label="用时"
            value={formatClock(attempt.elapsedSeconds)}
            hint={
              comparison.elapsedDelta === null
                ? '首次记录'
                : `${formatSignedSeconds(comparison.elapsedDelta)} 较上次`
            }
          />
        </motion.section>

        {answers.length === 0 ? (
          <motion.section
            variants={riseChild}
            className="mt-5 rounded-2xl border border-dashed border-line bg-canvas p-7 text-center"
          >
            <h2 className="text-base font-semibold text-ink">这次记录没有逐题快照</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-subtle">
              逐题回顾是后来才加的能力，早先记录的成绩只保留了汇总数据。再练一次这组 Session，就能看到完整的逐题对照。
            </p>
            <Link
              href={sessionHref}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
            >
              重练这组 Session
              <ArrowRight size={16} weight="bold" />
            </Link>
          </motion.section>
        ) : (
          <>
            <QuestionReview
              answers={visibleAnswers}
              outcomes={outcomes}
              total={answers.length}
              filter={filter}
              onFilterChange={onFilterChange}
            />
            <RetryPanel retryAnswers={retryAnswers} sessionHref={sessionHref} />
          </>
        )}

        <motion.footer variants={riseChild} className="mt-6 flex flex-wrap gap-2.5">
          <Link
            href={sessionHref}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
          >
            <ArrowUUpLeft size={16} weight="bold" />
            重练这组 Session
          </Link>
          <Link
            href={PRACTICE_SESSIONS_HREF}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:text-ink active:scale-[0.98]"
          >
            换一组练
            <ArrowRight size={16} weight="bold" />
          </Link>
        </motion.footer>
      </motion.div>
    </main>
  );
}

function deltaIcon(delta: number | null) {
  if (delta === null || delta === 0) return undefined;
  return delta > 0 ? TrendUp : TrendDown;
}

function StatTile({
  label,
  value,
  hint,
  hintTone,
  hintIcon: HintIcon,
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: string;
  hintIcon?: typeof TrendUp;
}) {
  return (
    <motion.div
      variants={riseChild}
      className="rounded-2xl border border-line bg-surface p-4"
    >
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {hint && (
        <p className={`mt-1 flex items-center gap-1 text-[11px] ${hintTone ?? 'text-ink-muted'}`}>
          {HintIcon && <HintIcon size={12} weight="fill" />}
          {hint}
        </p>
      )}
    </motion.div>
  );
}

function BackLink() {
  return (
    <Link
      href={PRACTICE_HISTORY_HREF}
      className="mb-5 flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-zinc-100 hover:text-ink active:scale-[0.98]"
    >
      <ArrowLeft size={17} weight="bold" />
      返回 Session History
    </Link>
  );
}

function QuestionReview({
  answers,
  outcomes,
  total,
  filter,
  onFilterChange,
}: {
  answers: PracticeAttemptAnswer[];
  outcomes: Record<PracticeAttemptOutcome, number>;
  total: number;
  filter: OutcomeFilter;
  onFilterChange: (next: OutcomeFilter) => void;
}) {
  const allFilters: { value: OutcomeFilter; label: string; count: number }[] = [
    { value: 'all', label: '全部', count: total },
    { value: 'incorrect', label: OUTCOME_TONES.incorrect.label, count: outcomes.incorrect },
    { value: 'skipped', label: OUTCOME_TONES.skipped.label, count: outcomes.skipped },
    { value: 'correct', label: OUTCOME_TONES.correct.label, count: outcomes.correct },
    { value: 'manual_review', label: OUTCOME_TONES.manual_review.label, count: outcomes.manual_review },
  ];
  const filters = allFilters.filter((item) => item.value === 'all' || item.count > 0);

  return (
    <motion.section variants={riseChild} className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">逐题回顾</h2>
        <div className="flex flex-wrap gap-1.5">
          {filters.map((item) => {
            const active = filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onFilterChange(item.value)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors active:scale-[0.98] ${
                  active
                    ? 'bg-ink text-white'
                    : 'border border-line bg-surface text-ink-muted hover:border-zinc-300 hover:text-ink'
                }`}
              >
                {item.label} {item.count}
              </button>
            );
          })}
        </div>
      </div>

      {answers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-canvas p-6 text-center text-sm text-ink-subtle">
          这个筛选下没有题目。
        </p>
      ) : (
        <div className="space-y-2.5">
          {answers.map((answer) => (
            <AnswerRow key={answer.questionId} answer={answer} />
          ))}
        </div>
      )}
    </motion.section>
  );
}

function AnswerRow({ answer }: { answer: PracticeAttemptAnswer }) {
  const tone = OUTCOME_TONES[answer.outcome];
  const ToneIcon = tone.Icon;
  const showCorrect = Boolean(answer.correctAnswer) && answer.outcome !== 'correct';

  return (
    <motion.article
      variants={riseChild}
      className={`rounded-2xl border bg-surface p-4 ${tone.card}`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${tone.badge}`}>
          {answer.questionNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
              <ToneIcon size={12} weight="fill" />
              {tone.label}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
              {QUESTION_TYPE_LABELS[answer.questionType] ?? answer.questionType}
            </span>
          </div>
          {answer.prompt && <p className="mt-2 text-sm leading-relaxed text-ink">{answer.prompt}</p>}

          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-canvas px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">你的作答</dt>
              <dd className={`mt-0.5 break-words text-sm ${answer.userAnswer ? 'text-ink' : 'text-ink-muted'}`}>
                {answer.userAnswer || '（未作答）'}
              </dd>
            </div>
            {showCorrect && (
              <div className="rounded-xl bg-emerald-50 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">参考答案</dt>
                <dd className="mt-0.5 break-words text-sm text-emerald-800">{answer.correctAnswer}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </motion.article>
  );
}

function RetryPanel({
  retryAnswers,
  sessionHref,
}: {
  retryAnswers: PracticeAttemptAnswer[];
  sessionHref: string;
}) {
  if (retryAnswers.length === 0) {
    return (
      <motion.section
        variants={riseChild}
        className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-5"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <SealCheck size={20} weight="fill" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-900">这次没有错题或漏题</p>
          <p className="mt-0.5 text-xs text-emerald-800/80">保持节奏，可以挑战难度更高的一组。</p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section
      variants={riseChild}
      className="mt-5 rounded-2xl border border-line bg-surface p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-tint text-accent">
            <ArrowUUpLeft size={16} weight="regular" />
          </span>
          <p className="text-sm font-semibold text-ink">值得重练的 {retryAnswers.length} 题</p>
        </div>
        <Link
          href={sessionHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-zinc-300 hover:text-ink active:scale-[0.98]"
        >
          回到 Session
          <ArrowRight size={13} weight="bold" />
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {retryAnswers.map((answer) => {
          const tone = OUTCOME_TONES[answer.outcome];
          return (
            <span
              key={answer.questionId}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
              title={answer.prompt || undefined}
            >
              第 {answer.questionNumber} 题 · {tone.label}
            </span>
          );
        })}
      </div>
    </motion.section>
  );
}
