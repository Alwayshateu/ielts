import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(req: NextRequest) {
  let response = NextResponse.next();

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('Supabase environment variables not found in proxy');
    return response;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              req.cookies.set(name, value)
            );
            response = NextResponse.next({
              request: req,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    const isAuthenticated = Boolean(user);
    const path =
      req.nextUrl.pathname === '/'
        ? '/'
        : req.nextUrl.pathname.replace(/\/$/, '');
    const isProtectedPath =
      path.startsWith('/dashboard') ||
      path.startsWith('/practice') ||
      path.startsWith('/favorites') ||
      path.startsWith('/wrong-book');

    if (isAuthenticated && path === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    if (!isAuthenticated && isProtectedPath) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    return response;
  }
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/favorites/:path*',
    '/login',
    '/login/:path*',
    '/practice/:path*',
    '/wrong-book/:path*',
  ],
};
