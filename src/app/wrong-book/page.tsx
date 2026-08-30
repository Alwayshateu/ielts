import { redirect } from 'next/navigation';
import AppQuickNav from '../components/AppQuickNav';
import WrongBookView from '../components/WrongBookView';
import { getCollectionItems } from '@/lib/question-collections';
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

  const { items, error, partialError } = await getCollectionItems(supabase, 'wrong_book', user.id);

  if (error) {
    console.error('Error fetching wrong book:', error);
    return (
      <main className="min-h-[100dvh] bg-canvas px-4 py-10 text-center text-ink-muted">
        加载错题本失败，请刷新重试。
      </main>
    );
  }

  if (partialError) {
    // Legacy cards still render; only the practice-linked half failed.
    console.error('Error fetching practice-linked wrong book entries:', partialError);
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <AppQuickNav />
      <WrongBookView initialItems={items} degraded={Boolean(partialError)} />
    </div>
  );
}
