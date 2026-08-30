import { describe, expect, it } from 'vitest';

import type { PracticeSessionDraftStatus } from '@/lib/practice-session-draft';
import type { PracticeRecommendationReason } from '@/lib/practice-session-recommendations';
import type { PracticeUnit } from '@/lib/types';
import { getDraftSummary, getSessionFlow, recommendationCopy } from '../session-summary';

function makeStatus(overrides: Partial<PracticeSessionDraftStatus>): PracticeSessionDraftStatus {
  return { answered: 0, total: 5, showResults: false, flagged: 0, notes: 0, updatedAt: 0, ...overrides };
}

function unitWithSkill(skill: PracticeUnit['skill']): PracticeUnit {
  return { skill } as unknown as PracticeUnit;
}

describe('getSessionFlow', () => {
  it('gives each skill a three-step flow', () => {
    for (const skill of ['listening', 'writing', 'speaking', 'reading', 'foundation'] as const) {
      expect(getSessionFlow(unitWithSkill(skill))).toHaveLength(3);
    }
  });

  it('opens the listening flow with the audio/transcript step', () => {
    expect(getSessionFlow(unitWithSkill('listening'))[0]).toBe('查看音频占位与 Transcript');
  });

  it('opens the writing flow with the prompt step', () => {
    expect(getSessionFlow(unitWithSkill('writing'))[0]).toBe('阅读 Writing Task prompt');
  });

  it('opens the speaking flow with the cue card step', () => {
    expect(getSessionFlow(unitWithSkill('speaking'))[0]).toBe('阅读 Part 2 cue card');
  });

  it('falls back to the passage flow for reading and anything else', () => {
    expect(getSessionFlow(unitWithSkill('reading'))[0]).toBe('阅读完整 Passage');
    expect(getSessionFlow(unitWithSkill('foundation'))[0]).toBe('阅读完整 Passage');
  });
});

describe('getDraftSummary', () => {
  it('treats a missing status as not started', () => {
    const summary = getDraftSummary(undefined);
    expect(summary.label).toBe('未开始');
    expect(summary.hasDraft).toBe(false);
    expect(summary.ctaLabel).toBe('进入 Session');
  });

  it('treats an all-zero status the same as not started', () => {
    const summary = getDraftSummary(makeStatus({}));
    expect(summary.label).toBe('未开始');
    expect(summary.hasDraft).toBe(false);
  });

  it('reports a checked session as 已检查 with progress', () => {
    const summary = getDraftSummary(makeStatus({ showResults: true, answered: 5, total: 5 }));
    expect(summary.label).toBe('已检查 · 5/5');
    expect(summary.className).toContain('emerald');
    expect(summary.hasDraft).toBe(true);
    expect(summary.ctaLabel).toBe('继续 Session');
  });

  it('lets showResults win even when nothing is answered yet', () => {
    const summary = getDraftSummary(makeStatus({ showResults: true, answered: 0, total: 5 }));
    expect(summary.label).toBe('已检查 · 0/5');
  });

  it('reports an in-progress draft as 草稿 with progress', () => {
    const summary = getDraftSummary(makeStatus({ answered: 3, total: 5 }));
    expect(summary.label).toBe('草稿 · 3/5');
    expect(summary.className).toContain('amber');
    expect(summary.ctaLabel).toBe('继续 Session');
  });

  it('switches the CTA to 继续复盘 once a draft carries flags or notes', () => {
    const summary = getDraftSummary(makeStatus({ answered: 3, total: 5, notes: 1 }));
    expect(summary.ctaLabel).toBe('继续复盘');
    expect(summary.label).toBe('草稿 · 3/5 · 1 笔记');
  });

  it('reports flags/notes with no answers as 待复盘', () => {
    const summary = getDraftSummary(makeStatus({ answered: 0, flagged: 1 }));
    expect(summary.label).toBe('待复盘 · 1 标记');
    expect(summary.className).toContain('sky');
    expect(summary.ctaLabel).toBe('继续复盘');
  });

  it('joins flags and notes into the metadata suffix in order', () => {
    const summary = getDraftSummary(makeStatus({ answered: 2, total: 5, flagged: 2, notes: 3 }));
    expect(summary.label).toBe('草稿 · 2/5 · 2 标记 · 3 笔记');
  });
});

describe('recommendationCopy', () => {
  it('provides label, detail, and badge for every reason', () => {
    for (const reason of ['review', 'continue', 'start', 'stretch'] as const) {
      const copy = recommendationCopy(reason as PracticeRecommendationReason);
      expect(copy.label.length).toBeGreaterThan(0);
      expect(copy.detail.length).toBeGreaterThan(0);
      expect(copy.badge).toContain('border-');
    }
  });

  it('maps each reason to its distinct label', () => {
    expect(recommendationCopy('review').label).toBe('优先复盘');
    expect(recommendationCopy('continue').label).toBe('继续草稿');
    expect(recommendationCopy('start').label).toBe('开始训练');
    expect(recommendationCopy('stretch').label).toBe('挑战模式');
  });
});
