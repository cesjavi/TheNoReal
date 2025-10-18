import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const isDev = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,

  // Static Export (Next 15+)
  output: 'export',
  images: { unoptimized: true }, // requerido para export estático
};

export default withPWA({ dest: 'public', disable: isDev })(nextConfig);
