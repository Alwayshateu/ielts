/**
 * Live test for the shared wrong book / favorites across both question models.
 *
 * Skipped unless RUN_LIVE_SUPABASE_TESTS=1. Uses a throwaway anonymous user; both
 * tables allow owner deletes, so everything created here is removed in afterAll.
 *
 *   RUN_LIVE_SUPABASE_TESTS=1 npx vitest run src/lib/__tests__/practice-collections.live.test.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  getCollectionItems,
  readSavedPracticeQuestionIds,
  removePracticeQuestionFromCollection,
  resolvePracticeQuestionDbIds,
  savePracticeQuestionToCollection,
} from '../question-collections';
import { getSamplePracticeUnits } from '../practice-session-samples';

const LIVE = process.env.RUN_LIVE_SUPABASE_TESTS === '1';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

describe.skipIf(!LIVE || !url || !anonKey)('practice collections (live)', () => {
  let supabase: SupabaseClient;
  let userId: string;
  let dbIds: Map<string, string>;

  const readingUnit = () => getSamplePracticeUnits().find((unit) => unit.skill === 'reading')!;
  const localIds = () => readingUnit().questions.map((question) => question.id);

  beforeAll(async () => {
    // getCollectionItems consults the env flag at call time.
    process.env.NEXT_PUBLIC_PRACTICE_COLLECTION_LINK = 'on';

    supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error(`anonymous sign-in failed: ${error.message}`);
    userId = data.user!.id;

    dbIds = await resolvePracticeQuestionDbIds(supabase, localIds());
  });

  afterAll(async () => {
    await supabase.from('wrong_book').delete().eq('user_id', userId);
    await supabase.from('favorites').delete().eq('user_id', userId);
    await supabase.auth.signOut();
  });

  it('resolves local slugs to seeded practice question uuids', () => {
    expect(dbIds.size).toBe(localIds().length);
    for (const [localId, dbId] of dbIds) {
      expect(localId).toMatch(/^green-roofs-q\d$/);
      expect(dbId).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('saves a missed question to the wrong book idempotently', async () => {
    const dbId = dbIds.get('green-roofs-q1')!;

    const first = await savePracticeQuestionToCollection({
      supabase,
      table: 'wrong_book',
      userId,
      practiceQuestionId: dbId,
    });
    const second = await savePracticeQuestionToCollection({
      supabase,
      table: 'wrong_book',
      userId,
      practiceQuestionId: dbId,
    });

    expect(first).toBeNull();
    expect(second).toBeNull();

    const { count } = await supabase
      .from('wrong_book')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    expect(count).toBe(1);
  });

  it('reads the practice entry back as a merged collection item', async () => {
    const { items, error, partialError } = await getCollectionItems(supabase, 'wrong_book', userId);

    expect(error).toBeNull();
    expect(partialError).toBeNull();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source: 'practice',
      category: 'reading',
      unitTitle: readingUnit().title,
      href: `/practice/session/${readingUnit().slug}`,
    });
    expect(items[0].questionText.length).toBeGreaterThan(0);
    expect(items[0].answer.length).toBeGreaterThan(0);
  });

  it('tracks favorites saved state for the session view', async () => {
    const dbId = dbIds.get('green-roofs-q2')!;

    await savePracticeQuestionToCollection({
      supabase,
      table: 'favorites',
      userId,
      practiceQuestionId: dbId,
    });

    const saved = await readSavedPracticeQuestionIds({
      supabase,
      table: 'favorites',
      userId,
      practiceQuestionIds: [...dbIds.values()],
    });

    expect(saved.has(dbId)).toBe(true);
    expect(saved.size).toBe(1);
  });

  it('removes by question id', async () => {
    const dbId = dbIds.get('green-roofs-q2')!;

    const error = await removePracticeQuestionFromCollection({
      supabase,
      table: 'favorites',
      userId,
      practiceQuestionId: dbId,
    });
    expect(error).toBeNull();

    const saved = await readSavedPracticeQuestionIds({
      supabase,
      table: 'favorites',
      userId,
      practiceQuestionIds: [dbId],
    });
    expect(saved.size).toBe(0);
  });

  it('cannot write a collection row for another user (RLS)', async () => {
    const { error } = await supabase.from('wrong_book').insert({
      user_id: '00000000-0000-4000-8000-000000000000',
      practice_question_id: dbIds.get('green-roofs-q3')!,
      question_id: null,
    });

    expect(error).not.toBeNull();
  });
});
