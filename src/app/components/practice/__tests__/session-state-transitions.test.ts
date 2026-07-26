import { describe, expect, it } from 'vitest';
import type { PassageAnnotation } from '@/lib/types';
import {
  addAnnotation,
  pickReviewTarget,
  removeAnnotation,
  setReviewNote,
  setRubricRating,
  toggleFlag,
  toggleMistakeReason,
  updateAnnotation,
} from '../session-state-transitions';

function annotationInput(overrides: Partial<Omit<PassageAnnotation, 'id'>> = {}): Omit<PassageAnnotation, 'id'> {
  return {
    paragraphIndex: 0,
    startOffset: 0,
    endOffset: 5,
    text: 'sample',
    kind: 'highlight',
    note: null,
    ...overrides,
  };
}

function annotation(overrides: Partial<PassageAnnotation> = {}): PassageAnnotation {
  return { id: 'a1', ...annotationInput(), ...overrides };
}

describe('toggleFlag', () => {
  it('appends an unflagged id', () => {
    expect(toggleFlag([], 'q1')).toEqual(['q1']);
    expect(toggleFlag(['q2'], 'q1')).toEqual(['q2', 'q1']);
  });

  it('removes an already-flagged id', () => {
    expect(toggleFlag(['q1', 'q2'], 'q1')).toEqual(['q2']);
  });

  it('is a no-op when toggled twice (idempotent round-trip)', () => {
    expect(toggleFlag(toggleFlag(['q2'], 'q1'), 'q1')).toEqual(['q2']);
  });

  it('does not mutate the input array', () => {
    const input = ['q1'];
    toggleFlag(input, 'q2');
    expect(input).toEqual(['q1']);
  });
});

describe('setReviewNote', () => {
  it('trims leading whitespace but preserves trailing whitespace', () => {
    expect(setReviewNote({}, 'q1', '  hi  ')).toEqual({ q1: 'hi  ' });
  });

  it('removes the key when the note is empty after trimming', () => {
    expect(setReviewNote({ q1: 'x', q2: 'y' }, 'q1', '   ')).toEqual({ q2: 'y' });
    expect(setReviewNote({ q1: 'x' }, 'q1', '')).toEqual({});
  });

  it('does not mutate the input map', () => {
    const input = { q1: 'x' };
    setReviewNote(input, 'q1', '');
    expect(input).toEqual({ q1: 'x' });
  });
});

describe('toggleMistakeReason', () => {
  it('creates the list for the first reason', () => {
    expect(toggleMistakeReason({}, 'q1', 'grammar')).toEqual({ q1: ['grammar'] });
  });

  it('appends further reasons', () => {
    expect(toggleMistakeReason({ q1: ['grammar'] }, 'q1', 'vocab')).toEqual({ q1: ['grammar', 'vocab'] });
  });

  it('removes one reason while keeping the rest', () => {
    expect(toggleMistakeReason({ q1: ['grammar', 'vocab'] }, 'q1', 'grammar')).toEqual({ q1: ['vocab'] });
  });

  it('drops the key entirely when the last reason is removed', () => {
    expect(toggleMistakeReason({ q1: ['grammar'], q2: ['x'] }, 'q1', 'grammar')).toEqual({ q2: ['x'] });
  });
});

describe('setRubricRating', () => {
  it('creates the criterion map for a new question', () => {
    expect(setRubricRating({}, 'q1', 'task', 7)).toEqual({ q1: { task: 7 } });
  });

  it('merges a new criterion without dropping existing ones', () => {
    expect(setRubricRating({ q1: { task: 7 } }, 'q1', 'coherence', 6)).toEqual({
      q1: { task: 7, coherence: 6 },
    });
  });

  it('overwrites the same criterion and preserves other questions', () => {
    expect(setRubricRating({ q1: { task: 7 }, q2: { task: 5 } }, 'q1', 'task', 8)).toEqual({
      q1: { task: 8 },
      q2: { task: 5 },
    });
  });
});

describe('addAnnotation', () => {
  it('appends with an id derived from paragraph, 1-based position, and a 12-char text prefix', () => {
    const next = addAnnotation([], annotationInput({ paragraphIndex: 2, text: 'The quick brown fox' }));
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('2-1-The quick br');
  });

  it('increments the position with the existing length', () => {
    const seed = [annotation({ id: 'x' }), annotation({ id: 'y' })];
    const next = addAnnotation(seed, annotationInput({ paragraphIndex: 4, text: 'note' }));
    expect(next).toHaveLength(3);
    expect(next[2].id).toBe('4-3-note');
  });
});

describe('updateAnnotation', () => {
  it('patches kind/note on the matching id only', () => {
    const seed = [annotation({ id: 'a1', note: null }), annotation({ id: 'a2', note: 'keep' })];
    const next = updateAnnotation(seed, 'a1', { kind: 'note', note: 'added' });
    expect(next[0]).toMatchObject({ id: 'a1', kind: 'note', note: 'added' });
    expect(next[1]).toMatchObject({ id: 'a2', note: 'keep' });
  });

  it('returns an equivalent list when the id is absent', () => {
    const seed = [annotation({ id: 'a1' })];
    expect(updateAnnotation(seed, 'missing', { note: 'x' })).toEqual(seed);
  });
});

describe('removeAnnotation', () => {
  it('drops the matching annotation', () => {
    const seed = [annotation({ id: 'a1' }), annotation({ id: 'a2' })];
    expect(removeAnnotation(seed, 'a1')).toEqual([annotation({ id: 'a2' })]);
  });

  it('is a no-op when the id is absent', () => {
    const seed = [annotation({ id: 'a1' })];
    expect(removeAnnotation(seed, 'missing')).toEqual(seed);
  });
});

describe('pickReviewTarget', () => {
  const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];

  it('returns the first unanswered question', () => {
    expect(pickReviewTarget([{ id: 'q3' }], questions, [])).toBe('q3');
  });

  it('prefers unanswered over flagged', () => {
    expect(pickReviewTarget([{ id: 'q3' }], questions, ['q1'])).toBe('q3');
  });

  it('falls back to the first flagged question in question order (not flag order)', () => {
    expect(pickReviewTarget([], questions, ['q2', 'q1'])).toBe('q1');
  });

  it('returns null when nothing is unanswered or flagged', () => {
    expect(pickReviewTarget([], questions, [])).toBeNull();
  });
});
