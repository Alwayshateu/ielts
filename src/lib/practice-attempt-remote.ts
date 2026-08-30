import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildPracticeAttemptSyncPlans,
  questionLookupKey,
  selectUnsyncedEntries,
  type PracticeAttemptSyncPlan,
  type PracticeUnitLookup,
} from './practice-attempt-sync';
import type { PracticeSessionHistoryEntry } from './practice-session-history';

/**
 * Whether attempt syncing is switched on. Off unless explicitly enabled, so the
 * default build keeps history entirely local.
 */
export function isPracticeAttemptSyncEnabled(
  value = process.env.NEXT_PUBLIC_PRACTICE_ATTEMPT_SYNC
) {
  return value === 'on';
}

export type PracticeAttemptSyncResult = {
  syncedAttempts: number;
  syncedAnswers: number;
  skippedEntries: number;
  unresolvedQuestions: number;
  errors: string[];
};

const EMPTY_RESULT: PracticeAttemptSyncResult = {
  syncedAttempts: 0,
  syncedAnswers: 0,
  skippedEntries: 0,
  unresolvedQuestions: 0,
  errors: [],
};

/** Resolve slug/external_key → uuid for the units the given entries reference. */
async function readLookup(
  supabase: SupabaseClient,
  slugs: string[]
): Promise<PracticeUnitLookup> {
  const lookup: PracticeUnitLookup = {
    unitIdBySlug: new Map(),
    questionIdByExternalKey: new Map(),
  };

  if (slugs.length === 0) return lookup;

  const { data: units, error: unitsError } = await supabase
    .from('practice_units')
    .select('id,slug')
    .in('slug', slugs);

  if (unitsError) throw new Error(`read units: ${unitsError.message}`);

  const slugById = new Map<string, string>();
  for (const unit of units ?? []) {
    lookup.unitIdBySlug.set(unit.slug as string, unit.id as string);
    slugById.set(unit.id as string, unit.slug as string);
  }

  if (slugById.size === 0) return lookup;

  const { data: questions, error: questionsError } = await supabase
    .from('practice_questions')
    .select('id,unit_id,external_key')
    .in('unit_id', [...slugById.keys()]);

  if (questionsError) throw new Error(`read questions: ${questionsError.message}`);

  for (const question of questions ?? []) {
    const slug = slugById.get(question.unit_id as string);
    const externalKey = question.external_key as string | null;
    if (!slug || !externalKey) continue;
    lookup.questionIdByExternalKey.set(questionLookupKey(slug, externalKey), question.id as string);
  }

  return lookup;
}

async function insertPlan(
  supabase: SupabaseClient,
  plan: PracticeAttemptSyncPlan
): Promise<{ answers: number }> {
  const { data, error } = await supabase
    .from('practice_attempts')
    .upsert(plan.attempt, { onConflict: 'user_id,client_attempt_id' })
    .select('id')
    .single();

  if (error) throw new Error(`insert attempt ${plan.attempt.client_attempt_id}: ${error.message}`);

  const attemptId = data?.id as string | undefined;
  if (!attemptId) throw new Error(`insert attempt ${plan.attempt.client_attempt_id}: no id returned`);
  if (plan.answers.length === 0) return { answers: 0 };

  const rows = plan.answers.map((answer) => ({ ...answer, attempt_id: attemptId }));
  const { error: answersError } = await supabase
    .from('practice_answers')
    .upsert(rows, { onConflict: 'attempt_id,question_id' });

  if (answersError) {
    throw new Error(`insert answers for ${plan.attempt.client_attempt_id}: ${answersError.message}`);
  }

  return { answers: rows.length };
}

/**
 * Push local history entries that are not yet in the database.
 *
 * Only ever writes practice_attempts / practice_answers, and only rows owned by the
 * signed-in user — RLS enforces that independently. Idempotent: attempts upsert on
 * (user_id, client_attempt_id) and answers on (attempt_id, question_id), so a repeat
 * run makes no duplicates. A failure on one attempt does not abort the others.
 */
export async function syncPracticeAttempts({
  supabase,
  entries,
}: {
  supabase: SupabaseClient;
  entries: PracticeSessionHistoryEntry[];
}): Promise<PracticeAttemptSyncResult> {
  if (entries.length === 0) return EMPTY_RESULT;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ...EMPTY_RESULT, errors: ['not signed in'] };
  }

  const { data: remote, error: remoteError } = await supabase
    .from('practice_attempts')
    .select('client_attempt_id')
    .eq('user_id', user.id)
    .not('client_attempt_id', 'is', null);

  if (remoteError) {
    return { ...EMPTY_RESULT, errors: [`read existing attempts: ${remoteError.message}`] };
  }

  const pending = selectUnsyncedEntries(
    entries,
    (remote ?? []).map((row) => row.client_attempt_id as string)
  );

  if (pending.length === 0) return EMPTY_RESULT;

  const lookup = await readLookup(supabase, [...new Set(pending.map((entry) => entry.slug))]);
  const { plans, skipped } = buildPracticeAttemptSyncPlans({
    entries: pending,
    userId: user.id,
    lookup,
  });

  const result: PracticeAttemptSyncResult = {
    ...EMPTY_RESULT,
    skippedEntries: skipped.length,
    errors: [],
  };

  for (const plan of plans) {
    try {
      const { answers } = await insertPlan(supabase, plan);
      result.syncedAttempts += 1;
      result.syncedAnswers += answers;
      result.unresolvedQuestions += plan.unresolvedQuestionKeys.length;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return result;
}
