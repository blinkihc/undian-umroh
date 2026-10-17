import type { NextConfig } from 'next';

/**
 * Header keamanan dasar (SECURITY §5). Content-Security-Policy berbasis nonce per permintaan
 * ditambahkan di tiket hardening karena harus diuji bersama Layar Undian, PDF, dan PWA.
 * Caddy menambahkan header yang sama di produksi; keduanya tidak bertentangan.
 */
const HEADER_KEAMANAN = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-Frame-Options', value: 'DENY' },
] as const;

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Tidak membocorkan teknologi server lewat header X-Powered-By.
  poweredByHeader: false,
  headers() {
    return Promise.resolve([{ source: '/:path*', headers: [...HEADER_KEAMANAN] }]);
  },
};

export default nextConfig;
