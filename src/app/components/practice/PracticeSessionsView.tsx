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
  Database,
  FileText,
  Headphones,
  ListChecks,
  Microphone,
  PenNib,
  Target,
} from '@phosphor-icons/react';
import { readPracticeSessionDraftStatuses, type PracticeSessionDraftStatus } from '@/lib/practice-session-draft';
import {
  getPracticeLearningSummary,
  getPracticeRecommendationReason,
  getRecommendedPracticeUnits,
} from '@/lib/practice-session-recommendations';
import { PRACTICE_HISTORY_HREF } from '@/lib/practice-session-links';
import { formatDifficulty } from '@/lib/question-labels';
import { formatMinutes } from '@/lib/practice-clock';
import type { PracticeUnit } from '@/lib/types';
import { riseChild, staggerParent } from '../ui/motion-presets';
import { getDraftSummary, getSessionFlow, recommendationCopy } from './session-summary';

function formatMode(mode: PracticeUnit['mode']) {
  const labels: Record<PracticeUnit['mode'], string> = {
    basic: 'Basic',
    progressive: 'Progressive',
    challenge: 'Challenge',
  };

  return labels[mode] ?? mode;
}

function formatSkill(skill: PracticeUnit['skill']) {
  const labels: Record<PracticeUnit['skill'], string> = {
    foundation: 'Foundation',
    reading: 'Reading',
    listening: 'Listening',
    writing: 'Writing',
    speaking: 'Speaking',
  };

  return labels[skill] ?? skill;
}

type SkillFilter = 'all' | PracticeUnit['skill'];
type UnitDraftStatus = PracticeSessionDraftStatus;

const SKILL_FILTERS: { id: SkillFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'reading', label: 'Reading' },
  { id: 'listening', label: 'Listening' },
  { id: 'writing', label: 'Writing' },
  { id: 'speaking', label: 'Speaking' },
];

const SKILL_TONES: Record<
  PracticeUnit['skill'],
  {
    Icon: typeof BookOpenText;
    badge: string;
    border: string;
    hover: string;
  }
> = {
  foundation: {
    Icon: Target,
    badge: 'bg-zinc-100 text-ink-muted',
    border: 'border-zinc-200',
    hover: 'hover:border-zinc-300',
  },
  reading: {
    Icon: BookOpenText,
    badge: 'bg-emerald-50 text-emerald-700',
    border: 'border-emerald-200/75',
    hover: 'hover:border-emerald-300',
  },
  listening: {
    Icon: Headphones,
    badge: 'bg-sky-50 text-sky-700',
    border: 'border-sky-200/75',
    hover: 'hover:border-sky-300',
  },
  writing: {
    Icon: PenNib,
    badge: 'bg-amber-50 text-amber-700',
    border: 'border-amber-200/75',
    hover: 'hover:border-amber-300',
  },
  speaking: {
    Icon: Microphone,
    badge: 'bg-rose-50 text-rose-700',
    border: 'border-rose-200/75',
    hover: 'hover:border-rose-300',
  },
};

export default function PracticeSessionsView({ units }: { units: PracticeUnit[] }) {
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all');
  const [draftStatuses] = useState<Record<string, UnitDraftStatus>>(() => readPracticeSessionDraftStatuses(units));

  const filteredUnits = useMemo(
    () => (skillFilter === 'all' ? units : units.filter((unit) => unit.skill === skillFilter)),
    [skillFilter, units]
  );

  const recommendedUnits = useMemo(() => {
    const candidates = filteredUnits.length ? filteredUnits : units;

    return getRecommendedPracticeUnits(candidates, draftStatuses, 3);
  }, [draftStatuses, filteredUnits, units]);

  const featuredUnit = recommendedUnits[0] ?? null;
  const learningSummary = useMemo(
    () => getPracticeLearningSummary(draftStatuses),
    [draftStatuses]
  );
  const featuredTone = featuredUnit ? SKILL_TONES[featuredUnit.skill] : null;
  const FeaturedIcon = featuredTone?.Icon ?? BookOpenText;
  const featuredFlow = featuredUnit ? getSessionFlow(featuredUnit) : [];
  const featuredDraftSummary = featuredUnit ? getDraftSummary(draftStatuses[featuredUnit.id]) : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.header variants={riseChild} className="mb-8 grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard"
                className="flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-zinc-100 hover:text-ink active:scale-[0.98]"
              >
                <ArrowLeft size={17} weight="bold" />
                返回 Dashboard
              </Link>
              <Link
                href={PRACTICE_HISTORY_HREF}
                className="flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-zinc-100 hover:text-ink active:scale-[0.98]"
              >
                <ChartLineUp size={17} weight="regular" />
                复盘轨迹
              </Link>
            </div>
            <h1 className="text-tight mt-1 max-w-3xl text-3xl font-semibold text-ink sm:text-4xl">
              从单题训练，走向整组 IELTS 任务。
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-subtle">
              这里先用本地 sample 展示未来 Session Library 的形态：一篇材料、一组关联题、统一检查和复盘。当前不会读取或写入 Supabase practice tables。
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-ink p-5 text-white">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                <Database size={22} weight="regular" />
              </span>
              <div>
                <p className="text-sm font-semibold">规划先行，不改库</p>
                <p className="mt-1 text-xs leading-relaxed text-white/55">
                  本页通过 `practice-units.ts` local adapter 消费 sample data，用来预演 practice_units / practice_questions 上线后的入口体验。
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <HeaderMetric label="Samples" value={String(units.length)} />
              <HeaderMetric label="Writes" value="0" />
              <HeaderMetric label="Mode" value="Preview" />
            </div>
          </div>
        </motion.header>

        <motion.section variants={riseChild} className="mb-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm font-semibold text-ink">学习队列</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-subtle">
              根据本机草稿、已检查状态、标记和笔记生成推荐。当前仍然只读 localStorage，不写 Supabase。
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <LibraryMetric label="草稿" value={String(learningSummary.inProgress)} tone="amber" />
              <LibraryMetric label="待复盘" value={String(learningSummary.needsReview)} tone="sky" />
              <LibraryMetric label="已检查" value={String(learningSummary.checked)} tone="emerald" />
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">推荐下一步</p>
                <p className="mt-1 text-xs text-ink-subtle">优先继续草稿和复盘，再开启新 Session。</p>
              </div>
              <span className="rounded-full border border-line bg-zinc-50 px-3 py-1 text-xs font-semibold text-ink-subtle">
                Top {recommendedUnits.length}
              </span>
            </div>
            {recommendedUnits.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {recommendedUnits.map((unit) => {
                  const tone = SKILL_TONES[unit.skill];
                  const Icon = tone.Icon;
                  const reason = recommendationCopy(getPracticeRecommendationReason(unit, draftStatuses[unit.id]));

                  return (
                    <Link
                      key={unit.id}
                      href={`/practice/session/${unit.slug}`}
                      className="rounded-xl border border-line bg-zinc-50 p-3 transition-colors hover:border-zinc-300 hover:bg-surface active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone.badge}`}>
                          <Icon size={16} weight="regular" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink">{unit.title}</p>
                          <p className="text-[11px] text-ink-subtle">{formatSkill(unit.skill)}</p>
                        </div>
                      </div>
                      <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${reason.badge}`}>
                        {reason.label}
                      </span>
                      <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-ink-subtle">{reason.detail}</p>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <EmptySessionState title="暂无推荐" description="当前筛选下没有可推荐的 Session。切换技能筛选或添加本地 sample 后会自动出现推荐。" />
            )}
          </div>
        </motion.section>
        {featuredUnit && (
          <motion.section
            variants={riseChild}
            className={`mb-8 rounded-2xl border bg-surface p-5 sm:p-6 ${featuredTone?.border ?? 'border-line'}`}
          >
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${featuredTone?.badge ?? 'bg-accent-tint text-accent'}`}>
                    <FeaturedIcon size={14} weight="regular" />
                    Featured {formatSkill(featuredUnit.skill)} MVP
                  </span>
                  {featuredDraftSummary && (
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${featuredDraftSummary.className}`}>
                      {featuredDraftSummary.label}
                    </span>
                  )}
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-ink sm:text-3xl">{featuredUnit.title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-subtle">{featuredUnit.description}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-4">
                  <UnitMetric icon={Target} label="技能" value={formatSkill(featuredUnit.skill)} />
                  <UnitMetric icon={ListChecks} label="题数" value={`${featuredUnit.questions.length} 题`} />
                  <UnitMetric icon={FileText} label="难度" value={formatDifficulty(featuredUnit.difficulty)} />
                  <UnitMetric icon={Clock} label="建议" value={formatMinutes(featuredUnit.time_limit_seconds)} />
                </div>
              </div>
              <div className="rounded-xl border border-line bg-canvas p-4">
                <p className="text-xs font-semibold text-ink-subtle">Session Flow</p>
                <div className="mt-4 space-y-3">
                  {featuredFlow.map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{index + 1}</span>
                      <span className="text-sm font-medium text-ink-muted">{item}</span>
                    </div>
                  ))}
                </div>
                <Link
                  href={`/practice/session/${featuredUnit.slug}`}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 active:scale-[0.98]"
                >
                  {featuredDraftSummary?.ctaLabel ?? '进入 Session'}
                  <ArrowRight size={16} weight="bold" />
                </Link>
              </div>
            </div>
          </motion.section>
        )}

        <motion.section variants={riseChild}>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">Session Library</h2>
              <p className="mt-1 text-sm text-ink-subtle">后续 Reading / Listening / Writing / Speaking 的 practice units 会在这里汇总。</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SKILL_FILTERS.map((filter) => {
                const count = filter.id === 'all' ? units.length : units.filter((unit) => unit.skill === filter.id).length;
                const active = skillFilter === filter.id;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setSkillFilter(filter.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors active:scale-[0.98] ${
                      active
                        ? 'border-ink bg-ink text-white'
                        : 'border-line bg-surface text-ink-subtle hover:border-zinc-300 hover:text-ink'
                    }`}
                  >
                    {filter.label} · {count}
                  </button>
                );
              })}
            </div>
          </div>
          {filteredUnits.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredUnits.map((unit) => {
                const tone = SKILL_TONES[unit.skill];
                const Icon = tone.Icon;
                const draftSummary = getDraftSummary(draftStatuses[unit.id]);

                return (
                <Link
                  key={unit.id}
                  href={`/practice/session/${unit.slug}`}
                  className={`group rounded-2xl border bg-surface p-5 transition-colors hover:border-zinc-300 active:scale-[0.99] ${tone.border} ${tone.hover}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                          <Icon size={14} weight="regular" />
                          {formatMode(unit.mode)}
                        </span>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${draftSummary.className}`}>
                          {draftSummary.label}
                        </span>
                      </div>
                      <h3 className="mt-4 text-xl font-semibold text-ink transition-colors group-hover:text-accent">{unit.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-subtle">{unit.description}</p>
                      <p className="mt-4 text-xs font-medium text-ink-subtle">
                        {formatSkill(unit.skill)} · {unit.questions.length} questions · {formatMinutes(unit.time_limit_seconds)}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-accent">{draftSummary.ctaLabel}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-50 text-ink-subtle transition-all group-hover:translate-x-1 group-hover:bg-ink group-hover:text-white">
                      <ArrowRight size={17} weight="bold" />
                    </span>
                  </div>
                </Link>
              );
              })}
            </div>
          ) : (
            <EmptySessionState
              title="这个技能暂时没有 Session"
              description="当前筛选没有本地样例。切换到全部，或之后在 sample / Supabase source 中补充更多 practice units。"
            />
          )}
        </motion.section>
      </motion.div>
    </main>
  );
}

function EmptySessionState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-line bg-zinc-50 p-6 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-ink-subtle">
        <BookOpenText size={20} weight="regular" />
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-subtle">{description}</p>
    </div>
  );
}

function LibraryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'amber' | 'sky' | 'emerald';
}) {
  const toneClass = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }[tone];

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold opacity-70">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function HeaderMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
      <p className="text-[11px] font-semibold text-white/45">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</p>
    </div>
  );
}

function UnitMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-subtle">
        <Icon size={13} weight="regular" />
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
