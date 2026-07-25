import type { SupabaseClient } from '@supabase/supabase-js';

import {
  mergeCollectionItems,
  toLegacyCollectionItem,
  toPracticeCollectionItem,
  type CollectionItem,
  type PracticeQuestionJoin,
} from './collection-items';
import type { IeltsQuestion } from './types';

export type CollectionTable = 'favorites' | 'wrong_book';

/**
 * Whether these tables carry practice-session questions yet. Off until migration 0003
 * is applied, so the screens keep working against the pre-migration schema.
 */
export function isPracticeCollectionLinkEnabled(
  value = process.env.NEXT_PUBLIC_PRACTICE_COLLECTION_LINK
) {
  return value === 'on';
}

const PRACTICE_QUESTION_SELECT = `
  id,
  question_text,
  question_type,
  options,
  answer_key,
  explanation,
  unit:practice_units!inner(slug, title, skill, difficulty)
`;

/** Legacy rows: ielts_questions reached through favorites/wrong_book.question_id. */
async function readLegacyItems(
  supabase: SupabaseClient,
  table: CollectionTable,
  userId: string
): Promise<{ items: CollectionItem[]; error: Error | null }> {
  const { data: rows, error } = await supabase
    .from(table)
    .select('id, created_at, question_id')
    .eq('user_id', userId)
    .not('question_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) return { items: [], error: new Error(error.message) };
  if (!rows?.length) return { items: [], error: null };

  const questionIds = rows.map((row) => row.question_id as string);
  const { data: questions, error: questionsError } = await supabase
    .from('ielts_questions')
    .select('*')
    .in('id', questionIds);

  if (questionsError) return { items: [], error: new Error(questionsError.message) };

  const byId = new Map(
    (questions ?? []).map((question) => [question.id as string, question as IeltsQuestion])
  );

  const items = rows
    .map((row) => {
      const question = byId.get(row.question_id as string);
      return question
        ? toLegacyCollectionItem(
            { id: row.id as string, created_at: row.created_at as string, question_id: row.question_id as string },
            question
          )
        : null;
    })
    .filter((item): item is CollectionItem => item !== null);

  return { items, error: null };
}

/** Practice rows: practice_questions joined through practice_question_id. */
async function readPracticeItems(
  supabase: SupabaseClient,
  table: CollectionTable,
  userId: string
): Promise<{ items: CollectionItem[]; error: Error | null }> {
  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, created_at, practice_question_id, question:practice_questions!inner(${PRACTICE_QUESTION_SELECT})`)
    .eq('user_id', userId)
    .not('practice_question_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) return { items: [], error: new Error(error.message) };
  if (!rows?.length) return { items: [], error: null };

  const items = rows
    .map((row) => {
      const joined = row.question as unknown;
      const question = (Array.isArray(joined) ? joined[0] : joined) as PracticeQuestionJoin | null;
      if (!question) return null;

      const unit = question.unit as unknown;
      return toPracticeCollectionItem(
        {
          id: row.id as string,
          created_at: row.created_at as string,
          practice_question_id: row.practice_question_id as string,
        },
        { ...question, unit: (Array.isArray(unit) ? unit[0] : unit) ?? null }
      );
    })
    .filter((item): item is CollectionItem => item !== null);

  return { items, error: null };
}

/**
 * Read one collection from both question models and return a single newest-first list.
 *
 * A failure in the practice half is not fatal: the legacy cards still render and the
 * error is surfaced separately, so an unapplied migration degrades instead of breaking
 * the page.
 */
export async function getCollectionItems(
  supabase: SupabaseClient,
  table: CollectionTable,
  userId: string
): Promise<{ items: CollectionItem[]; error: Error | null; partialError: Error | null }> {
  const legacy = await readLegacyItems(supabase, table, userId);
  if (legacy.error) return { items: [], error: legacy.error, partialError: null };

  if (!isPracticeCollectionLinkEnabled()) {
    return { items: legacy.items, error: null, partialError: null };
  }

  const practice = await readPracticeItems(supabase, table, userId);

  return {
    items: mergeCollectionItems(legacy.items, practice.items),
    error: null,
    partialError: practice.error,
  };
}

/** Remove one card by its row id in favorites/wrong_book. */
export async function removeCollectionItem(
  supabase: SupabaseClient,
  table: CollectionTable,
  entryId: string
) {
  const { error } = await supabase.from(table).delete().eq('id', entryId);
  return error ? new Error(error.message) : null;
}

/**
 * Record a practice-session question in the wrong book or favorites.
 *
 * Idempotent per (user, practice question) via the partial unique indexes from
 * migration 0003 — a duplicate save is ignored rather than erroring.
 */
export async function savePracticeQuestionToCollection({
  supabase,
  table,
  userId,
  practiceQuestionId,
}: {
  supabase: SupabaseClient;
  table: CollectionTable;
  userId: string;
  practiceQuestionId: string;
}) {
  const { error } = await supabase.from(table).upsert(
    { user_id: userId, practice_question_id: practiceQuestionId, question_id: null },
    { onConflict: 'user_id,practice_question_id', ignoreDuplicates: true }
  );

  return error ? new Error(error.message) : null;
}

/** Remove a practice question from a collection, addressed by question rather than row. */
export async function removePracticeQuestionFromCollection({
  supabase,
  table,
  userId,
  practiceQuestionId,
}: {
  supabase: SupabaseClient;
  table: CollectionTable;
  userId: string;
  practiceQuestionId: string;
}) {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('user_id', userId)
    .eq('practice_question_id', practiceQuestionId);

  return error ? new Error(error.message) : null;
}

/** Which of the given practice questions the user has already saved. */
export async function readSavedPracticeQuestionIds({
  supabase,
  table,
  userId,
  practiceQuestionIds,
}: {
  supabase: SupabaseClient;
  table: CollectionTable;
  userId: string;
  practiceQuestionIds: string[];
}): Promise<Set<string>> {
  if (practiceQuestionIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from(table)
    .select('practice_question_id')
    .eq('user_id', userId)
    .in('practice_question_id', practiceQuestionIds);

  if (error) return new Set();

  return new Set((data ?? []).map((row) => row.practice_question_id as string));
}
