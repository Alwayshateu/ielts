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
import { countCollectionSources, type CollectionItem } from '@/lib/collection-items';
import { formatCategory, formatDifficulty } from '@/lib/question-labels';
import { removeCollectionItem } from '@/lib/question-collections';
import EmptyState from '../ui/EmptyState';
import { riseChild, springSnap, staggerParent } from '../ui/motion-presets';
import QuestionDetails from './QuestionDetails';

type CollectionKind = 'favorites' | 'wrong-book';

type ReviewCollectionViewProps = {
  kind: CollectionKind;
  initialItems: CollectionItem[];
  degraded?: boolean;
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
  initialItems,
  degraded = false,
}: ReviewCollectionViewProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const copy = COLLECTION_COPY[kind];
  const Icon = copy.icon;
  const needsConfirmation = kind === 'wrong-book';
  const [items, setItems] = useState(initialItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sources = countCollectionSources(items);

  const toggleExpanded = (entryId: string) => {
    setExpandedId((current) => (current === entryId ? null : entryId));
  };

  const requestRemoval = (entryId: string) => {
    setError(null);

    if (needsConfirmation) {
      setConfirmingId(entryId);
      return;
    }

    void removeItem(entryId);
  };

  const removeItem = async (entryId: string) => {
    setRemovingId(entryId);
    setError(null);

    // Addressed by row id, so this works identically for legacy and practice entries.
    const removeError = await removeCollectionItem(
      createSupabaseBrowserClient(),
      copy.table,
      entryId
    );

    if (removeError) {
      console.error(`Failed to remove entry from ${copy.table}`, removeError);
      setError(copy.errorMessage);
      setRemovingId(null);
      return;
    }

    setItems((current) => current.filter((item) => item.entryId !== entryId));
    setExpandedId((current) => (current === entryId ? null : current));
    setConfirmingId(null);
    setRemovingId(null);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.header variants={staggerParent(0.06)} initial="hidden" animate="show">
        <motion.div variants={riseChild} className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-tint text-accent">
            <Icon size={23} weight={kind === 'favorites' ? 'fill' : 'regular'} />
          </span>
          <div>
            <h1 className="text-tight text-3xl font-semibold text-ink">{copy.title}</h1>
            <p className="mt-1.5 text-sm text-ink-subtle">{copy.count(sources.total)}</p>
            {sources.practice > 0 && (
              <p className="mt-1 text-xs text-ink-muted">
                其中 {sources.practice} 道来自 Session 训练
                {sources.legacy > 0 && `，${sources.legacy} 道来自单题练习`}
              </p>
            )}
          </div>
        </motion.div>
        <motion.p variants={riseChild} className="mt-4 border-l-2 border-line pl-4 text-sm leading-relaxed text-ink-subtle">
          {copy.strategy}
        </motion.p>
      </motion.header>

      {degraded && (
        <p
          role="status"
          className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Session 来源的记录暂时读取失败，下面只显示单题练习的部分。刷新可以重试。
        </p>
      )}

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={springSnap}
            role="status"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Icon}
            title={copy.emptyTitle}
            description={copy.emptyDescription}
            actionLabel={copy.emptyAction}
            onAction={() => router.push('/dashboard')}
          />
        </div>
      ) : (
        <motion.div
          variants={staggerParent(0.05)}
          initial="hidden"
          animate="show"
          className="mt-8 overflow-hidden rounded-2xl border border-line bg-surface"
        >
          {items.map((item, index) => {
            const expanded = expandedId === item.entryId;
            const confirming = confirmingId === item.entryId;
            const removing = removingId === item.entryId;
            const detailsId = `question-details-${item.entryId}`;
            const confirmationId = `remove-confirmation-${item.entryId}`;

            return (
              <motion.article
                key={item.entryId}
                layout
                variants={riseChild}
                transition={springSnap}
                className="border-b border-line last:border-b-0"
              >
                <div className="px-5 py-5 sm:px-6">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-accent-tint px-2.5 py-1 text-xs font-semibold text-accent">
                          {formatCategory(item.category)}
                        </span>
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-ink-muted">
                          {formatDifficulty(item.difficulty)}
                        </span>
                        {item.source === 'practice' && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {item.unitTitle ?? 'Session'}
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-semibold leading-relaxed text-ink sm:text-lg">
                        <span className="mr-2 text-ink-subtle">{index + 1}.</span>
                        {item.questionText}
                      </h2>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {item.href && (
                        <Link
                          href={item.href}
                          className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-accent/30 hover:bg-accent-tint hover:text-accent active:scale-[0.98]"
                        >
                          去重练
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.entryId)}
                        aria-expanded={expanded}
                        aria-controls={detailsId}
                        className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-accent/30 hover:bg-accent-tint hover:text-accent active:scale-[0.98]"
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
                        onClick={() => requestRemoval(item.entryId)}
                        disabled={removing}
                        aria-label={copy.removeLabel}
                        aria-controls={needsConfirmation ? confirmationId : undefined}
                        aria-expanded={needsConfirmation ? confirming : undefined}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-red-50 hover:text-red-600 active:scale-[0.96] disabled:cursor-wait disabled:opacity-60"
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
                        className="mt-5 flex flex-col gap-3 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
                            onClick={() => void removeItem(item.entryId)}
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
                      <QuestionDetails question={item} />
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
