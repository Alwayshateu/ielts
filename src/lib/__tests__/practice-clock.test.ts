import { describe, expect, it } from 'vitest';
import { formatClock, formatMinutes } from '../practice-clock';

describe('formatClock', () => {
  it('formats seconds as zero-padded mm:ss', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(5)).toBe('00:05');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(600)).toBe('10:00');
  });

  it('keeps counting minutes past an hour (no h:mm:ss rollover)', () => {
    expect(formatClock(3661)).toBe('61:01');
  });

  it('clamps negative input to zero', () => {
    expect(formatClock(-5)).toBe('00:00');
  });
});

describe('formatMinutes', () => {
  it('reports unlimited when there is no time budget', () => {
    expect(formatMinutes(null)).toBe('不限时');
    expect(formatMinutes(0)).toBe('不限时');
  });

  it('rounds seconds to whole minutes', () => {
    expect(formatMinutes(60)).toBe('1 分钟');
    expect(formatMinutes(120)).toBe('2 分钟');
    expect(formatMinutes(1800)).toBe('30 分钟');
  });
});
