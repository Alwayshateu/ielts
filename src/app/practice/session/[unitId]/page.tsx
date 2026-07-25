import { notFound, redirect } from 'next/navigation';
import AppQuickNav from '@/app/components/AppQuickNav';
import PracticeSessionView from '@/app/components/practice/PracticeSessionView';
import { getPracticeUnit } from '@/lib/practice-units';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { unitId } = await params;
  const unit = await getPracticeUnit(unitId);

  if (!unit) {
    notFound();
  }

  return (
    <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
      <AppQuickNav />
      <PracticeSessionView unit={unit} />
    </div>
  );
}
