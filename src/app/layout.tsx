import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IELTS Trainer — 个人雅思训练系统',
  description: '发现薄弱项、针对性练习、持续复盘的个人雅思训练系统',
};

export const viewport: Viewport = {
  themeColor: '#f6f6f7',
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
