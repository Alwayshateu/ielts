import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getCollectionItems,
  isPracticeCollectionLinkEnabled,
  readSavedPracticeQuestionIds,
  removeCollectionItem,
  removePracticeQuestionFromCollection,
  resolvePracticeQuestionDbIds,
  savePracticeQuestionToCollection,
} from '../question-collections';
import { createSupabaseMock, type QueryContext } from './supabase-mock';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isPracticeCollectionLinkEnabled', () => {
  it('is on only for the exact string "on"', () => {
    expect(isPracticeCollectionLinkEnabled('on')).toBe(true);
    expect(isPracticeCollectionLinkEnabled('off')).toBe(false);
    expect(isPracticeCollectionLinkEnabled('ON')).toBe(false);
    expect(isPracticeCollectionLinkEnabled(undefined)).toBe(false);
  });
});

describe('resolvePracticeQuestionDbIds', () => {
  it('passes uuids through untouched and never hits the DB when there are no external keys', async () => {
    const { client, calls } = createSupabaseMock(() => ({ data: [] }));

    const map = await resolvePracticeQuestionDbIds(client, [UUID_A, UUID_B]);

    expect(map.get(UUID_A)).toBe(UUID_A);
    expect(map.get(UUID_B)).toBe(UUID_B);
    expect(calls).toHaveLength(0);
  });

  it('resolves authored slugs via external_key and omits ids with no row', async () => {
    const { client, calls } = createSupabaseMock((ctx) => {
      if (ctx.table === 'practice_questions') {
        return { data: [{ id: UUID_A, external_key: 'green-roofs-q1' }] };
      }
      return { data: [] };
    });

    const map = await resolvePracticeQuestionDbIds(client, [
      'green-roofs-q1',
      'green-roofs-q2', // no DB row -> absent
      UUID_B, // uuid passes through
      '', // empty -> skipped
    ]);

    expect(map.get('green-roofs-q1')).toBe(UUID_A);
    expect(map.has('green-roofs-q2')).toBe(false);
    expect(map.get(UUID_B)).toBe(UUID_B);
    expect(map.has('')).toBe(false);
    // Only the external keys are looked up, not the uuid or empty string.
    const lookup = calls.find((c) => c.table === 'practice_questions');
    expect(lookup?.args.in).toEqual(['external_key', ['green-roofs-q1', 'green-roofs-q2']]);
  });
});

describe('savePracticeQuestionToCollection', () => {
  it('writes the practice question id with a null legacy id and returns no error on success', async () => {
    const { client, calls } = createSupabaseMock(() => ({ error: null }));

    const error = await savePracticeQuestionToCollection({
      supabase: client,
      table: 'wrong_book',
      userId: 'user-1',
      practiceQuestionId: UUID_A,
    });

    expect(error).toBeNull();
    const insert = calls.find((c: QueryContext) => c.op === 'insert');
    expect(insert?.payload).toEqual({
      user_id: 'user-1',
      practice_question_id: UUID_A,
      question_id: null,
    });
  });

  it('treats a 23505 unique violation as already-saved (idempotent)', async () => {
    const { client } = createSupabaseMock(() => ({ error: { code: '23505', message: 'dup' } }));

    const error = await savePracticeQuestionToCollection({
      supabase: client,
      table: 'favorites',
      userId: 'user-1',
      practiceQuestionId: UUID_A,
    });

    expect(error).toBeNull();
  });

  it('surfaces other insert errors', async () => {
    const { client } = createSupabaseMock(() => ({ error: { code: '42501', message: 'denied' } }));

    const error = await savePracticeQuestionToCollection({
      supabase: client,
      table: 'favorites',
      userId: 'user-1',
      practiceQuestionId: UUID_A,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe('denied');
  });
});

describe('remove helpers', () => {
  it('removeCollectionItem maps a delete error to an Error and success to null', async () => {
    const ok = createSupabaseMock(() => ({ error: null }));
    expect(await removeCollectionItem(ok.client, 'favorites', 'row-1')).toBeNull();

    const bad = createSupabaseMock(() => ({ error: { message: 'nope' } }));
    const err = await removeCollectionItem(bad.client, 'favorites', 'row-1');
    expect(err?.message).toBe('nope');
  });

  it('removePracticeQuestionFromCollection filters by user and practice question', async () => {
    const { client, calls } = createSupabaseMock(() => ({ error: null }));

    const error = await removePracticeQuestionFromCollection({
      supabase: client,
      table: 'wrong_book',
      userId: 'user-1',
      practiceQuestionId: UUID_A,
    });

    expect(error).toBeNull();
    const del = calls.find((c) => c.op === 'delete');
    expect(del?.args.eq).toEqual(['practice_question_id', UUID_A]); // last eq wins in the stub
  });
});

describe('readSavedPracticeQuestionIds', () => {
  it('short-circuits to an empty set without querying when given no ids', async () => {
    const { client, calls } = createSupabaseMock(() => ({ data: [] }));

    const saved = await readSavedPracticeQuestionIds({
      supabase: client,
      table: 'favorites',
      userId: 'user-1',
      practiceQuestionIds: [],
    });

    expect(saved.size).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('returns the set of saved ids, and an empty set on error', async () => {
    const hit = createSupabaseMock(() => ({
      data: [{ practice_question_id: UUID_A }, { practice_question_id: UUID_B }],
    }));
    const saved = await readSavedPracticeQuestionIds({
      supabase: hit.client,
      table: 'favorites',
      userId: 'user-1',
      practiceQuestionIds: [UUID_A, UUID_B],
    });
    expect([...saved].sort()).toEqual([UUID_A, UUID_B]);

    const broke = createSupabaseMock(() => ({ error: { message: 'boom' } }));
    const none = await readSavedPracticeQuestionIds({
      supabase: broke.client,
      table: 'favorites',
      userId: 'user-1',
      practiceQuestionIds: [UUID_A],
    });
    expect(none.size).toBe(0);
  });
});

describe('getCollectionItems', () => {
  it('propagates a legacy-read failure and stops before the practice half', async () => {
    vi.stubEnv('NEXT_PUBLIC_PRACTICE_COLLECTION_LINK', 'on');
    const { client, calls } = createSupabaseMock((ctx) => {
      if (ctx.table === 'favorites') return { error: { message: 'legacy down' } };
      return { data: [] };
    });

    const result = await getCollectionItems(client, 'favorites', 'user-1');

    expect(result.error?.message).toBe('legacy down');
    expect(result.items).toEqual([]);
    expect(result.partialError).toBeNull();
    // No practice join attempted after the legacy failure.
    expect(calls.every((c) => !String(c.args.select ?? '').includes('practice_questions'))).toBe(true);
  });

  it('returns legacy items only and skips the practice half when the link flag is off', async () => {
    vi.stubEnv('NEXT_PUBLIC_PRACTICE_COLLECTION_LINK', 'off');
    const { client, calls } = createSupabaseMock(() => ({ data: [] }));

    const result = await getCollectionItems(client, 'wrong_book', 'user-1');

    expect(result.items).toEqual([]);
    expect(result.partialError).toBeNull();
    expect(calls.some((c) => String(c.args.select ?? '').includes('practice_questions'))).toBe(false);
  });

  it('surfaces a practice-half failure as a non-fatal partialError when the flag is on', async () => {
    vi.stubEnv('NEXT_PUBLIC_PRACTICE_COLLECTION_LINK', 'on');
    const { client } = createSupabaseMock((ctx) => {
      if (ctx.table === 'wrong_book' && String(ctx.args.select ?? '').includes('practice_questions')) {
        return { error: { message: 'practice down' } };
      }
      return { data: [] }; // legacy read is empty and fine
    });

    const result = await getCollectionItems(client, 'wrong_book', 'user-1');

    expect(result.error).toBeNull();
    expect(result.items).toEqual([]);
    expect(result.partialError?.message).toBe('practice down');
  });
});
