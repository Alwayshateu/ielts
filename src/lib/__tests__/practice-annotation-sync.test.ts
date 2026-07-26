import { describe, expect, it } from 'vitest';

import {
  annotationsSignature,
  buildPracticeAnnotationRows,
  isPersistableAnnotation,
  isPracticeAnnotationSyncEnabled,
  mapRemoteAnnotationRow,
} from '../practice-annotation-sync';
import type { PassageAnnotation } from '../types';

const USER_ID = '44444444-4444-4444-8444-444444444444';
const UNIT_UUID = '11111111-1111-4111-8111-111111111111';

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

describe('isPracticeAnnotationSyncEnabled', () => {
  it('is on only for the literal "on"', () => {
    expect(isPracticeAnnotationSyncEnabled('on')).toBe(true);
    expect(isPracticeAnnotationSyncEnabled('off')).toBe(false);
    expect(isPracticeAnnotationSyncEnabled(undefined)).toBe(false);
    expect(isPracticeAnnotationSyncEnabled('true')).toBe(false);
  });
});

describe('isPersistableAnnotation', () => {
  it('accepts a well-formed annotation', () => {
    expect(isPersistableAnnotation(annotation())).toBe(true);
    expect(isPersistableAnnotation(annotation({ kind: 'note', note: 'recall this' }))).toBe(true);
  });

  it('rejects structurally invalid annotations', () => {
    expect(isPersistableAnnotation(annotation({ id: '' }))).toBe(false);
    expect(isPersistableAnnotation(annotation({ endOffset: 4 }))).toBe(false); // end == start
    expect(isPersistableAnnotation(annotation({ startOffset: -1 }))).toBe(false);
    expect(isPersistableAnnotation(annotation({ paragraphIndex: 1.5 }))).toBe(false);
    expect(isPersistableAnnotation(annotation({ text: '' }))).toBe(false);
    // @ts-expect-error deliberately wrong kind
    expect(isPersistableAnnotation(annotation({ kind: 'scribble' }))).toBe(false);
  });
});

describe('buildPracticeAnnotationRows', () => {
  it('maps local annotations to insert rows and drops invalid ones', () => {
    const rows = buildPracticeAnnotationRows({
      annotations: [
        annotation(),
        annotation({ id: 'p1-note', paragraphIndex: 1, startOffset: 0, endOffset: 5, text: 'roofs', kind: 'note', note: 'define' }),
        annotation({ id: 'bad', endOffset: 0 }), // invalid: end <= start
      ],
      userId: USER_ID,
      unitId: UNIT_UUID,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      user_id: USER_ID,
      unit_id: UNIT_UUID,
      attempt_id: null,
      paragraph_index: 0,
      start_offset: 4,
      end_offset: 14,
      selected_text: 'Green roofs',
      kind: 'highlight',
      note: null,
      metadata: { client_annotation_id: 'p0-1-Green roofs' },
    });
    expect(rows[1].note).toBe('define');
    expect(rows[1].metadata.client_annotation_id).toBe('p1-note');
  });

  it('always writes reading marks with a null attempt_id', () => {
    const rows = buildPracticeAnnotationRows({ annotations: [annotation()], userId: USER_ID, unitId: UNIT_UUID });
    expect(rows[0].attempt_id).toBeNull();
  });

  it('normalizes an empty note string to null', () => {
    const rows = buildPracticeAnnotationRows({
      annotations: [annotation({ kind: 'note', note: '' })],
      userId: USER_ID,
      unitId: UNIT_UUID,
    });
    expect(rows[0].note).toBeNull();
  });
});

describe('mapRemoteAnnotationRow', () => {
  it('maps a DB row back to a PassageAnnotation, preferring the client id in metadata', () => {
    const mapped = mapRemoteAnnotationRow({
      id: '99999999-9999-4999-8999-999999999999',
      paragraph_index: 2,
      start_offset: 3,
      end_offset: 9,
      selected_text: 'carbon',
      kind: 'note',
      note: 'key term',
      metadata: { client_annotation_id: 'p2-carbon' },
    });

    expect(mapped).toEqual<PassageAnnotation>({
      id: 'p2-carbon',
      paragraphIndex: 2,
      startOffset: 3,
      endOffset: 9,
      text: 'carbon',
      kind: 'note',
      note: 'key term',
    });
  });

  it('falls back to the DB id when metadata has no client id', () => {
    const mapped = mapRemoteAnnotationRow({
      id: 'db-uuid',
      paragraph_index: 0,
      start_offset: 0,
      end_offset: 4,
      selected_text: 'roof',
      kind: 'highlight',
      note: null,
      metadata: {},
    });
    expect(mapped?.id).toBe('db-uuid');
  });

  it('rejects rows that violate the offset / kind invariants', () => {
    const base = {
      id: 'x',
      paragraph_index: 0,
      start_offset: 5,
      end_offset: 10,
      selected_text: 'ok',
      kind: 'highlight' as const,
      note: null,
      metadata: {},
    };
    expect(mapRemoteAnnotationRow({ ...base, end_offset: 5 })).toBeNull();
    expect(mapRemoteAnnotationRow({ ...base, start_offset: -1 })).toBeNull();
    expect(mapRemoteAnnotationRow({ ...base, kind: 'scribble' })).toBeNull();
  });
});

describe('annotationsSignature', () => {
  it('ignores ids and ordering', () => {
    const a = annotation({ id: 'first' });
    const b = annotation({ id: 'second', paragraphIndex: 1, startOffset: 0, endOffset: 3, text: 'the' });
    expect(annotationsSignature([a, b])).toBe(annotationsSignature([b, a]));
    expect(annotationsSignature([annotation({ id: 'x' })])).toBe(annotationsSignature([annotation({ id: 'y' })]));
  });

  it('distinguishes different note text on the same span', () => {
    const one = annotation({ kind: 'note', note: 'first thought' });
    const two = annotation({ kind: 'note', note: 'second thought' });
    expect(annotationsSignature([one])).not.toBe(annotationsSignature([two]));
  });

  it('is stable across a build → map round trip (no restore-echo)', () => {
    const local = [annotation({ kind: 'note', note: 'define' })];
    const rows = buildPracticeAnnotationRows({ annotations: local, userId: USER_ID, unitId: UNIT_UUID });
    const restored = rows
      .map((row, index) =>
        mapRemoteAnnotationRow({
          id: `db-${index}`,
          paragraph_index: row.paragraph_index,
          start_offset: row.start_offset,
          end_offset: row.end_offset,
          selected_text: row.selected_text,
          kind: row.kind,
          note: row.note,
          metadata: row.metadata,
        })
      )
      .filter((value): value is PassageAnnotation => value !== null);

    expect(annotationsSignature(restored)).toBe(annotationsSignature(local));
  });
});
