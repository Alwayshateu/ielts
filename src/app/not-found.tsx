/**
 * Branded 404. Reached by any `notFound()` call — e.g. the practice session page
 * when a unit slug resolves to nothing — as well as unknown URLs.
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-4xl font-semibold text-tight text-ink">404</p>
        <h1 className="mt-2 text-xl font-semibold text-tight text-ink">没有找到这个页面</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          你要找的练习或页面可能已被移动或还未创建。
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong active:scale-[0.98]"
          >
            返回首页
          </Link>
          <Link
            href="/practice/sessions"
            className="rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/30 hover:bg-accent-tint hover:text-accent active:scale-[0.98]"
          >
            练习库
          </Link>
        </div>
      </div>
    </div>
  );
}
