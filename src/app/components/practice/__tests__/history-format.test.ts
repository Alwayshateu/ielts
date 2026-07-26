import { describe, expect, it } from 'vitest';

import { dayKey, formatDuration } from '../history-format';

describe('formatDuration', () => {
  it('clamps non-positive input to zero minutes', () => {
    expect(formatDuration(0)).toBe('0 分钟');
    expect(formatDuration(-30)).toBe('0 分钟');
  });

  it('rounds seconds to the nearest whole minute under an hour', () => {
    expect(formatDuration(29)).toBe('0 分钟');
    expect(formatDuration(30)).toBe('1 分钟');
    expect(formatDuration(90)).toBe('2 分钟');
    expect(formatDuration(3540)).toBe('59 分钟');
  });

  it('switches to hours at exactly 60 minutes', () => {
    expect(formatDuration(3600)).toBe('1 小时');
    expect(formatDuration(7200)).toBe('2 小时');
  });

  it('appends remaining minutes only when non-zero', () => {
    expect(formatDuration(3660)).toBe('1 小时 1 分');
    expect(formatDuration(9000)).toBe('2 小时 30 分');
  });
});

describe('dayKey', () => {
  it('buckets by local calendar day with a zero-indexed month', () => {
    // Calendar June is month 6, but Date months are zero-indexed, so the key uses 5.
    const june15 = new Date(2024, 5, 15, 12, 0, 0).getTime();
    expect(dayKey(june15)).toBe('2024-5-15');
  });

  it('is stable across different times on the same local day', () => {
    const morning = new Date(2024, 0, 3, 8, 15, 0).getTime();
    const night = new Date(2024, 0, 3, 23, 45, 0).getTime();
    expect(dayKey(morning)).toBe(dayKey(night));
    expect(dayKey(morning)).toBe('2024-0-3');
  });

  it('differs across a local day boundary', () => {
    const lateDay1 = new Date(2024, 0, 3, 23, 59, 0).getTime();
    const earlyDay2 = new Date(2024, 0, 4, 0, 1, 0).getTime();
    expect(dayKey(lateDay1)).not.toBe(dayKey(earlyDay2));
  });
});
