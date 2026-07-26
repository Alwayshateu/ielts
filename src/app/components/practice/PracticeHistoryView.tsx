'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ChartLineUp,
  Clock,
  CloudArrowUp,
  CloudCheck,
  Fire,
  Headphones,
  Microphone,
  PenNib,
  Target,
  Trash,
  TrendDown,
  TrendUp,
  WarningCircle,
} from '@phosphor-icons/react';
import {
  isPracticeAttemptSyncEnabled,
  syncPracticeAttempts,
  type PracticeAttemptSyncResult,
} from '@/lib/practice-attempt-remote';
import {
  clearPracticeSessionHistory,
  computePracticeStudyStreak,
  readPracticeSessionHistory,
  summarizePracticeSessionHistory,
  type PracticeSessionHistoryEntry,
  type PracticeSessionHistoryTrend,
} from '@/lib/practice-session-history';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { practiceAttemptDetailHref, PRACTICE_SESSIONS_HREF } from '@/lib/practice-session-links';
import { formatClock } from '@/lib/practice-clock';
import type { PracticeSkill } from '@/lib/types';
import { riseChild, springSnap, staggerParent } from '../ui/motion-presets';

const SKILL_TONES: Record<PracticeSkill, { Icon: typeof BookOpenText; label: string; badge: string; bar: string }> = {
  foundation: { Icon: Target, label: 'Foundation', badge: 'bg-zinc-100 text-ink-muted', bar: 'bg-zinc-400' },
  reading: { Icon: BookOpenText, label: 'Reading', badge: 'bg-emerald-50 text-emerald-700', bar: 'bg-emerald-500' },
  listening: { Icon: Headphones, label: 'Listening', badge: 'bg-sky-50 text-sky-700', bar: 'bg-sky-500' },
  writing: { Icon: PenNib, label: 'Writing', badge: 'bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
  speaking: { Icon: Microphone, label: 'Speaking', badge: 'bg-rose-50 text-rose-700', bar: 'bg-rose-500' },
};

function formatDuration(seconds: number) {
  if (seconds <= 0) return '0 分钟';
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} 分钟`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} 小时 ${minutes} 分` : `${hours} 小时`;
}

function formatDayLabel(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function dayKey(ts: number) {
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

type SyncState =
  | { status: 'idle' }
  | { status: 'syncing' }
  | { status: 'done'; result: PracticeAttemptSyncResult }
  | { status: 'error'; message: string };

function trendMeta(trend: PracticeSessionHistoryTrend) {
  if (trend === 'up') return { Icon: TrendUp, className: 'text-emerald-600', label: '较上次上升' };
  if (trend === 'down') return { Icon: TrendDown, className: 'text-rose-600', label: '较上次下降' };
  if (trend === 'flat') return { Icon: ArrowRight, className: 'text-ink-muted', label: '与上次持平' };
  return null;
}

export default function PracticeHistoryView() {
  const [entries, setEntries] = useState<PracticeSessionHistoryEntry[]>(() => readPracticeSessionHistory());
  const [nowTs] = useState(() => Date.now());
  const [syncEnabled] = useState(() => isPracticeAttemptSyncEnabled());
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle' });

  const summary = useMemo(() => summarizePracticeSessionHistory(entries), [entries]);
  const streak = useMemo(() => computePracticeStudyStreak(entries, nowTs), [entries, nowTs]);

  const objectiveTrend = useMemo(
    () =>
      [...entries]
        .filter((entry) => entry.accuracy !== null)
        .sort((a, b) => a.recordedAt - b.recordedAt)
        .slice(-14),
    [entries]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; recordedAt: number; items: PracticeSessionHistoryEntry[] }>();
    entries.forEach((entry) => {
      const key = dayKey(entry.recordedAt);
      const group = map.get(key) ?? { label: formatDayLabel(entry.recordedAt), recordedAt: entry.recordedAt, items: [] };
      group.items.push(entry);
      group.recordedAt = Math.max(group.recordedAt, entry.recordedAt);
      map.set(key, group);
    });
    return [...map.values()].sort((a, b) => b.recordedAt - a.recordedAt);
  }, [entries]);

  const handleClear = () => {
    if (!window.confirm('清空全部本地 Session 复盘记录？此操作只影响本机 localStorage，不会改动数据库。')) return;
    clearPracticeSessionHistory();
    setEntries([]);
  };

  const handleSync = async () => {
    setSyncState({ status: 'syncing' });

    try {
      const result = await syncPracticeAttempts({
        supabase: createSupabaseBrowserClient(),
        entries,
      });
      setSyncState({ status: 'done', result });
    } catch (error) {
      setSyncState({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const trend = trendMeta(summary.accuracyTrend);
  const TrendIcon = trend?.Icon;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.header variants={riseChild} className="mb-7">
          <Link
            href={PRACTICE_SESSIONS_HREF}
            className="mb-5 flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:border-zinc-300 hover:text-ink active:scale-[0.98]"
          >
            <ArrowLeft size={17} weight="bold" />
            返回 Session Library
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle">
            <ChartLineUp size={14} weight="regular" />
            Session History · {syncEnabled ? '本地 + 云端' : '本地'}
          </span>
          <h1 className="text-display mt-4 max-w-3xl text-4xl font-semibold text-ink sm:text-5xl">
            你的 Session 复盘轨迹
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-subtle">
            每次在 Session 里进入 Review Mode，都会在本机留下一份成绩快照。这里帮你回看正确率、自评 Band 和练习节奏。
            {syncEnabled
              ? '记录先存本机，点“同步到云端”可以备份到你的账号，换设备也能查。'
              : '当前只读 localStorage，不写数据库。'}
          </p>
        </motion.header>

        {entries.length === 0 ? (
          <motion.div
            variants={riseChild}
            className="rounded-[1.75rem] border border-dashed border-line bg-surface/70 p-10 text-center"
          >
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-tint text-accent">
              <ChartLineUp size={26} weight="regular" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-ink">还没有复盘记录</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-subtle">
              打开任意一组 Session，完成作答后点“检查 / 进入 Review Mode”，这次成绩就会自动记录到这里。
            </p>
            <Link
              href={PRACTICE_SESSIONS_HREF}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-[0.98]"
            >
              去 Session Library
              <ArrowRight size={16} weight="bold" />
            </Link>
          </motion.div>
        ) : (
          <>
            <motion.section
              variants={riseChild}
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
            >
              <SummaryTile label="总复盘次数" value={String(summary.totalAttempts)} hint={`${summary.sessionsPracticed} 组 Session`} />
              <SummaryTile
                label="最近正确率"
                value={summary.latestAccuracy === null ? '—' : `${summary.latestAccuracy}%`}
                hint={trend?.label}
                hintIcon={TrendIcon}
                hintClassName={trend?.className}
              />
              <SummaryTile label="最佳正确率" value={summary.bestAccuracy === null ? '—' : `${summary.bestAccuracy}%`} hint="客观题" />
              <SummaryTile
                label="平均正确率"
                value={summary.averageAccuracy === null ? '—' : `${summary.averageAccuracy}%`}
                hint="全部客观题"
              />
              <SummaryTile
                label="自评 Band"
                value={summary.latestBand === null ? '—' : summary.latestBand.toFixed(1)}
                hint={summary.bestBand === null ? '写作 / 口语' : `最佳 ${summary.bestBand.toFixed(1)}`}
              />
              <SummaryTile
                label="累计用时"
                value={formatDuration(summary.totalStudySeconds)}
                hint={streak > 0 ? `连续 ${streak} 天` : '开始你的连续记录'}
                hintIcon={streak > 0 ? Fire : Clock}
                hintClassName={streak > 0 ? 'text-amber-600' : undefined}
              />
            </motion.section>

            {objectiveTrend.length >= 2 && (
              <motion.section
                variants={riseChild}
                className="mt-4 rounded-[1.5rem] border border-line bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_14px_38px_-34px_rgba(24,24,27,0.34)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-tint text-accent">
                      <ChartLineUp size={16} weight="regular" />
                    </span>
                    <p className="text-sm font-semibold text-ink">客观题正确率走势</p>
                  </div>
                  <p className="text-xs text-ink-muted">最近 {objectiveTrend.length} 次</p>
                </div>
                <div className="flex h-32 items-end gap-1.5">
                  {objectiveTrend.map((entry) => {
                    const tone = SKILL_TONES[entry.skill] ?? SKILL_TONES.reading;
                    return (
                      <div key={entry.id} className="group flex flex-1 flex-col items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-ink-muted opacity-0 transition-opacity group-hover:opacity-100">
                          {entry.accuracy}%
                        </span>
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className={`w-full rounded-t-md ${tone.bar} transition-all`}
                            style={{ height: `${Math.max(6, entry.accuracy ?? 0)}%` }}
                            title={`${tone.label} · ${entry.accuracy}% · ${formatDayLabel(entry.recordedAt)}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {summary.bySkill.length > 0 && (
              <motion.section variants={riseChild} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {summary.bySkill.map((stat) => {
                  const tone = SKILL_TONES[stat.skill] ?? SKILL_TONES.reading;
                  const ToneIcon = tone.Icon;
                  return (
                    <div
                      key={stat.skill}
                      className="rounded-2xl border border-line bg-surface p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                          <ToneIcon size={13} weight="regular" />
                          {tone.label}
                        </span>
                        <span className="text-xs text-ink-muted">{stat.attempts} 次</span>
                      </div>
                      <p className="mt-3 text-2xl font-semibold text-ink">
                        {stat.averageAccuracy === null ? '—' : `${stat.averageAccuracy}%`}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">平均正确率</p>
                    </div>
                  );
                })}
              </motion.section>
            )}

            <motion.section variants={riseChild} className="mt-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-ink">复盘时间线</h2>
                <div className="flex items-center gap-2">
                  {syncEnabled && (
                    <button
                      type="button"
                      onClick={handleSync}
                      disabled={syncState.status === 'syncing'}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-all hover:border-zinc-300 hover:text-ink active:scale-[0.98] disabled:opacity-60"
                    >
                      <CloudArrowUp size={13} weight="regular" />
                      {syncState.status === 'syncing' ? '同步中…' : '同步到云端'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink-muted transition-all hover:border-rose-200 hover:text-rose-600 active:scale-[0.98]"
                  >
                    <Trash size={13} weight="regular" />
                    清空记录
                  </button>
                </div>
              </div>

              {syncState.status !== 'idle' && syncState.status !== 'syncing' && (
                <SyncBanner state={syncState} />
              )}

              <div className="space-y-6">
                {grouped.map((group) => (
                  <div key={group.label}>
                    <div className="mb-3 flex items-center gap-3">
                      <p className="text-sm font-semibold text-ink">{group.label}</p>
                      <span className="h-px flex-1 bg-line" />
                      <span className="text-xs text-ink-muted">{group.items.length} 次</span>
                    </div>
                    <div className="space-y-2.5">
                      {group.items.map((entry) => (
                        <HistoryRow key={entry.id} entry={entry} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>
          </>
        )}
      </motion.div>
    </main>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  hintIcon: HintIcon,
  hintClassName,
}: {
  label: string;
  value: string;
  hint?: string;
  hintIcon?: typeof Clock;
  hintClassName?: string;
}) {
  return (
    <motion.div
      variants={riseChild}
      whileHover={{ y: -2 }}
      transition={springSnap}
      className="rounded-2xl border border-line bg-surface p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
    >
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
      {hint && (
        <p className={`mt-1 flex items-center gap-1 text-[11px] ${hintClassName ?? 'text-ink-muted'}`}>
          {HintIcon && <HintIcon size={12} weight="fill" />}
          {hint}
        </p>
      )}
    </motion.div>
  );
}

function SyncBanner({ state }: { state: SyncState }) {
  if (state.status === 'error') {
    return (
      <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
        <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0 text-rose-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-rose-900">同步失败</p>
          <p className="mt-0.5 break-words text-xs text-rose-800/80">{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.status !== 'done') return null;

  const { result } = state;
  const failed = result.errors.length > 0;
  const nothingToDo = result.syncedAttempts === 0 && !failed;

  return (
    <div
      className={`mb-4 flex items-start gap-2.5 rounded-2xl border p-4 ${
        failed ? 'border-amber-100 bg-amber-50/70' : 'border-emerald-100 bg-emerald-50/60'
      }`}
    >
      {failed ? (
        <WarningCircle size={17} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />
      ) : (
        <CloudCheck size={17} weight="fill" className="mt-0.5 shrink-0 text-emerald-600" />
      )}
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${failed ? 'text-amber-900' : 'text-emerald-900'}`}>
          {nothingToDo
            ? '已是最新，没有需要同步的记录'
            : `已同步 ${result.syncedAttempts} 次练习、${result.syncedAnswers} 道题`}
        </p>
        <p className={`mt-0.5 text-xs ${failed ? 'text-amber-800/80' : 'text-emerald-800/80'}`}>
          {[
            result.skippedEntries > 0 ? `${result.skippedEntries} 条跳过（题库里没有对应 Session）` : null,
            result.unresolvedQuestions > 0 ? `${result.unresolvedQuestions} 道题未匹配` : null,
            failed ? result.errors[0] : null,
          ]
            .filter(Boolean)
            .join(' · ') || '本地记录保持不变，云端只做追加。'}
        </p>
      </div>
    </div>
  );
}

function HistoryRow({ entry }: { entry: PracticeSessionHistoryEntry }) {
  const tone = SKILL_TONES[entry.skill] ?? SKILL_TONES.reading;
  const ToneIcon = tone.Icon;

  return (
    <Link
      href={practiceAttemptDetailHref(entry.id)}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-zinc-300 active:scale-[0.99]"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.badge}`}>
        <ToneIcon size={20} weight="regular" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{entry.title}</p>
          <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${tone.badge}`}>
            {tone.label}
          </span>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-ink-muted">
          <span>{formatTime(entry.recordedAt)}</span>
          <span>·</span>
          <span>完成 {entry.completionPercent}%</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock size={11} weight="regular" />
            {formatClock(entry.elapsedSeconds)}
          </span>
        </p>
      </div>

      <div className="shrink-0 text-right">
        {entry.accuracy === null ? (
          <p className="text-sm font-semibold text-sky-600">
            {entry.selfRatedBand === null ? '待反馈' : `Band ${entry.selfRatedBand.toFixed(1)}`}
          </p>
        ) : (
          <p className="text-xl font-semibold text-ink">{entry.accuracy}%</p>
        )}
        <p className="mt-0.5 text-[11px] text-ink-muted">
          {entry.objectiveTotal > 0 ? `${entry.correct}/${entry.objectiveTotal} 正确` : `${entry.answered}/${entry.total} 作答`}
        </p>
      </div>

      <ArrowRight
        size={16}
        weight="bold"
        className="shrink-0 text-ink-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
      />
    </Link>
  );
}
