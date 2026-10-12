# Changelog

> Format mengikuti Keep a Changelog; versi mengikuti Semantic Versioning. Perubahan dokumen yang mengubah perilaku produk dicatat di sini.

## [Unreleased]

### Added

- Tabel peserta dan ekspor gugur (tiket 06): `GET /api/periode/:id/peserta` (filter status, wilayah, kecamatan, alasan, pencarian NOP/awalan nama, paginasi), `GET /api/periode/:id/peserta/ekspor-gugur` (XLSX, penetralan rumus, audit `EKSPOR_UNDUH`); `FilterPesertaSchema`, `tafsirkanPencarian`, `netralkanSelExcel`; tabel peserta, form filter GET, paginasi, skeleton dan galat di tab Data Peserta. Dependensi `exceljs` 4.4.0 (ARCHITECTURE §3).
- Impor CSV dan evaluasi syarat (tiket 05): modul murni `normalizeNop`/`formatNop`/`maskNop`, `isValidNik`/`maskNik`, `normalizeKecamatan`, `parseTanggalLunas` (WIB; `dd/mm/yyyy[ HH:MM[:SS]]`, `dd-mm-yyyy`, ISO, serial Excel), `evaluateEligibility` dengan seluruh kode alasan PRD §6.0, `periksaHeader`, `evaluasiImpor` (NOP ganda, ringkasan); tabel `impor` dan `peserta` (NIK AES-256-GCM, index unik parsial `impor_satu_aktif`); `POST /api/periode/:id/impor` (CSV UTF-8 `;`, ≤ 20 MB, satu transaksi, audit `IMPOR_BERHASIL`/`IMPOR_DITOLAK`), `GET /api/periode/:id/ringkasan`; kode galat `HEADER_TIDAK_SESUAI`, `FILE_TIDAK_VALID`; tab Data Peserta (kartu ringkasan, banner kecamatan belum terpetakan, gugur per alasan, unggah dengan kemajuan) dan tab Pengaturan di halaman periode; contoh header `/contoh/format-impor.csv`. Dependensi `papaparse` 5.7.0 (ARCHITECTURE §3).
- Kelola periode (tiket 04): tabel `periode` dan `wilayah` (W1/W2 dibuat otomatis), index unik parsial `periode_satu_aktif`, CHECK alasan wajib saat Dibatalkan; `GET/POST /api/periode`, `GET/PATCH /api/periode/:id` (optimistic concurrency, batas lunas hanya saat Draf), `POST /api/periode/:id/batal`; kode galat `PERIODE_AKTIF_SUDAH_ADA` dan `PERIODE_TERKUNCI`; audit `PERIODE_BUAT`, `PERIODE_UBAH`, `WILAYAH_NAMA_UBAH`, `PERIODE_BATAL`; daftar periode berchip status di Dasbor dan `/admin/periode`, halaman Buat Periode dan detail periode (ubah, batalkan); menu Periode; daftar dan detail periode baca-saja untuk Operator.
- Kelola pengguna dan log audit (tiket 03): `GET/POST /api/pengguna`, `PATCH /api/pengguna/:id` (aktif/nonaktif, reset kata sandi yang memaksa ganti, ubah peran) dengan `version`, aturan akun sendiri dan Admin aktif terakhir di transaksi berkunci, `GET /api/audit` dengan filter aksi, aktor, rentang tanggal WIB, dan paginasi; halaman `/admin/pengguna` dan `/admin/audit`; sidebar Panel Admin; penyaringan payload audit (field rahasia dibuang, NIK/NOP utuh disamarkan); kolom `pengguna.version`.
- Login dan peran (tiket 02): tabel `pengguna` dan `audit_log` (append-only lewat trigger), login Admin/Operator dengan Auth.js + argon2id, sesi JWT 8 jam (batas mutlak 12 jam) dengan pengecekan akun aktif ke database di setiap request, wajib ganti kata sandi pertama, pembatas 5 gagal / 15 menit, pengecekan `Origin` pada mutasi, `withHandler`/`AppError`/`audit()`/pino dengan `X-Request-Id`, seed Admin idempoten (`npm run db:seed`), `/api/health`, header keamanan dasar, serta halaman `/login`, `/akun/ganti-password`, `/admin`, dan `/operator`. Keputusan di Decision 023.
- Kerangka aplikasi (tiket 01): Next.js 16 App Router, TypeScript strict, Tailwind v4 dengan token `DESIGN_SYSTEM.md`, font lokal, ESLint (batas modul murni, larangan `Math.random` di area undian, larangan `console`), Prettier, Vitest (node + jsdom), Playwright, PostgreSQL tes via `docker-compose.test.yml`, validasi env gagal cepat, dan beranda publik bermerek (`lang="id"`). Versi dasar dicatat di Decision 022.

### Changed
- Komponen React yang diekspor wajib bertipe kembalian eksplisit dan dipaksa ESLint (CODE_STYLE §6).
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
