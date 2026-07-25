import { describe, expect, it } from 'vitest';

import { buildPracticeReviewReport, formatPracticeSessionClock } from '../practice-session-report';
import type { PracticeQuestion } from '../types';

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

describe('practice session report', () => {
  it('formats elapsed time as a safe mm:ss clock', () => {
    expect(formatPracticeSessionClock(0)).toBe('00:00');
    expect(formatPracticeSessionClock(65)).toBe('01:05');
    expect(formatPracticeSessionClock(-5)).toBe('00:00');
  });

  it('prioritizes review queue reasons: incorrect, skipped, manual, flagged, then notes', () => {
    const questions = [
      question('incorrect-q', 1, ['right']),
      question('skipped-q', 2, ['answer']),
      question('manual-q', 3, []),
      question('flagged-q', 4, ['ok']),
      question('note-q', 5, ['noted']),
      question('flagged-incorrect-q', 6, ['expected']),
    ];

    const report = buildPracticeReviewReport({
      questions,
      answers: {
        'incorrect-q': 'wrong',
        'manual-q': 'essay draft',
        'flagged-q': 'ok',
        'note-q': 'noted',
        'flagged-incorrect-q': 'wrong',
      },
      showResults: true,
      flaggedQuestionIds: ['flagged-q', 'flagged-incorrect-q'],
      reviewNotesByQuestionId: { 'note-q': 'Check wording', 'flagged-incorrect-q': 'Also noted' },
      elapsedSeconds: 125,
    });

    expect(report.queue.map((item) => [item.question.id, item.reason])).toEqual([
      ['incorrect-q', 'incorrect'],
      ['flagged-incorrect-q', 'incorrect'],
      ['skipped-q', 'skipped'],
      ['manual-q', 'manual'],
      ['flagged-q', 'flagged'],
      ['note-q', 'note'],
    ]);
    expect(report.completionPercent).toBe(83);
    expect(report.questionTypeStats).toEqual([
      expect.objectContaining({ questionType: 'short_answer', total: 5, correct: 2, incorrect: 2, skipped: 1 }),
      expect.objectContaining({ questionType: 'writing_task', total: 1, manualReview: 1 }),
    ]);
    expect(report.focusSummary).toContain('错题');
    expect(report.nextSteps.length).toBeGreaterThan(0);
  });

  it('does not reveal result-only queue items before results are shown', () => {
    const report = buildPracticeReviewReport({
      questions: [question('incorrect-q', 1, ['right']), question('skipped-q', 2, ['answer'])],
      answers: { 'incorrect-q': 'wrong' },
      showResults: false,
      flaggedQuestionIds: ['skipped-q'],
      reviewNotesByQuestionId: { 'incorrect-q': 'note before reveal' },
      elapsedSeconds: 0,
    });

    expect(report.queue.map((item) => [item.question.id, item.reason])).toEqual([
      ['skipped-q', 'flagged'],
      ['incorrect-q', 'note'],
    ]);
  });

  it('sets canReveal only after at least one answer and detects answered manual-only sessions', () => {
    const manualQuestion = question('manual-q', 1, []);

    expect(buildPracticeReviewReport({
      questions: [manualQuestion],
      answers: {},
      showResults: false,
      flaggedQuestionIds: [],
      reviewNotesByQuestionId: {},
      elapsedSeconds: 0,
    })).toMatchObject({
      canReveal: false,
      manualOnly: false,
    });

    expect(buildPracticeReviewReport({
      questions: [manualQuestion],
      answers: { 'manual-q': 'draft answer' },
      showResults: true,
      flaggedQuestionIds: [],
      reviewNotesByQuestionId: {},
      elapsedSeconds: 0,
    })).toMatchObject({
      canReveal: true,
      manualOnly: true,
      score: {
        answered: 1,
        manualReview: 1,
        objectiveTotal: 0,
        accuracy: 0,
      },
    });
  });
});
