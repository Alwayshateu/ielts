import { describe, expect, it } from 'vitest';

import {
  buildPracticeAttemptComparison,
  findPracticeAttempt,
  selectPracticeAttemptRetryAnswers,
  summarizePracticeAttemptOutcomes,
} from '../practice-attempt-detail';
import type {
  PracticeAttemptAnswer,
  PracticeAttemptOutcome,
  PracticeSessionHistoryEntry,
} from '../practice-session-history';

function answer(
  questionNumber: number,
  outcome: PracticeAttemptOutcome,
  overrides: Partial<PracticeAttemptAnswer> = {}
): PracticeAttemptAnswer {
  return {
    questionId: `q${questionNumber}`,
    questionNumber,
    questionType: 'short_answer',
    prompt: `Question ${questionNumber}`,
    outcome,
    userAnswer: outcome === 'skipped' ? '' : 'mine',
    correctAnswer: 'theirs',
    ...overrides,
  };
}

function entry(overrides: Partial<PracticeSessionHistoryEntry>): PracticeSessionHistoryEntry {
  return {
    id: overrides.id ?? `${overrides.unitId ?? 'unit-1'}:${overrides.recordedAt ?? 0}`,
    unitId: 'unit-1',
    slug: 'unit-1-slug',
    title: 'Urban Green Roofs',
    skill: 'reading',
    mode: 'progressive',
    difficulty: 'medium',
    recordedAt: 0,
    elapsedSeconds: 120,
    answered: 5,
    total: 5,
    correct: 4,
    incorrect: 1,
    skipped: 0,
    manualReview: 0,
    objectiveTotal: 5,
    accuracy: 80,
    completionPercent: 100,
    selfRatedBand: null,
    ...overrides,
  };
}

describe('findPracticeAttempt', () => {
  it('returns the matching attempt or null', () => {
    const entries = [entry({ id: 'a', recordedAt: 200 }), entry({ id: 'b', recordedAt: 100 })];

    expect(findPracticeAttempt(entries, 'b')?.recordedAt).toBe(100);
    expect(findPracticeAttempt(entries, 'missing')).toBeNull();
  });
});

describe('summarizePracticeAttemptOutcomes', () => {
  it('tallies every outcome bucket', () => {
    expect(
      summarizePracticeAttemptOutcomes([
        answer(1, 'correct'),
        answer(2, 'incorrect'),
        answer(3, 'skipped'),
        answer(4, 'correct'),
        answer(5, 'manual_review'),
      ])
    ).toEqual({ correct: 2, incorrect: 1, skipped: 1, manual_review: 1 });
  });

  it('returns zeroes for an empty snapshot', () => {
    expect(summarizePracticeAttemptOutcomes([])).toEqual({
      correct: 0,
      incorrect: 0,
      skipped: 0,
      manual_review: 0,
    });
  });
});

describe('selectPracticeAttemptRetryAnswers', () => {
  it('keeps wrong and skipped questions in question order', () => {
    const result = selectPracticeAttemptRetryAnswers([
      answer(4, 'skipped'),
      answer(1, 'correct'),
      answer(2, 'incorrect'),
      answer(3, 'manual_review'),
    ]);

    expect(result.map((item) => item.questionNumber)).toEqual([2, 4]);
  });
});

describe('buildPracticeAttemptComparison', () => {
  it('positions the attempt in its unit series and diffs against the previous one', () => {
    const first = entry({ id: 'a1', recordedAt: 100, accuracy: 60, elapsedSeconds: 300 });
    const second = entry({ id: 'a2', recordedAt: 200, accuracy: 80, elapsedSeconds: 240 });
    const otherUnit = entry({ id: 'b1', unitId: 'unit-2', recordedAt: 150, accuracy: 10 });

    const comparison = buildPracticeAttemptComparison([second, otherUnit, first], second);

    expect(comparison.attemptIndex).toBe(2);
    expect(comparison.unitAttempts).toBe(2);
    expect(comparison.previous?.id).toBe('a1');
    expect(comparison.accuracyDelta).toBe(20);
    expect(comparison.elapsedDelta).toBe(-60);
    expect(comparison.isPersonalBest).toBe(true);
  });

  it('reports no previous attempt and no personal best on a first record', () => {
    const only = entry({ id: 'a1', recordedAt: 100, accuracy: 70 });
    const comparison = buildPracticeAttemptComparison([only], only);

    expect(comparison.attemptIndex).toBe(1);
    expect(comparison.previous).toBeNull();
    expect(comparison.accuracyDelta).toBeNull();
    expect(comparison.elapsedDelta).toBeNull();
    expect(comparison.isPersonalBest).toBe(false);
  });

  it('diffs self-rated band for manual sessions without accuracy', () => {
    const first = entry({ id: 'w1', recordedAt: 100, skill: 'writing', accuracy: null, objectiveTotal: 0, selfRatedBand: 6 });
    const second = entry({ id: 'w2', recordedAt: 200, skill: 'writing', accuracy: null, objectiveTotal: 0, selfRatedBand: 6.5 });

    const comparison = buildPracticeAttemptComparison([second, first], second);

    expect(comparison.accuracyDelta).toBeNull();
    expect(comparison.bandDelta).toBe(0.5);
    expect(comparison.isPersonalBest).toBe(false);
  });

  it('does not claim a personal best when an earlier attempt scored higher', () => {
    const best = entry({ id: 'a1', recordedAt: 100, accuracy: 95 });
    const latest = entry({ id: 'a2', recordedAt: 200, accuracy: 80 });

    expect(buildPracticeAttemptComparison([latest, best], latest).isPersonalBest).toBe(false);
  });
});
