import { describe, expect, it } from 'vitest';

import {
  mapPracticeUnitRow,
  mapPracticeUnitRows,
  PracticeUnitMappingError,
  type RawPracticeQuestionRow,
  type RawPracticeUnitRow,
} from '../practice-unit-mapper';

const unitRow: RawPracticeUnitRow = {
  id: 'unit-1',
  slug: 'reading-progressive-unit-1',
  skill: 'reading',
  mode: 'progressive',
  title: 'Mapped passage',
  description: null,
  difficulty: 'medium',
  material_type: 'passage',
  passage_text: 'Passage body',
  audio_url: null,
  transcript: null,
  asset_url: null,
  time_limit_seconds: 1200,
  metadata: { source: 'test' },
  is_active: true,
};

function questionRow(overrides: RawPracticeQuestionRow = {}): RawPracticeQuestionRow {
  return {
    id: 'question-1',
    unit_id: 'unit-1',
    question_number: 1,
    question_type: 'short_answer',
    question_text: 'What is the answer?',
    options: null,
    answer_key: {
      answers: ['answer'],
      caseSensitive: false,
      acceptedAlternatives: ['an answer'],
    },
    explanation: null,
    metadata: { ieltsType: 'short_answer' },
    is_active: true,
    ...overrides,
  };
}

describe('practice unit mapper', () => {
  it('maps valid rows, nullable fields, and JSONB values', () => {
    expect(mapPracticeUnitRow(unitRow, [questionRow()])).toEqual({
      id: 'unit-1',
      slug: 'reading-progressive-unit-1',
      skill: 'reading',
      mode: 'progressive',
      title: 'Mapped passage',
      description: null,
      difficulty: 'medium',
      material_type: 'passage',
      passage_text: 'Passage body',
      audio_url: null,
      transcript: null,
      asset_url: null,
      time_limit_seconds: 1200,
      metadata: { source: 'test' },
      questions: [
        {
          id: 'question-1',
          unit_id: 'unit-1',
          question_number: 1,
          question_type: 'short_answer',
          question_text: 'What is the answer?',
          options: null,
          answer_key: {
            answers: ['answer'],
            caseSensitive: false,
            acceptedAlternatives: ['an answer'],
          },
          explanation: null,
          metadata: { ieltsType: 'short_answer' },
        },
      ],
    });
  });

  it('sorts questions by question number', () => {
    const mapped = mapPracticeUnitRow(unitRow, [
      questionRow({ id: 'question-2', question_number: 2 }),
      questionRow(),
    ]);

    expect(mapped.questions.map((question) => question.id)).toEqual([
      'question-1',
      'question-2',
    ]);
  });

  it('uses safe defaults for null metadata and answer keys', () => {
    const mapped = mapPracticeUnitRow(
      { ...unitRow, metadata: null },
      [questionRow({ metadata: null, answer_key: null })]
    );

    expect(mapped.metadata).toEqual({});
    expect(mapped.questions[0].metadata).toEqual({});
    expect(mapped.questions[0].answer_key).toEqual({ answers: [] });
  });

  it.each([
    ['options', questionRow({ options: ['valid', 2] })],
    ['answer_key', questionRow({ answer_key: [] })],
    ['answer_key.answers', questionRow({ answer_key: { answers: 'answer' } })],
  ])('rejects malformed %s JSONB', (_, row) => {
    expect(() => mapPracticeUnitRow(unitRow, [row])).toThrow(PracticeUnitMappingError);
  });

  it.each([
    ['skill', { ...unitRow, skill: 'grammar' }],
    ['mode', { ...unitRow, mode: 'expert' }],
    ['difficulty', { ...unitRow, difficulty: 'extreme' }],
    ['material_type', { ...unitRow, material_type: 'video' }],
  ])('rejects an invalid unit %s enum', (_, row) => {
    expect(() => mapPracticeUnitRow(row, [])).toThrow(PracticeUnitMappingError);
  });

  it('rejects an invalid question type', () => {
    expect(() =>
      mapPracticeUnitRow(unitRow, [questionRow({ question_type: 'matching_headings' })])
    ).toThrow(/question_type/);
  });

  it('rejects questions that belong to another unit', () => {
    expect(() =>
      mapPracticeUnitRow(unitRow, [questionRow({ unit_id: 'unit-2' })])
    ).toThrow(/does not match parent unit/);
  });

  it('rejects duplicate question numbers', () => {
    expect(() =>
      mapPracticeUnitRow(unitRow, [questionRow(), questionRow({ id: 'question-2' })])
    ).toThrow(/duplicate question number/);
  });

  it('filters inactive units and questions in collection mapping', () => {
    const units = mapPracticeUnitRows(
      [unitRow, { ...unitRow, id: 'unit-2', slug: 'inactive-unit', is_active: false }],
      [questionRow(), questionRow({ id: 'inactive-question', question_number: 2, is_active: false })]
    );

    expect(units).toHaveLength(1);
    expect(units[0].questions).toHaveLength(1);
  });

  it('rejects active orphan questions and duplicate units', () => {
    expect(() =>
      mapPracticeUnitRows([unitRow], [questionRow({ unit_id: 'missing-unit' })])
    ).toThrow(/unknown active unit/);

    expect(() =>
      mapPracticeUnitRows([unitRow, { ...unitRow }], [questionRow()])
    ).toThrow(/duplicate practice unit id/);
  });

  it('rejects direct mapping of inactive rows', () => {
    expect(() => mapPracticeUnitRow({ ...unitRow, is_active: false }, [])).toThrow(
      /is not active/
    );
    expect(() =>
      mapPracticeUnitRow(unitRow, [questionRow({ is_active: false })])
    ).toThrow(/is not active/);
  });
});
