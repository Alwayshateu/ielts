'use client';

import { BookOpenText, CheckCircle } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import type { IeltsQuestion } from '@/lib/types';
import { springSoft } from '../ui/motion-presets';

export default function QuestionDetails({ question }: { question: IeltsQuestion }) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduce ? 0 : -8 }}
      transition={springSoft}
      className="border-t border-line bg-zinc-50/80 px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:px-7"
    >
      {question.type === 'multiple_choice' && question.options && (
        <div className="mb-7 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {question.options.map((option) => {
            const correct = option === question.correct_answer;
            return (
              <div
                key={option}
                className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
                  correct
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-[0_12px_28px_-24px_rgba(5,150,105,0.65)]'
                    : 'border-line bg-surface text-ink-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'
                }`}
              >
                {option}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle size={17} weight="bold" />
        </span>
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-subtle">正确答案</p>
          <p className="mt-1 font-semibold text-ink">{question.correct_answer}</p>
        </div>
      </div>

      {question.explanation && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-sm font-semibold text-ink">解析</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {question.explanation}
          </p>
        </div>
      )}

      {question.article_content && (
        <section className="mt-6 border-t border-line pt-5" aria-label="相关原文">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <BookOpenText size={17} weight="regular" />
            原文片段
          </h3>
          <div
            className="mt-3 max-h-48 overflow-y-auto rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed text-ink-muted"
            dangerouslySetInnerHTML={{ __html: question.article_content }}
          />
        </section>
      )}
    </motion.div>
  );
}
