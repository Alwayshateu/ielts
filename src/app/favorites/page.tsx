import { redirect } from 'next/navigation';
import AppQuickNav from '../components/AppQuickNav';
import FavoritesView from '../components/FavoritesView';
import { getQuestionsForCollection } from '@/lib/question-collections';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { questions, error } = await getQuestionsForCollection(
    supabase,
    'favorites',
    user.id
  );

  if (error) {
    console.error('Error fetching favorites:', error);
    return (
      <main className="min-h-[100dvh] bg-canvas px-4 py-10 text-center text-ink-muted">
        加载收藏失败，请稍后重试。
      </main>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <AppQuickNav />
      <FavoritesView initialQuestions={questions} userId={user.id} />
    </div>
  );
}
