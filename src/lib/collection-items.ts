import type { IeltsQuestion, PracticeQuestionType } from './types';

/**
 * A wrong-book / favorites card, from either question model.
 *
 * The two systems store different shapes: legacy `ielts_questions` rows are standalone,
 * while practice questions belong to a unit and are reached through it. This type is the
 * common surface the review screens render, so neither screen needs to branch on source.
 */
export type CollectionItem = {
  /** Row id in favorites / wrong_book — used as the removal key. */
  entryId: string;
  source: 'legacy' | 'practice';
  questionText: string;
  answer: string;
  explanation: string | null;
  /** IELTS skill/category label, e.g. 'reading'. */
  category: string;
  difficulty: string;
  savedAt: number;
  /** Where the question can be practised again, or null for legacy rows. */
  href: string | null;
  /** Unit title for practice questions, null for legacy ones. */
  unitTitle: string | null;
  questionType: string;
  options: string[] | null;
  /** Legacy questions may carry an HTML article excerpt; practice questions do not. */
  articleContent: string | null;
};

export type LegacyCollectionRow = {
  id: string;
  created_at: string;
  question_id: string;
};

export type PracticeCollectionRow = {
  id: string;
  created_at: string;
  practice_question_id: string;
};

export type PracticeQuestionJoin = {
  id: string;
  question_text: string;
  question_type: PracticeQuestionType;
  options: unknown;
  answer_key: unknown;
  explanation: string | null;
  unit: {
    slug: string;
    title: string;
    skill: string;
    difficulty: string;
  } | null;
};

function parseTimestamp(value: string) {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function firstAnswer(answerKey: unknown): string {
  if (!answerKey || typeof answerKey !== 'object') return '';
  const answers = (answerKey as { answers?: unknown }).answers;
  if (!Array.isArray(answers)) return '';
  const first = answers.find((value) => typeof value === 'string' && value.trim());
  return typeof first === 'string' ? first : '';
}

function parseOptions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const options = value.filter((item): item is string => typeof item === 'string');
  return options.length ? options : null;
}

/** Map a legacy favorites/wrong_book row plus its question into a card. Pure. */
export function toLegacyCollectionItem(
  row: LegacyCollectionRow,
  question: IeltsQuestion
): CollectionItem {
  return {
    entryId: row.id,
    source: 'legacy',
    questionText: question.question_text,
    answer: question.correct_answer,
    explanation: question.explanation ?? null,
    category: question.category,
    difficulty: question.difficulty,
    savedAt: parseTimestamp(row.created_at),
    href: null,
    unitTitle: null,
    questionType: question.type,
    options: question.options ?? null,
    articleContent: question.article_content ?? null,
  };
}

/** Map a practice-sourced row plus its joined question into a card. Pure. */
export function toPracticeCollectionItem(
  row: PracticeCollectionRow,
  question: PracticeQuestionJoin
): CollectionItem {
  return {
    entryId: row.id,
    source: 'practice',
    questionText: question.question_text,
    answer: firstAnswer(question.answer_key),
    explanation: question.explanation,
    category: question.unit?.skill ?? 'reading',
    difficulty: question.unit?.difficulty ?? 'medium',
    savedAt: parseTimestamp(row.created_at),
    href: question.unit ? `/practice/session/${question.unit.slug}` : null,
    unitTitle: question.unit?.title ?? null,
    questionType: question.question_type,
    options: parseOptions(question.options),
    articleContent: null,
  };
}

/** Merge both sources into one newest-first list. Pure. */
export function mergeCollectionItems(...groups: CollectionItem[][]): CollectionItem[] {
  return groups.flat().sort((a, b) => b.savedAt - a.savedAt);
}

export type CollectionSourceCounts = {
  total: number;
  legacy: number;
  practice: number;
};

/** Tally items by source, for the "N 来自 Session" hint. Pure. */
export function countCollectionSources(items: CollectionItem[]): CollectionSourceCounts {
  return {
    total: items.length,
    legacy: items.filter((item) => item.source === 'legacy').length,
    practice: items.filter((item) => item.source === 'practice').length,
  };
}
