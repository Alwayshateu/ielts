import { describe, expect, it } from 'vitest';

import { deltaTone, formatSignedPercent, formatSignedSeconds } from '../attempt-delta';

describe('formatSignedPercent', () => {
  it('prefixes a plus and keeps the magnitude for gains', () => {
    expect(formatSignedPercent(12)).toBe('+12%');
  });

  it('uses a real minus sign (U+2212) and the magnitude for losses', () => {
    expect(formatSignedPercent(-8)).toBe('−8%');
  });

  it('marks no change with a plus-minus glyph', () => {
    expect(formatSignedPercent(0)).toBe('±0%');
  });
});

describe('formatSignedSeconds', () => {
  it('signs a positive delta and renders mm:ss of the magnitude', () => {
    expect(formatSignedSeconds(65)).toBe('+01:05');
  });

  it('signs a negative delta with a real minus and the absolute mm:ss', () => {
    expect(formatSignedSeconds(-65)).toBe('−01:05');
  });

  it('marks a zero delta with the plus-minus glyph', () => {
    expect(formatSignedSeconds(0)).toBe('±00:00');
  });
});

describe('deltaTone', () => {
  it('is emerald for improvements', () => {
    expect(deltaTone(5)).toBe('text-emerald-600');
  });

  it('is rose for regressions', () => {
    expect(deltaTone(-5)).toBe('text-rose-600');
  });

  it('collapses zero and unknown deltas to no tone', () => {
    expect(deltaTone(0)).toBeUndefined();
    expect(deltaTone(null)).toBeUndefined();
  });
});
