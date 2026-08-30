import { describe, expect, it } from 'vitest';

import {
  resolveDashboardRecommendation,
  type DashboardRecommendationInput,
} from '../dashboard-recommendation';

function input(overrides: Partial<DashboardRecommendationInput> = {}): DashboardRecommendationInput {
  return {
    sessionsInProgress: 0,
    sessionsNeedingReview: 0,
    wrongBookCount: 0,
    legacyAttempts: 0,
    sessionAttempts: 0,
    ...overrides,
  };
}

describe('resolveDashboardRecommendation', () => {
  it('prioritizes finishing an in-progress session above everything else', () => {
    const result = resolveDashboardRecommendation(
      input({ sessionsInProgress: 2, sessionsNeedingReview: 3, wrongBookCount: 9, legacyAttempts: 5 })
    );

    expect(result.kind).toBe('resume-session');
    expect(result.description).toContain('2');
  });

  it('uses singular wording for exactly one unfinished session', () => {
    expect(resolveDashboardRecommendation(input({ sessionsInProgress: 1 })).description).toContain(
      '1 组'
    );
  });

  it('suggests review when answers are in but results were never checked', () => {
    const result = resolveDashboardRecommendation(
      input({ sessionsNeedingReview: 2, wrongBookCount: 4 })
    );

    expect(result.kind).toBe('review-session');
  });

  it('falls back to the wrong book when nothing is mid-flight', () => {
    const result = resolveDashboardRecommendation(input({ wrongBookCount: 6, legacyAttempts: 3 }));

    expect(result.kind).toBe('clear-wrong-book');
    expect(result.description).toContain('6');
  });

  it('onboards a brand-new user into a full session', () => {
    expect(resolveDashboardRecommendation(input()).kind).toBe('first-session');
  });

  it('does not treat a session-only user as brand new', () => {
    expect(resolveDashboardRecommendation(input({ sessionAttempts: 4 })).kind).toBe('keep-going');
  });

  it('does not treat a legacy-only user as brand new', () => {
    expect(resolveDashboardRecommendation(input({ legacyAttempts: 4 })).kind).toBe('keep-going');
  });
});
