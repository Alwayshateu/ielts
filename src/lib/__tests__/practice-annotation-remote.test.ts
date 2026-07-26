import { describe, expect, it } from 'vitest';

import {
  loadPracticeUnitAnnotations,
  syncPracticeUnitAnnotations,
} from '../practice-annotation-remote';
import type { PassageAnnotation } from '../types';
import { createSupabaseMock, type QueryContext } from './supabase-mock';

const USER_ID = '44444444-4444-4444-8444-444444444444';
const UNIT_UUID = '11111111-1111-4111-8111-111111111111';
const SLUG = 'unit-1-slug';

function annotation(overrides: Partial<PassageAnnotation> = {}): PassageAnnotation {
  return {
    id: 'p0-1-Green roofs',
    paragraphIndex: 0,
    startOffset: 4,
    endOffset: 14,
    text: 'Green roofs',
    kind: 'highlight',
    note: null,
    ...overrides,
  };
}

// A DB row shaped for mapRemoteAnnotationRow; end_offset === start_offset makes it invalid.
function remoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    paragraph_index: 2,
    start_offset: 3,
    end_offset: 9,
    selected_text: 'carbon',
    kind: 'note',
    note: 'key term',
    metadata: { client_annotation_id: 'p2-carbon' },
    ...overrides,
  };
}

type ClientOptions = {
  user?: { id: string } | null;
  unitId?: string | null;
  unitError?: unknown;
  loadRows?: unknown[];
  loadError?: unknown;
  deleteError?: unknown;
  insertError?: unknown;
};

function makeClient(opts: ClientOptions = {}) {
  const resolve = (ctx: QueryContext) => {
    if (ctx.table === 'practice_units') {
      if (opts.unitError) return { error: opts.unitError };
      if (opts.unitId === null) return { data: null }; // unit not seeded
      return { data: { id: opts.unitId ?? UNIT_UUID } };
    }
    if (ctx.table === 'practice_annotations') {
      if (ctx.op === 'delete') return { error: opts.deleteError ?? null };
      if (ctx.op === 'insert') return { error: opts.insertError ?? null };
      if (opts.loadError) return { error: opts.loadError };
      return { data: opts.loadRows ?? [] };
    }
    return { data: [] };
  };

  return createSupabaseMock(resolve, {
    authUser: opts.user === undefined ? { id: USER_ID } : opts.user,
  });
}

describe('loadPracticeUnitAnnotations', () => {
  it('returns "not signed in" and hits no table when there is no user', async () => {
    const { client, calls } = makeClient({ user: null });
    const result = await loadPracticeUnitAnnotations({ supabase: client, unitSlug: SLUG });

    expect(result).toEqual({ annotations: [], error: 'not signed in' });
    expect(calls).toHaveLength(0);
  });

  it('surfaces a unit-resolution failure as a soft error, never throwing', async () => {
    const { client } = makeClient({ unitError: { message: 'db unreachable' } });
    const result = await loadPracticeUnitAnnotations({ supabase: client, unitSlug: SLUG });

    expect(result.annotations).toEqual([]);
    expect(result.error).toBe(`resolve unit ${SLUG}: db unreachable`);
  });

  it('returns an empty, error-free result when the unit is not seeded', async () => {
    const { client, calls } = makeClient({ unitId: null });
    const result = await loadPracticeUnitAnnotations({ supabase: client, unitSlug: SLUG });

    expect(result).toEqual({ annotations: [], error: null });
    // Never queried the annotations table.
    expect(calls.some((c) => c.table === 'practice_annotations')).toBe(false);
  });

  it('returns the DB message when the annotations read fails', async () => {
    const { client } = makeClient({ loadError: { message: 'read timeout' } });
    const result = await loadPracticeUnitAnnotations({ supabase: client, unitSlug: SLUG });

    expect(result).toEqual({ annotations: [], error: 'read timeout' });
  });

  it('maps valid rows, drops invalid ones, and scopes to reading marks', async () => {
    const { client, calls } = makeClient({
      loadRows: [remoteRow(), remoteRow({ id: 'bad', start_offset: 5, end_offset: 5 })],
    });
    const result = await loadPracticeUnitAnnotations({ supabase: client, unitSlug: SLUG });

    expect(result.error).toBeNull();
    expect(result.annotations).toEqual<PassageAnnotation[]>([
      {
        id: 'p2-carbon',
        paragraphIndex: 2,
        startOffset: 3,
        endOffset: 9,
        text: 'carbon',
        kind: 'note',
        note: 'key term',
      },
    ]);

    const read = calls.find((c) => c.table === 'practice_annotations' && c.op === 'select');
    expect(read?.args.is).toEqual(['attempt_id', null]); // only unattached reading marks
  });
});

describe('syncPracticeUnitAnnotations', () => {
  it('reports "not signed in" and writes nothing without a user', async () => {
    const { client, calls } = makeClient({ user: null });
    const result = await syncPracticeUnitAnnotations({
      supabase: client,
      unitSlug: SLUG,
      annotations: [annotation()],
    });

    expect(result).toEqual({ pushed: 0, cleared: false, error: 'not signed in' });
    expect(calls).toHaveLength(0);
  });

  it('surfaces a unit-resolution failure without clearing anything', async () => {
    const { client, calls } = makeClient({ unitError: { message: 'db unreachable' } });
    const result = await syncPracticeUnitAnnotations({
      supabase: client,
      unitSlug: SLUG,
      annotations: [annotation()],
    });

    expect(result).toEqual({ pushed: 0, cleared: false, error: `resolve unit ${SLUG}: db unreachable` });
    expect(calls.some((c) => c.op === 'delete' || c.op === 'insert')).toBe(false);
  });

  it('skips (no clear) when the unit is not seeded', async () => {
    const { client, calls } = makeClient({ unitId: null });
    const result = await syncPracticeUnitAnnotations({
      supabase: client,
      unitSlug: SLUG,
      annotations: [annotation()],
    });

    expect(result).toEqual({ pushed: 0, cleared: false, error: null });
    expect(calls.some((c) => c.table === 'practice_annotations')).toBe(false);
  });

  it('aborts before inserting when the delete fails', async () => {
    const { client, calls } = makeClient({ deleteError: { message: 'locked' } });
    const result = await syncPracticeUnitAnnotations({
      supabase: client,
      unitSlug: SLUG,
      annotations: [annotation()],
    });

    expect(result).toEqual({ pushed: 0, cleared: false, error: 'locked' });
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('clears remotely but inserts nothing when there are no local annotations', async () => {
    const { client, calls } = makeClient();
    const result = await syncPracticeUnitAnnotations({
      supabase: client,
      unitSlug: SLUG,
      annotations: [],
    });

    expect(result).toEqual({ pushed: 0, cleared: true, error: null });
    expect(calls.some((c) => c.table === 'practice_annotations' && c.op === 'delete')).toBe(true);
    expect(calls.some((c) => c.op === 'insert')).toBe(false);
  });

  it('replaces reading marks: delete then insert the valid local set', async () => {
    const { client, calls } = makeClient();
    const result = await syncPracticeUnitAnnotations({
      supabase: client,
      unitSlug: SLUG,
      // second is invalid (end <= start) and must be dropped before insert
      annotations: [annotation(), annotation({ id: 'bad', endOffset: 0 })],
    });

    expect(result).toEqual({ pushed: 1, cleared: true, error: null });

    const del = calls.find((c) => c.table === 'practice_annotations' && c.op === 'delete');
    expect(del?.args.is).toEqual(['attempt_id', null]);

    const insert = calls.find((c) => c.table === 'practice_annotations' && c.op === 'insert');
    const rows = insert?.payload as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ user_id: USER_ID, unit_id: UNIT_UUID, attempt_id: null });
  });

  it('reports the insert error but still counts as cleared', async () => {
    const { client } = makeClient({ insertError: { message: 'constraint' } });
    const result = await syncPracticeUnitAnnotations({
      supabase: client,
      unitSlug: SLUG,
      annotations: [annotation()],
    });

    expect(result).toEqual({ pushed: 0, cleared: true, error: 'constraint' });
  });
});
