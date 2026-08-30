import { describe, expect, it } from 'vitest';

import { getDashboardStats } from '../dashboard-stats';
import { createSupabaseMock, type MockResult } from './supabase-mock';

/**
 * Wires the five queries getDashboardStats issues to fixtures. The two `history`
 * reads are told apart by the count/head flag: the plain read returns rows, the
 * head read returns a count.
 */
function makeClient(cfg: {
  history?: MockResult;
  recent?: MockResult;
  wrongBook?: MockResult;
  favorites?: MockResult;
  session?: MockResult;
}) {
  return createSupabaseMock((ctx) => {
    if (ctx.table === 'history') {
      return ctx.isCount ? cfg.recent ?? { count: 0 } : cfg.history ?? { data: [] };
    }
    if (ctx.table === 'wrong_book') return cfg.wrongBook ?? { count: 0 };
    if (ctx.table === 'favorites') return cfg.favorites ?? { count: 0 };
    if (ctx.table === 'practice_attempts') return cfg.session ?? { data: [] };
    return { data: [] };
  });
}

describe('getDashboardStats', () => {
  it('derives accuracy, counts, and last-practised time from the fixtures', async () => {
    const { client } = makeClient({
      history: {
        data: [
          { is_correct: true, created_at: '2026-07-25T09:00:00Z' },
          { is_correct: false, created_at: '2026-07-24T09:00:00Z' },
          { is_correct: true, created_at: '2026-07-23T09:00:00Z' },
        ],
      },
      recent: { count: 5 },
      wrongBook: { count: 4 },
      favorites: { count: 7 },
      session: { data: [{ score: 80 }, { score: 90 }] },
    });

    const stats = await getDashboardStats(client, 'user-1');

    expect(stats.totalAttempts).toBe(3);
    expect(stats.correctAttempts).toBe(2);
    expect(stats.accuracy).toBe(67); // round(2/3 * 100)
    expect(stats.recentAttempts).toBe(5);
    expect(stats.wrongBookCount).toBe(4);
    expect(stats.favoritesCount).toBe(7);
    expect(stats.lastPracticedAt).toBe('2026-07-25T09:00:00Z');
    expect(stats.sessionAttempts).toBe(2);
    expect(stats.sessionAccuracy).toBe(85);
    expect(stats.statsError).toBeNull();
  });

  it('reports null accuracy and no last-practised time when there are no attempts', async () => {
    const { client } = makeClient({ history: { data: [] } });

    const stats = await getDashboardStats(client, 'user-1');

    expect(stats.totalAttempts).toBe(0);
    expect(stats.accuracy).toBeNull();
    expect(stats.lastPracticedAt).toBeNull();
    expect(stats.sessionAccuracy).toBeNull();
  });

  it('degrades to empty stats with a message when a core query fails, skipping the session read', async () => {
    const { client, calls } = makeClient({
      history: { error: { message: 'history exploded' } },
      session: { data: [{ score: 99 }] },
    });

    const stats = await getDashboardStats(client, 'user-1');

    expect(stats.statsError).toBe('学习概览暂时无法加载，练习功能不受影响。');
    expect(stats.totalAttempts).toBe(0);
    expect(stats.sessionAttempts).toBe(0);
    // Early return means practice_attempts is never queried.
    expect(calls.some((c) => c.table === 'practice_attempts')).toBe(false);
  });

  it('keeps the overview intact when only the session read fails', async () => {
    const { client } = makeClient({
      history: { data: [{ is_correct: true, created_at: '2026-07-25T09:00:00Z' }] },
      recent: { count: 1 },
      session: { error: { message: 'practice_attempts missing' } },
    });

    const stats = await getDashboardStats(client, 'user-1');

    expect(stats.totalAttempts).toBe(1);
    expect(stats.accuracy).toBe(100);
    expect(stats.statsError).toBeNull(); // session failure is non-fatal
    expect(stats.sessionAttempts).toBe(0);
    expect(stats.sessionAccuracy).toBeNull();
  });

  it('averages only finite session scores and rounds the result', async () => {
    const { client } = makeClient({
      history: { data: [] },
      // 'x' coerces to NaN and is dropped; the two finite scores average to 72.5 -> 73.
      session: { data: [{ score: 70 }, { score: 'x' }, { score: 75 }] },
    });

    const stats = await getDashboardStats(client, 'user-1');

    expect(stats.sessionAttempts).toBe(2);
    expect(stats.sessionAccuracy).toBe(73);
  });
});
