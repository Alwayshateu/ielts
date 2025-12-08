import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import DashboardContent from '../components/DashboardContent';

// 强制动态渲染，防止 Next.js 缓存页面导致用户信息不更新
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // 1. 获取 Cookie Store (Next.js 14+ 必须 await)
  const cookieStore = await cookies();
  
  // 2. 创建 Supabase 客户端
  const supabase = createServerComponentClient({ cookies: async () => cookieStore });

  // 3. 获取用户信息 (使用 getUser 验证安全性)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 如果中间件漏网了（极低概率），这里做一个最后的兜底，但不重定向，只显示错误
  if (authError || !user) {
    return (
      <div className="h-screen flex items-center justify-center text-red-500">
        认证失效，请刷新页面。
      </div>
    );
  }

  // 4. 获取 Profile 资料
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('username, email')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Profile fetch error:', profileError);
  }

  // 5. 渲染 UI 组件
  // 如果 profile 没取到，给一个默认对象防止报错
  const safeProfile = profile || { email: user.email, username: null };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <DashboardContent profile={safeProfile} />
    </div>
  );
}