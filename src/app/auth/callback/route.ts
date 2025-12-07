import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    // 1. 关键修复：必须 await cookies()
    const cookieStore = await cookies();
    
    // 2. 创建 Supabase 客户端，传入 cookieStore
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // 3. 用 Code 换取 Session (登录的核心步骤)
    await supabase.auth.exchangeCodeForSession(code);
  }

  // 4. 登录成功后，跳转到 Dashboard
  // 使用 requestUrl.origin 可以自动适配 localhost 和 vercel 域名
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}