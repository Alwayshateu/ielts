import { redirect } from 'next/navigation';
import AppQuickNav from '@/app/components/AppQuickNav';
import PracticeSessionsView from '@/app/components/practice/PracticeSessionsView';
import { getPracticeUnits } from '@/lib/practice-units';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function PracticeSessionsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const units = await getPracticeUnits();

  return (
    <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
      <AppQuickNav />
      <PracticeSessionsView units={units} />
    </div>
  );
}
