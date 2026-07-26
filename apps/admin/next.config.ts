import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@fv/ui', '@fv/shared'],
  reactStrictMode: true,
};

export default nextConfig;
