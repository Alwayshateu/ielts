import { describe, expect, it } from 'vitest';

import {
  getPracticeAcceptedAnswers,
  getPracticeAnswerState,
  isPracticeAnswerCorrect,
  scorePracticeAnswers,
} from '../practice-answer-check';
import type { PracticeQuestion } from '../types';

function question(overrides: Partial<PracticeQuestion> = {}): PracticeQuestion {
  return {
    id: 'q1',
    unit_id: 'unit-1',
    question_number: 1,
    question_type: 'short_answer',
    question_text: 'Answer the question.',
    options: null,
    answer_key: {
      answers: ['Green roof'],
      caseSensitive: false,
      acceptedAlternatives: ['planted roof'],
    },
    explanation: null,
    ...overrides,
  };
}

describe('practice answer checking', () => {
  it('normalizes surrounding whitespace and repeated internal whitespace', () => {
    expect(isPracticeAnswerCorrect(question(), '  green   roof  ')).toBe(true);
  });

  it('matches accepted alternatives', () => {
    expect(isPracticeAnswerCorrect(question(), 'PLANTED ROOF')).toBe(true);
    expect(getPracticeAcceptedAnswers(question())).toEqual(['Green roof', 'planted roof']);
  });

  it('honors case-sensitive answer keys', () => {
    const caseSensitiveQuestion = question({
      answer_key: {
        answers: ['IELTS'],
        caseSensitive: true,
      },
    });

    expect(isPracticeAnswerCorrect(caseSensitiveQuestion, 'IELTS')).toBe(true);
    expect(isPracticeAnswerCorrect(caseSensitiveQuestion, 'ielts')).toBe(false);
  });

  it('returns skipped for empty answers once results are shown', () => {
    expect(getPracticeAnswerState(question(), '   ', true)).toBe('skipped');
  });

  it('returns incorrect for non-matching objective answers', () => {
    expect(getPracticeAnswerState(question(), 'solar panel', true)).toBe('incorrect');
  });

  it('returns manual review only for answered questions with empty answer keys', () => {
    const manualQuestion = question({
      question_type: 'writing_task',
      answer_key: {
        answers: [],
        caseSensitive: false,
      },
    });

    expect(getPracticeAnswerState(manualQuestion, '', true)).toBe('skipped');
    expect(getPracticeAnswerState(manualQuestion, 'My essay draft', true)).toBe('manual_review');
  });

  it('scores correct, incorrect, skipped, and manual-review answers', () => {
    const questions = [
      question({ id: 'correct-q', answer_key: { answers: ['A'], caseSensitive: false } }),
      question({ id: 'incorrect-q', answer_key: { answers: ['B'], caseSensitive: false } }),
      question({ id: 'skipped-q', answer_key: { answers: ['C'], caseSensitive: false } }),
      question({ id: 'manual-q', question_type: 'speaking_response', answer_key: { answers: [], caseSensitive: false } }),
    ];

    expect(scorePracticeAnswers(questions, {
      'correct-q': 'a',
      'incorrect-q': 'wrong',
      'manual-q': 'spoken response notes',
    })).toEqual({
      answered: 3,
      correct: 1,
      incorrect: 1,
      skipped: 1,
      manualReview: 1,
      total: 4,
      objectiveTotal: 3,
      accuracy: 33,
    });
  });
});
