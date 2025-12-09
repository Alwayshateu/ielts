import { createSupabaseServerClient } from '@/lib/supabase-server'; 
import { redirect } from 'next/navigation';
import PracticeView from '../components/PracticeView';

// 强制动态渲染，防止 SSR 缓存问题
export const dynamic = 'force-dynamic';

export default async function PracticePage() {
  // ✅ 修正点：必须使用 await 调用 createSupabaseServerClient()
  // 这是为了兼容 Next.js 15+ cookies() 的异步特性
  const supabase = await createSupabaseServerClient();

  // 2. 获取当前用户 (服务端验证)
  const { data: { user }, error } = await supabase.auth.getUser();

  // 3. 安全拦截
  if (error || !user) {
    redirect('/login');
  }

  // 4. 渲染客户端组件，传入 userId 用于记录数据
  return (
    <div className="min-h-screen bg-[#f8f9fa] pt-4 pb-10">
      <PracticeView userId={user.id} />
    </div>
  );
}