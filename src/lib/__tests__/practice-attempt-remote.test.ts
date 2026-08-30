import { describe, expect, it } from 'vitest';

import { isPracticeAttemptSyncEnabled, syncPracticeAttempts } from '../practice-attempt-remote';
import type {
  PracticeAttemptAnswer,
  PracticeAttemptOutcome,
  PracticeSessionHistoryEntry,
} from '../practice-session-history';
import { createSupabaseMock, type QueryContext } from './supabase-mock';

const SLUG = 'unit-1-slug';
const UNIT_UUID = '11111111-1111-4111-8111-111111111111';
const Q1_UUID = '22222222-2222-4222-8222-222222222222';
const Q2_UUID = '33333333-3333-4333-8333-333333333333';
const USER_ID = '44444444-4444-4444-8444-444444444444';

function answer(
  questionId: string,
  questionNumber: number,
  outcome: PracticeAttemptOutcome,
  overrides: Partial<PracticeAttemptAnswer> = {}
): PracticeAttemptAnswer {
  return {
    questionId,
    questionNumber,
    questionType: 'short_answer',
    prompt: `Question ${questionNumber}`,
    outcome,
    userAnswer: outcome === 'skipped' ? '' : 'mine',
    correctAnswer: 'theirs',
    ...overrides,
  };
}

function entry(overrides: Partial<PracticeSessionHistoryEntry> = {}): PracticeSessionHistoryEntry {
  return {
    id: 'unit-1:1700000000000',
    unitId: 'unit-1',
    slug: SLUG,
    title: 'Urban Green Roofs',
    skill: 'reading',
    mode: 'progressive',
    difficulty: 'medium',
    recordedAt: 1_700_000_000_000,
    elapsedSeconds: 120,
    answered: 2,
    total: 2,
    correct: 1,
    incorrect: 1,
    skipped: 0,
    manualReview: 0,
    objectiveTotal: 2,
    accuracy: 50,
    completionPercent: 100,
    selfRatedBand: null,
    ...overrides,
  };
}

type ClientOptions = {
  user?: { id: string } | null;
  userError?: unknown;
  remoteAttemptIds?: string[];
  remoteError?: unknown;
  units?: Array<{ id: string; slug: string }>;
  unitsError?: unknown;
  questions?: Array<{ id: string; unit_id: string; external_key: string | null }>;
  questionsError?: unknown;
  attemptId?: string | null;
  attemptError?: unknown;
  answersError?: unknown;
  /** Fail the attempt upsert whose client_attempt_id equals this, leaving others intact. */
  failAttemptId?: string;
};

function makeClient(opts: ClientOptions = {}) {
  const units = opts.units ?? [{ id: UNIT_UUID, slug: SLUG }];
  const questions =
    opts.questions ??
    [
      { id: Q1_UUID, unit_id: UNIT_UUID, external_key: 'q1' },
      { id: Q2_UUID, unit_id: UNIT_UUID, external_key: 'q2' },
    ];

  const resolve = (ctx: QueryContext) => {
    if (ctx.table === 'practice_attempts') {
      if (ctx.op === 'upsert') {
        const cid = (ctx.payload as { client_attempt_id?: string })?.client_attempt_id;
        if (opts.failAttemptId && cid === opts.failAttemptId) return { error: { message: 'db down' } };
        if (opts.attemptError) return { error: opts.attemptError };
        if (opts.attemptId === null) return {}; // simulate no id returned
        return { data: { id: opts.attemptId ?? 'attempt-uuid' } };
      }
      if (opts.remoteError) return { error: opts.remoteError };
      return { data: (opts.remoteAttemptIds ?? []).map((id) => ({ client_attempt_id: id })) };
    }
    if (ctx.table === 'practice_units') {
      if (opts.unitsError) return { error: opts.unitsError };
      return { data: units };
    }
    if (ctx.table === 'practice_questions') {
      if (opts.questionsError) return { error: opts.questionsError };
      return { data: questions };
    }
    if (ctx.table === 'practice_answers') {
      if (opts.answersError) return { error: opts.answersError };
      return { error: null };
    }
    return { data: [] };
  };

  return createSupabaseMock(resolve, {
    authUser: opts.user === undefined ? { id: USER_ID } : opts.user,
    authError: opts.userError,
  });
}

describe('isPracticeAttemptSyncEnabled', () => {
  it('is on only for the exact string "on"', () => {
    expect(isPracticeAttemptSyncEnabled('on')).toBe(true);
    expect(isPracticeAttemptSyncEnabled('off')).toBe(false);
    expect(isPracticeAttemptSyncEnabled('ON')).toBe(false);
    expect(isPracticeAttemptSyncEnabled(undefined)).toBe(false);
  });
});

describe('syncPracticeAttempts', () => {
  it('does nothing (and never touches the network) for no entries', async () => {
    const { client, calls } = makeClient();
    const result = await syncPracticeAttempts({ supabase: client, entries: [] });

    expect(result).toEqual({
      syncedAttempts: 0,
      syncedAnswers: 0,
      skippedEntries: 0,
      unresolvedQuestions: 0,
      errors: [],
    });
    expect(calls).toHaveLength(0);
  });

  it('reports "not signed in" and writes nothing when there is no user', async () => {
    const { client, calls } = makeClient({ user: null });
    const result = await syncPracticeAttempts({
      supabase: client,
      entries: [entry({ answers: [answer('q1', 1, 'correct')] })],
    });

    expect(result.errors).toEqual(['not signed in']);
    expect(result.syncedAttempts).toBe(0);
    expect(calls).toHaveLength(0); // bailed right after auth, before any table read/write
  });

  it('treats an auth error the same as being signed out', async () => {
    const { client } = makeClient({ user: null, userError: { message: 'session expired' } });
    const result = await syncPracticeAttempts({
      supabase: client,
      entries: [entry()],
    });

    expect(result.errors).toEqual(['not signed in']);
  });

  it('returns a non-fatal error when the existing-attempts read fails', async () => {
    const { client, calls } = makeClient({ remoteError: { message: 'timeout' } });
    const result = await syncPracticeAttempts({
      supabase: client,
      entries: [entry()],
    });

    expect(result.errors).toEqual(['read existing attempts: timeout']);
    expect(result.syncedAttempts).toBe(0);
    // Never advanced to any upsert.
    expect(calls.some((c) => c.op === 'upsert')).toBe(false);
  });

  it('skips entries that are already synced remotely (idempotent)', async () => {
    const { client, calls } = makeClient({ remoteAttemptIds: ['unit-1:1700000000000'] });
    const result = await syncPracticeAttempts({
      supabase: client,
      entries: [entry({ id: 'unit-1:1700000000000' })],
    });

    expect(result.syncedAttempts).toBe(0);
    expect(result.errors).toEqual([]);
    // Read happened, but no attempt was written since it was already remote.
    expect(calls.some((c) => c.table === 'practice_attempts' && c.op === 'upsert')).toBe(false);
  });

  it('upserts an attempt and its answers with the right conflict targets', async () => {
    const { client, calls } = makeClient();
    const result = await syncPracticeAttempts({
      supabase: client,
      entries: [entry({ answers: [answer('q1', 1, 'correct'), answer('q2', 2, 'incorrect')] })],
    });

    expect(result).toEqual({
      syncedAttempts: 1,
      syncedAnswers: 2,
      skippedEntries: 0,
      unresolvedQuestions: 0,
      errors: [],
    });

    const attemptUpsert = calls.find((c) => c.table === 'practice_attempts' && c.op === 'upsert');
    expect(attemptUpsert?.args.onConflict).toBe('user_id,client_attempt_id');
    expect(attemptUpsert?.payload).toMatchObject({
      user_id: USER_ID,
      unit_id: UNIT_UUID,
      client_attempt_id: 'unit-1:1700000000000',
    });

    const answersUpsert = calls.find((c) => c.table === 'practice_answers' && c.op === 'upsert');
    expect(answersUpsert?.args.onConflict).toBe('attempt_id,question_id');
    // Every answer row is stitched to the id the attempt upsert returned.
    expect(answersUpsert?.payload).toEqual([
      expect.objectContaining({ attempt_id: 'attempt-uuid', question_id: Q1_UUID, question_number: 1 }),
      expect.objectContaining({ attempt_id: 'attempt-uuid', question_id: Q2_UUID, question_number: 2 }),
    ]);
  });

  it('counts unresolved questions without dropping the attempt', async () => {
    const { client } = makeClient();
    const result = await syncPracticeAttempts({
      supabase: client,
      entries: [entry({ answers: [answer('q1', 1, 'correct'), answer('ghost-q', 2, 'incorrect')] })],
    });

    expect(result.syncedAttempts).toBe(1);
    expect(result.syncedAnswers).toBe(1); // only q1 resolved
    expect(result.unresolvedQuestions).toBe(1); // ghost-q had no db row
    expect(result.errors).toEqual([]);
  });

  it('records an error but keeps going when an attempt upsert returns no id', async () => {
    const { client } = makeClient({ attemptId: null });
    const result = await syncPracticeAttempts({
      supabase: client,
      entries: [entry()],
    });

    expect(result.syncedAttempts).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('no id returned');
  });

  it('isolates a failing attempt so the others still sync', async () => {
    const { client } = makeClient({ failAttemptId: 'unit-1:bad' });
    const result = await syncPracticeAttempts({
      supabase: client,
      entries: [
        entry({ id: 'unit-1:bad', answers: [answer('q1', 1, 'correct')] }),
        entry({ id: 'unit-1:good', answers: [answer('q2', 2, 'correct')] }),
      ],
    });

    expect(result.syncedAttempts).toBe(1); // the good one went through
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('insert attempt unit-1:bad');
  });

  it('propagates a unit-lookup failure as a thrown error (not a soft result)', async () => {
    const { client } = makeClient({ unitsError: { message: 'relation missing' } });

    await expect(
      syncPracticeAttempts({ supabase: client, entries: [entry()] })
    ).rejects.toThrow('read units: relation missing');
  });
});
