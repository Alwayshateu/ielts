import type { SupabaseClient } from '@supabase/supabase-js';

export type DashboardStats = {
  /** Single-question attempts recorded in the legacy history table. */
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number | null;
  recentAttempts: number;
  /** Counts cover both question models once migration 0003 is applied. */
  wrongBookCount: number;
  favoritesCount: number;
  lastPracticedAt: string | null;
  /** Practice sessions synced to the cloud; 0 when the user only practises locally. */
  sessionAttempts: number;
  sessionAccuracy: number | null;
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
  sessionAttempts: 0,
  sessionAccuracy: null,
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

  // Practice-session attempts live in their own table and may not exist yet (migration
  // 0001 unapplied, or the user never synced). A failure here must not blank the whole
  // overview, so it degrades to zero instead of propagating.
  const sessionResult = await supabase
    .from('practice_attempts')
    .select('score')
    .eq('user_id', userId)
    .not('score', 'is', null)
    .order('started_at', { ascending: false })
    .limit(500);

  const sessionScores = sessionResult.error
    ? []
    : (sessionResult.data ?? [])
        .map((row) => Number(row.score))
        .filter((score) => Number.isFinite(score));

  return {
    totalAttempts,
    correctAttempts,
    accuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : null,
    recentAttempts: recentResult.count ?? 0,
    wrongBookCount: wrongBookResult.count ?? 0,
    favoritesCount: favoritesResult.count ?? 0,
    lastPracticedAt: attempts[0]?.created_at ?? null,
    sessionAttempts: sessionScores.length,
    sessionAccuracy: sessionScores.length
      ? Math.round(sessionScores.reduce((sum, score) => sum + score, 0) / sessionScores.length)
      : null,
    statsError: null,
  };
}
