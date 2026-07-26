'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ComponentType } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BookOpenText,
  CalendarCheck,
  ChartLineUp,
  CircleNotch,
  ClipboardText,
  Fire,
  GearSix,
  Headphones,
  Lightning,
  Microphone,
  PenNib,
  Shuffle,
  SignOut,
  Target,
} from '@phosphor-icons/react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { resolveDashboardRecommendation } from '@/lib/dashboard-recommendation';
import type { DashboardStats } from '@/lib/dashboard-stats';
import { PRACTICE_HISTORY_HREF, PRACTICE_SESSIONS_HREF } from '@/lib/practice-session-links';
import { readPracticeSessionDraftStatuses } from '@/lib/practice-session-draft';
import {
  computePracticeStudyStreak,
  readPracticeSessionHistory,
  summarizePracticeSessionHistory,
} from '@/lib/practice-session-history';
import {
  getPracticeLearningSummary,
  getRecommendedPracticeUnits,
} from '@/lib/practice-session-recommendations';
import { getSamplePracticeUnits } from '@/lib/practice-session-samples';
import { riseChild, springSnap, staggerParent } from './ui/motion-presets';
import { formatLastPracticed } from './dashboard-format';

type Difficulty = 'easy' | 'medium' | 'hard';
type IconType = ComponentType<{ size?: number; weight?: 'regular' | 'bold' | 'duotone' | 'fill' }>;

const categories: {
  id: string;
  name: string;
  icon: IconType;
  desc: string;
  detail: string;
}[] = [
  {
    id: 'mixed',
    name: '综合随机练习',
    icon: Shuffle,
    desc: '快速进入训练状态',
    detail: '从全题库抽题，适合今天先热身。',
  },
  {
    id: 'reading',
    name: '阅读',
    icon: BookOpenText,
    desc: '长难句与信息定位',
    detail: '训练结构感和细节判断。',
  },
  {
    id: 'listening',
    name: '听力',
    icon: Headphones,
    desc: '听前预测与关键信息',
    detail: '先保留入口，后续接入专项交互。',
  },
  {
    id: 'writing',
    name: '写作',
    icon: PenNib,
    desc: '结构、观点与结论',
    detail: '用填空题先打结构基础。',
  },
  {
    id: 'speaking',
    name: '口语',
    icon: Microphone,
    desc: '话题组织与表达',
    detail: '用 prompt 练习回答方向。',
  },
];

type PracticeTone = {
  border: string;
  glow: string;
  glowSoft: string;
  wash: string;
  icon: string;
  rail: string;
};

const PRACTICE_TONES: Record<string, PracticeTone> = {
  reading: {
    border: 'hover:border-emerald-200',
    glow: 'bg-emerald-300/45',
    glowSoft: 'bg-teal-200/36',
    wash: 'bg-[radial-gradient(circle_at_82%_4%,rgba(16,185,129,0.30),transparent_38%),radial-gradient(circle_at_0%_100%,rgba(45,212,191,0.18),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,253,245,0.82))]',
    icon: 'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white',
    rail: 'bg-emerald-500',
  },
  listening: {
    border: 'hover:border-sky-200',
    glow: 'bg-sky-300/45',
    glowSoft: 'bg-cyan-200/36',
    wash: 'bg-[radial-gradient(circle_at_82%_4%,rgba(14,165,233,0.30),transparent_38%),radial-gradient(circle_at_0%_100%,rgba(34,211,238,0.18),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.84))]',
    icon: 'bg-sky-50 text-sky-700 group-hover:bg-sky-600 group-hover:text-white',
    rail: 'bg-sky-500',
  },
  writing: {
    border: 'hover:border-amber-200',
    glow: 'bg-amber-300/48',
    glowSoft: 'bg-orange-200/36',
    wash: 'bg-[radial-gradient(circle_at_82%_4%,rgba(245,158,11,0.32),transparent_38%),radial-gradient(circle_at_0%_100%,rgba(251,146,60,0.18),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,251,235,0.86))]',
    icon: 'bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-white',
    rail: 'bg-amber-500',
  },
  speaking: {
    border: 'hover:border-rose-200',
    glow: 'bg-rose-300/45',
    glowSoft: 'bg-pink-200/34',
    wash: 'bg-[radial-gradient(circle_at_82%_4%,rgba(244,63,94,0.28),transparent_38%),radial-gradient(circle_at_0%_100%,rgba(251,113,133,0.16),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,241,242,0.84))]',
    icon: 'bg-rose-50 text-rose-700 group-hover:bg-rose-600 group-hover:text-white',
    rail: 'bg-rose-500',
  },
};

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: '基础', hint: '降低摩擦，先找回节奏' },
  { id: 'medium', label: '进阶', hint: '贴近实考节奏，适合日常训练' },
  { id: 'hard', label: '挑战', hint: '冲刺薄弱项和高分区间' },
];

const DIFFICULTY_TONE: Record<
  Difficulty,
  {
    panel: string;
    glow: string;
    rail: string;
    label: string;
  }
> = {
  easy: {
    panel: 'bg-emerald-50/70',
    glow: 'bg-emerald-200/45',
    rail: 'bg-emerald-500',
    label: '轻量热身',
  },
  medium: {
    panel: 'bg-accent-tint/80',
    glow: 'bg-indigo-200/55',
    rail: 'bg-accent',
    label: '日常主线',
  },
  hard: {
    panel: 'bg-orange-50/75',
    glow: 'bg-orange-200/55',
    rail: 'bg-orange-500',
    label: '冲刺模式',
  },
};

interface Profile {
  username: string | null;
  email: string | null;
}

export default function DashboardContent({
  profile,
  isAnonymous,
  stats,
}: {
  profile: Profile;
  isAnonymous: boolean;
  stats: DashboardStats;
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [practiceSessionUnits] = useState(() => getSamplePracticeUnits());
  const [practiceSessionStatuses] = useState(() => readPracticeSessionDraftStatuses(practiceSessionUnits));
  const [practiceSessionHistory] = useState(() => readPracticeSessionHistory());
  const [historyNowTs] = useState(() => Date.now());
  const sessionHistorySummary = useMemo(
    () => summarizePracticeSessionHistory(practiceSessionHistory),
    [practiceSessionHistory]
  );
  const sessionStreak = useMemo(
    () => computePracticeStudyStreak(practiceSessionHistory, historyNowTs),
    [historyNowTs, practiceSessionHistory]
  );

  const displayName = isAnonymous
    ? '测试管理员'
    : profile.username || profile.email?.split('@')[0] || '学员';

  const sessionRecommendation = useMemo(
    () => getRecommendedPracticeUnits(practiceSessionUnits, practiceSessionStatuses, 1)[0] ?? null,
    [practiceSessionStatuses, practiceSessionUnits]
  );
  const sessionLearningSummary = useMemo(
    () => getPracticeLearningSummary(practiceSessionStatuses),
    [practiceSessionStatuses]
  );

  // One decision from both signals — legacy stats and local session state — so the page
  // can never show two "do this next" cards that disagree.
  const recommendation = useMemo(() => {
    const resolved = resolveDashboardRecommendation({
      sessionsInProgress: sessionLearningSummary.inProgress,
      sessionsNeedingReview: sessionLearningSummary.needsReview,
      wrongBookCount: stats.wrongBookCount,
      legacyAttempts: stats.totalAttempts,
      sessionAttempts: practiceSessionHistory.length,
    });

    const sessionHref = sessionRecommendation
      ? `/practice/session/${sessionRecommendation.slug}`
      : PRACTICE_SESSIONS_HREF;

    const routing: Record<typeof resolved.kind, { href: string; Icon: typeof Target }> = {
      'resume-session': { href: sessionHref, Icon: Lightning },
      'review-session': { href: sessionHref, Icon: Target },
      'clear-wrong-book': { href: '/wrong-book', Icon: ClipboardText },
      'first-session': { href: sessionHref, Icon: Lightning },
      'keep-going': { href: sessionHref, Icon: Target },
    };

    return {
      eyebrow: '今日建议',
      title: resolved.title,
      desc: resolved.description,
      label: resolved.actionLabel,
      ...routing[resolved.kind],
    };
  }, [
    practiceSessionHistory.length,
    sessionLearningSummary.inProgress,
    sessionLearningSummary.needsReview,
    sessionRecommendation,
    stats.totalAttempts,
    stats.wrongBookCount,
  ]);

  const activeHint = DIFFICULTIES.find((d) => d.id === difficulty)?.hint;
  const difficultyTone = DIFFICULTY_TONE[difficulty];
  const accuracyLabel = stats.accuracy === null ? '—' : `${stats.accuracy}%`;
  const clampedAccuracy = Math.max(0, Math.min(100, stats.accuracy ?? 0));
  const accuracyWidth = `${clampedAccuracy}%`;

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed', error);
      setLoading(false);
    }
  };

  const handleStartPractice = (categoryId: string) => {
    router.push(`/practice?category=${categoryId}&difficulty=${difficulty}`);
  };

  const RecommendationIcon = recommendation.Icon;
  const statCards = [
    {
      label: '练习记录',
      value: String(stats.totalAttempts),
      hint: '最多显示最近 500 条',
      icon: ChartLineUp,
      tone: 'accent' as const,
    },
    {
      label: '正确率',
      value: accuracyLabel,
      hint: '基于现有历史记录',
      icon: Target,
      progress: clampedAccuracy,
      tone: 'emerald' as const,
    },
    {
      label: '7 天练习',
      value: String(stats.recentAttempts),
      hint: '保持手感的节奏',
      icon: CalendarCheck,
      tone: 'sky' as const,
    },
    {
      label: '复习队列',
      value: String(stats.wrongBookCount),
      hint: `${stats.favoritesCount} 道收藏题`,
      icon: ClipboardText,
      tone: 'orange' as const,
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header
        variants={staggerParent(0.06)}
        initial="hidden"
        animate="show"
        className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-start"
      >
        <motion.div variants={riseChild}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle">
              IELTS Trainer
            </span>
            {isAnonymous && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                测试登录
              </span>
            )}
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle transition-colors hover:border-accent/30 hover:bg-accent-tint hover:text-accent active:scale-[0.98]"
            >
              <GearSix size={14} weight="regular" />
              设置
            </Link>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? <CircleNotch size={14} weight="bold" className="animate-spin" /> : <SignOut size={14} weight="regular" />}
              退出登录
            </button>
          </div>
          <h1 className="text-display max-w-2xl text-4xl font-semibold text-ink sm:text-5xl">
            今天，把一个薄弱点练到更确定。
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-subtle">
            你好，{displayName}。这里不只是入口页，而是你的训练决策台：看见状态，选择难度，然后进入下一步。
          </p>
        </motion.div>

        <motion.div
          variants={riseChild}
          whileHover={{ y: -7, scale: 1.018 }}
          whileTap={{ scale: 0.995 }}
          transition={springSnap}
          className="group relative overflow-hidden rounded-[2rem] border border-line bg-surface p-5 shadow-[0_20px_50px_-34px_rgba(24,24,27,0.45)] transition-colors hover:border-accent/35 hover:shadow-[0_30px_70px_-36px_rgba(79,70,229,0.34)]"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/20 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-52 w-52 rounded-full bg-indigo-200/30 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(79,70,229,0.20),transparent_40%),radial-gradient(circle_at_0%_100%,rgba(99,102,241,0.14),transparent_44%),linear-gradient(135deg,rgba(255,255,255,0.84),rgba(238,242,255,0.62))]" />
          </div>
          <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-accent">{recommendation.eyebrow}</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">{recommendation.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-subtle">{recommendation.desc}</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-tint text-accent">
              <RecommendationIcon size={22} weight="regular" />
            </span>
          </div>
          <Link
            href={recommendation.href}
            className="mt-6 flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 active:scale-[0.98]"
          >
            {recommendation.label}
            <ArrowRight size={16} weight="bold" />
          </Link>
          </div>
        </motion.div>
      </motion.header>

      {stats.statsError && (
        <p role="status" className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {stats.statsError}
        </p>
      )}

      <section className="mb-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div
          variants={riseChild}
          initial="hidden"
          animate="show"
          className="relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_22px_58px_-38px_rgba(5,150,105,0.28)]"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-emerald-300/30 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <BookOpenText size={23} weight="regular" />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wide text-emerald-700">Session 学习状态</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">你的练习进度</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-subtle">
                  草稿和复盘状态存在本机浏览器
                  {stats.sessionAttempts > 0
                    ? `，其中 ${stats.sessionAttempts} 次已备份到你的账号。`
                    : '。在复盘轨迹页可以备份到你的账号。'}
                </p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <DashboardSessionMetric label="草稿" value={String(sessionLearningSummary.inProgress)} />
              <DashboardSessionMetric label="待复盘" value={String(sessionLearningSummary.needsReview)} />
              <DashboardSessionMetric label="已检查" value={String(sessionLearningSummary.checked)} />
            </div>
            <Link
              href={PRACTICE_HISTORY_HREF}
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-emerald-300 active:scale-[0.99]"
            >
              <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-emerald-800">
                <ChartLineUp size={15} weight="regular" className="shrink-0" />
                {sessionHistorySummary && sessionHistorySummary.totalAttempts > 0 ? (
                  <span className="truncate">
                    已复盘 {sessionHistorySummary.totalAttempts} 次
                    {sessionHistorySummary.latestAccuracy !== null && ` · 最近 ${sessionHistorySummary.latestAccuracy}%`}
                    {sessionStreak > 0 && ` · 连续 ${sessionStreak} 天`}
                  </span>
                ) : (
                  <span className="truncate">查看复盘轨迹：正确率与自评 Band 的变化</span>
                )}
              </span>
              {sessionStreak > 0 ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  <Fire size={12} weight="fill" />
                  {sessionStreak}
                </span>
              ) : (
                <ArrowRight size={15} weight="bold" className="shrink-0 text-emerald-700" />
              )}
            </Link>
          </div>
        </motion.div>

        <motion.div
          variants={riseChild}
          initial="hidden"
          animate="show"
          className="relative overflow-hidden rounded-[2rem] border border-line bg-ink p-5 text-white shadow-[0_24px_60px_-38px_rgba(24,24,27,0.85)]"
        >
          <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <p className="text-xs font-semibold tracking-wide text-white/50">Session Library</p>
            <h2 className="mt-2 text-2xl font-semibold">按技能挑一组练</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
              Reading passage、Listening section、Writing task、Speaking cue card —— 材料、题组和复盘都在同一个练习现场。
            </p>
            <Link
              href={PRACTICE_SESSIONS_HREF}
              className="mt-5 flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition-all hover:-translate-y-0.5 hover:bg-zinc-100 active:scale-[0.98]"
            >
              浏览全部 Session
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <motion.div
          layout
          transition={springSnap}
          className={`relative overflow-hidden rounded-[2rem] border border-line p-5 shadow-[0_18px_48px_-36px_rgba(24,24,27,0.32)] ${difficultyTone.panel}`}
        >
          <motion.div
            key={difficulty}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springSnap}
            className={`pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full blur-3xl ${difficultyTone.glow}`}
            aria-hidden="true"
          />
          <div className={`absolute left-0 top-6 h-16 w-1 rounded-r-full ${difficultyTone.rail}`} aria-hidden="true" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">练习难度</h2>
                <p className="mt-1 text-sm text-ink-subtle">选择一个今天能坚持完成的强度。</p>
              </div>
              <span className="rounded-full border border-white/70 bg-white/55 px-3 py-1 text-xs font-semibold text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                {difficultyTone.label}
              </span>
            </div>
            <div className="mt-5 inline-flex items-center gap-1 rounded-full border border-line bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
              {DIFFICULTIES.map((d) => {
                const active = d.id === difficulty;
                return (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setDifficulty(d.id)}
                    className="relative rounded-full px-4 py-2 text-sm font-medium active:scale-[0.98]"
                  >
                    {active && (
                      <motion.span
                        layoutId="difficulty-pill"
                        transition={springSnap}
                        className="absolute inset-0 rounded-full bg-ink"
                      />
                    )}
                    <span className={`relative ${active ? 'text-white' : 'text-ink-subtle'}`}>{d.label}</span>
                  </button>
                );
              })}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={difficulty}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={springSnap}
                className="mt-4 text-sm text-ink-subtle"
              >
                {activeHint}
              </motion.p>
            </AnimatePresence>
            <p className="mt-6 border-t border-line/70 pt-4 text-xs text-ink-subtle">
              上次练习：{formatLastPracticed(stats.lastPracticedAt)}
            </p>
          </div>
        </motion.div>

        <div className="rounded-[2rem] border border-line bg-ink p-5 text-white shadow-[0_24px_60px_-36px_rgba(24,24,27,0.9)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-white/55">训练闭环</p>
              <h2 className="mt-2 text-2xl font-semibold">练习、记录、复盘</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
                每一次提交都会进入历史记录。错题会进入复习队列，收藏题会留在重点题库里。
              </p>
            </div>
            <div className="hidden rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-right sm:block">
              <p className="text-2xl font-semibold tabular-nums">{accuracyLabel}</p>
              <p className="text-xs text-white/45">当前正确率</p>
            </div>
          </div>
          <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: accuracyWidth }}
              transition={springSnap}
              className="h-full rounded-full bg-white"
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/wrong-book" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink active:scale-[0.98]">
              复习错题
            </Link>
            <Link href="/favorites" className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 active:scale-[0.98]">
              查看收藏
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <motion.div
          variants={riseChild}
          initial="hidden"
          animate="show"
          whileHover={{ y: -7, scale: 1.012 }}
          whileTap={{ scale: 0.995 }}
          transition={springSnap}
          className="group relative overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_22px_58px_-38px_rgba(5,150,105,0.32)] transition-colors hover:border-emerald-300 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_30px_72px_-40px_rgba(5,150,105,0.36)] lg:col-span-2"
        >
          <div className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-emerald-300/35 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-teal-200/30 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_0%,rgba(16,185,129,0.24),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(236,253,245,0.78))]" />
          </div>
          <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <BookOpenText size={23} weight="regular" />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wide text-emerald-700">Reading Session MVP</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">进入一篇 Passage + 五道关联题</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-subtle">
                  这是新的真实 IELTS 练习形态预览：材料常驻、题组跳转、答案草稿和复盘面板都在同一个 session 里。当前只读，不写入 history、错题本或收藏。
                </p>
              </div>
            </div>
            <Link
              href={PRACTICE_SESSIONS_HREF}
              className="flex w-fit items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(24,24,27,0.78)] transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98] lg:justify-self-end"
            >
              查看 Session Library
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </motion.div>
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ink">开始练习</h2>
            <p className="mt-1 text-sm text-ink-subtle">先选一个方向，系统会按当前难度抽题。</p>
          </div>
        </div>

        <motion.div
          variants={staggerParent(0.05)}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          {categories.map((cat) => {
            const isMixed = cat.id === 'mixed';
            const Icon = cat.icon;
            const tone = PRACTICE_TONES[cat.id];
            return (
              <motion.button
                key={cat.id}
                variants={riseChild}
                onClick={() => handleStartPractice(cat.id)}
                whileHover={{ y: isMixed ? -6 : -9, scale: isMixed ? 1.018 : 1.028 }}
                whileTap={{ scale: 0.98 }}
                transition={springSnap}
                className={`group relative min-h-44 overflow-hidden rounded-[2rem] border p-5 text-left transition-colors ${
                  isMixed
                    ? 'md:col-span-2 border-transparent bg-accent text-white shadow-[0_22px_50px_-30px_rgba(79,70,229,0.75)] hover:shadow-[0_32px_70px_-34px_rgba(79,70,229,0.85)]'
                    : `border-line bg-surface text-ink shadow-[0_14px_40px_-36px_rgba(24,24,27,0.28)] hover:shadow-[0_30px_72px_-38px_rgba(24,24,27,0.30)] ${tone.border}`
                }`}
              >
                {isMixed && <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/20 blur-sm transition-transform duration-500 group-hover:scale-150" aria-hidden />}
                {!isMixed && tone && (
                  <>
                    <div className={`pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${tone.glow}`} aria-hidden="true" />
                    <div className={`pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-85 ${tone.glowSoft}`} aria-hidden="true" />
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true">
                      <div className={`absolute inset-0 ${tone.wash}`} />
                    </div>
                    <div className={`pointer-events-none absolute left-0 top-6 h-16 w-1 rounded-r-full opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${tone.rail}`} aria-hidden="true" />
                  </>
                )}
                <div className="relative flex h-full flex-col justify-between">
                  <div className="flex items-start justify-between gap-4">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors duration-300 ${isMixed ? 'bg-white/15 text-white' : tone.icon}`}>
                      <Icon size={21} weight="regular" />
                    </span>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 group-hover:translate-x-1 group-hover:scale-110 ${isMixed ? 'bg-white/10 text-white/75' : 'bg-white/70 text-ink-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] group-hover:bg-ink group-hover:text-white'}`}>
                      <ArrowRight size={17} weight="bold" />
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold transition-transform duration-300 group-hover:-translate-y-0.5">{cat.name}</h3>
                    <p className={`mt-1 text-sm ${isMixed ? 'text-white/70' : 'text-ink-subtle group-hover:text-ink-muted'}`}>{cat.desc}</p>
                    <p className={`mt-3 text-xs leading-relaxed ${isMixed ? 'text-white/55' : 'text-ink-subtle'}`}>{cat.detail}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </section>
    </main>
  );
}

function DashboardSessionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3">
      <p className="text-[11px] font-semibold text-emerald-700/70">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-900">{value}</p>
    </div>
  );
}

type StatTone = 'accent' | 'emerald' | 'sky' | 'orange';

const STAT_TONES: Record<
  StatTone,
  {
    glow: string;
    wash: string;
    icon: string;
    bar: string;
  }
> = {
  accent: {
    glow: 'bg-accent/28',
    wash: 'bg-[radial-gradient(circle_at_78%_0%,rgba(79,70,229,0.24),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(99,102,241,0.14),transparent_46%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(238,242,255,0.78))]',
    icon: 'bg-accent-tint text-accent',
    bar: 'bg-accent',
  },
  emerald: {
    glow: 'bg-emerald-300/42',
    wash: 'bg-[radial-gradient(circle_at_78%_0%,rgba(16,185,129,0.28),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(52,211,153,0.14),transparent_46%),linear-gradient(135deg,rgba(255,255,255,0.97),rgba(236,253,245,0.84))]',
    icon: 'bg-emerald-50 text-emerald-700',
    bar: 'bg-emerald-600',
  },
  sky: {
    glow: 'bg-sky-300/42',
    wash: 'bg-[radial-gradient(circle_at_78%_0%,rgba(14,165,233,0.26),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(56,189,248,0.14),transparent_46%),linear-gradient(135deg,rgba(255,255,255,0.97),rgba(240,249,255,0.86))]',
    icon: 'bg-sky-50 text-sky-700',
    bar: 'bg-sky-600',
  },
  orange: {
    glow: 'bg-orange-300/46',
    wash: 'bg-[radial-gradient(circle_at_78%_0%,rgba(249,115,22,0.28),transparent_42%),radial-gradient(circle_at_0%_100%,rgba(251,146,60,0.16),transparent_46%),linear-gradient(135deg,rgba(255,255,255,0.97),rgba(255,247,237,0.88))]',
    icon: 'bg-orange-50 text-orange-700',
    bar: 'bg-orange-500',
  },
};

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  progress,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: IconType;
  progress?: number;
  tone: StatTone;
}) {
  const toneStyle = STAT_TONES[tone];

  return (
    <motion.div
      variants={riseChild}
      initial="hidden"
      animate="show"
      whileHover={{ y: -9, scale: 1.03 }}
      whileTap={{ scale: 0.99 }}
      transition={springSnap}
      className="group relative overflow-hidden rounded-[1.75rem] border border-line bg-surface p-5 shadow-[0_14px_40px_-34px_rgba(24,24,27,0.35)] transition-colors hover:border-zinc-300 hover:shadow-[0_30px_72px_-38px_rgba(24,24,27,0.28)]"
    >
      <div className={`pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100 ${toneStyle.glow}`} aria-hidden="true" />
      <div className={`pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-70 ${toneStyle.glow}`} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true">
        <div className={`absolute inset-0 ${toneStyle.wash}`} />
      </div>
      <div className="relative">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink-subtle transition-colors group-hover:text-ink-muted">{label}</p>
          <motion.span
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${toneStyle.icon}`}
            whileHover={{ rotate: -3, scale: 1.06 }}
            transition={springSnap}
          >
            <Icon size={18} weight="regular" />
          </motion.span>
        </div>
        <p className="text-3xl font-semibold tabular-nums text-ink">{value}</p>
        {typeof progress === 'number' && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100/90">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={springSnap}
              className={`h-full rounded-full ${toneStyle.bar}`}
            />
          </div>
        )}
        <p className="mt-3 text-xs text-ink-subtle">{hint}</p>
      </div>
    </motion.div>
  );
}
