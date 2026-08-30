import { describe, expect, it } from 'vitest';

import type { PracticeLearningSummary } from '@/lib/practice-session-recommendations';
import { sessionBadgeClass, sessionNavStatusFromSummary } from '../nav-status';

function makeSummary(overrides: Partial<PracticeLearningSummary>): PracticeLearningSummary {
  return { inProgress: 0, needsReview: 0, checked: 0, ...overrides };
}

describe('sessionNavStatusFromSummary', () => {
  it('returns null when nothing is pending', () => {
    expect(sessionNavStatusFromSummary(makeSummary({}))).toBeNull();
  });

  it('prioritises review over draft and checked', () => {
    const status = sessionNavStatusFromSummary(makeSummary({ needsReview: 2, inProgress: 5, checked: 9 }));
    expect(status).toEqual({ label: '2 复盘', tone: 'sky' });
  });

  it('prioritises in-progress drafts over checked', () => {
    const status = sessionNavStatusFromSummary(makeSummary({ inProgress: 3, checked: 9 }));
    expect(status).toEqual({ label: '3 草稿', tone: 'amber' });
  });

  it('falls back to the checked count when only checked is set', () => {
    const status = sessionNavStatusFromSummary(makeSummary({ checked: 4 }));
    expect(status).toEqual({ label: '4 已查', tone: 'emerald' });
  });
});

describe('sessionBadgeClass', () => {
  it('uses the active treatment regardless of tone when active', () => {
    expect(sessionBadgeClass('sky', true)).toBe('border-white/60 bg-white/70 text-accent');
    expect(sessionBadgeClass('emerald', true)).toBe('border-white/60 bg-white/70 text-accent');
  });

  it('maps each tone to its own palette when inactive', () => {
    expect(sessionBadgeClass('sky', false)).toContain('sky');
    expect(sessionBadgeClass('amber', false)).toContain('amber');
    expect(sessionBadgeClass('emerald', false)).toContain('emerald');
  });
});
