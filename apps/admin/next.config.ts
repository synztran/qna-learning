import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@qna/database', '@qna/types', '@qna/ui'],
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};

export default nextConfig;
