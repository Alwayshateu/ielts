'use client';

import {
  CaretDown,
  CircleNotch,
  ClipboardText,
  Heart,
  Trash,
} from '@phosphor-icons/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { formatCategory, formatDifficulty } from '@/lib/question-labels';
import { PRACTICE_SESSIONS_HREF } from '@/lib/practice-session-links';
import type { IeltsQuestion } from '@/lib/types';
import EmptyState from '../ui/EmptyState';
import { riseChild, springSnap, staggerParent } from '../ui/motion-presets';
import QuestionDetails from './QuestionDetails';

type CollectionKind = 'favorites' | 'wrong-book';

type ReviewCollectionViewProps = {
  kind: CollectionKind;
  initialQuestions: IeltsQuestion[];
  userId: string;
};

const COLLECTION_COPY = {
  favorites: {
    table: 'favorites',
    icon: Heart,
    title: '我的收藏夹',
    count: (count: number) => `这里保存了你标记为重点的 ${count} 道题目`,
    emptyTitle: '暂无收藏',
    emptyDescription: '在练习过程中收藏题目，之后就能随时回到这里集中复习。',
    emptyAction: '去练习',
    strategy:
      '收藏夹适合保存重点题和高价值解释。先展开题目回忆答案，再查看解析确认理解。',
    removeLabel: '取消收藏',
    errorMessage: '取消收藏失败，请重试。',
  },
  'wrong-book': {
    table: 'wrong_book',
    icon: ClipboardText,
    title: '我的错题本',
    count: (count: number) => `集中复习尚未掌握的 ${count} 道题目`,
    emptyTitle: '错题本是空的',
    emptyDescription: '答错的题目会自动收录到这里，方便你针对薄弱环节反复练习。',
    emptyAction: '去刷题',
    strategy:
      '错题本是待掌握队列。先尝试重新作答，再展开解析；确认掌握后用行内确认移出。',
    removeLabel: '标记为已掌握',
    errorMessage: '移出错题本失败，请重试。',
  },
} as const;

export default function ReviewCollectionView({
  kind,
  initialQuestions,
  userId,
}: ReviewCollectionViewProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const copy = COLLECTION_COPY[kind];
  const Icon = copy.icon;
  const needsConfirmation = kind === 'wrong-book';
  const [questions, setQuestions] = useState(initialQuestions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleExpanded = (questionId: string) => {
    setExpandedId((current) => (current === questionId ? null : questionId));
  };

  const requestRemoval = (questionId: string) => {
    setError(null);

    if (needsConfirmation) {
      setConfirmingId(questionId);
      return;
    }

    void removeQuestion(questionId);
  };

  const removeQuestion = async (questionId: string) => {
    setRemovingId(questionId);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error: removeError } = await supabase
      .from(copy.table)
      .delete()
      .eq('user_id', userId)
      .eq('question_id', questionId);

    if (removeError) {
      console.error(`Failed to remove question from ${copy.table}`, removeError);
      setError(copy.errorMessage);
      setRemovingId(null);
      return;
    }

    setQuestions((current) => current.filter((question) => question.id !== questionId));
    setExpandedId((current) => (current === questionId ? null : current));
    setConfirmingId(null);
    setRemovingId(null);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.header
        variants={staggerParent(0.06)}
        initial="hidden"
        animate="show"
        className="mb-8 grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch"
      >
        <motion.div
          variants={riseChild}
          whileHover={{ y: -6, scale: 1.012 }}
          transition={springSnap}
          className="group relative overflow-hidden rounded-[2rem] border border-line bg-surface p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_20px_54px_-36px_rgba(24,24,27,0.35)] transition-colors hover:border-accent/25"
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-accent/14 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
          <div className="relative flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-tint text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
              <Icon size={23} weight={kind === 'favorites' ? 'fill' : 'regular'} />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-wide text-ink-subtle">Review Collection</p>
              <h1 className="text-tight mt-2 text-3xl font-semibold text-ink">{copy.title}</h1>
              <p className="mt-2 text-sm text-ink-subtle">{copy.count(questions.length)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={riseChild}
          className="relative overflow-hidden rounded-[2rem] border border-line bg-ink p-6 text-white shadow-[0_24px_60px_-38px_rgba(24,24,27,0.85)]"
        >
          <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
          <div className="relative">
            <p className="text-xs font-semibold tracking-wide text-white/50">复习策略</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65">
              {copy.strategy}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-white/65">
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">先回忆答案</span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">再展开解析</span>
              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">最后处理队列</span>
            </div>
          </div>
        </motion.div>
      </motion.header>

      <motion.section
        variants={riseChild}
        initial="hidden"
        animate="show"
        className="mb-6 overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-emerald-50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_18px_48px_-38px_rgba(5,150,105,0.28)]"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-emerald-700">Session 本地复盘</p>
            <h2 className="mt-2 text-xl font-semibold text-emerald-950">错因标签和 rubric 自评在 Session 里继续完成</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-800/75">
              这里保留旧题库收藏和错题本。完整 Session 的标记、笔记、错因标签和 Writing / Speaking 自评目前保存在本机浏览器。
            </p>
          </div>
          <Link
            href={PRACTICE_SESSIONS_HREF}
            className="flex w-fit items-center justify-center rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-emerald-800 active:scale-[0.98]"
          >
            去 Session Library
          </Link>
        </div>
      </motion.section>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={springSnap}
            role="status"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {questions.length === 0 ? (
        <EmptyState
          icon={Icon}
          title={copy.emptyTitle}
          description={copy.emptyDescription}
          actionLabel={copy.emptyAction}
          onAction={() => router.push('/dashboard')}
        />
      ) : (
        <motion.div
          variants={staggerParent(0.05)}
          initial="hidden"
          animate="show"
          className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_20px_54px_-34px_rgba(24,24,27,0.30)]"
        >
          {questions.map((question, index) => {
            const expanded = expandedId === question.id;
            const confirming = confirmingId === question.id;
            const removing = removingId === question.id;
            const detailsId = `question-details-${question.id}`;
            const confirmationId = `remove-confirmation-${question.id}`;

            return (
              <motion.article
                key={question.id}
                layout
                variants={riseChild}
                whileHover={{ y: -3 }}
                transition={springSnap}
                className="group relative border-b border-line last:border-b-0"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_86%_0%,rgba(79,70,229,0.14),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.86))]" />
                </div>
                <div className="relative px-5 py-5 sm:px-7 sm:py-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-accent-tint px-2.5 py-1 text-xs font-semibold text-accent">
                          {formatCategory(question.category)}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-ink-muted">
                          {formatDifficulty(question.difficulty)}
                        </span>
                      </div>
                      <h2 className="text-base font-semibold leading-relaxed text-ink transition-colors group-hover:text-accent sm:text-lg">
                        <span className="mr-2 text-ink-subtle">{index + 1}.</span>
                        {question.question_text}
                      </h2>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(question.id)}
                        aria-expanded={expanded}
                        aria-controls={detailsId}
                        className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:bg-accent-tint hover:text-accent active:scale-[0.98]"
                      >
                        {expanded ? '收起详情' : '查看详情'}
                        <motion.span
                          animate={{ rotate: expanded ? 180 : 0 }}
                          transition={springSnap}
                          aria-hidden="true"
                          className="flex"
                        >
                          <CaretDown size={15} weight="bold" />
                        </motion.span>
                      </button>
                      <button
                        type="button"
                        onClick={() => requestRemoval(question.id)}
                        disabled={removing}
                        aria-label={copy.removeLabel}
                        aria-controls={needsConfirmation ? confirmationId : undefined}
                        aria-expanded={needsConfirmation ? confirming : undefined}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-subtle transition-all hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-600 active:scale-[0.96] disabled:cursor-wait disabled:opacity-60"
                      >
                        {removing ? (
                          <CircleNotch size={18} weight="bold" className="animate-spin" />
                        ) : (
                          <Trash size={18} weight="regular" />
                        )}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {confirming && (
                      <motion.div
                        id={confirmationId}
                        initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                        transition={springSnap}
                        role="group"
                        aria-label="确认移出错题本"
                        className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/85 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_42px_-34px_rgba(245,158,11,0.45)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <p className="text-sm font-medium text-orange-900">
                          已经掌握这道题，并将它移出错题本？
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            disabled={removing}
                            className="rounded-full px-4 py-2 text-sm font-medium text-orange-800 transition-colors hover:bg-orange-100 active:scale-[0.98]"
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeQuestion(question.id)}
                            disabled={removing}
                            className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                          >
                            {removing && <CircleNotch size={15} weight="bold" className="animate-spin" />}
                            确认移出
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <div id={detailsId}>
                      <QuestionDetails question={question} />
                    </div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </motion.div>
      )}
    </main>
  );
}
