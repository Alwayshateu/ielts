'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CheckCircle,
  CircleNotch,
  ClipboardText,
  Heart,
  Target,
  WarningCircle,
  XCircle,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { formatCategory, formatDifficulty } from '@/lib/question-labels';
import type { IeltsQuestion } from '@/lib/types';
import { PRACTICE_SESSIONS_HREF } from '@/lib/practice-session-links';
import { riseChild, springSnap, springSoft, staggerParent } from './ui/motion-presets';

type AnswerStatus = 'idle' | 'correct' | 'wrong';
type LoadState = 'loading' | 'ready' | 'empty' | 'error';

export default function PracticeView({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const reduceMotion = useReducedMotion();

  const category = searchParams.get('category') || 'mixed';
  const difficulty = searchParams.get('difficulty') || 'medium';

  const [question, setQuestion] = useState<IeltsQuestion | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [userAnswer, setUserAnswer] = useState('');
  const [status, setStatus] = useState<AnswerStatus>('idle');
  const [isFavorited, setIsFavorited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({ attempts: 0, correct: 0, wrong: 0, streak: 0 });

  const checkIfFavorited = useCallback(async (questionId: string) => {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle();

    setIsFavorited(Boolean(data));
  }, [supabase, userId]);

  const fetchQuestion = useCallback(async () => {
    setLoadState('loading');
    setStatus('idle');
    setUserAnswer('');
    setIsFavorited(false);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc('get_random_questions', {
        p_category: category,
        p_difficulty: category === 'mixed' ? null : difficulty,
        p_limit: 1,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setQuestion(data[0]);
        await checkIfFavorited(data[0].id);
        setLoadState('ready');
      } else {
        setQuestion(null);
        setLoadState('empty');
      }
    } catch (error) {
      console.error('Fetch question failed:', error);
      setQuestion(null);
      setLoadState('error');
      setMessage('题目加载失败，请检查网络后重试。');
    }
  }, [category, checkIfFavorited, difficulty, supabase]);

  useEffect(() => {
    void fetchQuestion();
  }, [fetchQuestion]);

  const handleSubmit = useCallback(async () => {
    if (!question || !userAnswer.trim() || saving || status !== 'idle') return;

    setSaving(true);
    setMessage(null);

    const cleanUser = userAnswer.trim().toLowerCase();
    const cleanCorrect = question.correct_answer.trim().toLowerCase();
    const isCorrect = cleanUser === cleanCorrect;

    setStatus(isCorrect ? 'correct' : 'wrong');

    try {
      const { error: historyError } = await supabase.from('history').insert({
        user_id: userId,
        question_id: question.id,
        user_answer: userAnswer,
        is_correct: isCorrect,
      });

      if (historyError) throw historyError;

      if (!isCorrect) {
        const { data: exist, error: existError } = await supabase
          .from('wrong_book')
          .select('id')
          .eq('user_id', userId)
          .eq('question_id', question.id)
          .maybeSingle();

        if (existError) throw existError;

        if (!exist) {
          const { error: wrongBookError } = await supabase.from('wrong_book').insert({
            user_id: userId,
            question_id: question.id,
          });

          if (wrongBookError) throw wrongBookError;
        }
      }

      setSessionStats((current) => ({
        attempts: current.attempts + 1,
        correct: current.correct + (isCorrect ? 1 : 0),
        wrong: current.wrong + (isCorrect ? 0 : 1),
        streak: isCorrect ? current.streak + 1 : 0,
      }));
    } catch (error) {
      console.error('Submit failed:', error);
      setStatus('idle');
      setMessage('提交失败，请检查网络后重试。');
    } finally {
      setSaving(false);
    }
  }, [question, saving, status, supabase, userAnswer, userId]);

  const toggleFavorite = useCallback(async () => {
    if (!question) return;

    const nextState = !isFavorited;
    setIsFavorited(nextState);
    setMessage(null);

    const { error } = nextState
      ? await supabase.from('favorites').insert({ user_id: userId, question_id: question.id })
      : await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('question_id', question.id);

    if (error) {
      console.error('Favorite toggle failed:', error);
      setIsFavorited(!nextState);
      setMessage('收藏状态更新失败，请稍后重试。');
    }
  }, [isFavorited, question, supabase, userId]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && status === 'idle' && userAnswer.trim()) {
        void handleSubmit();
      }

      if (event.key === ' ' && status !== 'idle') {
        event.preventDefault();
        void fetchQuestion();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [fetchQuestion, handleSubmit, status, userAnswer]);

  if (loadState === 'loading') {
    return <PracticeSkeleton />;
  }

  if (loadState === 'error') {
    return (
      <PracticeNotice
        icon={WarningCircle}
        title="题目加载失败"
        description={message ?? '暂时无法连接题库，请稍后再试。'}
        actionLabel="重新加载"
        onAction={() => void fetchQuestion()}
        secondaryLabel="返回 Dashboard"
        onSecondary={() => router.push('/dashboard')}
      />
    );
  }

  if (loadState === 'empty' || !question) {
    return (
      <PracticeNotice
        icon={BookOpenText}
        title="该分类下暂时没有题目"
        description="换一个题型或难度继续练习。综合练习会从全题库随机抽取。"
        actionLabel="返回选择"
        onAction={() => router.back()}
      />
    );
  }

  const hasArticle = Boolean(question.article_content);
  const answered = status !== 'idle';
  const sessionMode = category === 'mixed' ? '综合训练' : `${formatCategory(question.category)}专项`;
  const answerMode = question.type === 'multiple_choice' ? '选择题' : '填空题';
  const sessionAccuracy = sessionStats.attempts > 0
    ? Math.round((sessionStats.correct / sessionStats.attempts) * 100)
    : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <motion.header variants={staggerParent(0.05)} initial="hidden" animate="show">
        <motion.div variants={riseChild} className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.back()}
              className="mb-5 flex w-fit items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:text-ink active:scale-[0.98]"
            >
              <ArrowLeft size={17} weight="bold" />
              退出练习
            </button>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-subtle">
              <Target size={14} weight="regular" />
              Practice Workstation
            </span>
            <h1 className="text-display mt-4 max-w-2xl text-3xl font-semibold text-ink sm:text-4xl">
              先读任务，再提交答案。
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-subtle">
              当前先用现有题库模拟训练工作台：材料、题干、作答和复盘分区呈现。每次提交都会留下可追踪的练习记录。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:max-w-sm lg:justify-end">
            <span className="rounded-full bg-accent-tint px-3 py-1 text-xs font-semibold text-accent">
              {sessionMode}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-ink-muted">
              {formatDifficulty(question.difficulty)}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-ink-muted">
              {answerMode}
            </span>
            <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-subtle">
              Enter 提交
            </span>
            <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-subtle">
              Space 下一题
            </span>
          </div>
        </motion.div>

        <motion.div variants={riseChild} className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent">
                <ClipboardText size={17} weight="regular" />
              </span>
              <div>
                <p className="text-xs font-semibold text-accent">快速单题练习</p>
                <h2 className="mt-1 text-base font-semibold text-ink">保持当前题库节奏</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-subtle">
                  适合 5 分钟热身；提交后会同步到历史、错题本和收藏。
                </p>
              </div>
            </div>
          </div>
          <Link
            href={PRACTICE_SESSIONS_HREF}
            className="group rounded-2xl border border-emerald-200 bg-emerald-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-700">完整 Session 训练</p>
                <h2 className="mt-1 text-base font-semibold text-emerald-950">进入材料 + 题组 + 复盘</h2>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800/75">
                  从单题热身切换到更接近真实 IELTS 的连续训练。
                </p>
              </div>
              <ArrowRight size={17} weight="bold" className="mt-1 shrink-0 text-emerald-700 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </Link>
        </motion.div>
      </motion.header>

      <AnimatePresence initial={false}>
        {message && (
          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={springSnap}
            role="status"
            className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {message}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.div
        variants={staggerParent(0.06)}
        initial="hidden"
        animate="show"
        className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12"
      >
        <motion.aside variants={riseChild} className="lg:col-span-5">
          <div className="sticky top-6 overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="border-b border-line bg-ink px-5 py-5 text-white sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-white/55">训练任务</p>
                  <h2 className="mt-1.5 text-xl font-semibold">{sessionMode}</h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/65">
                    {hasArticle
                      ? '先浏览材料，再回到右侧完成作答。先定位依据，再提交答案。'
                      : '重点放在题干理解、答案表达和提交后的解析复盘。'}
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                  <ClipboardText size={20} weight="regular" />
                </span>
              </div>
            </div>
            {hasArticle ? (
              <div className="max-h-[60dvh] overflow-y-auto p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-2 border-b border-line pb-3 text-sm font-semibold text-ink">
                  <BookOpenText size={18} weight="regular" className="text-accent" />
                  阅读原文
                </div>
                <article
                  className="text-sm leading-7 text-ink-muted"
                  dangerouslySetInnerHTML={{ __html: question.article_content ?? '' }}
                />
              </div>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                <div>
                  <p className="text-sm font-semibold text-ink">作答策略</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-subtle">
                    先判断题型要求，再提交最小确定答案。答错会自动进入错题本，方便之后集中复盘。
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
                  <div className="bg-surface p-4">
                    <p className="text-xs text-ink-subtle">题目分类</p>
                    <p className="mt-2 font-semibold text-ink">{formatCategory(question.category)}</p>
                  </div>
                  <div className="bg-surface p-4">
                    <p className="text-xs text-ink-subtle">训练强度</p>
                    <p className="mt-2 font-semibold text-ink">{formatDifficulty(question.difficulty)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-px overflow-hidden border-t border-line bg-line">
              <SessionMetric label="本轮" value={String(sessionStats.attempts)} />
              <SessionMetric label="正确" value={sessionAccuracy === null ? '—' : `${sessionAccuracy}%`} />
              <SessionMetric label="连对" value={String(sessionStats.streak)} />
            </div>
          </div>
        </motion.aside>

        <motion.section variants={riseChild} className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="border-b border-line px-5 py-6 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-tight text-xl font-semibold leading-snug text-ink sm:text-2xl">
                  {question.question_text}
                </h2>
                <button
                  type="button"
                  onClick={() => void toggleFavorite()}
                  aria-pressed={isFavorited}
                  aria-label={isFavorited ? '取消收藏' : '加入收藏'}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors active:scale-[0.96] ${
                    isFavorited
                      ? 'bg-red-50 text-red-500'
                      : 'text-ink-subtle hover:bg-accent-tint hover:text-accent'
                  }`}
                >
                  <Heart size={22} weight={isFavorited ? 'fill' : 'regular'} />
                </button>
              </div>
            </div>

            <div className="bg-canvas px-5 py-6 sm:px-7">
              {question.type === 'multiple_choice' && question.options ? (
                <div className="overflow-hidden rounded-2xl border border-line bg-surface" role="radiogroup" aria-label="选择答案">
                  {question.options.map((option, index) => {
                    const selected = userAnswer === option;
                    const marker = String.fromCharCode(65 + index);
                    return (
                      <motion.button
                        key={`${option}-${index}`}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={answered}
                        onClick={() => setUserAnswer(option)}
                        whileHover={answered || reduceMotion ? undefined : { x: 3 }}
                        whileTap={answered || reduceMotion ? undefined : { scale: 0.995 }}
                        transition={springSnap}
                        className={`group/option flex w-full items-start gap-4 border-b border-line px-4 py-4 text-left text-sm transition-colors last:border-b-0 disabled:cursor-default ${
                          selected
                            ? 'bg-accent-tint text-ink'
                            : 'text-ink-muted hover:bg-zinc-50 hover:text-ink'
                        } ${answered && !selected ? 'opacity-50' : ''}`}
                      >
                        <motion.span
                          layout
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                            selected
                              ? 'border-accent bg-accent text-white'
                              : 'border-zinc-300 bg-zinc-50 text-ink-subtle group-hover/option:border-accent/35 group-hover/option:text-accent'
                          }`}
                          aria-hidden="true"
                        >
                          {marker}
                        </motion.span>
                        <span className="leading-relaxed">{option}</span>
                        </motion.button>
                    );
                  })}
                </div>
              ) : (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink">你的答案</span>
                  <input
                    type="text"
                    value={userAnswer}
                    disabled={answered}
                    onChange={(event) => setUserAnswer(event.target.value)}
                    placeholder="请输入你的答案..."
                    className="w-full rounded-xl border border-line bg-surface px-4 py-4 text-lg text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:cursor-default disabled:bg-zinc-100"
                  />
                </label>
              )}

              {status === 'idle' && (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!userAnswer.trim() || saving}
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-4 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:hover:translate-y-0"
                >
                  {saving && <CircleNotch size={17} weight="bold" className="animate-spin" />}
                  提交答案 (Enter)
                </button>
              )}
            </div>

            <AnimatePresence initial={false}>
              {answered && (
                <motion.div
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={springSoft}
                  role="status"
                  className={`border-t px-5 py-6 sm:px-7 ${
                    status === 'correct'
                      ? 'border-emerald-200 bg-emerald-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex gap-4">
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        status === 'correct'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {status === 'correct' ? (
                        <CheckCircle size={22} weight="bold" />
                      ) : (
                        <XCircle size={22} weight="bold" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3
                        className={`text-lg font-semibold ${
                          status === 'correct' ? 'text-emerald-900' : 'text-red-900'
                        }`}
                      >
                        {status === 'correct' ? '回答正确，记录已保存' : '回答错误，已加入复盘队列'}
                      </h3>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-line bg-surface p-4">
                          <p className="text-xs font-semibold text-ink-subtle">你的答案</p>
                          <p className="mt-1 font-semibold text-ink">{userAnswer}</p>
                        </div>
                        <div className="rounded-xl border border-line bg-surface p-4">
                          <p className="text-xs font-semibold text-ink-subtle">正确答案</p>
                          <p className="mt-1 font-semibold text-ink">{question.correct_answer}</p>
                        </div>
                      </div>

                      {question.explanation && (
                        <div className="mt-3 rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-ink-muted">
                          <span className="font-semibold text-ink">解析：</span>
                          {question.explanation}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                    {status === 'wrong' && (
                      <Link
                        href="/wrong-book"
                        className="rounded-full border border-line bg-surface px-5 py-3 text-center text-sm font-semibold text-ink-muted transition-colors hover:border-red-200 hover:text-red-700 active:scale-[0.98]"
                      >
                        稍后集中复盘
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => void toggleFavorite()}
                      className="flex items-center justify-center gap-2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/30 hover:text-accent active:scale-[0.98]"
                    >
                      <Heart size={17} weight={isFavorited ? 'fill' : 'regular'} />
                      {isFavorited ? '已收藏' : '收藏此题'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void fetchQuestion()}
                      className="flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
                    >
                      下一题 (Space)
                      <ArrowRight size={17} weight="bold" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>
      </motion.div>
    </main>
  );
}

function SessionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-3 py-3 text-center">
      <p className="text-lg font-semibold tabular-nums text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-ink-subtle">{label}</p>
    </div>
  );
}

function PracticeSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8" aria-label="正在加载题目">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-10 w-28 animate-pulse rounded-full bg-zinc-200" />
        <div className="flex gap-2">
          <div className="h-7 w-16 animate-pulse rounded-full bg-zinc-200" />
          <div className="h-7 w-16 animate-pulse rounded-full bg-zinc-200" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="hidden rounded-2xl border border-line bg-surface p-6 lg:col-span-6 lg:block">
          <div className="mb-5 h-5 w-24 animate-pulse rounded bg-zinc-200" />
          <div className="space-y-3">
            {Array.from({ length: 9 }).map((_, index) => (
              <div
                key={index}
                className="h-4 animate-pulse rounded bg-zinc-200"
                style={{ width: `${92 - (index % 4) * 9}%` }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface lg:col-span-6">
          <div className="border-b border-line p-7">
            <div className="h-7 w-4/5 animate-pulse rounded bg-zinc-200" />
            <div className="mt-3 h-7 w-2/3 animate-pulse rounded bg-zinc-200" />
          </div>
          <div className="space-y-3 bg-canvas p-7">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl bg-zinc-200" />
            ))}
            <div className="mt-7 h-14 animate-pulse rounded-2xl bg-zinc-300" />
          </div>
        </div>
      </div>
    </main>
  );
}

type NoticeIcon = typeof WarningCircle;

function PracticeNotice({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  icon: NoticeIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-md border-t border-line pt-10">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-tint text-accent">
          <Icon size={23} weight="regular" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-subtle">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onAction}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
          >
            {actionLabel}
          </button>
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:text-ink active:scale-[0.98]"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
