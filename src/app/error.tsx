'use client';

/**
 * Route-level error boundary. Catches render/data errors thrown by any page
 * segment below the root layout and offers a retry (re-runs the segment's
 * server render) plus an escape hatch home, instead of Next's bare default.
 */
import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort surfacing; swap for a real reporter when observability lands.
    console.error('Route error boundary:', error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">出错了</p>
        <h1 className="mt-2 text-xl font-semibold text-tight text-ink">页面暂时无法显示</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          刚才的操作遇到一点问题。你可以重试，或先回到首页——练习记录都安全保存着。
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-[11px] text-ink-subtle">错误编号 {error.digest}</p>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong active:scale-[0.98]"
          >
            重试
          </button>
          <Link
            href="/"
            className="rounded-full border border-line bg-surface px-5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:border-accent/30 hover:bg-accent-tint hover:text-accent active:scale-[0.98]"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
