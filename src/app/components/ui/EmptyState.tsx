'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ComponentType } from 'react';
import { springSoft } from './motion-presets';

type EmptyStateProps = {
  icon: ComponentType<{
    size?: number;
    weight?: 'regular' | 'bold' | 'duotone';
    className?: string;
  }>;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className="border-t border-line py-20"
    >
      <div className="max-w-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-tint text-accent">
          <Icon size={22} weight="regular" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-subtle">{description}</p>
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      </div>
    </motion.div>
  );
}
