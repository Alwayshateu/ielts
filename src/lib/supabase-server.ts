// src/lib/supabase-server.ts
// ⚠️ 放弃封装。这个文件现在只负责导入和导出必要的工具。
export { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
// 我们不需要在这里导入 cookies，让调用者 (page.tsx) 自己去导入。