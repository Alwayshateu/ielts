import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IELTS Trainer — 个人雅思训练系统',
  description: '用一个沉浸式、可复盘的训练闭环发现薄弱项并持续提升。',
};

export const viewport: Viewport = {
  themeColor: '#faf7f2',
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
