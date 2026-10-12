# Changelog

> Format mengikuti Keep a Changelog; versi mengikuti Semantic Versioning. Perubahan dokumen yang mengubah perilaku produk dicatat di sini.

## [Unreleased]

### Added

- Kerangka aplikasi (tiket 01): Next.js 16 App Router, TypeScript strict, Tailwind v4 dengan token `DESIGN_SYSTEM.md`, font lokal, ESLint (batas modul murni, larangan `Math.random` di area undian, larangan `console`), Prettier, Vitest (node + jsdom), Playwright, PostgreSQL tes via `docker-compose.test.yml`, validasi env gagal cepat, dan beranda publik bermerek (`lang="id"`). Versi dasar dicatat di Decision 022.

## [0.1.0] - 2026-10-11

Rilis dokumentasi dan desain awal. Belum ada kode aplikasi.

### Added

- 17 dokumen di `docs/` berbasis Vibe Coding Blueprint: `PRD`, `UX_FLOWS`, `DESIGN_SYSTEM`, `ARCHITECTURE`, `DATABASE`, `API`, `SECURITY`, `CODE_STYLE`, `TESTING`, `AGENTS`, `DECISIONS`, `ROADMAP`, `ENVIRONMENT`, `ERROR_HANDLING`, `DEPLOYMENT`, `OBSERVABILITY`, `CHANGELOG`.
- Aturan bisnis inti: syarat lunas 2022–2026, batas default 30 September 2026, pembayaran terlambat tetap sah, kode alasan gugur, 6 slot undian (1 utama + 2 cadangan per wilayah).
- Kontrak paket undian offline dan file hasil (hash SHA-256 kanonik, 10 pemeriksaan verifikasi), skema `ThemeConfig`.
- 21 keputusan arsitektur (ADR) di `DECISIONS.md`.
- Mockup 11 layar di `design/undian-umroh.pen`: Layar Undian (kartu pemenang, ringkasan akhir, halaman depan 4 preset), Panel Admin (data peserta, pemetaan wilayah, tema undian), dan Halaman Publik mobile (cek NOP: ikut dan tidak ikut).
- Aset merek: logo Pemkab OKU Selatan dan Bapenda di `design/assets/`.
- Token desain (warna, font, spasi) sebagai variabel di file desain.

### Changed

- Judul acara sementara menjadi "Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026" di seluruh dokumen dan mockup.
- Cek NOP publik aktif sejak data diimpor dengan label "Hasil sementara" sampai data dikunci.
- Retensi data peserta 12 bulan setelah publikasi, lalu anonimisasi.

### Fixed

- (tidak ada)

### Removed

- (tidak ada)
