import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getDashboardStats } from '@/lib/dashboard-stats';
import { redirect } from 'next/navigation';
import AppQuickNav from '../components/AppQuickNav';
import DashboardContent from '../components/DashboardContent';

// 防止数据缓存
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  // 2. 获取用户
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const isAnonymous = user.is_anonymous ?? false;

  // 3. 获取用户 profile
  let profile = null;
  if (!isAnonymous) {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
    }

    profile = profileData;
  }

  // 4. 防止 profile 为 null 导致组件报错
  const safeProfile = profile || { email: user.email ?? null, username: null };

  const stats = await getDashboardStats(supabase, user.id);

  return (
    <div className="variant-dashboard-shell min-h-[100dvh]">
      <AppQuickNav />
      <DashboardContent profile={safeProfile} isAnonymous={isAnonymous} stats={stats} />
    </div>
  );
}
