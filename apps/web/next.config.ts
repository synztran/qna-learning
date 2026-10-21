import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@qna/database', '@qna/types', '@qna/ui'],
  reactStrictMode: true,
};

export default nextConfig;
