import { describe, expect, it } from 'vitest';
import {
  clampPlaybackTime,
  formatClock,
  parseTranscriptCues,
  resolveActiveCueIndex,
  type TranscriptCue,
} from '../practice-listening-cues';

describe('parseTranscriptCues', () => {
  it('returns an empty array for non-array input', () => {
    expect(parseTranscriptCues(undefined)).toEqual([]);
    expect(parseTranscriptCues(null)).toEqual([]);
    expect(parseTranscriptCues('nope')).toEqual([]);
  });

  it('keeps valid cues and drops malformed ones', () => {
    const cues = parseTranscriptCues([
      { start: 0, text: 'first' },
      { start: 5, text: '  ' },
      { start: 'x', text: 'bad start' },
      { text: 'no start' },
      { start: 10, text: 'third' },
    ]);

    expect(cues).toEqual([
      { start: 0, text: 'first' },
      { start: 10, text: 'third' },
    ]);
  });

  it('clamps negative starts and sorts ascending', () => {
    const cues = parseTranscriptCues([
      { start: 12, text: 'c' },
      { start: -4, text: 'a' },
      { start: 6, text: 'b' },
    ]);

    expect(cues.map((cue) => cue.start)).toEqual([0, 6, 12]);
    expect(cues.map((cue) => cue.text)).toEqual(['a', 'b', 'c']);
  });

  it('trims cue text', () => {
    expect(parseTranscriptCues([{ start: 1, text: '  hi  ' }])).toEqual([{ start: 1, text: 'hi' }]);
  });
});

describe('resolveActiveCueIndex', () => {
  const cues: TranscriptCue[] = [
    { start: 0, text: 'a' },
    { start: 10, text: 'b' },
    { start: 20, text: 'c' },
  ];

  it('returns -1 when there are no cues', () => {
    expect(resolveActiveCueIndex([], 5)).toBe(-1);
  });

  it('returns the last cue at or before the current time', () => {
    expect(resolveActiveCueIndex(cues, 0)).toBe(0);
    expect(resolveActiveCueIndex(cues, 9.9)).toBe(0);
    expect(resolveActiveCueIndex(cues, 10)).toBe(1);
    expect(resolveActiveCueIndex(cues, 25)).toBe(2);
  });

  it('handles a small epsilon so exact boundaries activate', () => {
    expect(resolveActiveCueIndex(cues, 19.9995)).toBe(2);
  });
});

describe('formatClock', () => {
  it('formats mm:ss with padding', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(9)).toBe('00:09');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(600)).toBe('10:00');
  });

  it('guards against negative or non-finite input', () => {
    expect(formatClock(-5)).toBe('00:00');
    expect(formatClock(Number.NaN)).toBe('00:00');
  });
});

describe('clampPlaybackTime', () => {
  it('clamps below zero to zero', () => {
    expect(clampPlaybackTime(-3, 100)).toBe(0);
  });

  it('clamps above duration to duration', () => {
    expect(clampPlaybackTime(120, 96)).toBe(96);
  });

  it('passes through valid times', () => {
    expect(clampPlaybackTime(42, 96)).toBe(42);
  });

  it('ignores an unknown duration', () => {
    expect(clampPlaybackTime(42, 0)).toBe(42);
    expect(clampPlaybackTime(42, Number.NaN)).toBe(42);
  });
});
