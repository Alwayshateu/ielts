import type {
  PracticeAnswerKey,
  PracticeDifficulty,
  PracticeMaterialType,
  PracticeMode,
  PracticeQuestion,
  PracticeQuestionType,
  PracticeSkill,
  PracticeUnit,
} from './types';

export type RawPracticeUnitRow = Record<string, unknown>;
export type RawPracticeQuestionRow = Record<string, unknown>;

const PRACTICE_SKILLS: PracticeSkill[] = [
  'foundation',
  'reading',
  'listening',
  'writing',
  'speaking',
];
const PRACTICE_MODES: PracticeMode[] = ['basic', 'progressive', 'challenge'];
const PRACTICE_DIFFICULTIES: PracticeDifficulty[] = ['easy', 'medium', 'hard'];
const PRACTICE_MATERIAL_TYPES: PracticeMaterialType[] = [
  'none',
  'passage',
  'audio',
  'writing_prompt',
  'speaking_prompt',
  'foundation_note',
];
const PRACTICE_QUESTION_TYPES: PracticeQuestionType[] = [
  'multiple_choice',
  'true_false_not_given',
  'sentence_completion',
  'short_answer',
  'writing_task',
  'speaking_response',
];

export class PracticeUnitMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PracticeUnitMappingError';
  }
}

function describeRow(row: Record<string, unknown>, fallback: string) {
  return typeof row.id === 'string' && row.id ? row.id : fallback;
}

function requireString(value: unknown, field: string, rowLabel: string) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new PracticeUnitMappingError(`${rowLabel}.${field} must be a non-empty string`);
  }

  return value;
}

function nullableString(value: unknown, field: string, rowLabel: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new PracticeUnitMappingError(`${rowLabel}.${field} must be a string or null`);
  }

  return value;
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
  rowLabel: string
) {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new PracticeUnitMappingError(
      `${rowLabel}.${field} must be one of: ${allowed.join(', ')}`
    );
  }

  return value as T;
}

function normalizeMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeOptions(value: unknown, rowLabel: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Array.isArray(value) || value.some((option) => typeof option !== 'string')) {
    throw new PracticeUnitMappingError(`${rowLabel}.options must be an array of strings or null`);
  }

  return value;
}

function normalizeStringArray(value: unknown, field: string, rowLabel: string) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new PracticeUnitMappingError(`${rowLabel}.${field} must be an array of strings`);
  }

  return value;
}

function normalizeAnswerKey(value: unknown, rowLabel: string): PracticeAnswerKey {
  if (value === null || value === undefined) {
    return { answers: [] };
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PracticeUnitMappingError(`${rowLabel}.answer_key must be an object or null`);
  }

  const raw = value as Record<string, unknown>;
  const answerKey: PracticeAnswerKey = {
    answers: normalizeStringArray(raw.answers, 'answer_key.answers', rowLabel),
  };

  if (raw.caseSensitive !== undefined) {
    if (typeof raw.caseSensitive !== 'boolean') {
      throw new PracticeUnitMappingError(
        `${rowLabel}.answer_key.caseSensitive must be a boolean`
      );
    }
    answerKey.caseSensitive = raw.caseSensitive;
  }

  if (raw.acceptedAlternatives !== undefined) {
    answerKey.acceptedAlternatives = normalizeStringArray(
      raw.acceptedAlternatives,
      'answer_key.acceptedAlternatives',
      rowLabel
    );
  }

  return answerKey;
}

function normalizeTimeLimit(value: unknown, rowLabel: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new PracticeUnitMappingError(
      `${rowLabel}.time_limit_seconds must be a positive integer or null`
    );
  }

  return value as number;
}

function mapQuestionRow(row: RawPracticeQuestionRow, expectedUnitId: string): PracticeQuestion {
  const rowLabel = `practice_question:${describeRow(row, 'unknown')}`;

  if (row.is_active !== true) {
    throw new PracticeUnitMappingError(`${rowLabel} is not active`);
  }

  const unitId = requireString(row.unit_id, 'unit_id', rowLabel);
  if (unitId !== expectedUnitId) {
    throw new PracticeUnitMappingError(
      `${rowLabel}.unit_id does not match parent unit ${expectedUnitId}`
    );
  }

  if (!Number.isInteger(row.question_number) || (row.question_number as number) <= 0) {
    throw new PracticeUnitMappingError(
      `${rowLabel}.question_number must be a positive integer`
    );
  }

  return {
    id: requireString(row.id, 'id', rowLabel),
    unit_id: unitId,
    question_number: row.question_number as number,
    question_type: requireEnum(
      row.question_type,
      PRACTICE_QUESTION_TYPES,
      'question_type',
      rowLabel
    ),
    question_text: requireString(row.question_text, 'question_text', rowLabel),
    options: normalizeOptions(row.options, rowLabel),
    answer_key: normalizeAnswerKey(row.answer_key, rowLabel),
    explanation: nullableString(row.explanation, 'explanation', rowLabel),
    metadata: normalizeMetadata(row.metadata),
  };
}

export function mapPracticeUnitRow(
  row: RawPracticeUnitRow,
  questionRows: RawPracticeQuestionRow[]
): PracticeUnit {
  const rowLabel = `practice_unit:${describeRow(row, 'unknown')}`;

  if (row.is_active !== true) {
    throw new PracticeUnitMappingError(`${rowLabel} is not active`);
  }

  const id = requireString(row.id, 'id', rowLabel);
  const questions = questionRows
    .map((question) => mapQuestionRow(question, id))
    .sort((left, right) => left.question_number - right.question_number);
  const seenNumbers = new Set<number>();
  const seenIds = new Set<string>();

  for (const question of questions) {
    if (seenNumbers.has(question.question_number)) {
      throw new PracticeUnitMappingError(
        `${rowLabel} contains duplicate question number ${question.question_number}`
      );
    }
    if (seenIds.has(question.id)) {
      throw new PracticeUnitMappingError(`${rowLabel} contains duplicate question id ${question.id}`);
    }
    seenNumbers.add(question.question_number);
    seenIds.add(question.id);
  }

  return {
    id,
    slug: requireString(row.slug, 'slug', rowLabel),
    skill: requireEnum(row.skill, PRACTICE_SKILLS, 'skill', rowLabel),
    mode: requireEnum(row.mode, PRACTICE_MODES, 'mode', rowLabel),
    title: requireString(row.title, 'title', rowLabel),
    description: nullableString(row.description, 'description', rowLabel),
    difficulty: requireEnum(
      row.difficulty,
      PRACTICE_DIFFICULTIES,
      'difficulty',
      rowLabel
    ),
    material_type: requireEnum(
      row.material_type,
      PRACTICE_MATERIAL_TYPES,
      'material_type',
      rowLabel
    ),
    passage_text: nullableString(row.passage_text, 'passage_text', rowLabel),
    audio_url: nullableString(row.audio_url, 'audio_url', rowLabel),
    transcript: nullableString(row.transcript, 'transcript', rowLabel),
    asset_url: nullableString(row.asset_url, 'asset_url', rowLabel),
    time_limit_seconds: normalizeTimeLimit(row.time_limit_seconds, rowLabel),
    metadata: normalizeMetadata(row.metadata),
    questions,
  };
}

export function mapPracticeUnitRows(
  unitRows: RawPracticeUnitRow[],
  questionRows: RawPracticeQuestionRow[]
) {
  const activeUnits = unitRows.filter((row) => row.is_active === true);
  const activeUnitIds = new Set(activeUnits.map((row) => requireString(row.id, 'id', 'practice_unit')));
  const questionsByUnit = new Map<string, RawPracticeQuestionRow[]>();

  for (const question of questionRows) {
    if (question.is_active !== true) {
      continue;
    }

    const unitId = requireString(question.unit_id, 'unit_id', 'practice_question');
    if (!activeUnitIds.has(unitId)) {
      throw new PracticeUnitMappingError(
        `practice_question:${describeRow(question, 'unknown')} references an unknown active unit ${unitId}`
      );
    }

    const rows = questionsByUnit.get(unitId) ?? [];
    rows.push(question);
    questionsByUnit.set(unitId, rows);
  }

  const seenUnitIds = new Set<string>();
  const seenSlugs = new Set<string>();

  return activeUnits.map((unitRow) => {
    const id = requireString(unitRow.id, 'id', 'practice_unit');
    const slug = requireString(unitRow.slug, 'slug', `practice_unit:${id}`);

    if (seenUnitIds.has(id)) {
      throw new PracticeUnitMappingError(`duplicate practice unit id ${id}`);
    }
    if (seenSlugs.has(slug)) {
      throw new PracticeUnitMappingError(`duplicate practice unit slug ${slug}`);
    }

    seenUnitIds.add(id);
    seenSlugs.add(slug);
    return mapPracticeUnitRow(unitRow, questionsByUnit.get(id) ?? []);
  });
}
