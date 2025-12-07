'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// 引入 Shuffle 图标用于综合训练
import { LogOut, BookOpen, Headphones, PenTool, Mic, Loader2, Shuffle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

// --- 更新：加入综合训练 ---
const categories = [
  // 新增：综合训练 (放在最前面或最后面，用 distinct 颜色)
  { 
    id: 'mixed', // 对应后端 SQL 的 'mixed' 逻辑
    name: '综合随机训练', 
    icon: <Shuffle />, 
    color: 'bg-indigo-600 text-white shadow-indigo-200', // 深色背景突出显示
    desc: '听/说/读/写 全题库随机抽取'
  },
  { id: 'reading', name: '阅读训练', icon: <BookOpen />, color: 'bg-blue-50 text-blue-600', desc: '专项攻克长难句与理解' },
  { id: 'listening', name: '听力训练', icon: <Headphones />, color: 'bg-purple-50 text-purple-600', desc: '磨耳朵，精听练习' },
  { id: 'writing', name: '写作训练', icon: <PenTool />, color: 'bg-pink-50 text-pink-600', desc: '大作文与小作文逻辑' },
  { id: 'speaking', name: '口语训练', icon: <Mic />, color: 'bg-orange-50 text-orange-600', desc: '口语话题模拟' },
];

const difficulties = [
  { id: 'easy', label: '简单' },
  { id: 'medium', label: '中等' },
  { id: 'hard', label: '困难' },
];

interface Profile {
  username: string | null;
  email: string | null;
}

export default function DashboardContent({ profile }: { profile: Profile }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  
  const [loading, setLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.refresh(); 
    } catch (error) {
      console.error('Logout failed', error);
      setLoading(false);
    }
  };

  const handleStartPractice = (categoryId: string) => {
    // 无论是 mixed 还是 reading，逻辑都一样，直接传参
    const url = `/practice?category=${categoryId}&difficulty=${selectedDifficulty}`;
    router.push(url);
  };

  const displayName = profile.username || profile.email?.split('@')[0] || '学员';

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      {/* Header 和 难度选择 (保持不变) ... */}
      <header className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            你好，<span className="text-indigo-600">{displayName}</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">今天想练点什么？</p>
        </div>
        
        <button 
          onClick={handleLogout}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full text-slate-600 text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          退出登录
        </button>
      </header>

      {/* 难度选择器 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">当前难度设置</h2>
        <div className="flex gap-3">
          {difficulties.map((diff) => (
            <button
              key={diff.id}
              onClick={() => setSelectedDifficulty(diff.id)}
              className={`
                px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200
                ${selectedDifficulty === diff.id 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-200 transform scale-105' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }
              `}
            >
              {diff.label}
            </button>
          ))}
        </div>
      </div>

      {/* 分类入口 Grid */}
      <h2 className="text-lg font-bold text-slate-900 mb-5">开始练习</h2>
      
      {/* 第一行：综合训练 (独占一行，或者做成大卡片) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* 映射所有卡片 */}
        {categories.map((cat) => {
          // 判断是否是综合训练，给它特殊的样式处理
          const isMixed = cat.id === 'mixed';

          return (
            <button
              key={cat.id}
              onClick={() => handleStartPractice(cat.id)}
              className={`
                group relative flex flex-col justify-between p-6 rounded-3xl border transition-all duration-300 text-left
                ${isMixed 
                  ? 'md:col-span-2 lg:col-span-1 bg-gradient-to-br from-indigo-600 to-violet-600 border-transparent text-white shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:scale-[1.02]' 
                  : 'bg-white border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-lg hover:border-indigo-100 text-slate-900'
                }
              `}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl
                  ${isMixed ? 'bg-white/20 text-white' : `${cat.color}`}
                `}>
                  {cat.icon}
                </div>
                {isMixed && (
                  <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                    推荐
                  </span>
                )}
              </div>
              
              <div>
                <h3 className={`text-xl font-bold mb-1 ${isMixed ? 'text-white' : 'text-slate-900'}`}>
                  {cat.name}
                </h3>
                <p className={`text-sm ${isMixed ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {cat.desc}
                </p>
              </div>

              {/* 装饰性箭头 */}
              <div className={`absolute bottom-6 right-6 transition-transform duration-300 group-hover:translate-x-1
                ${isMixed ? 'text-white/60' : 'text-slate-300'}
              `}>
                <ArrowIcon />
              </div>
            </button>
          )
        })}
      </div>
    </div>
  );
}

// 简单的箭头图标组件
function ArrowIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  );
}