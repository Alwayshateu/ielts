import { createSupabaseServerClient } from '@/lib/supabase-server'; 
import { redirect } from 'next/navigation';
import WrongBookView from '../components/WrongBookView';

// 强制动态渲染
export const dynamic = 'force-dynamic';

export default async function WrongBookPage() {
  // 1. 初始化客户端 (使用 await)
  const supabase = await createSupabaseServerClient();

  // 2. 验证用户
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 3. 获取错题数据
  // A. 获取错题 ID 列表 (按时间倒序)
  const { data: wrongEntries, error: wrongError } = await supabase
    .from('wrong_book')
    .select('question_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (wrongError) {
    console.error('Error fetching wrong book:', wrongError);
    return <div className="p-10 text-center">加载失败，请刷新重试。</div>;
  }

  // B. 提取 ID
  const questionIds = wrongEntries.map((entry) => entry.question_id);
  let questions: any[] = [];

  // C. 批量获取题目详情
  if (questionIds.length > 0) {
    const { data: qData, error: qError } = await supabase
      .from('ielts_questions')
      .select('*')
      .in('id', questionIds);
    
    if (!qError && qData) {
      // 保持错题添加的顺序 (可选优化)
      // 这里简单返回数据，前端按获取到的顺序显示
      questions = qData;
    }
  }

  // 4. 渲染视图
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <WrongBookView initialQuestions={questions} userId={user.id} />
    </div>
  );
}