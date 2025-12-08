'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { 
  Loader2, CheckCircle2, XCircle, ArrowRight, 
  BookOpen, Heart, AlertCircle, ArrowLeft 
} from 'lucide-react';

// 类型定义
type QuestionType = 'multiple_choice' | 'fill_in_the_blank';

interface IeltsQuestion {
  id: string;
  type: QuestionType;
  category: string;
  difficulty: string;
  article_content?: string;
  question_text: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

export default function PracticeView({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();

  // 1. 获取 URL 参数
  const category = searchParams.get('category') || 'mixed';
  const difficulty = searchParams.get('difficulty') || 'medium';

  // 2. 状态管理
  const [question, setQuestion] = useState<IeltsQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [isFavorited, setIsFavorited] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- 核心逻辑：获取题目 ---
  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    setStatus('idle');
    setUserAnswer('');
    setIsFavorited(false);

    try {
      // 调用新的 RPC 函数
      const { data, error } = await supabase.rpc('get_random_questions', {
        p_category: category,
        p_difficulty: category === 'mixed' ? null : difficulty, // 综合模式下可能忽略难度，或者你也可以加上
        p_limit: 1
      });

      if (error) throw error;

      if (data && data.length > 0) {
        setQuestion(data[0]);
        // 检查该题是否已收藏 (锦上添花的功能)
        checkIfFavorited(data[0].id);
      } else {
        setQuestion(null);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [category, difficulty, supabase]);

  // 检查收藏状态
  const checkIfFavorited = async (questionId: string) => {
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .single();
    if (data) setIsFavorited(true);
  };

  // 初始化加载
  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  // --- 交互逻辑：提交答案 ---
  const handleSubmit = async () => {
    if (!question || !userAnswer.trim()) return;

    setSaving(true);
    const cleanUser = userAnswer.trim().toLowerCase();
    const cleanCorrect = question.correct_answer.trim().toLowerCase();
    
    // 简单判分逻辑
    const isCorrect = cleanUser === cleanCorrect;
    setStatus(isCorrect ? 'correct' : 'wrong');

    // 1. 记录历史 (History)
    await supabase.from('history').insert({
      user_id: userId,
      question_id: question.id,
      user_answer: userAnswer,
      is_correct: isCorrect
    });

    // 2. 如果错了，加入错题本 (Wrong Book)
    // 先检查是否已经在错题本，避免重复插入
    if (!isCorrect) {
       const { data: exist } = await supabase.from('wrong_book')
         .select('id').eq('user_id', userId).eq('question_id', question.id).single();
       
       if (!exist) {
         await supabase.from('wrong_book').insert({
           user_id: userId,
           question_id: question.id
         });
       }
    }
    setSaving(false);
  };

  // --- 交互逻辑：收藏/取消收藏 ---
  const toggleFavorite = async () => {
    if (!question) return;

    // UI 乐观更新
    const nextState = !isFavorited;
    setIsFavorited(nextState);

    if (nextState) {
      // 添加收藏
      await supabase.from('favorites').insert({ user_id: userId, question_id: question.id });
    } else {
      // 取消收藏
      await supabase.from('favorites').delete().eq('user_id', userId).eq('question_id', question.id);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && status === 'idle' && userAnswer.trim()) handleSubmit();
      if (e.key === ' ' && status !== 'idle') {
        e.preventDefault(); // 防止空格滚动页面
        fetchQuestion();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [status, userAnswer, fetchQuestion]);


  // --- 渲染部分 ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p>正在从题库抽取题目...</p>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-lg">该分类下暂时没有题目。</p>
        <button onClick={() => router.back()} className="mt-4 text-indigo-600 hover:underline">
          返回选择其他分类
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* 顶部导航 */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={20} className="mr-1" /> 退出练习
        </button>
        <div className="flex items-center gap-2">
           <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
             {question.category}
           </span>
           <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
             {question.difficulty}
           </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 左侧：文章区域 (仅阅读题显示) */}
        {question.article_content && (
          <div className="lg:col-span-6 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4 text-indigo-600 border-b border-slate-100 pb-2">
              <BookOpen size={18} />
              <span className="font-bold text-sm">阅读原文</span>
            </div>
            <article 
              className="prose prose-slate prose-sm max-w-none text-slate-600 font-serif leading-relaxed"
              dangerouslySetInnerHTML={{ __html: question.article_content }} 
            />
          </div>
        )}

        {/* 右侧：题目交互区 */}
        <div className={`${question.article_content ? 'lg:col-span-6' : 'lg:col-span-8 lg:col-start-3'}`}>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
            
            {/* 题干栏 */}
            <div className="p-6 sm:p-8 border-b border-slate-50 relative">
              <div className="flex justify-between items-start gap-4">
                <h2 className="text-xl font-semibold text-slate-900 leading-snug">
                  {question.question_text}
                </h2>
                <button 
                  onClick={toggleFavorite}
                  className={`p-2 rounded-full transition-all ${
                    isFavorited ? 'text-red-500 bg-red-50' : 'text-slate-300 hover:bg-slate-50'
                  }`}
                  title="加入收藏"
                >
                  <Heart fill={isFavorited ? "currentColor" : "none"} size={24} />
                </button>
              </div>
            </div>

            {/* 答题区 */}
            <div className="p-6 sm:p-8 bg-slate-50/50">
               {question.type === 'multiple_choice' && question.options ? (
                 <div className="space-y-3">
                   {question.options.map((opt, idx) => (
                     <button
                       key={idx}
                       disabled={status !== 'idle'}
                       onClick={() => setUserAnswer(opt)}
                       className={`
                         w-full text-left p-4 rounded-xl border-2 transition-all flex items-center
                         ${userAnswer === opt 
                           ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm' 
                           : 'border-white bg-white text-slate-600 hover:border-indigo-200'
                         }
                         ${status !== 'idle' && userAnswer !== opt && 'opacity-50'}
                       `}
                     >
                       <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center
                         ${userAnswer === opt ? 'border-indigo-600' : 'border-slate-300'}
                       `}>
                         {userAnswer === opt && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                       </div>
                       {opt}
                     </button>
                   ))}
                 </div>
               ) : (
                 <input
                   type="text"
                   value={userAnswer}
                   disabled={status !== 'idle'}
                   onChange={(e) => setUserAnswer(e.target.value)}
                   placeholder="请输入你的答案..."
                   className="w-full p-4 text-lg border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none bg-white shadow-sm"
                 />
               )}

               {status === 'idle' && (
                 <button
                   onClick={handleSubmit}
                   disabled={!userAnswer.trim() || saving}
                   className="mt-8 w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                 >
                   {saving && <Loader2 className="animate-spin" />} 提交答案 (Enter)
                 </button>
               )}
            </div>

            {/* 结果反馈区 */}
            {status !== 'idle' && (
              <div className={`
                p-6 sm:p-8 border-t-4 animate-in slide-in-from-bottom-4 duration-500
                ${status === 'correct' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}
              `}>
                <div className="flex gap-4">
                  <div className={`mt-1 p-2 rounded-full ${status === 'correct' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                    {status === 'correct' ? <CheckCircle2 /> : <XCircle />}
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold mb-1 ${status === 'correct' ? 'text-green-800' : 'text-red-800'}`}>
                      {status === 'correct' ? '回答正确！' : '回答错误'}
                    </h3>
                    
                    {status === 'wrong' && (
                      <div className="mb-4">
                        <span className="text-sm text-slate-500">正确答案：</span>
                        <div className="font-bold text-slate-900 text-lg">{question.correct_answer}</div>
                      </div>
                    )}

                    {question.explanation && (
                      <div className="bg-white/60 p-4 rounded-lg text-sm text-slate-600 leading-relaxed border border-black/5">
                        <span className="font-bold text-slate-900">解析：</span> {question.explanation}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={fetchQuestion}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-bold rounded-xl shadow-sm transition-all"
                  >
                    下一题 (Space) <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}