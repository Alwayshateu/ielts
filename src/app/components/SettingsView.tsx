'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  BellSimple,
  BookOpenText,
  CheckCircle,
  CircleNotch,
  Database,
  Eraser,
  GearSix,
  ListChecks,
  ShieldCheck,
  SignOut,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import {
  clearPracticeSessionAnnotations,
  clearPracticeSessionDraft,
  loadPracticeSessionAnnotations,
  readPracticeSessionDraftStatuses,
} from '@/lib/practice-session-draft';
import { getPracticeLearningSummary } from '@/lib/practice-session-recommendations';
import { getSamplePracticeUnits } from '@/lib/practice-session-samples';
import { riseChild, springSnap, staggerParent } from './ui/motion-presets';

type SettingsProfile = {
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

type SettingsViewProps = {
  userId: string;
  isAnonymous: boolean;
  authEmail: string | null;
  initialProfile: SettingsProfile | null;
};

type LocalSessionDataSummary = {
  sessionsWithData: number;
  inProgress: number;
  needsReview: number;
  checked: number;
  annotations: number;
};

function readLocalSessionDataSummary(): LocalSessionDataSummary {
  const units = getSamplePracticeUnits();
  const statuses = readPracticeSessionDraftStatuses(units);
  const learning = getPracticeLearningSummary(statuses);
  const annotations = units.reduce(
    (total, unit) => total + loadPracticeSessionAnnotations(unit.id).length,
    0
  );

  return {
    sessionsWithData: Object.keys(statuses).length,
    ...learning,
    annotations,
  };
}

function formatJoinedAt(value: string | null | undefined) {
  if (!value) return '本次会话';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '已创建';

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export default function SettingsView({
  userId,
  isAnonymous,
  authEmail,
  initialProfile,
}: SettingsViewProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initialProfile?.username ?? '');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [clearingSessionData, setClearingSessionData] = useState(false);
  const [localSessionData, setLocalSessionData] = useState(readLocalSessionDataSummary);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const displayEmail = initialProfile?.email || authEmail || '游客测试账号';
  const joinedAt = useMemo(() => formatJoinedAt(initialProfile?.created_at), [initialProfile?.created_at]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim() || null })
      .eq('id', userId);

    if (error) {
      console.error('Profile update failed:', error);
      setMessage({ type: 'error', text: '保存失败，请稍后重试。' });
    } else {
      setMessage({ type: 'success', text: '设置已保存。' });
      router.refresh();
    }

    setSaving(false);
  };

  const handleClearSessionData = () => {
    if (
      !window.confirm(
        '清空所有本地 Session 答案、标记、错因、rubric 自评和材料标注？此操作不会删除 Supabase 数据。'
      )
    ) {
      return;
    }

    setClearingSessionData(true);
    setMessage(null);

    const units = getSamplePracticeUnits();
    const results = units.map((unit) => {
      const draftCleared = clearPracticeSessionDraft(unit.id);
      const annotationsCleared = clearPracticeSessionAnnotations(unit.id);
      return draftCleared && annotationsCleared;
    });
    const cleared = results.every(Boolean);

    setLocalSessionData(readLocalSessionDataSummary());
    setMessage(
      cleared
        ? { type: 'success', text: '所有本地 Session 数据已清空。Supabase 数据未受影响。' }
        : { type: 'error', text: '部分本地 Session 数据未能清空，请检查浏览器存储权限。' }
    );
    setClearingSessionData(false);
  };

  const handleLogout = async () => {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.div variants={riseChild} className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink active:scale-[0.98]"
          >
            <ArrowLeft size={17} weight="bold" />
            返回 Dashboard
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          >
            {signingOut ? <CircleNotch size={17} weight="bold" className="animate-spin" /> : <SignOut size={17} weight="regular" />}
            退出登录
          </button>
        </motion.div>

        <motion.header variants={riseChild} className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle">
              <GearSix size={14} weight="regular" />
              设置
            </span>
            <h1 className="text-display mt-5 max-w-2xl text-4xl font-semibold text-ink sm:text-5xl">
              把训练环境调成自己的节奏。
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-subtle">
              现在先管理账号资料和训练偏好。后续目标分、考试日期、题型偏好会在不破坏当前学习闭环的基础上逐步接入。
            </p>
          </div>

          <motion.div
            whileHover={{ y: -6, scale: 1.015 }}
            whileTap={{ scale: 0.995 }}
            transition={springSnap}
            className="group relative overflow-hidden rounded-[2rem] border border-zinc-800 bg-ink p-5 text-white shadow-[0_24px_60px_-36px_rgba(24,24,27,0.9)]"
          >
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/10 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-accent/25 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-90" aria-hidden="true" />
            <div className="relative flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
                <UserCircle size={25} weight="regular" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{username.trim() || (isAnonymous ? '测试管理员' : '学员')}</p>
                <p className="mt-1 truncate text-xs text-white/55">{displayEmail}</p>
                <p className="mt-3 text-xs text-white/45">加入时间：{joinedAt}</p>
              </div>
            </div>
          </motion.div>
        </motion.header>

        <AnimatePresence mode="wait">
          {message && (
            <motion.p
              key={message.text}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={springSnap}
              role="status"
              className={`mb-6 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
                message.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {message.type === 'success' ? <CheckCircle size={18} weight="bold" /> : <WarningCircle size={18} weight="bold" />}
              {message.text}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <motion.section
            variants={riseChild}
            whileHover={{ y: -5, scale: 1.01 }}
            transition={springSnap}
            className="group relative overflow-hidden rounded-[2rem] border border-line bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_48px_-34px_rgba(24,24,27,0.35)] transition-colors hover:border-zinc-300 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_28px_64px_-38px_rgba(24,24,27,0.32)]"
          >
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-accent/12 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
            <div className="relative">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">账号资料</h2>
                <p className="mt-1 text-sm text-ink-subtle">当前数据库只支持 profile 基础字段，本页不会修改 schema。</p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-tint text-accent">
                <ShieldCheck size={20} weight="regular" />
              </span>
            </div>

            <div className="space-y-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="username" className="text-sm font-semibold text-ink">
                  显示名称
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="例如：正在冲 7 的学员"
                  className="w-full rounded-2xl border border-line bg-zinc-50 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10"
                />
                <p className="text-xs leading-relaxed text-ink-subtle">
                  只影响应用内显示，不会修改 Supabase Auth 邮箱。
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-ink">登录身份</label>
                <div className="rounded-2xl border border-line bg-zinc-50 px-4 py-3 text-sm text-ink-muted">
                  {displayEmail}
                </div>
                {isAnonymous && (
                  <p className="text-xs leading-relaxed text-amber-700">
                    当前是游客测试登录。后续如果需要长期保存跨设备数据，建议接入邮箱登录。
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_36px_-26px_rgba(24,24,27,0.75)] transition-all hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-[0_24px_48px_-28px_rgba(24,24,27,0.85)] active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
              >
                {saving && <CircleNotch size={17} weight="bold" className="animate-spin" />}
                保存设置
              </button>
            </div>
            </div>
          </motion.section>

          <motion.section variants={riseChild} className="space-y-4">
            <InfoPanel
              icon={BookOpenText}
              title="练习形态规划"
              body="真实 IELTS 不是一题一题孤立出现。后续会把 Reading Passage、Listening Section、Writing Task、Speaking Cue Card 分成各自的考试式界面。"
            />
            <InfoPanel
              icon={Database}
              title="当前数据库能力"
              body="现在可以安全保存 profile、历史记录、收藏和错题。目标分、考试日期、题型偏好等个性化设置需要后续 schema 支持，本轮先不写入假字段。"
            />
            <InfoPanel
              icon={BellSimple}
              title="训练反馈方向"
              body="基础、进阶、挑战会逐步从单纯难度变成不同训练模式：基础练语言与规则，进阶练题型策略，挑战练考试节奏。"
            />
          </motion.section>
        </div>

        <motion.section
          variants={riseChild}
          className="mt-6 overflow-hidden rounded-[2rem] border border-sky-200/70 bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_20px_54px_-36px_rgba(14,165,233,0.26)]"
        >
          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <ListChecks size={21} weight="regular" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-sky-700">本地 Session 数据</p>
                  <h2 className="mt-2 text-xl font-semibold text-ink">管理当前浏览器里的练习现场</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-subtle">
                    Session 答案、标记、错因、rubric 自评和材料标注目前保存在 localStorage。清理这里只影响当前浏览器，不会删除账号、历史记录、收藏、错题本或 Supabase 数据。
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <LocalDataMetric label="有数据" value={localSessionData.sessionsWithData} />
                <LocalDataMetric label="草稿" value={localSessionData.inProgress} />
                <LocalDataMetric label="待复盘" value={localSessionData.needsReview} />
                <LocalDataMetric label="已检查" value={localSessionData.checked} />
                <LocalDataMetric label="材料标注" value={localSessionData.annotations} />
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:w-48">
              <Link
                href="/practice/sessions"
                className="flex items-center justify-center rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
              >
                打开 Session Library
              </Link>
              <button
                type="button"
                onClick={handleClearSessionData}
                disabled={clearingSessionData || (localSessionData.sessionsWithData === 0 && localSessionData.annotations === 0)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-all hover:-translate-y-0.5 hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-line disabled:bg-zinc-50 disabled:text-ink-subtle disabled:hover:translate-y-0"
              >
                {clearingSessionData ? (
                  <CircleNotch size={17} weight="bold" className="animate-spin" />
                ) : (
                  <Eraser size={17} weight="regular" />
                )}
                清空本地数据
              </button>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </main>
  );
}

function LocalDataMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/65 p-3">
      <p className="text-[11px] font-semibold text-sky-700/70">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-sky-950">{value}</p>
    </div>
  );
}

function InfoPanel({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BookOpenText;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.012 }}
      whileTap={{ scale: 0.995 }}
      transition={springSnap}
      className="group relative overflow-hidden rounded-[2rem] border border-line bg-surface p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_14px_42px_-34px_rgba(24,24,27,0.32)] transition-colors hover:border-accent/25 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_26px_62px_-38px_rgba(24,24,27,0.32)]"
    >
      <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-accent/12 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
      <div className="relative flex items-start gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent-tint text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
          <Icon size={20} weight="regular" />
        </span>
        <div>
          <h2 className="font-semibold text-ink">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-subtle">{body}</p>
        </div>
      </div>
    </motion.div>
  );
}
