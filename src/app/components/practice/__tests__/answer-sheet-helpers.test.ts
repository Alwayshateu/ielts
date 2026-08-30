import { describe, expect, it } from 'vitest';
import type { PracticeQuestion } from '@/lib/types';
import {
  countWords,
  getSpeakingChecklist,
  isExtendedResponse,
  labelQuestionType,
  optionMarker,
} from '../answer-sheet-helpers';

function makeQuestion(overrides: Partial<PracticeQuestion>): PracticeQuestion {
  return { question_type: 'multiple_choice', ...overrides } as unknown as PracticeQuestion;
}

describe('optionMarker', () => {
  it('maps a zero-based index to A, B, C, ...', () => {
    expect(optionMarker(0)).toBe('A');
    expect(optionMarker(1)).toBe('B');
    expect(optionMarker(3)).toBe('D');
  });
});

describe('labelQuestionType', () => {
  it('gives a human label for each known type', () => {
    expect(labelQuestionType('multiple_choice')).toBe('Multiple Choice');
    expect(labelQuestionType('true_false_not_given')).toBe('True / False / Not Given');
    expect(labelQuestionType('sentence_completion')).toBe('Sentence Completion');
    expect(labelQuestionType('short_answer')).toBe('Short Answer');
    expect(labelQuestionType('writing_task')).toBe('Writing Task');
    expect(labelQuestionType('speaking_response')).toBe('Speaking Response');
  });

  it('falls back to the raw type when unknown', () => {
    expect(labelQuestionType('mystery' as PracticeQuestion['question_type'])).toBe('mystery');
  });
});

describe('isExtendedResponse', () => {
  it('is true for writing and speaking questions', () => {
    expect(isExtendedResponse(makeQuestion({ question_type: 'writing_task' }))).toBe(true);
    expect(isExtendedResponse(makeQuestion({ question_type: 'speaking_response' }))).toBe(true);
  });

  it('is false for objective question types', () => {
    expect(isExtendedResponse(makeQuestion({ question_type: 'multiple_choice' }))).toBe(false);
    expect(isExtendedResponse(makeQuestion({ question_type: 'short_answer' }))).toBe(false);
  });
});

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('one two three')).toBe(3);
  });

  it('collapses irregular whitespace and trims', () => {
    expect(countWords('  hello   world\n\tagain  ')).toBe(3);
  });

  it('is zero for empty or whitespace-only input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('    ')).toBe(0);
  });
});

describe('getSpeakingChecklist', () => {
  it('marks coverage when cue keywords appear', () => {
    const checklist = getSpeakingChecklist('I explained what happened and who was there.');
    expect(checklist[0].done).toBe(true);
  });

  it('marks coverage when the answer is long enough even without keywords', () => {
    const longAnswer = Array.from({ length: 30 }, (_, i) => `token${i}`).join(' ');
    expect(getSpeakingChecklist(longAnswer)[0].done).toBe(true);
  });

  it('detects reason/example and self-review signals', () => {
    const checklist = getSpeakingChecklist('For example I worked on my pronunciation.');
    expect(checklist[1].done).toBe(true);
    expect(checklist[2].done).toBe(true);
  });

  it('leaves items undone when signals are absent', () => {
    const checklist = getSpeakingChecklist('short reply');
    expect(checklist[1].done).toBe(false);
    expect(checklist[2].done).toBe(false);
  });

  it('always returns three checklist items', () => {
    expect(getSpeakingChecklist('anything')).toHaveLength(3);
  });
});
