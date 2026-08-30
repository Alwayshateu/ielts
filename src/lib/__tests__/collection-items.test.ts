import { describe, expect, it } from 'vitest';

import {
  countCollectionSources,
  mergeCollectionItems,
  toLegacyCollectionItem,
  toPracticeCollectionItem,
  type CollectionItem,
  type PracticeQuestionJoin,
} from '../collection-items';
import type { IeltsQuestion } from '../types';

const legacyQuestion: IeltsQuestion = {
  id: 'q-legacy',
  type: 'multiple_choice',
  category: 'reading',
  difficulty: 'easy',
  question_text: 'Legacy question?',
  options: ['a', 'b'],
  correct_answer: 'a',
  explanation: 'because a',
};

function practiceQuestion(overrides: Partial<PracticeQuestionJoin> = {}): PracticeQuestionJoin {
  return {
    id: 'pq-1',
    question_text: 'Practice question?',
    question_type: 'short_answer',
    options: null,
    answer_key: { answers: ['slowly'], acceptedAlternatives: ['gradually'] },
    explanation: 'paragraph 3',
    unit: { slug: 'reading-unit', title: 'Urban Green Roofs', skill: 'reading', difficulty: 'medium' },
    ...overrides,
  };
}

describe('toLegacyCollectionItem', () => {
  it('maps a legacy row with no practice link', () => {
    const item = toLegacyCollectionItem(
      { id: 'row-1', created_at: '2026-01-02T03:04:05Z', question_id: 'q-legacy' },
      legacyQuestion
    );

    expect(item).toMatchObject({
      entryId: 'row-1',
      source: 'legacy',
      questionText: 'Legacy question?',
      answer: 'a',
      category: 'reading',
      difficulty: 'easy',
      href: null,
      unitTitle: null,
    });
    expect(item.savedAt).toBe(Date.parse('2026-01-02T03:04:05Z'));
  });
});

describe('toPracticeCollectionItem', () => {
  it('takes the first accepted answer and links back to the session', () => {
    const item = toPracticeCollectionItem(
      { id: 'row-2', created_at: '2026-02-03T00:00:00Z', practice_question_id: 'pq-1' },
      practiceQuestion()
    );

    expect(item).toMatchObject({
      entryId: 'row-2',
      source: 'practice',
      answer: 'slowly',
      category: 'reading',
      difficulty: 'medium',
      href: '/practice/session/reading-unit',
      unitTitle: 'Urban Green Roofs',
    });
  });

  it('survives a manual question with no answer key entries', () => {
    const item = toPracticeCollectionItem(
      { id: 'row-3', created_at: '2026-02-03T00:00:00Z', practice_question_id: 'pq-2' },
      practiceQuestion({ question_type: 'writing_task', answer_key: { answers: [] } })
    );

    expect(item.answer).toBe('');
    expect(item.questionType).toBe('writing_task');
  });

  it('falls back to defaults when the unit join is missing', () => {
    const item = toPracticeCollectionItem(
      { id: 'row-4', created_at: '2026-02-03T00:00:00Z', practice_question_id: 'pq-3' },
      practiceQuestion({ unit: null })
    );

    expect(item.href).toBeNull();
    expect(item.unitTitle).toBeNull();
    expect(item.category).toBe('reading');
  });

  it('keeps options only when they are a string array', () => {
    expect(toPracticeCollectionItem(
      { id: 'r', created_at: '2026-01-01T00:00:00Z', practice_question_id: 'p' },
      practiceQuestion({ options: ['True', 'False'] })
    ).options).toEqual(['True', 'False']);

    expect(toPracticeCollectionItem(
      { id: 'r', created_at: '2026-01-01T00:00:00Z', practice_question_id: 'p' },
      practiceQuestion({ options: 'nope' })
    ).options).toBeNull();
  });
});

describe('mergeCollectionItems', () => {
  const item = (id: string, savedAt: number): CollectionItem => ({
    entryId: id,
    source: 'legacy',
    questionText: id,
    answer: '',
    explanation: null,
    category: 'reading',
    difficulty: 'easy',
    savedAt,
    href: null,
    unitTitle: null,
    questionType: 'short_answer',
    options: null,
    articleContent: null,
  });

  it('interleaves both sources newest-first', () => {
    const merged = mergeCollectionItems(
      [item('a', 300), item('c', 100)],
      [{ ...item('b', 200), source: 'practice' }]
    );

    expect(merged.map((entry) => entry.entryId)).toEqual(['a', 'b', 'c']);
  });

  it('handles empty groups', () => {
    expect(mergeCollectionItems([], [])).toEqual([]);
  });
});

describe('countCollectionSources', () => {
  it('counts each source', () => {
    const base = toLegacyCollectionItem(
      { id: 'r', created_at: '2026-01-01T00:00:00Z', question_id: 'q' },
      legacyQuestion
    );

    expect(
      countCollectionSources([base, { ...base, source: 'practice' }, { ...base, source: 'practice' }])
    ).toEqual({ total: 3, legacy: 1, practice: 2 });
  });
});
