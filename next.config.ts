import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Tidak membocorkan teknologi server lewat header X-Powered-By.
  poweredByHeader: false,
};

export default nextConfig;
