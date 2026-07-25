import { redirect } from 'next/navigation';
import AppQuickNav from '../components/AppQuickNav';
import SettingsView from '../components/SettingsView';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username, email, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Settings profile fetch error:', profileError);
  }

  return (
    <div className="min-h-[100dvh] bg-canvas">
      <AppQuickNav />
      <SettingsView
        userId={user.id}
        isAnonymous={user.is_anonymous ?? false}
        authEmail={user.email ?? null}
        initialProfile={profile ?? null}
      />
    </div>
  );
}
