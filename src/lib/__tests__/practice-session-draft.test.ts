import { describe, expect, it } from 'vitest';

import {
  createEmptyPracticeSessionDraft,
  safeParseJson,
  sanitizePracticeSessionAnnotations,
  sanitizePracticeSessionDraft,
} from '../practice-session-draft';
import type { PassageAnnotation, PracticeQuestion } from '../types';

const questions: PracticeQuestion[] = [
  {
    id: 'q1',
    unit_id: 'unit-1',
    question_number: 1,
    question_type: 'short_answer',
    question_text: 'Question 1',
    options: null,
    answer_key: { answers: ['one'], caseSensitive: false },
    explanation: null,
  },
  {
    id: 'q2',
    unit_id: 'unit-1',
    question_number: 2,
    question_type: 'short_answer',
    question_text: 'Question 2',
    options: null,
    answer_key: { answers: ['two'], caseSensitive: false },
    explanation: null,
  },
];

describe('practice session draft sanitization', () => {
  it('falls back for malformed JSON and non-object drafts', () => {
    expect(safeParseJson('{not-json')).toBeNull();
    expect(sanitizePracticeSessionDraft(safeParseJson('{not-json'), questions)).toEqual(
      createEmptyPracticeSessionDraft(questions)
    );
    expect(sanitizePracticeSessionDraft('legacy-value', questions)).toEqual(
      createEmptyPracticeSessionDraft(questions)
    );
  });

  it('strips unknown question IDs from answers, flags, and notes', () => {
    const draft = sanitizePracticeSessionDraft({
      answers: { q1: 'answer', missing: 'stale' },
      flaggedQuestionIds: ['q2', 'missing'],
      reviewNotesByQuestionId: { q1: 'review', missing: 'stale' },
      activeQuestionId: 'q2',
      elapsedSeconds: 12,
      updatedAt: 34,
    }, questions);

    expect(draft.answers).toEqual({ q1: 'answer' });
    expect(draft.flaggedQuestionIds).toEqual(['q2']);
    expect(draft.reviewNotesByQuestionId).toEqual({ q1: 'review' });
  });

  it('dedupes flags and ignores non-string draft fields', () => {
    const draft = sanitizePracticeSessionDraft({
      answers: { q1: 'answer', q2: 42 },
      flaggedQuestionIds: ['q1', 'q1', 42, 'q2'],
      reviewNotesByQuestionId: { q1: false, q2: 'note' },
    }, questions);

    expect(draft.answers).toEqual({ q1: 'answer' });
    expect(draft.flaggedQuestionIds).toEqual(['q1', 'q2']);
    expect(draft.reviewNotesByQuestionId).toEqual({ q2: 'note' });
  });

  it('resets invalid active question and rejected time values', () => {
    expect(sanitizePracticeSessionDraft({
      activeQuestionId: 'missing',
      elapsedSeconds: -10,
      updatedAt: Number.POSITIVE_INFINITY,
    }, questions)).toMatchObject({
      activeQuestionId: 'q1',
      elapsedSeconds: 0,
      updatedAt: 0,
    });

    expect(sanitizePracticeSessionDraft({
      activeQuestionId: 'q2',
      elapsedSeconds: 12.9,
      updatedAt: 98.7,
    }, questions)).toMatchObject({
      activeQuestionId: 'q2',
      elapsedSeconds: 12,
      updatedAt: 98,
    });
  });
  it('filters annotation shapes and keeps valid highlight/note entries', () => {
    const validHighlight: PassageAnnotation = {
      id: 'a1',
      paragraphIndex: 0,
      startOffset: 2,
      endOffset: 8,
      text: 'sample',
      kind: 'highlight',
      note: null,
    };
    const validNote: PassageAnnotation = {
      id: 'a2',
      paragraphIndex: 1,
      startOffset: 0,
      endOffset: 4,
      text: 'text',
      kind: 'note',
      note: 'remember this',
    };

    expect(sanitizePracticeSessionAnnotations([
      validHighlight,
      validNote,
      { ...validHighlight, id: 123 },
      { ...validHighlight, kind: 'underline' },
      { ...validHighlight, note: 7 },
      { ...validHighlight, paragraphIndex: Number.NaN },
      { ...validHighlight, startOffset: -1 },
      { ...validHighlight, endOffset: 2 },
    ])).toEqual([validHighlight, validNote]);
  });

  it('sanitizes mistake reasons and rubric ratings', () => {
    const draft = sanitizePracticeSessionDraft({
      mistakeReasonsByQuestionId: {
        q1: ['location', 'location', '', 12],
        missing: ['careless'],
      },
      rubricRatingsByQuestionId: {
        q2: { taskResponse: 6.26, grammar: 9.5, stale: 'bad' },
        missing: { grammar: 6 },
      },
    }, questions);

    expect(draft.mistakeReasonsByQuestionId).toEqual({ q1: ['location'] });
    expect(draft.rubricRatingsByQuestionId).toEqual({ q2: { taskResponse: 6.5 } });
  });
});
