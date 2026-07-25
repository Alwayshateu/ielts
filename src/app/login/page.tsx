'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import MagneticButton from '../components/ui/MagneticButton';
import { springSnap, staggerParent, riseChild } from '../components/ui/motion-presets';
import {
  BookOpenText,
  Headphones,
  PenNib,
  Microphone,
  BookmarkSimple,
  ChartLineUp,
  EnvelopeSimple,
  ShieldCheck,
  CheckCircle,
  WarningCircle,
  CircleNotch,
  ArrowRight,
} from '@phosphor-icons/react';

const SKILL_ORBIT = [
  { Icon: BookOpenText, label: '阅读', delay: 0 },
  { Icon: Headphones, label: '听力', delay: 0.15 },
  { Icon: PenNib, label: '写作', delay: 0.3 },
  { Icon: Microphone, label: '口语', delay: 0.45 },
];

const HIGHLIGHTS = [
  { Icon: BookOpenText, text: '四项技能分类练习，按难度逐步推进' },
  { Icon: ChartLineUp, text: '错题自动归档，形成可复盘的题库' },
  { Icon: BookmarkSimple, text: '收藏重点题目，随时回到薄弱环节' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingAnonymous, setLoadingAnonymous] = useState(false);
  const [message, setMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingEmail(true);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: '登录链接已发送，请查收邮箱。' });
    }

    setLoadingEmail(false);
  };

  const handleAnonymousLogin = async () => {
    setLoadingAnonymous(true);
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInAnonymously();

    if (error) {
      setMessage({
        type: 'error',
        text: `匿名测试登录失败：${error.message}`,
      });
      setLoadingAnonymous(false);
      return;
    }

    window.location.href = '/dashboard';
  };

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 bg-canvas text-ink lg:grid-cols-[1.1fr_1fr]">
      {/* Branding panel — hidden on small screens, per anti-center-bias split layout. */}
      <div className="relative hidden overflow-hidden bg-ink px-14 py-16 lg:flex lg:flex-col lg:justify-between">
        <div
          className="aurora -left-28 -top-28 h-[440px] w-[440px] bg-accent/35"
          aria-hidden
        />
        <div
          className="aurora -bottom-36 right-[-6rem] h-[380px] w-[380px] bg-accent/15"
          style={{ animationDelay: '-11s' }}
          aria-hidden
        />
        <div className="grain absolute inset-0" aria-hidden />

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSnap}
          className="relative z-10 flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white">
            雅
          </div>
          <span className="text-tight text-sm font-medium text-zinc-300">
            IELTS Trainer
          </span>
        </motion.div>

        <div className="relative z-10 max-w-md">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSnap, delay: 0.05 }}
            className="text-display text-4xl font-semibold text-white"
          >
            把薄弱项练成不再犹豫的答案
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSnap, delay: 0.12 }}
            className="mt-4 text-sm leading-relaxed text-zinc-400"
          >
            一个只为你自己的雅思训练系统：挑难度、练题、回顾错题，三件事循环起来。
          </motion.p>

          <ul className="mt-9 space-y-4">
            {HIGHLIGHTS.map(({ Icon, text }, i) => (
              <motion.li
                key={text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springSnap, delay: 0.18 + i * 0.08 }}
                className="flex items-center gap-3 text-sm text-zinc-300"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-accent-tint">
                  <Icon size={16} weight="regular" />
                </span>
                {text}
              </motion.li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          {SKILL_ORBIT.map(({ Icon, label, delay }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <motion.span
                animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay,
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-300"
              >
                <Icon size={15} weight="regular" />
              </motion.span>
              <span className="text-xs text-zinc-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center overflow-hidden px-6 py-16 sm:px-12">
        <div className="pointer-events-none absolute -right-24 top-12 h-72 w-72 rounded-full bg-accent/12 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-accent-tint/70 blur-3xl" aria-hidden="true" />
        <motion.div
          variants={staggerParent(0.07)}
          initial="hidden"
          animate="show"
          className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-line bg-surface/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_28px_70px_-44px_rgba(24,24,27,0.42)] sm:p-8"
        >
          <motion.div
            variants={riseChild}
            className="mb-8 flex items-center gap-3 lg:hidden"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white">
              雅
            </div>
            <span className="text-sm font-medium text-ink-muted">
              IELTS Trainer
            </span>
          </motion.div>

          <motion.h1
            variants={riseChild}
            className="text-display text-3xl font-semibold text-ink"
          >
            登录
          </motion.h1>
          <motion.p variants={riseChild} className="mt-2 text-sm text-ink-subtle">
            没有邮箱就先用测试账号进系统看看。
          </motion.p>

          <motion.div variants={riseChild} className="mt-8">
            <MagneticButton
              type="button"
              onClick={handleAnonymousLogin}
              disabled={loadingAnonymous || loadingEmail}
              strength={6}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_38px_-28px_rgba(24,24,27,0.85)] transition-all hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-[0_24px_52px_-30px_rgba(24,24,27,0.9)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingAnonymous ? (
                <CircleNotch size={18} weight="bold" className="animate-spin" />
              ) : (
                <ShieldCheck size={18} weight="regular" />
              )}
              <span>游客测试登录</span>
            </MagneticButton>
          </motion.div>

          <motion.div
            variants={riseChild}
            className="my-6 flex items-center gap-3"
          >
            <div className="h-px flex-1 bg-line" />
            <span className="text-xs text-ink-subtle">或者</span>
            <div className="h-px flex-1 bg-line" />
          </motion.div>

          <motion.form
            variants={riseChild}
            onSubmit={handleEmailLogin}
            className="space-y-2"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-semibold text-ink">
                邮箱地址
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-2xl border border-line bg-zinc-50 px-4 py-3 text-sm text-ink outline-none transition-all placeholder:text-ink-subtle focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10"
              />
              <p className="text-xs text-ink-subtle">
                我们会发送一次性登录链接，无需设置密码。
              </p>
            </div>

            <MagneticButton
              type="submit"
              disabled={loadingEmail || loadingAnonymous}
              strength={6}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3.5 text-sm font-semibold text-white shadow-[0_18px_38px_-28px_rgba(79,70,229,0.75)] transition-all hover:-translate-y-0.5 hover:bg-accent-strong hover:shadow-[0_24px_52px_-30px_rgba(79,70,229,0.85)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingEmail ? (
                <CircleNotch size={18} weight="bold" className="animate-spin" />
              ) : (
                <>
                  <EnvelopeSimple size={18} weight="regular" />
                  <span>发送登录链接</span>
                  <ArrowRight size={16} weight="bold" className="ml-0.5" />
                </>
              )}
            </MagneticButton>
          </motion.form>

          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                key={message.text}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={springSnap}
                role="status"
                className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ${
                  message.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle size={18} weight="regular" className="mt-0.5 shrink-0" />
                ) : (
                  <WarningCircle size={18} weight="regular" className="mt-0.5 shrink-0" />
                )}
                <span className="leading-relaxed font-medium">{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
