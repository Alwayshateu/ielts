'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { springSnap, staggerParent, riseChild } from '../components/ui/motion-presets';
import AuraField from '../components/ui/AuraField';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CircleNotch,
  EnvelopeSimple,
  Moon,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';

export default function LoginPage() {
  const reduceMotion = useReducedMotion();
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
    <main className="aura-canvas-bg relative min-h-[100dvh] overflow-x-hidden overflow-y-auto text-[#f8f4f9]">
      <AuraField />

      {/* Top bar — brand left, version right, per reference composition. */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-6 py-6 sm:px-12">
        <Link
          href="/"
          className="glass-1 glass-blur flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-[#f8f4f9] transition-all duration-300 hover:-translate-y-0.5 hover:glass-2 active:scale-[0.98]"
        >
          <ArrowLeft size={15} weight="bold" />
          IELTS Trainer
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden font-mono text-xs text-[rgba(248,244,249,0.6)] sm:block">V03.01</span>
          <span className="glass-1 glass-blur inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-xs font-semibold text-[#f8f4f9]">
            <Moon size={15} weight="regular" />
            DARK
          </span>
        </div>
      </div>

      {/* Corner metadata — IELTS semantics in the reference's technical voice. */}
      <span className="tech-label absolute left-6 top-20 z-10 sm:left-12 lg:top-24" aria-hidden="true">
        PRACTICE.CORE // ON-LINE
      </span>
      <span className="tech-label absolute bottom-6 left-6 z-10 sm:left-12" aria-hidden="true">
        SESSION.SYNC_ESTABLISHED_
      </span>
      <span
        className="tech-label absolute right-12 top-1/2 z-10 hidden -translate-y-1/2 rotate-90 items-center gap-6 lg:flex origin-[center_right]"
        aria-hidden="true"
      >
        <span>BAND</span>
        <span>=</span>
        <span>TARGET</span>
        <span>-7.0</span>
      </span>

      <div className="relative z-10 grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2">
        {/* Left column: quiet brand statement over the aura field. */}
        <div className="hidden flex-col justify-end px-12 pb-16 lg:flex">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springSnap, delay: 0.1 }}
            className="max-w-md"
          >
            <p className="font-mono text-[11px] tracking-[0.2em] text-[#b08da3]">IELTS.IDENTITY</p>
            <h2 className="text-display mt-4 text-4xl font-medium leading-tight text-[#f8f4f9]">
              把薄弱项，
              <br />
              练成确定的答案。
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[rgba(248,244,249,0.6)]">
              练习、记录、复盘放进同一个闭环。每天只需要进入下一组最该做的题。
            </p>
          </motion.div>
        </div>

        {/* Right column: the glass auth panel. */}
        <div className="flex items-center justify-center px-4 py-24 sm:px-8 lg:justify-self-end lg:pr-[12%]">
          <motion.div
            variants={staggerParent(0.07)}
            initial="hidden"
            animate="show"
            className="glass-1 glass-blur flex h-[634px] w-full max-w-[440px] flex-col gap-8 rounded-[3rem] border border-white/40 p-8 shadow-[0_20px_40px_rgba(0,0,0,0.02)] sm:p-12"
          >
            <header className="flex flex-col gap-1">
              <motion.span
                variants={riseChild}
                className="glass-2 mb-2 self-start rounded-full px-3 py-1 font-mono text-[11px] leading-[14px] tracking-[0.1em] text-[#f8f4f9]"
              >
                IELTS.IDENTITY
              </motion.span>
              <motion.h1 variants={riseChild} className="text-display text-[32px] font-medium leading-[1.1] text-[#f8f4f9]">
                登录
              </motion.h1>
              <motion.p variants={riseChild} className="text-sm font-normal text-[rgba(248,244,249,0.6)]">
                使用邮箱验证链接，或先以游客身份进入训练室。
              </motion.p>
            </header>

            <motion.div variants={riseChild}>
              <button
                type="button"
                onClick={handleAnonymousLogin}
                disabled={loadingAnonymous || loadingEmail}
                className="glass-2 flex h-14 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-[#f8f4f9] transition-all duration-300 hover:-translate-y-0.5 hover:glass-3 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingAnonymous ? (
                  <CircleNotch size={18} weight="bold" className="animate-spin" />
                ) : (
                  <ShieldCheck size={18} weight="regular" />
                )}
                游客测试登录
              </button>
            </motion.div>

            <motion.div
              variants={riseChild}
              className="flex items-center gap-4 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.1em] text-[#b08da3]"
            >
              <span className="h-px flex-1 rounded-full bg-white/12" />
              EMAIL_OTP_LINK
              <span className="h-px flex-1 rounded-full bg-white/12" />
            </motion.div>

            <motion.form variants={riseChild} onSubmit={handleEmailLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="pl-4 text-xs font-medium text-[rgba(248,244,249,0.6)]">
                  邮箱地址
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="glass-2 h-14 w-full rounded-full px-6 text-[15px] text-[#f8f4f9] outline-none transition-colors placeholder:text-[rgba(248,244,249,0.4)] focus:glass-3"
                />
                <p className="pl-4 text-xs text-[rgba(248,244,249,0.45)]">
                  我们会发送一次性登录链接，无需设置密码。
                </p>
              </div>

              <button
                type="submit"
                disabled={loadingEmail || loadingAnonymous}
                className="mt-2 flex h-16 w-full items-center justify-between rounded-full bg-[#f8f4f9] px-6 text-base font-semibold text-[#2d1b33] shadow-[0_10px_30px_rgba(45,27,51,0.15)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_15px_40px_rgba(45,27,51,0.25)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loadingEmail ? (
                  <CircleNotch size={19} weight="bold" className="mx-auto animate-spin" />
                ) : (
                  <>
                    <span>发送登录链接</span>
                    <ArrowRight size={19} weight="bold" />
                  </>
                )}
              </button>
            </motion.form>

            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  key={message.text}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
                  transition={springSnap}
                  role="status"
                  className={`mt-6 flex items-start gap-3 rounded-[1.5rem] border p-4 text-sm ${
                    message.type === 'success'
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border-red-400/30 bg-red-400/10 text-red-300'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle size={18} weight="regular" className="mt-0.5 shrink-0" />
                  ) : (
                    <WarningCircle size={18} weight="regular" className="mt-0.5 shrink-0" />
                  )}
                  <span className="font-medium leading-relaxed">{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.p variants={riseChild} className="text-center font-mono text-[10px] tracking-[0.1em] text-[rgba(248,244,249,0.4)]">
              <EnvelopeSimple size={12} weight="regular" className="mr-1.5 inline align-[-2px]" />
              SUPABASE_AUTH // SECURE_SESSION
            </motion.p>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
