import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // 获取 session
  const { data: { session } } = await supabase.auth.getSession();

  // 去掉尾斜杠，避免 /dashboard/ 和 /dashboard 不一致
  const path = req.nextUrl.pathname.replace(/\/$/, '');

  // 已登录用户访问 login 或 signup → 跳 dashboard
  if (session && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 未登录访问 dashboard → 跳 login
  if (!session && path.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 未登录访问根路径 → 跳 login
  if (!session && path === '/') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/login',
    '/signup',
    '/practice/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)'
  ],
};
