import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@fv/ui', '@fv/shared'],
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();

