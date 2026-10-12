import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactElement, ReactNode } from 'react';

import { JUDUL_ACARA_DEFAULT } from '@/config/brand';

import './globals.css';

// Font di-host lokal (tanpa CDN) agar tetap tersedia saat offline.
const plusJakartaSans = localFont({
  src: './fonts/plus-jakarta-sans-latin-wght-normal.woff2',
  variable: '--font-plus-jakarta',
  weight: '200 800',
  display: 'swap',
});

const inter = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
});

const jetBrainsMono = localFont({
  src: './fonts/jetbrains-mono-latin-wght-normal.woff2',
  variable: '--font-jetbrains-mono',
  weight: '100 800',
  display: 'swap',
});

export const metadata: Metadata = {
  title: JUDUL_ACARA_DEFAULT,
  description:
    'Undian umroh untuk wajib pajak PBB-P2 Kabupaten Ogan Komering Ulu Selatan yang melunasi pajak tahun 2022 sampai 2026, diselenggarakan oleh Bapenda.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} ${inter.variable} ${jetBrainsMono.variable}`}
    >
      <body className="bg-neutral-0 text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
