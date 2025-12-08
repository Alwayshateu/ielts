'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Next.js 路由
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'; // 引入我们封装的
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';



export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  
  const router = useRouter();
  

  // 处理登录 (Magic Link 方式，最简单且无需密码逻辑)
  // 或者如果你想用密码登录，我可以改。这里先写最通用的邮箱登录。
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createSupabaseBrowserClient();
    // 发送登录链接 (Magic Link)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // 登录成功后跳转到 dashboard
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: '登录链接已发送！请查收您的邮箱。' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] px-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto shadow-lg shadow-indigo-200 mb-5">
            雅
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">欢迎回来</h1>
          <p className="text-slate-500 text-sm mt-2">IELTS Trainer - 您的雅思备考私教</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
              邮箱地址
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : '发送登录链接'}
          </button>
        </form>

        {/* Feedback Messages */}
        {message && (
          <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 text-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span className="leading-relaxed font-medium">{message.text}</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-400">
          未注册的邮箱将自动创建新账号
        </div>
      </div>
    </div>
  );
}