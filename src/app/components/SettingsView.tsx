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
  const [activeSection, setActiveSection] = useState<'profile' | 'session' | 'roadmap'>('profile');

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
    <main className="variant-settings relative min-h-[100dvh] w-full px-4 py-8 sm:px-6 lg:px-8">
      <span className="tech-label pointer-events-none absolute left-6 top-20 z-10 sm:left-12 lg:top-24" aria-hidden="true">
        ACCOUNT.CORE // SYNCED
      </span>
      <span className="tech-label pointer-events-none absolute bottom-6 left-6 z-10 sm:left-12" aria-hidden="true">
        PROFILE.DATA // LOCAL_SESSION
      </span>
      <div className="relative z-10 mx-auto w-full max-w-6xl">
      <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.div variants={riseChild} className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:border-accent/25 hover:text-ink active:scale-[0.98]"
          >
            <ArrowLeft size={17} weight="bold" />
            返回 Dashboard
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink-muted transition-all hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
          >
            {signingOut ? <CircleNotch size={17} weight="bold" className="animate-spin" /> : <SignOut size={17} weight="regular" />}
            退出登录
          </button>
        </motion.div>

        <motion.header variants={riseChild} className="mt-6 pt-10 sm:pt-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent-tint px-3 py-1.5 text-xs font-semibold text-accent">
              <span className="h-2 w-2 rounded-full bg-accent" />
              设置 / 账号与会话数据
            </div>
            <h1 className="text-display mt-4 max-w-2xl text-3xl font-semibold text-ink sm:text-4xl">
              管理账号资料，也管理你自己的训练痕迹。
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-subtle">
              这里分成账号资料、本地 Session 数据和后续训练路线。{isAnonymous ? '当前是游客测试登录。' : `登录身份：${displayEmail}`}
            </p>
            {isAnonymous && (
              <p className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                当前是测试登录
              </p>
            )}
          </div>
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

        <section className="mt-8 grid gap-6 lg:grid-cols-[350px_minmax(0,1fr)]">
          <motion.section id="account-profile" variants={riseChild}>
            <h2 className="text-sm font-semibold text-ink-subtle">账号资料</h2>
            <div className="mt-4 space-y-5 rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_14px_40px_-32px_rgba(45,27,51,0.24)]">
            <div className="mb-5 border-b border-line pb-5">
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] tracking-[0.12em] text-[#c2a5cf]">
                AURA.CORE
              </span>
              <h2 className="mt-3 text-2xl font-medium text-ink">Settings</h2>
              <nav className="mt-4 flex flex-col gap-1" aria-label="设置分区">
                {[
                  ['profile', '账号资料'],
                  ['session', 'Session 数据'],
                  ['roadmap', '训练规划'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id as 'profile' | 'session' | 'roadmap')}
                    className={`rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors ${
                      activeSection === id
                        ? 'bg-white/10 text-ink'
                        : 'text-ink-subtle hover:bg-white/10 hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#c2a5cf] shadow-[0_0_36px_rgba(166,124,142,0.35)]">
                <UserCircle size={38} weight="regular" />
              </span>
              <div>
                <p className="font-mono text-[10px] tracking-[0.12em] text-ink-subtle">CURRENT ACCOUNT</p>
                <p className="mt-1 text-sm font-semibold text-ink">{displayEmail}</p>
                <p className="mt-1 text-xs text-ink-subtle">{isAnonymous ? '游客测试登录' : '邮箱身份已连接'} · {joinedAt}</p>
              </div>
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
            </div>
          </motion.section>

          <div className="space-y-8">
              {activeSection === 'profile' && (
                <motion.section variants={riseChild}>
                  <div className="fd9-section-header">
                    <span className="font-mono text-[10px] tracking-[0.16em] text-[#b08da3]">PROFILE // IDENTITY</span>
                    <h2 className="mt-2 text-2xl font-medium text-ink">账号资料</h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-subtle">管理应用内显示名称和当前登录身份。</p>
                  </div>
                  <div className="mt-6 space-y-5 rounded-3xl border border-line bg-white/5 p-6">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="username" className="text-sm font-semibold text-ink">显示名称</label>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        placeholder="例如：正在冲 7 的学员"
                        className="w-full rounded-2xl border border-line bg-zinc-50 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10"
                      />
                      <p className="text-xs leading-relaxed text-ink-subtle">只影响应用内显示，不会修改 Supabase Auth 邮箱。加入时间：{joinedAt}。</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-ink">登录身份</label>
                      <div className="rounded-2xl border border-line bg-zinc-50 px-4 py-3 text-sm text-ink-muted">{displayEmail}</div>
                      {isAnonymous && <p className="text-xs leading-relaxed text-amber-700">当前是游客测试登录。后续如果需要长期保存跨设备数据，建议接入邮箱登录。</p>}
                    </div>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                    >
                      {saving && <CircleNotch size={17} weight="bold" className="animate-spin" />}
                      保存设置
                    </button>
                  </div>
                </motion.section>
              )}

              {activeSection === 'session' && (
              <motion.section id="session-data" variants={riseChild}>
                <h2 className="text-sm font-semibold text-ink-subtle">本地 Session 数据</h2>
            <div className="mt-4 rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_14px_40px_-32px_rgba(45,27,51,0.24)]">
              <p className="text-sm leading-relaxed text-ink-subtle">
                Session 答案、标记、错因、rubric 自评和材料标注保存在本浏览器的 localStorage。清理只影响当前浏览器，不会删除账号、历史记录、收藏、错题本或 Supabase 数据。
              </p>

              <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-5">
                <LocalDataMetric label="有数据" value={localSessionData.sessionsWithData} />
                <LocalDataMetric label="草稿" value={localSessionData.inProgress} />
                <LocalDataMetric label="待复盘" value={localSessionData.needsReview} />
                <LocalDataMetric label="已检查" value={localSessionData.checked} />
                <LocalDataMetric label="材料标注" value={localSessionData.annotations} />
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/practice/sessions"
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent-tint hover:text-accent active:scale-[0.98]"
                >
                  打开 Session Library
                </Link>
                <button
                  type="button"
                  onClick={handleClearSessionData}
                  disabled={clearingSessionData || (localSessionData.sessionsWithData === 0 && localSessionData.annotations === 0)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-line disabled:bg-zinc-50 disabled:text-ink-subtle disabled:hover:translate-y-0"
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
              )}

              {activeSection === 'roadmap' && (
                <motion.section id="learning-roadmap" variants={riseChild}>
                  <div className="fd9-section-header">
                    <span className="font-mono text-[10px] tracking-[0.16em] text-[#b08da3]">ROADMAP // NEXT</span>
                    <h2 className="mt-2 text-2xl font-medium text-ink">训练规划</h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-subtle">把后续产品能力和当前训练入口放在同一个视野里。</p>
                  </div>
                  <dl className="mt-6 space-y-4 rounded-3xl border border-line bg-white/5 p-6">
                    {ROADMAP.map((item) => (
                      <div key={item.title} className="border-b border-line/80 pb-4 last:border-0 last:pb-0">
                        <dt className="text-sm font-semibold text-ink">{item.title}</dt>
                        <dd className="mt-1 text-sm leading-relaxed text-ink-subtle">{item.body}</dd>
                      </div>
                    ))}
                  </dl>
                </motion.section>
              )}
            </div>
          </section>
        </motion.div>
      </div>
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
