'use client';

/**
 * Last-resort boundary for errors thrown by the root layout itself. It replaces
 * the whole document, so it must render its own <html>/<body>. Styles are inline
 * because globals.css may not have applied when this renders.
 */
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error boundary:', error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f6f6f7',
          color: '#18181b',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>应用遇到问题</h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: '#52525b' }}>
            请刷新页面重试。如果反复出现，请稍后再来——你的数据是安全的。
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              border: 'none',
              borderRadius: 999,
              background: '#4f46e5',
              color: '#fff',
              padding: '10px 22px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            刷新
          </button>
        </div>
      </body>
    </html>
  );
}
