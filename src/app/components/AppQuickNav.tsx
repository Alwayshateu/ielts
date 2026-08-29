'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BookOpenText,
  ChartLineUp,
  ClipboardText,
  Gauge,
  Heart,
  House,
  ListChecks,
  Target,
} from '@phosphor-icons/react';
import { readPracticeSessionDraftStatuses } from '@/lib/practice-session-draft';
import { getPracticeLearningSummary } from '@/lib/practice-session-recommendations';
import { getSamplePracticeUnits } from '@/lib/practice-session-samples';
import { sessionBadgeClass, sessionNavStatusFromSummary } from './nav-status';

const NAV_ITEMS = [
  { href: '/', label: '首页', Icon: House, match: (path: string) => path === '/' },
  { href: '/dashboard', label: 'Dashboard', Icon: Gauge, match: (path: string) => path === '/dashboard' },
  { href: '/practice', label: '单题练习', Icon: Target, match: (path: string) => path === '/practice' },
  {
    href: '/practice/sessions',
    label: 'Sessions',
    Icon: BookOpenText,
    match: (path: string) => path.startsWith('/practice/session'),
    session: true,
  },
  {
    href: '/practice/history',
    label: '复盘轨迹',
    Icon: ChartLineUp,
    match: (path: string) => path.startsWith('/practice/history'),
  },
  { href: '/wrong-book', label: '错题本', Icon: ClipboardText, match: (path: string) => path === '/wrong-book' },
  { href: '/favorites', label: '收藏', Icon: Heart, match: (path: string) => path === '/favorites' },
];

function getSessionNavStatus() {
  const units = getSamplePracticeUnits();
  const statuses = readPracticeSessionDraftStatuses(units);
  return sessionNavStatusFromSummary(getPracticeLearningSummary(statuses));
}

export default function AppQuickNav() {
  const pathname = usePathname();
  const [sessionStatus] = useState(getSessionNavStatus);

  return (
    <nav className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8" aria-label="主要学习入口">
      <div className="flex items-center gap-2 overflow-x-auto rounded-full border border-line bg-surface p-1.5 shadow-sm">
        <span className="hidden items-center gap-2 rounded-full bg-ink px-3 py-2 text-xs font-semibold text-white sm:flex">
          <ListChecks size={14} weight="regular" />
          Study Loop
          {sessionStatus && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/75">
              {sessionStatus.label}
            </span>
          )}
        </span>
        {NAV_ITEMS.map(({ href, label, Icon, match, session }) => {
          const active = match(pathname);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
                active
                  ? 'bg-accent-tint text-accent'
                  : 'text-ink-subtle hover:-translate-y-0.5 hover:bg-zinc-50 hover:text-ink'
              }`}
            >
              <Icon size={14} weight={active ? 'bold' : 'regular'} />
              {label}
              {session && sessionStatus && (
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sessionBadgeClass(sessionStatus.tone, active)}`}>
                  {sessionStatus.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
