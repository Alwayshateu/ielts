import { createSupabaseServerClient } from '@/lib/supabase-server'; 
import { redirect } from 'next/navigation';
import FavoritesView from '../components/FavoritesView';

// 强制动态渲染，保证数据最新
export const dynamic = 'force-dynamic';

export default async function FavoritesPage() {
  // 1. 实例化客户端 (记得加 await!)
  const supabase = await createSupabaseServerClient();

  // 2. 获取当前用户
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 3. 获取收藏数据
  // 这里我们采用两步法：先拿收藏列表，再拿题目详情
  // 这种方法比直接 SQL Join 在 Typescript 中处理起来更灵活，容错率更高
  
  // A. 获取该用户所有收藏记录
  const { data: favEntries, error: favError } = await supabase
    .from('favorites')
    .select('question_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }); // 最近收藏的在前面

  if (favError) {
    console.error('Error fetching favorites:', favError);
    return <div className="p-10 text-center">加载收藏失败，请稍后重试。</div>;
  }

  // B. 提取 ID 数组
  const questionIds = favEntries.map((f) => f.question_id);
  let questions: any[] = [];

  // C. 如果有收藏，去题目表里查详情
  if (questionIds.length > 0) {
    const { data: qData, error: qError } = await supabase
      .from('ielts_questions')
      .select('*')
      .in('id', questionIds); // 批量获取
    
    if (!qError && qData) {
      // 这里的 qData 顺序可能是乱的，我们可以按 ID 重新排序以匹配收藏时间顺序，或者简单展示即可
      questions = qData;
    }
  }

  // 4. 渲染客户端组件
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <FavoritesView initialQuestions={questions} userId={user.id} />
    </div>
  );
}