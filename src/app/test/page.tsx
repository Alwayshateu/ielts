'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  BookOpen, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

// --- 修复的防抖函数 ---
const simpleDebounce = <T extends (...args: unknown[]) => void>(
  func: T, 
  delay: number
) => {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// --- 环境变量配置 ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- 类型定义 ---
type QuestionType = 'multiple_choice' | 'fill_in_the_blank';

interface IeltsQuestion {
  id: string;
  type: QuestionType;
  article_content?: string;
  question_text: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

export default function IeltsTrainer() {
  const [question, setQuestion] = useState<IeltsQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitted' | 'correct' | 'wrong'>('idle');
  const [isSaving, setIsSaving] = useState(false);

  // --- 修复的保存历史函数 ---
  const saveHistory = useCallback(async (qId: string, ans: string, isCorrect: boolean) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('history').insert([{ 
        question_id: qId, 
        user_answer: ans, 
        is_correct: isCorrect 
      }]);
      if (error) console.error('保存历史记录失败:', error);
    } catch (err) {
      console.error('保存历史记录异常:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // --- 修复的获取题目函数 ---
  const fetchQuestionImmediate = useCallback(async () => {
    setLoading(true);
    setStatus('idle');
    setUserAnswer('');
    
    try {
      const { data, error } = await supabase.rpc('get_random_question');
      
      if (error) {
        console.error('获取题目失败:', error);
        throw error;
      }
      
      // ✅ 修复：直接使用data，不是data[0]
      if (data) {
        setQuestion(data);
      } else {
        setQuestion(null);
      }
    } catch (err) {
      console.error('获取题目异常:', err);
      setQuestion(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- 修复的防抖调用 ---
  const debouncedFetchQuestion = useMemo(
    () => simpleDebounce(fetchQuestionImmediate, 300),
    [fetchQuestionImmediate]
  );

  // --- 修复的提交逻辑 ---
  const handleSubmit = useCallback(async () => {
    if (!question || !userAnswer.trim()) return;

    const cleanedUserAns = userAnswer.trim();
    const cleanedCorrectAns = question.correct_answer.trim();

    const isCorrect = 
      cleanedCorrectAns === cleanedUserAns || 
      cleanedCorrectAns.toLowerCase() === cleanedUserAns.toLowerCase();

    setStatus(isCorrect ? 'correct' : 'wrong');
    await saveHistory(question.id, userAnswer, isCorrect);
  }, [question, userAnswer, saveHistory]);

  // --- 初始化加载 ---
  useEffect(() => {
    debouncedFetchQuestion();
  }, [debouncedFetchQuestion]);

  // --- 键盘快捷键 ---
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (status === 'idle' && userAnswer.trim()) {
          e.preventDefault(); 
          handleSubmit();
        }
      }

      if (e.key === ' ') {
        if (status !== 'idle') {
          e.preventDefault(); 
          debouncedFetchQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [status, userAnswer, handleSubmit, debouncedFetchQuestion]);

  // --- 渲染逻辑 ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-500 text-sm font-medium">正在从云端题库抽题...</p >
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <AlertCircle size={48} className="mb-4 text-slate-300" />
        <p>题库里好像没有题目了，请先添加一些活跃 (is_active=true) 的题目吧。</p >
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-800 font-sans py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-6 sticky top-0 z-20 py-2 bg-[#f8f9fa]/90 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">雅</div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">IELTS Trainer (雅思特训)</h1>
          </div>
          <div className="text-xs font-medium text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            {question.type === 'multiple_choice' ? '阅读 / 选择题' : '听力 / 填空题'}
          </div>
        </header>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 左侧：文章区域 */}
          {question.article_content && (
            <div className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[50vh] lg:h-[calc(100vh-140px)] overflow-y-auto">
              <div className="flex items-center gap-2 mb-4 text-indigo-600 sticky top-0 bg-white pb-2 border-b border-dashed border-slate-100">
                <BookOpen size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">阅读原文</span>
              </div>
              {/* ✅ 修复：拼写错误 */}
              <article 
                className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-sm sm:text-base font-serif"
                dangerouslySetInnerHTML={{ __html: question.article_content }} 
              />
            </div>
          )}

          {/* 右侧：答题区域 */}
          <div className={`${question.article_content ? 'lg:col-span-6' : 'lg:col-span-8 lg:col-start-3'} flex flex-col gap-6`}>
            
            <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 border border-white overflow-hidden ring-1 ring-slate-100 relative">
              
              <div className="p-6 sm:p-8">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900 mb-8 leading-snug">
                  {question.question_text}
                </h2>

                <div className="space-y-3">
                  {question.type === 'multiple_choice' && question.options ? (
                    question.options.map((opt, idx) => {
                      const isSelected = userAnswer === opt;
                      const isDimmed = status !== 'idle' && !isSelected;
                      
                      return (
                        <label 
                          key={idx}
                          className={`
                            group flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
                            ${status !== 'idle' ? 'pointer-events-none' : 'hover:border-indigo-200 hover:bg-indigo-50/30'}
                            ${isSelected ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-white'}
                            ${isDimmed ? 'opacity-50 grayscale' : 'opacity-100'}
                          `}
                        >
                          <input
                            type="radio"
                            name="option"
                            value={opt}
                            checked={isSelected}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 accent-indigo-600"
                          />
                          <span className={`ml-3 text-sm sm:text-base ${isSelected ? 'text-indigo-900 font-medium' : 'text-slate-600 group-hover:text-slate-900'}`}>
                            {opt}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="relative">
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        disabled={status !== 'idle'}
                        placeholder="请输入答案..."
                        className="w-full p-4 text-lg bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-0 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>
                  )}
                </div>

                {status === 'idle' && (
                  <button
                    onClick={handleSubmit}
                    disabled={!userAnswer.trim()}
                    className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:shadow-none active:scale-[0.98]"
                  >
                    提交答案 (Enter)
                    {isSaving && <Loader2 size={20} className="animate-spin" />}
                  </button>
                )}
              </div>

              {status !== 'idle' && (
                <div className={`
                  border-t px-6 py-6 sm:px-8
                  ${status === 'correct' ? 'bg-green-50/60 border-green-100' : 'bg-red-50/60 border-red-100'}
                `}>
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-1 rounded-full shrink-0 ${status === 'correct' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {status === 'correct' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg font-bold mb-2 ${status === 'correct' ? 'text-green-800' : 'text-red-800'}`}>
                        {status === 'correct' ? '回答正确！' : '回答错误'}
                      </h3>
                      
                      {status === 'wrong' && (
                        <div className="mb-4 inline-block bg-white border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm shadow-sm">
                          正确答案��：
                          <span className="font-bold ml-1 text-lg">{question.correct_answer}</span>
                        </div>
                      )}

                      {question.explanation && (
                        <div className={`
                          text-sm leading-relaxed text-slate-600 bg-white/80 p-4 rounded-lg border
                          ${status === 'correct' ? 'border-green-200/50' : 'border-red-200/50'}
                        `}>
                          <span className="font-bold text-slate-800 block mb-1">解析：</span>
                          {question.explanation}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={debouncedFetchQuestion}
                      className="group flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium rounded-lg transition-all shadow-sm active:bg-slate-100"
                    >
                      下一题 (Space)
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}