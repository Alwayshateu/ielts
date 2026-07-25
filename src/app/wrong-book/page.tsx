import { redirect } from 'next/navigation';
import AppQuickNav from '../components/AppQuickNav';
import WrongBookView from '../components/WrongBookView';
import { getQuestionsForCollection } from '@/lib/question-collections';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function WrongBookPage() {
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
    'wrong_book',
    user.id
  );

  if (error) {
    console.error('Error fetching wrong book:', error);
    return (
      <main className="min-h-[100dvh] bg-canvas px-4 py-10 text-center text-ink-muted">
        加载错题本失败，请刷新重试。
      </main>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <AppQuickNav />
      <WrongBookView initialQuestions={questions} userId={user.id} />
    </div>
  );
}
