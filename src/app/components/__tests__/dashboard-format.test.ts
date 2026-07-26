import { describe, expect, it } from 'vitest';

import { formatLastPracticed } from '../dashboard-format';

describe('formatLastPracticed', () => {
  it('reports no record for null', () => {
    expect(formatLastPracticed(null)).toBe('还没有记录');
  });

  it('reports no record for an empty string', () => {
    expect(formatLastPracticed('')).toBe('还没有记录');
  });

  it('falls back to a vague label when the timestamp cannot be parsed', () => {
    expect(formatLastPracticed('not-a-date')).toBe('最近练过');
  });

  it('formats a valid ISO timestamp into a concrete, non-fallback label', () => {
    const label = formatLastPracticed('2024-06-15T09:30:00.000Z');
    expect(label).not.toBe('还没有记录');
    expect(label).not.toBe('最近练过');
    expect(label.length).toBeGreaterThan(0);
  });
});
