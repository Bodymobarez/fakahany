import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@fv/ui', '@fv/shared'],
  images: {
    // OpenNext on Cloudflare often returns 404 for `/_next/image`; use passthrough loader.
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts',
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'example.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: 'nabtio.adsolutions-eg.com' },
    ],
  },
};

export default withNextIntl(nextConfig);

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
