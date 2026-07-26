/**
 * Live test for reading-annotation cloud sync (practice_annotations).
 *
 * Skipped unless RUN_LIVE_SUPABASE_TESTS=1. Uses throwaway anonymous users;
 * practice_annotations allows owner deletes, so everything created here is removed
 * in afterAll. Generous timeouts because each sync/load is several sequential
 * round trips (getUser → resolve unit → delete/insert or select).
 *
 *   RUN_LIVE_SUPABASE_TESTS=1 npx vitest run src/lib/__tests__/practice-annotations.live.test.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  loadPracticeUnitAnnotations,
  syncPracticeUnitAnnotations,
} from '../practice-annotation-remote';
import { annotationsSignature } from '../practice-annotation-sync';
import { getSamplePracticeUnits } from '../practice-session-samples';
import type { PassageAnnotation } from '../types';

const LIVE = process.env.RUN_LIVE_SUPABASE_TESTS === '1';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const T = 20000;

const readingUnit = () => getSamplePracticeUnits().find((unit) => unit.skill === 'reading')!;
const unitSlug = () => readingUnit().slug;

const firstSet = (): PassageAnnotation[] => [
  { id: 'live-h1', paragraphIndex: 0, startOffset: 0, endOffset: 5, text: 'Green', kind: 'highlight', note: null },
  { id: 'live-n1', paragraphIndex: 1, startOffset: 2, endOffset: 8, text: 'carbon', kind: 'note', note: 'define this' },
];

describe.skipIf(!LIVE || !url || !anonKey)('practice annotations sync (live)', () => {
  let supabase: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    supabase = createClient(url, anonKey);
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw new Error(`anonymous sign-in failed: ${error.message}`);
    userId = data.user!.id;
  }, T);

  afterAll(async () => {
    await supabase.from('practice_annotations').delete().eq('user_id', userId);
    await supabase.auth.signOut();
  }, T);

  it('round-trips a set of annotations through the database', async () => {
    const result = await syncPracticeUnitAnnotations({ supabase, unitSlug: unitSlug(), annotations: firstSet() });
    expect(result.error).toBeNull();
    expect(result.pushed).toBe(2);

    const { annotations, error } = await loadPracticeUnitAnnotations({ supabase, unitSlug: unitSlug() });
    expect(error).toBeNull();
    expect(annotationsSignature(annotations)).toBe(annotationsSignature(firstSet()));
    // client ids survive the round trip via metadata
    expect(annotations.map((a) => a.id).sort()).toEqual(['live-h1', 'live-n1']);
  }, T);

  it('replace-all keeps only the latest set (delete + insert, idempotent)', async () => {
    const nextSet: PassageAnnotation[] = [
      { id: 'live-h2', paragraphIndex: 3, startOffset: 1, endOffset: 6, text: 'roofs', kind: 'highlight', note: null },
    ];

    const result = await syncPracticeUnitAnnotations({ supabase, unitSlug: unitSlug(), annotations: nextSet });
    expect(result.error).toBeNull();
    expect(result.pushed).toBe(1);

    const { annotations } = await loadPracticeUnitAnnotations({ supabase, unitSlug: unitSlug() });
    expect(annotations).toHaveLength(1);
    expect(annotations[0].id).toBe('live-h2');
  }, T);

  it('re-running the same set makes no duplicates', async () => {
    const set = firstSet();
    await syncPracticeUnitAnnotations({ supabase, unitSlug: unitSlug(), annotations: set });
    await syncPracticeUnitAnnotations({ supabase, unitSlug: unitSlug(), annotations: set });

    const { annotations } = await loadPracticeUnitAnnotations({ supabase, unitSlug: unitSlug() });
    expect(annotations).toHaveLength(2);
  }, T);

  it('clears all annotations when syncing an empty set', async () => {
    const result = await syncPracticeUnitAnnotations({ supabase, unitSlug: unitSlug(), annotations: [] });
    expect(result.error).toBeNull();
    expect(result.cleared).toBe(true);

    const { annotations } = await loadPracticeUnitAnnotations({ supabase, unitSlug: unitSlug() });
    expect(annotations).toHaveLength(0);
  }, T);

  it('skips unknown units instead of guessing a target', async () => {
    const result = await syncPracticeUnitAnnotations({
      supabase,
      unitSlug: 'does-not-exist-000',
      annotations: firstSet(),
    });
    expect(result.error).toBeNull();
    expect(result.pushed).toBe(0);
    expect(result.cleared).toBe(false);
  }, T);

  it('hides one user’s annotations from another (RLS)', async () => {
    await syncPracticeUnitAnnotations({ supabase, unitSlug: unitSlug(), annotations: firstSet() });

    const other = createClient(url, anonKey);
    const { error: signInError } = await other.auth.signInAnonymously();
    if (signInError) throw new Error(`second sign-in failed: ${signInError.message}`);

    // Even asking for the first user's rows by id returns nothing under RLS.
    const { data, error } = await other
      .from('practice_annotations')
      .select('id')
      .eq('user_id', userId);
    expect(error).toBeNull();
    expect(data ?? []).toHaveLength(0);

    // And the loader sees only the caller's own (empty) set.
    const own = await loadPracticeUnitAnnotations({ supabase: other, unitSlug: unitSlug() });
    expect(own.annotations).toHaveLength(0);

    await other.auth.signOut();
  }, T);
});
