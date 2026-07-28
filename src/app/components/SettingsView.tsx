'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  CheckCircle,
  CircleNotch,
  Eraser,
  SignOut,
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
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.div variants={riseChild} className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-zinc-100 hover:text-ink active:scale-[0.98]"
          >
            <ArrowLeft size={17} weight="bold" />
            返回 Dashboard
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          >
            {signingOut ? <CircleNotch size={17} weight="bold" className="animate-spin" /> : <SignOut size={17} weight="regular" />}
            退出登录
          </button>
        </motion.div>

        <motion.header variants={riseChild} className="mt-6">
          <h1 className="text-tight text-3xl font-semibold text-ink">设置</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-subtle">
            管理账号资料和本地训练数据。{isAnonymous ? '当前是游客测试登录。' : `登录身份：${displayEmail}`}
          </p>
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
              className={`mt-6 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
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

        {/* Account profile */}
        <motion.section variants={riseChild} className="mt-8">
          <h2 className="text-sm font-semibold text-ink-subtle">账号资料</h2>
          <div className="mt-4 space-y-5 rounded-2xl border border-line bg-surface p-5">
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
                className="w-full rounded-xl border border-line bg-zinc-50 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10"
              />
              <p className="text-xs leading-relaxed text-ink-subtle">
                只影响应用内显示，不会修改 Supabase Auth 邮箱。加入时间：{joinedAt}。
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-ink">登录身份</label>
              <div className="rounded-xl border border-line bg-zinc-50 px-4 py-3 text-sm text-ink-muted">
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
            >
              {saving && <CircleNotch size={17} weight="bold" className="animate-spin" />}
              保存设置
            </button>
          </div>
        </motion.section>

        {/* Local session data */}
        <motion.section variants={riseChild} className="mt-8">
          <h2 className="text-sm font-semibold text-ink-subtle">本地 Session 数据</h2>
          <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm leading-relaxed text-ink-subtle">
              Session 答案、标记、错因、rubric 自评和材料标注保存在本浏览器的 localStorage。清理只影响当前浏览器，不会删除账号、历史记录、收藏、错题本或 Supabase 数据。
            </p>

            <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-5">
              <LocalDataMetric label="有数据" value={localSessionData.sessionsWithData} />
              <LocalDataMetric label="草稿" value={localSessionData.inProgress} />
              <LocalDataMetric label="待复盘" value={localSessionData.needsReview} />
              <LocalDataMetric label="已检查" value={localSessionData.checked} />
              <LocalDataMetric label="材料标注" value={localSessionData.annotations} />
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/practice/sessions"
                className="flex flex-1 items-center justify-center rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent/30 hover:bg-accent-tint hover:text-accent active:scale-[0.98]"
              >
                打开 Session Library
              </Link>
              <button
                type="button"
                onClick={handleClearSessionData}
                disabled={clearingSessionData || (localSessionData.sessionsWithData === 0 && localSessionData.annotations === 0)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-line disabled:bg-zinc-50 disabled:text-ink-subtle"
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

        {/* Roadmap — quiet, not three glowing cards */}
        <motion.section variants={riseChild} className="mt-8">
          <h2 className="text-sm font-semibold text-ink-subtle">计划中</h2>
          <dl className="mt-4 space-y-4 border-l-2 border-line pl-4">
            {ROADMAP.map((item) => (
              <div key={item.title}>
                <dt className="text-sm font-semibold text-ink">{item.title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink-subtle">{item.body}</dd>
              </div>
            ))}
          </dl>
        </motion.section>
      </motion.div>
    </main>
  );
}

const ROADMAP = [
  {
    title: '练习形态',
    body: '真实 IELTS 不是孤立的一题一题。Reading Passage、Listening Section、Writing Task、Speaking Cue Card 会分成各自的考试式界面。',
  },
  {
    title: '个性化设置',
    body: '目标分、考试日期、题型偏好需要后续 schema 支持，本轮先不写入假字段，避免和现有数据混淆。',
  },
  {
    title: '训练模式',
    body: '基础、进阶、挑战会从单纯难度变成不同训练模式：基础练语言与规则，进阶练题型策略，挑战练考试节奏。',
  },
];

function LocalDataMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface p-3">
      <p className="text-[11px] font-semibold text-ink-subtle">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}
