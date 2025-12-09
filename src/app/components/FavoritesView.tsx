'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Heart, Trash2, Zap, BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// 定义题目接口（和 PracticeView 保持一致）
interface IeltsQuestion {
  id: string;
  type: string;
  category: string;
  difficulty: string;
  article_content?: string;
  question_text: string;
  correct_answer: string;
  explanation?: string;
  options?: string[];
}

interface FavoritesViewProps {
  initialQuestions: IeltsQuestion[];
  userId: string;
}

export default function FavoritesView({ initialQuestions, userId }: FavoritesViewProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // 创建客户端 (记得填入环境变量)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 切换解析展开/收起
  const handleToggleExpand = (id: string) => {
    setExpandedId(id === expandedId ? null : id);
  };

  // 取消收藏逻辑
  const handleRemoveFavorite = async (questionId: string) => {
    setRemovingId(questionId);

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('question_id', questionId);

    if (error) {
      console.error('Failed to remove favorite', error);
      alert('移除失败，请重试');
      setRemovingId(null);
    } else {
      // 成功后，从本地状态移除，实现 UI 即时更新
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setRemovingId(null);
    }
  };

  // --- 渲染 ---

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* 标题栏 */}
      <header className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-5">
        <div className="p-3 bg-red-50 text-red-500 rounded-full">
          <Heart className="w-6 h-6 fill-current" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">我的收藏夹</h1>
          <p className="text-slate-500 text-sm">这里保存了您标记为重点的 {questions.length} 道题目</p>
        </div>
      </header>

      {/* 空状态 */}
      {questions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
            <Heart size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">暂无收藏</h3>
          <p className="text-slate-500 mb-6 max-w-xs mx-auto">
            在练习过程中点击心形图标，即可将题目添加到这里方便日后复习。
          </p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-colors"
          >
            去练习
          </button>
        </div>
      )}

      {/* 题目列表 */}
      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            
            {/* 卡片头部：基本信息 */}
            <div className="p-6 flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 uppercase">
                    {q.category === 'mixed' ? '综合' : q.category}
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 uppercase">
                    {q.difficulty}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 leading-relaxed">
                  {index + 1}. {q.question_text}
                </h3>
              </div>

              {/* 操作区 */}
              <div className="flex items-center gap-3 shrink-0 pt-2 sm:pt-0">
                <button
                  onClick={() => handleToggleExpand(q.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    expandedId === q.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {expandedId === q.id ? '收起详情' : '查看详情'}
                </button>
                <button
                  onClick={() => handleRemoveFavorite(q.id)}
                  disabled={removingId === q.id}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="取消收藏"
                >
                  {removingId === q.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 详情区域 (仅展开时显示) */}
            {expandedId === q.id && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-in slide-in-from-top-2 duration-200">
                
                {/* 选项显示 (如果是选择题) */}
                {q.type === 'multiple_choice' && q.options && (
                  <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {q.options.map((opt, i) => (
                      <div key={i} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm">
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                {/* 正确答案 */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-1.5 bg-green-100 text-green-700 rounded-full mt-0.5">
                    <Zap size={16} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">正确答案</span>
                    <div className="text-lg font-bold text-slate-900">{q.correct_answer}</div>
                  </div>
                </div>

                {/* 解析 */}
                {q.explanation && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200 text-slate-600 text-sm leading-relaxed">
                    <span className="font-bold text-slate-900 block mb-1">解析：</span>
                    {q.explanation}
                  </div>
                )}

                {/* 原文引用 */}
                {q.article_content && (
                  <div className="mt-4">
                    <button className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wide">
                      <BookOpen size={14} /> 原文片段
                    </button>
                    <div 
                      className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-500 h-32 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: q.article_content }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}