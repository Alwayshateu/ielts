import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabase = createRouteHandlerClient({
    cookies: async () => cookies(),
  });

  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
