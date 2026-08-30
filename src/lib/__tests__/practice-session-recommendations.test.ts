import { describe, expect, it } from 'vitest';

import {
  getPracticeLearningSummary,
  getPracticeRecommendationReason,
  getRecommendedPracticeUnits,
} from '../practice-session-recommendations';
import type { PracticeSessionDraftStatus } from '../practice-session-draft';
import type { PracticeUnit } from '../types';

function unit(id: string, mode: PracticeUnit['mode'] = 'progressive'): PracticeUnit {
  return {
    id,
    slug: `${id}-slug`,
    skill: 'reading',
    mode,
    title: id,
    description: null,
    difficulty: 'medium',
    material_type: 'passage',
    passage_text: 'Text',
    audio_url: null,
    transcript: null,
    asset_url: null,
    time_limit_seconds: 600,
    questions: [
      {
        id: `${id}-q1`,
        unit_id: id,
        question_number: 1,
        question_type: 'short_answer',
        question_text: 'Question',
        options: null,
        answer_key: { answers: ['answer'] },
        explanation: null,
      },
    ],
  };
}

function status(overrides: Partial<PracticeSessionDraftStatus>): PracticeSessionDraftStatus {
  return {
    answered: 0,
    total: 1,
    showResults: false,
    flagged: 0,
    notes: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('practice session recommendations', () => {
  it('classifies review, continue, start, and stretch reasons', () => {
    expect(
      getPracticeRecommendationReason(unit('review'), status({ showResults: true, notes: 1 }))
    ).toBe('review');
    expect(
      getPracticeRecommendationReason(unit('continue'), status({ answered: 1, showResults: false }))
    ).toBe('continue');
    expect(getPracticeRecommendationReason(unit('start'), undefined)).toBe('start');
    expect(
      getPracticeRecommendationReason(unit('stretch', 'challenge'), status({ showResults: true }))
    ).toBe('stretch');
  });

  it('orders recommendations by learning priority before recency', () => {
    const units = [unit('start'), unit('continue'), unit('review')];
    const statuses = {
      start: status({ updatedAt: 999_000_000_000_000 }),
      continue: status({ answered: 1, updatedAt: 1 }),
      review: status({ showResults: true, flagged: 1, updatedAt: 1 }),
    };

    expect(getRecommendedPracticeUnits(units, statuses).map((item) => item.id)).toEqual([
      'review',
      'continue',
      'start',
    ]);
  });

  it('summarizes local learning state', () => {
    expect(
      getPracticeLearningSummary({
        draft: status({ answered: 1 }),
        review: status({ showResults: true, notes: 1 }),
        checked: status({ showResults: true }),
      })
    ).toEqual({
      inProgress: 1,
      needsReview: 1,
      checked: 2,
    });
  });
});
