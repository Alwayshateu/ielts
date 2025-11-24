import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, // 开启 React 严格模式
  experimental: {
    appDir: false, // 确保关闭 appDir 配置
  },
};

export default nextConfig;
