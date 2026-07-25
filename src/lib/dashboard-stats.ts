import type { SupabaseClient } from '@supabase/supabase-js';

export type DashboardStats = {
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number | null;
  recentAttempts: number;
  wrongBookCount: number;
  favoritesCount: number;
  lastPracticedAt: string | null;
  statsError: string | null;
};

const EMPTY_STATS: DashboardStats = {
  totalAttempts: 0,
  correctAttempts: 0,
  accuracy: null,
  recentAttempts: 0,
  wrongBookCount: 0,
  favoritesCount: 0,
  lastPracticedAt: null,
  statsError: null,
};

function daysAgoDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export async function getDashboardStats(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardStats> {
  const since = daysAgoDate(7);

  const [historyResult, recentResult, wrongBookResult, favoritesResult] = await Promise.all([
    supabase
      .from('history')
      .select('is_correct, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since),
    supabase
      .from('wrong_book')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('favorites')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  const firstError =
    historyResult.error ||
    recentResult.error ||
    wrongBookResult.error ||
    favoritesResult.error;

  if (firstError) {
    console.error('Dashboard stats fetch error:', firstError);
    return {
      ...EMPTY_STATS,
      statsError: '学习概览暂时无法加载，练习功能不受影响。',
    };
  }

  const attempts = historyResult.data ?? [];
  const correctAttempts = attempts.filter((attempt) => Boolean(attempt.is_correct)).length;
  const totalAttempts = attempts.length;

  return {
    totalAttempts,
    correctAttempts,
    accuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null,
    recentAttempts: recentResult.count ?? 0,
    wrongBookCount: wrongBookResult.count ?? 0,
    favoritesCount: favoritesResult.count ?? 0,
    lastPracticedAt: attempts[0]?.created_at ?? null,
    statsError: null,
  };
}
