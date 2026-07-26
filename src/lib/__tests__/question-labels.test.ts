import { describe, expect, it } from 'vitest';

import { formatCategory, formatDifficulty } from '../question-labels';

describe('question label formatting', () => {
  it('maps known categories to Chinese labels', () => {
    expect(formatCategory('mixed')).toBe('综合');
    expect(formatCategory('reading')).toBe('阅读');
    expect(formatCategory('listening')).toBe('听力');
    expect(formatCategory('writing')).toBe('写作');
    expect(formatCategory('speaking')).toBe('口语');
  });

  it('falls back to the raw category when unknown', () => {
    expect(formatCategory('grammar')).toBe('grammar');
    expect(formatCategory('')).toBe('');
  });

  it('maps known difficulties to Chinese labels', () => {
    expect(formatDifficulty('easy')).toBe('基础');
    expect(formatDifficulty('medium')).toBe('进阶');
    expect(formatDifficulty('hard')).toBe('挑战');
  });

  it('falls back to the raw difficulty when unknown', () => {
    expect(formatDifficulty('expert')).toBe('expert');
  });
});
