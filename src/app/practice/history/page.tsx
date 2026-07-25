import { redirect } from 'next/navigation';
import AppQuickNav from '@/app/components/AppQuickNav';
import PracticeHistoryView from '@/app/components/practice/PracticeHistoryView';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function PracticeHistoryPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
      <AppQuickNav />
      <PracticeHistoryView />
    </div>
  );
}
