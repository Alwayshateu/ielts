'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ComponentType } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  ChartLineUp,
  ClipboardText,
  Database,
  Fire,
  GearSix,
  Headphones,
  CircleNotch,
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
  { id: 'reading', name: '阅读', icon: BookOpenText, desc: '长难句与信息定位', detail: '训练结构感和细节判断。' },
  { id: 'listening', name: '听力', icon: Headphones, desc: '听前预测与关键信息', detail: '先保留入口，后续接入专项交互。' },
  { id: 'writing', name: '写作', icon: PenNib, desc: '结构、观点与结论', detail: '用填空题先打结构基础。' },
  { id: 'speaking', name: '口语', icon: Microphone, desc: '话题组织与表达', detail: '用 prompt 练习回答方向。' },
];

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: 'easy', label: '基础', hint: '降低摩擦，先找回节奏' },
  { id: 'medium', label: '进阶', hint: '贴近实考节奏，适合日常训练' },
  { id: 'hard', label: '挑战', hint: '冲刺薄弱项和高分区间' },
];

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
  const sessionRecommendation = useMemo(
    () => getRecommendedPracticeUnits(practiceSessionUnits, practiceSessionStatuses, 1)[0] ?? null,
    [practiceSessionStatuses, practiceSessionUnits]
  );
  const sessionLearningSummary = useMemo(
    () => getPracticeLearningSummary(practiceSessionStatuses),
    [practiceSessionStatuses]
  );

  const displayName = isAnonymous
    ? '测试管理员'
    : profile.username || profile.email?.split('@')[0] || '学员';

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

    const routing: Record<typeof resolved.kind, { href: string; Icon: IconType }> = {
      'resume-session': { href: sessionHref, Icon: Lightning },
      'review-session': { href: sessionHref, Icon: Target },
      'clear-wrong-book': { href: '/wrong-book', Icon: ClipboardText },
      'first-session': { href: sessionHref, Icon: Lightning },
      'keep-going': { href: sessionHref, Icon: Target },
    };

    return {
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
  const accuracyLabel = stats.accuracy === null ? '—' : `${stats.accuracy}%`;

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

  const metrics: { label: string; value: string; hint: string }[] = [
    { label: '练习记录', value: String(stats.totalAttempts), hint: '最多显示最近 500 条' },
    { label: '正确率', value: accuracyLabel, hint: '基于现有历史记录' },
    { label: '7 天练习', value: String(stats.recentAttempts), hint: '保持手感的节奏' },
    { label: '复习队列', value: String(stats.wrongBookCount), hint: `${stats.favoritesCount} 道收藏题` },
  ];

  return (
    <main className="variant-dashboard relative min-h-[calc(100dvh-80px)] w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative z-10 mx-auto w-full max-w-6xl">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.div variants={riseChild} className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-line bg-white/75 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-white hover:text-ink active:scale-[0.98]"
          >
            <ArrowLeft size={15} weight="bold" />
            回到首页
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-subtle transition-colors hover:bg-zinc-100 hover:text-ink active:scale-[0.98]"
            >
              <GearSix size={15} weight="regular" />
              设置
            </Link>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-subtle transition-colors hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? <CircleNotch size={15} weight="bold" className="animate-spin" /> : <SignOut size={15} weight="regular" />}
              退出登录
            </button>
          </div>
        </motion.div>

        <motion.header variants={riseChild} className="mt-6 grid gap-6 lg:grid-cols-[1.06fr_0.94fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent-tint px-3 py-1.5 text-xs font-semibold text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              IELTS Trainer / Dashboard
            </div>
            <h1 className="text-display mt-4 max-w-2xl text-3xl font-semibold text-ink sm:text-4xl">
              今天，把一个薄弱点练到更确定。
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-subtle">
              你好，{displayName}。看见状态，选择难度，然后进入下一步。
            </p>
            {isAnonymous && (
              <p className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                当前是测试登录
              </p>
            )}
          </div>

          <div className="dashboard-recommendation rounded-[1.5rem] border border-white/70 bg-[#2d1b33] p-5 text-white shadow-[0_24px_70px_-48px_rgba(45,27,51,0.95)]">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Database size={22} weight="regular" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">今日建议</p>
                <p className="mt-1 text-xs leading-relaxed text-white/65">
                  {recommendation.title}
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/80">{recommendation.desc}</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80">
                {recommendation.label}
              </span>
              {sessionStreak > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800">
                  <Fire size={13} weight="fill" />
                  {sessionStreak} 天练习
                </span>
              )}
            </div>
            <Link
              href={recommendation.href}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              继续这一步
              <ArrowRight size={16} weight="bold" />
            </Link>
          </div>
        </motion.header>

        {stats.statsError && (
          <motion.p
            variants={riseChild}
            role="status"
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {stats.statsError}
          </motion.p>
        )}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-sm font-semibold text-ink-subtle">你的状态</h2>
            <span className="text-xs text-ink-subtle">
              上次练习 · {formatLastPracticed(stats.lastPracticedAt)}
            </span>
          </div>

          <motion.div
            variants={staggerParent(0.05)}
            initial="hidden"
            animate="show"
            className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[1.5rem] border border-line bg-line md:grid-cols-4"
          >
            {metrics.map((metric) => (
              <Metric key={metric.label} {...metric} />
            ))}
          </motion.div>

          <motion.div variants={riseChild} initial="hidden" animate="show">
            <Link
              href={PRACTICE_HISTORY_HREF}
              className="group mt-4 flex items-center justify-between gap-4 rounded-[1.5rem] border border-line bg-white/85 px-5 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 active:scale-[0.99]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-tint text-accent">
                  <ChartLineUp size={19} weight="regular" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {sessionHistorySummary && sessionHistorySummary.totalAttempts > 0
                      ? `已复盘 ${sessionHistorySummary.totalAttempts} 次${
                          sessionHistorySummary.latestAccuracy !== null
                            ? ` · 最近 ${sessionHistorySummary.latestAccuracy}%`
                            : ''
                        }`
                      : '查看复盘轨迹'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-subtle">
                    草稿 {sessionLearningSummary.inProgress} · 待复盘 {sessionLearningSummary.needsReview} · 已检查 {sessionLearningSummary.checked}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <ArrowRight size={16} weight="bold" className="text-ink-subtle transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </motion.div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-ink">开始练习</h2>
              <p className="mt-1 text-sm text-ink-subtle">先选强度，再选一个方向，系统会按当前难度抽题。</p>
            </div>
            <div className="inline-flex items-center gap-1 self-start rounded-full border border-line bg-surface p-1 sm:self-auto">
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
          </div>

          <p className="mt-3 text-sm text-ink-subtle">{activeHint}</p>

          <motion.div
            variants={staggerParent(0.05)}
            initial="hidden"
            animate="show"
            className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {categories.map((cat) => {
              const isMixed = cat.id === 'mixed';
              const Icon = cat.icon;
              return (
                <motion.button
                  key={cat.id}
                  variants={riseChild}
                  onClick={() => handleStartPractice(cat.id)}
                  whileHover={{ y: -4, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={springSnap}
                  className={`portal-action-card group relative flex min-h-40 flex-col justify-between overflow-hidden rounded-[1.5rem] p-5 text-left transition-colors ${
                    isMixed
                      ? 'sm:col-span-2 bg-accent text-white'
                      : 'border border-line bg-surface text-ink hover:border-accent/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-colors ${
                        isMixed ? 'bg-white/15 text-white' : 'bg-accent-tint text-accent'
                      }`}
                    >
                      <Icon size={21} weight="regular" />
                    </span>
                    <ArrowRight
                      size={17}
                      weight="bold"
                      className={`transition-transform duration-300 group-hover:translate-x-1 ${
                        isMixed ? 'text-white/70' : 'text-ink-subtle'
                      }`}
                    />
                  </div>
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold">{cat.name}</h3>
                    <p className={`mt-1 text-sm ${isMixed ? 'text-white/70' : 'text-ink-subtle'}`}>{cat.desc}</p>
                    <p className={`mt-2 text-xs leading-relaxed ${isMixed ? 'text-white/55' : 'text-ink-subtle'}`}>{cat.detail}</p>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </section>
      </motion.div>
      </div>
    </main>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <motion.div variants={riseChild} className="bg-surface p-5">
      <p className="text-sm font-medium text-ink-subtle">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-2 text-xs text-ink-subtle">{hint}</p>
    </motion.div>
  );
}
