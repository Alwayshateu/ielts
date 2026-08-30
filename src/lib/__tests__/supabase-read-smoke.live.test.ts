/**
 * Live smoke test against the real Supabase project.
 *
 * Skipped unless RUN_LIVE_SUPABASE_TESTS=1, so `npm test` stays offline and
 * deterministic. Read-only: it never writes, and it verifies both that RLS lets a
 * signed-in-equivalent read through and that the row mapper produces the same
 * units the local samples describe.
 *
 *   RUN_LIVE_SUPABASE_TESTS=1 npx vitest run src/lib/__tests__/supabase-read-smoke.live.test.ts
 */
import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSupabasePracticeUnitRepository } from '../practice-units';
import { getSamplePracticeUnits } from '../practice-session-samples';

const LIVE = process.env.RUN_LIVE_SUPABASE_TESTS === '1';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

describe.skipIf(!LIVE || !url || !anonKey)('supabase practice read path (live)', () => {
  // Content policies are `to authenticated`, so an unauthenticated client correctly
  // sees zero rows. Every practice page is auth-gated, so a signed-in session is the
  // realistic client. Anonymous sign-in gives us exactly that role.
  // Built in beforeAll, not at describe time: describe bodies run even when skipped,
  // and createClient throws on the empty url present in offline runs.
  let client: ReturnType<typeof createClient>;
  let repository: ReturnType<typeof createSupabasePracticeUnitRepository>;

  beforeAll(async () => {
    client = createClient(url, anonKey);
    const { error } = await client.auth.signInAnonymously();
    if (error) throw new Error(`anonymous sign-in failed: ${error.message}`);
    repository = createSupabasePracticeUnitRepository(client);
  });

  afterAll(async () => {
    await client?.auth.signOut();
  });

  it('hides content from unauthenticated clients (RLS is on)', async () => {
    const guest = createSupabasePracticeUnitRepository(createClient(url, anonKey));
    await expect(guest.list()).resolves.toEqual([]);
  });

  it('lists every seeded unit with its questions attached', async () => {
    const units = await repository.list();
    const samples = getSamplePracticeUnits();

    expect(units.length).toBeGreaterThanOrEqual(samples.length);

    for (const sample of samples) {
      const remote = units.find((unit) => unit.slug === sample.slug);
      expect(remote, `unit ${sample.slug} missing from Supabase`).toBeDefined();
      expect(remote!.questions).toHaveLength(sample.questions.length);
      expect(remote!.skill).toBe(sample.skill);
      expect(remote!.material_type).toBe(sample.material_type);
    }
  });

  it('resolves a unit by slug with ordered questions and intact answer keys', async () => {
    const sample = getSamplePracticeUnits().find((unit) => unit.skill === 'reading')!;
    const remote = await repository.get(sample.slug);

    expect(remote).not.toBeNull();
    expect(remote!.title).toBe(sample.title);
    expect(remote!.passage_text).toBe(sample.passage_text);
    expect(remote!.questions.map((question) => question.question_number)).toEqual(
      sample.questions.map((question) => question.question_number)
    );
    expect(remote!.questions.map((question) => question.answer_key.answers)).toEqual(
      sample.questions.map((question) => question.answer_key.answers)
    );
  });

  it('preserves listening transcript cues through jsonb round-tripping', async () => {
    const sample = getSamplePracticeUnits().find((unit) => unit.skill === 'listening')!;
    const remote = await repository.get(sample.slug);

    expect(remote!.audio_url).toBe(sample.audio_url);
    const remoteCues = remote!.metadata?.transcriptCues as { start: number; text: string }[];
    const sampleCues = sample.metadata?.transcriptCues as { start: number; text: string }[];

    expect(remoteCues).toHaveLength(sampleCues.length);
    expect(remoteCues.map((cue) => cue.start)).toEqual(sampleCues.map((cue) => cue.start));
    expect(remoteCues.map((cue) => cue.text)).toEqual(sampleCues.map((cue) => cue.text));
  });

  it('returns null for an unknown slug rather than throwing', async () => {
    await expect(repository.get('definitely-not-a-real-unit-slug')).resolves.toBeNull();
  });
});
