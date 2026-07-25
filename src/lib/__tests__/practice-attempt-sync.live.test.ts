/**
 * Live write test against the real Supabase project.
 *
 * Skipped unless RUN_LIVE_SUPABASE_TESTS=1. Uses a throwaway anonymous user, so it
 * only ever creates rows owned by that user and never touches anyone else's data.
 *
 *   RUN_LIVE_SUPABASE_TESTS=1 npx vitest run src/lib/__tests__/practice-attempt-sync.live.test.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { syncPracticeAttempts } from '../practice-attempt-remote';
import { getSamplePracticeUnits } from '../practice-session-samples';
import type { PracticeSessionHistoryEntry } from '../practice-session-history';

const LIVE = process.env.RUN_LIVE_SUPABASE_TESTS === '1';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

describe.skipIf(!LIVE || !url || !anonKey)('practice attempt sync (live)', () => {
  let supabase: SupabaseClient;
  let userId: string;
  const stamp = Date.now();

  const reading = () => getSamplePracticeUnits().find((unit) => unit.skill === 'reading')!;

  function entry(overrides: Partial<PracticeSessionHistoryEntry> = {}): PracticeSessionHistoryEntry {
    const unit = reading();
    return {
      id: `${unit.id}:${stamp}`,
      unitId: unit.id,
      slug: unit.slug,
      title: unit.title,
      skill: unit.skill,
      mode: unit.mode,
      difficulty: unit.difficulty,
      recordedAt: stamp,
      elapsedSeconds: 240,
      answered: 5,
      total: 5,
      correct: 3,
      incorrect: 1,
      skipped: 1,
      manualReview: 0,
      objectiveTotal: 5,
      accuracy: 60,
      completionPercent: 80,
      selfRatedBand: null,
      answers: unit.questions.map((question, index) => ({
        questionId: question.id,
        questionNumber: question.question_number,
        questionType: question.question_type,
        prompt: question.question_text.slice(0, 60),
        outcome: index === 3 ? 'incorrect' : index === 4 ? 'skipped' : 'correct',
        userAnswer: index === 4 ? '' : `answer-${index}`,
        correctAnswer: question.answer_key.answers[0] ?? '',
      })),
      ...overrides,
    };
  }

  beforeAll(async () => {
    supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error(`anonymous sign-in failed: ${error.message}`);
    userId = data.user!.id;
  });

  afterAll(async () => {
    // practice_attempts intentionally has no delete policy — a client must not be able
    // to erase its own graded history — so this cleanup cannot succeed from the test's
    // anonymous session. Say so loudly instead of pretending the rows are gone.
    const { count } = await supabase
      .from('practice_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (count) {
      console.warn(
        `[live test] left ${count} attempt row(s) for anonymous user ${userId}. ` +
          'RLS forbids client deletes by design; remove with the service role if desired.'
      );
    }

    await supabase.auth.signOut();
  });

  it('writes an attempt with its per-question answers', async () => {
    const result = await syncPracticeAttempts({ supabase, entries: [entry()] });

    expect(result.errors).toEqual([]);
    expect(result.syncedAttempts).toBe(1);
    expect(result.syncedAnswers).toBe(5);
    expect(result.unresolvedQuestions).toBe(0);
    expect(result.skippedEntries).toBe(0);
  });

  it('persists the outcome and lets the DB derive is_correct', async () => {
    const { data: attempts } = await supabase
      .from('practice_attempts')
      .select('id,client_attempt_id,elapsed_seconds,score,correct_count,completion_percent')
      .eq('user_id', userId);

    expect(attempts).toHaveLength(1);
    expect(attempts![0]).toMatchObject({
      client_attempt_id: `${reading().id}:${stamp}`,
      elapsed_seconds: 240,
      score: 60,
      correct_count: 3,
      completion_percent: 80,
    });

    const { data: answers } = await supabase
      .from('practice_answers')
      .select('outcome,is_correct,question_number,user_answer')
      .eq('attempt_id', attempts![0].id)
      .order('question_number');

    expect(answers).toHaveLength(5);
    const byOutcome = (outcome: string) => answers!.filter((row) => row.outcome === outcome);
    expect(byOutcome('correct')).toHaveLength(3);
    expect(byOutcome('incorrect')).toHaveLength(1);
    expect(byOutcome('skipped')).toHaveLength(1);

    // is_correct is a generated column: true/false for graded, null otherwise.
    expect(byOutcome('correct').every((row) => row.is_correct === true)).toBe(true);
    expect(byOutcome('incorrect').every((row) => row.is_correct === false)).toBe(true);
    expect(byOutcome('skipped').every((row) => row.is_correct === null)).toBe(true);
    expect(byOutcome('skipped')[0].user_answer).toBeNull();
  });

  it('is idempotent — re-syncing the same history creates nothing new', async () => {
    const result = await syncPracticeAttempts({ supabase, entries: [entry()] });

    expect(result.errors).toEqual([]);
    expect(result.syncedAttempts).toBe(0);

    const { count } = await supabase
      .from('practice_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    expect(count).toBe(1);
  });

  it('forbids a client from deleting its own graded attempts (no delete policy)', async () => {
    const before = await supabase
      .from('practice_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    await supabase.from('practice_attempts').delete().eq('user_id', userId);

    const after = await supabase
      .from('practice_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    expect(before.count).toBeGreaterThan(0);
    expect(after.count).toBe(before.count);
  });

  it('cannot write content tables from a client session', async () => {
    const { error } = await supabase
      .from('practice_units')
      .insert({ slug: `rogue-${stamp}`, skill: 'reading', mode: 'basic', title: 'Rogue', difficulty: 'easy', material_type: 'none' });

    expect(error).not.toBeNull();
  });

  it('skips entries whose unit is not seeded in the database', async () => {
    const result = await syncPracticeAttempts({
      supabase,
      entries: [entry({ id: `ghost:${stamp}`, slug: 'definitely-not-seeded' })],
    });

    expect(result.syncedAttempts).toBe(0);
    expect(result.skippedEntries).toBe(1);
    expect(result.errors).toEqual([]);
  });
});
