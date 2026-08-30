import { describe, expect, it } from 'vitest';

import {
  buildPracticeAttemptAnswers,
  buildPracticeSessionHistoryEntry,
  computePracticeStudyStreak,
  isSamePracticeAttemptSignature,
  sanitizePracticeSessionHistory,
  summarizePracticeSessionHistory,
  type PracticeSessionHistoryEntry,
} from '../practice-session-history';
import { buildPracticeReviewReport } from '../practice-session-report';
import type { PracticeQuestion, PracticeUnit } from '../types';

const DAY_MS = 86_400_000;

function question(id: string, questionNumber: number, answers: string[]): PracticeQuestion {
  return {
    id,
    unit_id: 'unit-1',
    question_number: questionNumber,
    question_type: answers.length === 0 ? 'writing_task' : 'short_answer',
    question_text: `Question ${questionNumber}`,
    options: null,
    answer_key: { answers, caseSensitive: false },
    explanation: null,
  };
}

function unit(overrides: Partial<PracticeUnit> = {}): PracticeUnit {
  return {
    id: 'unit-1',
    slug: 'unit-1-slug',
    skill: 'reading',
    mode: 'progressive',
    title: 'Urban Green Roofs',
    description: null,
    difficulty: 'medium',
    material_type: 'passage',
    passage_text: null,
    audio_url: null,
    transcript: null,
    asset_url: null,
    time_limit_seconds: null,
    questions: [],
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

describe('buildPracticeAttemptAnswers', () => {
  it('captures objective outcomes and the primary accepted answer', () => {
    const questions = [question('q1', 1, ['Alpha']), question('q2', 2, ['Beta']), question('q3', 3, ['Gamma'])];

    expect(buildPracticeAttemptAnswers({ questions, answers: { q1: 'alpha', q2: 'wrong' } })).toEqual([
      expect.objectContaining({
        questionId: 'q1',
        questionNumber: 1,
        outcome: 'correct',
        userAnswer: 'alpha',
        correctAnswer: 'Alpha',
      }),
      expect.objectContaining({ questionId: 'q2', outcome: 'incorrect', correctAnswer: 'Beta' }),
      expect.objectContaining({ questionId: 'q3', outcome: 'skipped', userAnswer: '', correctAnswer: 'Gamma' }),
    ]);
  });

  it('keeps manual responses without inventing a correct answer', () => {
    const questions = [question('w1', 1, [])];

    expect(buildPracticeAttemptAnswers({ questions, answers: { w1: 'My essay' } })[0]).toMatchObject({
      questionId: 'w1',
      questionType: 'writing_task',
      outcome: 'manual_review',
      userAnswer: 'My essay',
      correctAnswer: '',
    });
  });
});

describe('buildPracticeSessionHistoryEntry', () => {
  it('captures score, completion and accuracy from a graded report', () => {
    const questions = [
      question('q1', 1, ['a']),
      question('q2', 2, ['b']),
      question('q3', 3, ['c']),
    ];
    const answers = { q1: 'a', q2: 'wrong', q3: 'c' };
    const report = buildPracticeReviewReport({
      questions,
      answers,
      showResults: true,
      flaggedQuestionIds: [],
      reviewNotesByQuestionId: {},
      elapsedSeconds: 90,
    });

    const built = buildPracticeSessionHistoryEntry({
      unit: unit({ questions }),
      report,
      elapsedSeconds: 90,
      recordedAt: 1_700_000_000_000,
      answers,
    });

    expect(built).toMatchObject({
      unitId: 'unit-1',
      title: 'Urban Green Roofs',
      skill: 'reading',
      answered: 3,
      correct: 2,
      incorrect: 1,
      objectiveTotal: 3,
      accuracy: 67,
      completionPercent: 100,
      selfRatedBand: null,
    });
    expect(built.id).toBe('unit-1:1700000000000');
    expect(built.answers?.map((answer) => answer.outcome)).toEqual(['correct', 'incorrect', 'correct']);
  });

  it('reports null accuracy for a purely manual (writing) session', () => {
    const questions = [question('w1', 1, [])];
    const report = buildPracticeReviewReport({
      questions,
      answers: { w1: 'my essay' },
      showResults: true,
      flaggedQuestionIds: [],
      reviewNotesByQuestionId: {},
      rubricRatingsByQuestionId: { w1: { taskResponse: 6, coherence: 7 } },
      elapsedSeconds: 600,
    });

    const built = buildPracticeSessionHistoryEntry({
      unit: unit({ skill: 'writing', questions }),
      report,
      elapsedSeconds: 600,
      recordedAt: 10,
    });

    expect(built.accuracy).toBeNull();
    expect(built.objectiveTotal).toBe(0);
    expect(built.selfRatedBand).toBe(6.5);
  });
});

describe('isSamePracticeAttemptSignature', () => {
  it('treats identical outcomes as the same regardless of timestamp', () => {
    expect(
      isSamePracticeAttemptSignature(entry({ recordedAt: 1 }), entry({ recordedAt: 999 }))
    ).toBe(true);
  });

  it('distinguishes attempts that differ in score', () => {
    expect(isSamePracticeAttemptSignature(entry({ correct: 4 }), entry({ correct: 5 }))).toBe(false);
  });
});

describe('sanitizePracticeSessionHistory', () => {
  it('drops malformed entries and sorts newest-first', () => {
    const result = sanitizePracticeSessionHistory([
      entry({ recordedAt: 100 }),
      { garbage: true },
      null,
      entry({ recordedAt: 300 }),
      entry({ recordedAt: 200 }),
    ]);

    expect(result.map((item) => item.recordedAt)).toEqual([300, 200, 100]);
  });

  it('clamps counts and accuracy into valid ranges', () => {
    const [cleaned] = sanitizePracticeSessionHistory([
      entry({ total: 5, correct: 99, accuracy: 250, completionPercent: -10 }),
    ]);

    expect(cleaned.correct).toBe(5);
    expect(cleaned.accuracy).toBe(100);
    expect(cleaned.completionPercent).toBe(0);
  });

  it('sanitizes per-question snapshots and preserves legacy entries without them', () => {
    const [withAnswers, legacy] = sanitizePracticeSessionHistory([
      entry({
        recordedAt: 200,
        total: 2,
        answers: [
          {
            questionId: 'q2',
            questionNumber: 2,
            questionType: 'short_answer',
            prompt: 'Question 2',
            outcome: 'incorrect',
            userAnswer: 'wrong',
            correctAnswer: 'right',
          },
          {
            questionId: 'q1',
            questionNumber: 1,
            questionType: 'short_answer',
            prompt: 'Question 1',
            outcome: 'correct',
            userAnswer: 'yes',
            correctAnswer: 'yes',
          },
          { questionId: '', outcome: 'wrong-shape' } as never,
        ],
      }),
      entry({ recordedAt: 100 }),
    ]);

    expect(withAnswers.answers?.map((answer) => answer.questionId)).toEqual(['q1', 'q2']);
    expect(legacy.answers).toBeUndefined();
  });

  it('returns an empty array for non-array input', () => {
    expect(sanitizePracticeSessionHistory(null)).toEqual([]);
    expect(sanitizePracticeSessionHistory('nope')).toEqual([]);
  });
});

describe('summarizePracticeSessionHistory', () => {
  it('returns an empty summary for no entries', () => {
    const summary = summarizePracticeSessionHistory([]);
    expect(summary.totalAttempts).toBe(0);
    expect(summary.accuracyTrend).toBeNull();
    expect(summary.bySkill).toEqual([]);
  });

  it('computes trend from the two most recent objective attempts', () => {
    const summary = summarizePracticeSessionHistory([
      entry({ recordedAt: 300, accuracy: 90 }),
      entry({ recordedAt: 200, accuracy: 70 }),
      entry({ recordedAt: 100, accuracy: 60 }),
    ]);

    expect(summary.latestAccuracy).toBe(90);
    expect(summary.bestAccuracy).toBe(90);
    expect(summary.averageAccuracy).toBeCloseTo(73.3, 1);
    expect(summary.accuracyTrend).toBe('up');
  });

  it('ignores manual attempts when computing accuracy but tracks best band', () => {
    const summary = summarizePracticeSessionHistory([
      entry({ recordedAt: 300, skill: 'writing', accuracy: null, objectiveTotal: 0, selfRatedBand: 7 }),
      entry({ recordedAt: 200, accuracy: 80, selfRatedBand: null }),
    ]);

    expect(summary.latestAccuracy).toBe(80);
    expect(summary.accuracyTrend).toBeNull();
    expect(summary.bestBand).toBe(7);
    expect(summary.sessionsPracticed).toBe(1);
  });

  it('groups accuracy by skill', () => {
    const summary = summarizePracticeSessionHistory([
      entry({ unitId: 'r1', skill: 'reading', accuracy: 80 }),
      entry({ unitId: 'r2', skill: 'reading', accuracy: 60 }),
      entry({ unitId: 'l1', skill: 'listening', accuracy: 50 }),
    ]);

    const reading = summary.bySkill.find((stat) => stat.skill === 'reading');
    const listening = summary.bySkill.find((stat) => stat.skill === 'listening');
    expect(reading?.attempts).toBe(2);
    expect(reading?.averageAccuracy).toBe(70);
    expect(listening?.averageAccuracy).toBe(50);
  });
});

describe('computePracticeStudyStreak', () => {
  const reference = 10 * DAY_MS + 5_000; // partway through day index 10

  it('counts consecutive days ending today', () => {
    const streak = computePracticeStudyStreak(
      [
        entry({ recordedAt: 10 * DAY_MS + 1 }),
        entry({ recordedAt: 9 * DAY_MS + 1 }),
        entry({ recordedAt: 8 * DAY_MS + 1 }),
      ],
      reference
    );
    expect(streak).toBe(3);
  });

  it('allows a one-day grace when today has no activity yet', () => {
    const streak = computePracticeStudyStreak(
      [entry({ recordedAt: 9 * DAY_MS + 1 }), entry({ recordedAt: 8 * DAY_MS + 1 })],
      reference
    );
    expect(streak).toBe(2);
  });

  it('resets when the most recent activity is older than yesterday', () => {
    const streak = computePracticeStudyStreak([entry({ recordedAt: 7 * DAY_MS + 1 })], reference);
    expect(streak).toBe(0);
  });

  it('returns zero for no entries', () => {
    expect(computePracticeStudyStreak([], reference)).toBe(0);
  });
});
