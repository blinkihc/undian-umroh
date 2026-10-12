/** Nama aplikasi; NEXT_PUBLIC_* dibaca langsung agar ikut dibundel ke browser. */
export const NAMA_APLIKASI_DEFAULT = 'Undian Umroh PBB OKU Selatan';

/** Versi bawaan; sama dengan `version` di package.json dan .env.example. */
export const VERSI_APLIKASI_DEFAULT = '0.1.0';

export const NAMA_APLIKASI = process.env.NEXT_PUBLIC_APP_NAME ?? NAMA_APLIKASI_DEFAULT;

/** Judul acara sementara (PRD §12: judul final belum ditetapkan, kelak diatur di pengaturan). */
export const JUDUL_ACARA_DEFAULT = 'Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026';

export const PENYELENGGARA = 'Badan Pendapatan Daerah Kabupaten Ogan Komering Ulu Selatan';

/** Logo (DESIGN_SYSTEM §2). Rasio piksel asli berkas di public/brand. */
export const LOGO_OKUS = {
  src: '/brand/logo-okus.png',
  lebar: 1031,
  tinggi: 1181,
  alt: 'Lambang Pemerintah Kabupaten Ogan Komering Ulu Selatan',
} as const;

export const LOGO_BAPENDA = {
  src: '/brand/logo-bapenda.png',
  lebar: 750,
  tinggi: 259,
  alt: 'Logo Badan Pendapatan Daerah Kabupaten Ogan Komering Ulu Selatan',
} as const;
