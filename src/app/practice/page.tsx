import { createServerComponentClient } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import PracticeView from '../components/PracticeView';

export default async function PracticePage() {
  const cookieStore =cookies();
  const supabase = createServerComponentClient({cookies});

  // 1. 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. 渲染客户端组件，并将 userId 传进去 (用于记录历史和收藏)
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PracticeView userId={user.id} />
    </div>
  );
}