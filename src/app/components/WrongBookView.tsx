'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { BookX, Trash2, Zap, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

// 定义题目接口
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

interface WrongBookViewProps {
  initialQuestions: IeltsQuestion[];
  userId: string;
}

export default function WrongBookView({ initialQuestions, userId }: WrongBookViewProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState(initialQuestions);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // 创建客户端
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 展开/收起解析
  const handleToggleExpand = (id: string) => {
    setExpandedId(id === expandedId ? null : id);
  };

  // 移除错题逻辑
  const handleRemove = async (questionId: string) => {
    // 简单的确认框
    if (!confirm('确定已掌握这道题，将其移出错题本吗？')) return;

    setRemovingId(questionId);

    const { error } = await supabase
      .from('wrong_book')
      .delete()
      .eq('user_id', userId)
      .eq('question_id', questionId);

    if (error) {
      console.error('Failed to remove wrong entry', error);
      alert('移除失败，请重试');
    } else {
      // 成功后，更新本地状态
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
    }
    setRemovingId(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* 标题栏 */}
      <header className="flex items-center gap-3 mb-8 border-b border-slate-200 pb-5">
        <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
          <BookX className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">我的错题本</h1>
          <p className="text-slate-500 text-sm">复习是进步的阶梯，共 {questions.length} 道错题</p>
        </div>
      </header>

      {/* 空状态 */}
      {questions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
            <BookX size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">错题本是空的</h3>
          <p className="text-slate-500 mb-6 max-w-xs mx-auto">
            太棒了！这说明你正确率很高，或者还没开始大规模练习。
          </p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors"
          >
            去刷题
          </button>
        </div>
      )}

      {/* 列表区域 */}
      <div className="space-y-6">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            
            {/* 卡片头部 */}
            <div className="p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-orange-50 text-orange-700 uppercase">
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

                {/* 删除按钮 */}
                <button
                  onClick={() => handleRemove(q.id)}
                  disabled={removingId === q.id}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="移除错题 (已掌握)"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* 展开/收起按钮 */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => handleToggleExpand(q.id)}
                  className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {expandedId === q.id ? (
                    <>收起解析 <ChevronUp size={16} /></>
                  ) : (
                    <>查看解析 & 答案 <ChevronDown size={16} /></>
                  )}
                </button>
              </div>
            </div>

            {/* 详情区域 (仅展开时显示) */}
            {expandedId === q.id && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-in slide-in-from-top-2 duration-200">
                
                {/* 选项显示 */}
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