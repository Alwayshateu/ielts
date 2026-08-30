import type { PracticeLearningSummary } from '@/lib/practice-session-recommendations';

export type SessionNavTone = 'sky' | 'amber' | 'emerald';
export type SessionNavStatus = { label: string; tone: SessionNavTone };

// Precedence for the quick-nav badge: an open review loop outranks an in-progress draft,
// which outranks a merely-checked session; nothing pending yields no badge.
export function sessionNavStatusFromSummary(summary: PracticeLearningSummary): SessionNavStatus | null {
  if (summary.needsReview > 0) {
    return { label: `${summary.needsReview} 复盘`, tone: 'sky' };
  }
  if (summary.inProgress > 0) {
    return { label: `${summary.inProgress} 草稿`, tone: 'amber' };
  }
  if (summary.checked > 0) {
    return { label: `${summary.checked} 已查`, tone: 'emerald' };
  }

  return null;
}

export function sessionBadgeClass(tone: SessionNavTone, active: boolean) {
  if (active) return 'border-white/60 bg-white/70 text-accent';

  return {
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }[tone];
}
