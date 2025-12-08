import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import DashboardContent from '../components/DashboardContent';

// 防止数据缓存
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // 2. 获取用户
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return (
      <div className="h-screen flex items-center justify-center text-red-500">
        认证失效，请刷新页面。
      </div>
    );
  }

  // 3. 获取用户 profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username, email')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
  }

  // 4. 防止 profile 为 null 导致组件报错
  const safeProfile = profile || { email: user.email, username: null };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <DashboardContent profile={safeProfile} />
    </div>
  );
}

