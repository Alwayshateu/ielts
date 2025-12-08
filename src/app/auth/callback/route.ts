import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: Request) {
  // Magic Link 回调 URL: /auth/callback?code=xxxx
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 注意：这里的 cookies() 是同步获取，不要 await！
  const cookieStore = cookies();

  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // 用 code 换 session（核心步骤）
  await supabase.auth.exchangeCodeForSession(code);

  // 登录成功后重定向
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
