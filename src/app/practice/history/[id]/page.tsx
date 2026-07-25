import { redirect } from 'next/navigation';
import AppQuickNav from '@/app/components/AppQuickNav';
import PracticeAttemptDetailView from '@/app/components/practice/PracticeAttemptDetailView';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function PracticeAttemptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { id } = await params;

  return (
    <div className="min-h-[100dvh] bg-canvas pb-10 pt-4">
      <AppQuickNav />
      <PracticeAttemptDetailView attemptId={id} />
    </div>
  );
}
