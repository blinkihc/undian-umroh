# Task Checklist — Undian Umroh PBB OKU Selatan

> Status: Draf v0.1 (2026-10-11). Daftar pekerjaan membangun aplikasi MVP dari 17 dokumen di `docs/` dan mockup `design/undian-umroh.pen`.
> Centang `[x]` saat selesai dan terverifikasi. Jangan mencentang bila tes/build belum lulus.
> Aturan kerja agen: `AGENTS.md`. Urutan prioritas dokumen bila bertentangan: `DECISIONS.md` → `PRD.md` → `SECURITY.md` → `API.md`/`DATABASE.md` → lainnya.

## Ringkasan Progres

| Tahap | Pekerjaan | Status |
|---|---|---|
| A | Dokumentasi dan desain | Selesai |
| 0 | Siapkan repositori | Belum |
| 1 | Fondasi proyek, token desain, branding | Belum |
| 2 | Modul domain murni | Belum |
| 3 | Database, autentikasi, peran, audit | Belum |
| 4 | Modul `package` dan `draw` | Belum |
| 5 | Periode, impor, laporan validasi, pemetaan wilayah | Belum |
| 6 | Kunci snapshot dan paket undian | Belum |
| 7 | Layar Undian PWA offline (jalur kritis) | Belum |
| 8 | Unggah hasil, verifikasi, status pemenang | Belum |
| 9 | Berita acara, ekspor, publikasi | Belum |
| 10 | Halaman publik | Belum |
| 11 | Tema bawaan dan pustaka aset | Belum |
| 12 | Hardening, deploy, gladi bersih | Belum |

Urutan dan ketergantungan:
- 1 → 2 dan 3 (paralel) → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 12
- 11 harus selesai sebelum finalisasi 7 (paket memuat tema); dapat dikerjakan paralel setelah 3.
- 10 membutuhkan 5 (data) dan 9 (publikasi).

## Persetujuan yang Dibutuhkan Sebelum Mulai

- [x] Repo git: `git init` terpisah di `d:\Code\undian-umroh` (repo induk `D:/Code` tidak diubah) — disetujui; dikerjakan di tiket 01
- [x] Kode aplikasi diletakkan di akar `d:\Code\undian-umroh` (`src/`, `prisma/`, `tests/`) berdampingan dengan `docs/` dan `design/` — disetujui
- [x] Aturan commit: agen tidak commit sendiri; commit dibuat per task setelah persetujuan — disetujui

## Tiket

Pekerjaan di bawah ini dipecah ulang menjadi 28 tiket irisan vertikal (masing-masing dapat dicoba sendiri) di `.scratch/mvp-undian-umroh/issues/`, satu berkas per tiket, berurutan sesuai ketergantungan. Berkas tiket menyebut tiket yang menghalanginya ("Blocked by"). Daftar Task 0–12 di bawah tetap berfungsi sebagai checklist rincian; jika keduanya berbeda, tiket yang berlaku.

| Task di bawah | Tiket |
|---|---|
| Task 0, 1 | 01 |
| Task 3 | 02, 03 |
| Task 5 (periode) | 04 |
| Task 2, 5 (impor) | 05, 06, 07, 08, 09 |
| Task 4 (hash), 6 | 10, 11 |
| Task 4 (draw), 7 | 12, 13, 14, 15, 16 |
| Task 4 (verifikasi), 8 | 17, 18 |
| Task 9 | 19, 20 |
| Task 10 | 21, 22 |
| Task 11 | 23, 24 |
| Task 12 | 25, 26, 27, 28 |

## Tahap A — Dokumentasi dan Desain

- [x] Batch 1: `PRD.md`, `UX_FLOWS.md`, `DESIGN_SYSTEM.md`
- [x] Batch 2: `ARCHITECTURE.md`, `DATABASE.md`, `API.md`, `SECURITY.md`, `CODE_STYLE.md`, `TESTING.md`, `AGENTS.md`
- [x] Batch 3: `DECISIONS.md`, `ROADMAP.md`, `ENVIRONMENT.md`, `ERROR_HANDLING.md`, `DEPLOYMENT.md`, `OBSERVABILITY.md`, `CHANGELOG.md`
- [x] Mockup 11 layar di `design/undian-umroh.pen` (Layar Undian ×6, Panel Admin ×3, Publik mobile ×2)
- [x] Judul acara diseragamkan: "Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026"
- [x] Jawaban retensi data (12 bulan) dan cek NOP sementara tercatat
- [x] Alat terpasang: Node v24.15.0, npm 11.14.1, Docker 29.2.1, git 2.54.0
- [ ] Pertanyaan terbuka PRD §12 dijawab (**ditunda atas permintaan pemilik produk; tidak memblokir build**):
  - [ ] Judul acara final
  - [ ] Template berita acara resmi
  - [ ] Penyedia AI dan anggaran
  - [ ] Tanggal dan lokasi acara
  - [ ] Pembagian kecamatan ke Wilayah 1 dan Wilayah 2
  - [ ] Saksi resmi
  - [ ] Domain dan hosting produksi

---

## Task 0 — Siapkan Repositori

Tujuan: riwayat git bersih dan terpisah dari repo induk.

- [ ] Persetujuan dari bagian "Persetujuan yang Dibutuhkan" diterima
- [ ] `git init` di `d:\Code\undian-umroh`
- [ ] `.gitignore`: `.scratch` (folder tiket), `node_modules`, `.next`, `.env*` (kecuali `.env.example`), `.storage`, `.backups`, `*.log`, `coverage`, `playwright-report`
- [ ] Commit awal berisi `docs/` dan `design/` apa adanya
- [ ] Verifikasi: `git status` bersih dan `git log` menampilkan satu commit; repo induk tidak berubah

---

## Task 1 — Fondasi Proyek, Token Desain, dan Branding

Rujukan: `ARCHITECTURE.md` §3, §7–8 · `CODE_STYLE.md` · `DESIGN_SYSTEM.md` §3–7 · `ENVIRONMENT.md` · `TESTING.md` §3, §7

Implementasi:
- [x] Inisialisasi Next.js (App Router) + TypeScript `strict` + `noUncheckedIndexedAccess`; paket di-pin exact
- [x] Tailwind dengan token warna, font, spasi, radius, bayangan dari `DESIGN_SYSTEM.md`
- [x] Font di-host lokal: Plus Jakarta Sans, Inter, JetBrains Mono (tanpa CDN)
- [x] ESLint (flat config): `import/order`, `no-restricted-imports` (batas `src/lib`, `server-only`), `no-restricted-properties` (`Math.random` di draw dan offline), `no-console`, `react/no-danger`
- [x] Prettier + plugin Tailwind; `npm run format`
- [x] Vitest (node dan jsdom) dan Playwright (Chromium/Edge)
- [x] `docker-compose.test.yml` untuk PostgreSQL test (port 5433)
- [x] `.env.example` lengkap dan `src/config/env.ts` (zod, gagal cepat)
- [x] Salin logo ke `public/brand/logo-okus.png` dan `logo-bapenda.png`
- [x] Layout dasar: header logo Pemkab + Bapenda, beranda publik placeholder bahasa Indonesia, `lang="id"`
- [ ] Skrip `package.json` sesuai `TESTING.md` §7: `lint`, `typecheck`, `test`, `test:unit`, `test:int`, `test:e2e`, `test:coverage`, `build`, `format`, `db:*`

Tes dan verifikasi:
- [x] Smoke test Vitest lulus
- [x] Satu tes Playwright membuka beranda
- [x] `npm run lint`, `typecheck`, `build` lulus
- [ ] `npm run dev` menampilkan beranda bermerek (diverifikasi pengguna)

---

## Task 2 — Modul Domain Murni (`src/lib/domain`)

Rujukan: `PRD.md` §6.0 · `TESTING.md` §2 · `DECISIONS.md` 001, 004–006

Implementasi:
- [ ] Tipe `Result` dan konstanta kode alasan (`NOP_INVALID`, `NOP_DUPLICATE`, `NAMA_KOSONG`, `KECAMATAN_KOSONG`, `FORMAT_BARIS`, `TANGGAL_*`, `LEWAT_BATAS_*`)
- [ ] `normalizeNop`, `formatNop`, `maskNop`
- [ ] `isValidNik`, `maskNik`
- [ ] `normalizeKecamatan`
- [ ] `parseTanggalLunas` (zona WIB; `dd/mm/yyyy HH:MM:SS`, `dd/mm/yyyy`, `dd-mm-yyyy`, ISO, serial Excel)
- [ ] `evaluateEligibility(row, { batasLunas })` dengan semua alasan terkumpul
- [ ] Halaman pengembangan `/admin/dev/cek-baris` (sementara; dihapus di Task 12)

Tes:
- [ ] Tabel kasus NOP, NIK, tanggal (kabisat, 31/04, format AS, serial Excel)
- [ ] Syarat: PBB 2025 dibayar April 2026 → lolos; batas 30/09/2026 23:59:59 inklusif; 01/10/2026 → `LEWAT_BATAS_2026`; tanggal sebelum tahun pajak; kolom kosong; banyak alasan sekaligus; timestamp identik tetap lolos
- [ ] Coverage `src/lib/domain` ≥ 95%
- [ ] Tidak ada import dari server/UI/Prisma/`node:*` (lint lulus)

---

## Task 3 — Database, Autentikasi, Peran, dan Audit

Rujukan: `DATABASE.md` · `SECURITY.md` §1–2, §5, §7 · `CODE_STYLE.md` §7 · `OBSERVABILITY.md`

Implementasi:
- [ ] `prisma/schema.prisma` lengkap sesuai `DATABASE.md` (enum, 15 tabel, indeks)
- [ ] Migrasi awal + SQL manual: trigger immutable (`snapshot`, `snapshot_peserta`, `hasil_undian`, `audit_log`), indeks unik parsial `periode_satu_aktif`
- [x] Auth.js credentials + argon2id; sesi JWT httpOnly; cek akun aktif ke DB tiap request
- [x] `must_change_password` dan halaman ganti kata sandi
- [x] `requireUser`, `requireRole`, `withHandler`, `AppError`, pemetaan error Prisma/zod
- [x] Rate limit login (5 gagal/15 menit); pengecekan `Origin` pada mutasi
- [x] pino + `redact`; `requestId` dan header `X-Request-Id`
- [x] Helper `audit()` dalam transaksi
- [x] Seed Admin dari env; `db:seed` idempoten
- [ ] Halaman: ~~login, ganti kata sandi~~ _(selesai tiket 02)_, kelola pengguna (tambah, nonaktifkan, reset), log audit (filter)
- [x] `/api/health`
- [x] Header keamanan dasar

Tes:
- [x] RBAC: ADMIN dan OPERATOR pada endpoint yang sudah ada; akses tanpa sesi → 401
- [x] Login gagal beruntun terblokir; akun nonaktif kehilangan akses segera
- [x] `Origin` asing → 403
- [x] UPDATE/DELETE langsung via SQL pada tabel immutable ditolak trigger _(baru `audit_log`; tabel lain di tiketnya)_
- [x] Setiap mutasi menulis tepat satu baris audit
- [ ] Demo: Admin membuat akun Operator; Operator ditolak di `/admin`

---

## Task 4 — Modul `package` dan `draw`

Rujukan: `API.md` §4–5 · `ARCHITECTURE.md` §4, §6.4 · `SECURITY.md` §9 · `DECISIONS.md` 003, 010, 015

Implementasi:
- [ ] `canonicalStringify` dan `sha256Hex` (Web Crypto; sama di Node dan browser)
- [ ] Skema zod `.strict()`: `Meta`, `Snapshot`, `Hasil`, `Manifest`, `ThemeConfig`
- [ ] `buildHasil` dan `verifyHasil` (10 pemeriksaan berurutan)
- [ ] `secureRandomInt` dengan rejection sampling; RNG dapat diinjeksi untuk tes
- [ ] `SLOT_URUTAN`, `createDrawState`, `drawNext`, `serializeDrawState` / deserialisasi
- [ ] `applyGugur` (cadangan naik, `PERLU_KEPUTUSAN`)
- [ ] `scripts/simulate-draw.ts` dan `npm run simulate-draw`

Tes:
- [ ] Hash deterministik; satu karakter berubah → hash berbeda; urutan kunci tidak berpengaruh
- [ ] Rejection sampling diuji dengan RNG tiruan
- [ ] 10.000 simulasi: tidak ada peserta ganda, wilayah selalu sesuai slot, 6 slot berurutan
- [ ] Chi-square pada pool 10 (df=9, < 27,88; `retry: 2`)
- [ ] Resume dari state serial; pool wilayah < 3 → error
- [ ] Setiap manipulasi hasil ditolak dengan kode pemeriksaan yang tepat
- [ ] Skema menolak field tambahan; snapshot tidak memuat `nik`/`nop` utuh
- [ ] Coverage `src/lib/package` dan `src/lib/draw` ≥ 95%
- [ ] Demo: `npm run simulate-draw` mencetak 6 pemenang dari data dummy

---

## Task 5 — Periode, Impor, Laporan Validasi, dan Pemetaan Wilayah

Rujukan: `PRD.md` F1–F2 · `UX_FLOWS.md` Flow 2–4 · `API.md` §2 · mockup "Data Peserta" dan "Pemetaan Wilayah"

Implementasi:
- [ ] Service dan API periode (buat, ubah, batal, daftar, detail); satu periode aktif; optimistic concurrency `version`
- [ ] Pembuatan otomatis 2 `wilayah` per periode
- [ ] Unggah impor: cek ukuran, ekstensi, MIME, magic bytes; batas 20 MB, 100.000 baris, XLSX ≤ 200 MB tak terkompresi
- [ ] Parser CSV (`;`, UTF-8 dengan fallback Windows-1252) dan XLSX (exceljs); semua sel dibaca sebagai teks
- [ ] Validasi header 12 kolom (tidak peka huruf besar/kecil dan spasi)
- [ ] Pipeline evaluasi per baris + deteksi NOP ganda
- [ ] Enkripsi NIK AES-256-GCM (`nik_enc`) dan `nik_masked`
- [ ] Simpan `createMany` per 1.000 baris dalam satu transaksi; impor ulang mengganti data; pemetaan lama dipertahankan
- [ ] Ringkasan impor (disimpan) dan endpoint ringkasan/peserta (filter, pencarian, paginasi)
- [ ] Ekspor daftar gugur ke Excel (netralkan sel formula)
- [ ] Pemetaan kecamatan ke wilayah, saran "mungkin sama dengan", nama wilayah dapat diedit
- [ ] Evaluasi ulang saat `batasLunas` diubah (hanya Draf)
- [ ] `scripts/generate-fixture.ts` dan fixture `tests/fixtures/peserta-dummy.csv/.xlsx`, `peserta-header-salah.csv`
- [ ] UI: dasbor periode, form periode, halaman Data Peserta (kartu ringkasan, filter, tabel, banner), halaman Wilayah

Tes:
- [ ] Fixture campuran mencakup semua kode alasan
- [ ] Header salah → `400 HEADER_TIDAK_SESUAI`, 0 baris tersimpan
- [ ] Impor ulang mengganti data; NIK 16 digit utuh setelah dekripsi
- [ ] Impor pada periode bukan Draf → 409
- [ ] 46.000 baris sintetis selesai < 60 detik (`@slow`)
- [ ] Satu kecamatan hanya satu wilayah; mengubah `batasLunas` memicu evaluasi ulang
- [ ] Demo: unggah fixture, lihat laporan lolos/gugur beserta alasan, petakan kecamatan

---

## Task 6 — Kunci Snapshot dan Paket Undian

Rujukan: `PRD.md` F3–F4 · `UX_FLOWS.md` Flow 5, 7 · `API.md` §4.2–4.4

Implementasi:
- [ ] Prasyarat kunci: semua kecamatan terpetakan, tanpa NOP ganda, ≥ 3 peserta lolos per wilayah
- [ ] Penomoran `urut` (NOP naik), `snapshot.json` kanonik, SHA-256, penulisan `snapshot/<periodeId>.json`
- [ ] Transaksi kunci: `snapshot`, `snapshot_peserta`, status Terkunci, audit; konfirmasi ketik judul; dua kunci bersamaan → satu berhasil
- [ ] Setelah kunci: impor, ubah batas, ubah pemetaan → `409 PERIODE_TERKUNCI`
- [ ] Pembatalan periode (Draf atau Terkunci tanpa hasil) dengan alasan
- [ ] Penyusunan paket `.zip` (fflate, di-stream): `manifest.json`, `meta.json`, `snapshot.json`, `tema/theme.json`, `tema/aset/*`
- [ ] Verifikasi ulang hash file saat menyusun paket; riwayat `paket_unduhan`
- [ ] UI: tab Kunci Data (checklist prasyarat, dialog konfirmasi, tampilan hash 8 karakter awal/akhir), tab Paket Undian

Tes:
- [ ] Hash snapshot deterministik dan sama dengan sha256 file
- [ ] Mutasi setelah kunci ditolak; kunci bersamaan → satu `200`, satu `409`
- [ ] Zip lolos manifest; pemindaian regex 16 dan 18 digit tidak menemukan apa pun
- [ ] Prasyarat gagal → `422 PRASYARAT_KUNCI_BELUM_LENGKAP` dengan rincian
- [ ] Demo: kunci periode, hash tampil, unduh paket

---

## Task 7 — Layar Undian PWA Offline (Jalur Kritis)

Rujukan: `PRD.md` F5 · `UX_FLOWS.md` Flow 8–10 · `DESIGN_SYSTEM.md` §16 · `ARCHITECTURE.md` §6.4 · `DECISIONS.md` 002, 003, 021 · mockup Layar Undian

Implementasi:
- [ ] Service worker (serwist): precache shell, font, ikon; halaman `/operator/undian` dapat dibuka offline
- [ ] Penyimpanan IndexedDB (`idb`): meta, peserta per wilayah, tema, aset (Blob), state undian, hasil slot, `catatanLokal`, ID perangkat
- [ ] Pemuat paket: unzip, validasi skema, cek manifest, cek `sha256(snapshot)` = `snapshotHash`, simpan; status "Siap Offline"
- [ ] Penanganan paket periode lain dan penyimpanan penuh
- [ ] Mesin layar undian: Menunggu → Mengacak → Menyimpan → Pemenang → Ringkasan
- [ ] Pemenang ditentukan RNG saat Berhenti, **disimpan ke IndexedDB sebelum ditampilkan**
- [ ] Animasi `slot-mesin` (sampel maks. 200 peserta, hanya `transform`/`opacity`) berakhir di pemenang yang sudah ditentukan
- [ ] Pemulihan setelah refresh/crash (banner "Melanjutkan undian…"; slot ditampilkan ulang bila crash di fase Pemenang)
- [ ] Pintasan: `Spasi`, `→`, `F`, `M`, `H`; bilah kontrol dapat disembunyikan
- [ ] Audio tiga fase (fade 300 ms), overlay "Klik untuk mengaktifkan suara"
- [ ] Kartu pemenang dan ringkasan akhir sesuai mockup (hash 8 karakter awal/akhir + hash lengkap)
- [ ] `buildHasil` dan unduh `hasil-undian-<slug>-<8hex>.json`
- [ ] Tombol "Hapus Data Undian" (setelah hasil terunggah)
- [ ] Hormati `prefers-reduced-motion`

Tes:
- [ ] E2E offline (`context.setOffline(true)`): 6 slot, 6 pemenang unik sesuai wilayah, file hasil lolos `verifyHasil`
- [ ] Reload di tengah undian dan saat fase Pemenang: pemenang tidak berubah
- [ ] Paket dimanipulasi → ditolak, IndexedDB tidak berubah
- [ ] Tidak ada request jaringan yang memblokir undian
- [ ] Demo: matikan Wi-Fi, muat paket, jalankan 6 slot, file hasil terunduh

---

## Task 8 — Unggah Hasil, Verifikasi, dan Status Pemenang

Rujukan: `PRD.md` F7–F8 · `UX_FLOWS.md` Flow 11–12 · `API.md` §4.5–4.6 · `DECISIONS.md` 007

Implementasi:
- [ ] `POST /api/periode/:id/hasil` (Admin dan Operator): `verifyHasil` 10 pemeriksaan; cek ulang `BELUM_ADA_HASIL` dalam transaksi
- [ ] Simpan `hasil_undian` dan 6 `slot_hasil`; status Diundi; salinan file ke `STORAGE_DIR/hasil`
- [ ] Unggahan kedua → `409 HASIL_SUDAH_DIUNGGAH`; semua penolakan tercatat `HASIL_DITOLAK`
- [ ] Halaman Unggah Hasil dengan daftar pemeriksaan bertahap dan tabel 6 slot + hash hasil
- [ ] Halaman Pemenang: dua panel wilayah, penerima aktif, verifikasi, gugur + alasan, riwayat status
- [ ] Kenaikan cadangan otomatis (`applyGugur`); wilayah `PERLU_KEPUTUSAN` bila ketiganya gugur
- [ ] Periode Final saat kedua wilayah punya penerima Terverifikasi
- [ ] Aksi "Tampilkan NIK" (Admin, kandidat saja, alasan wajib, `no-store`, audit `PEMENANG_LIHAT_NIK`)

Tes:
- [ ] Setiap jenis manipulasi ditolak dengan `details.pemeriksaan` yang tepat
- [ ] Unggah kedua ditolak dan tercatat
- [ ] Utama gugur → C1 naik; C1 gugur sebelum utama diputuskan lalu utama gugur → C2 naik; ketiganya gugur → `PERLU_KEPUTUSAN`
- [ ] `version` basi → 409; Operator tidak bisa mengakses endpoint pemenang
- [ ] Demo: unggah hasil dari Task 7, tandai pemenang W1 gugur, cadangan 1 naik

---

## Task 9 — Berita Acara, Ekspor, dan Publikasi

Rujukan: `PRD.md` F9 · `UX_FLOWS.md` Flow 13–14

Implementasi:
- [ ] Form berita acara (nomor, tempat, hari/tanggal, dasar kegiatan, panitia ≤ 5, saksi ≤ 5) dan simpan
- [ ] PDF A4 (`@react-pdf/renderer`): kop berlogo, hari/tanggal/tempat, jumlah peserta per wilayah, `snapshotHash`, hash hasil, tabel pemenang dan cadangan (tersamar, status terkini), kolom tanda tangan
- [ ] Ekspor Excel pemenang dan log audit (netralkan sel formula)
- [ ] Publikasi (konfirmasi + pratinjau), status Dipublikasi, audit
- [ ] Aturan satu periode aktif: periode Dipublikasi/Dibatalkan melepas kunci

Tes:
- [ ] Teks kunci PDF: judul, hash, nama penerima; PDF tidak memuat NIK utuh
- [ ] Isi Excel sesuai dan sel berawalan `=`/`+`/`-`/`@` dinetralkan
- [ ] Perubahan status pemenang setelah publikasi tercermin di PDF terbaru
- [ ] Demo: unduh berita acara PDF, publikasikan hasil

---

## Task 10 — Halaman Publik

Rujukan: `PRD.md` F10 · `UX_FLOWS.md` Flow 14–15 · `API.md` §3 · `SECURITY.md` §5–6 · `DECISIONS.md` 017, 020 · mockup Publik mobile

Implementasi:
- [ ] `/pemenang`: pemenang dan cadangan per wilayah (data tersamar), status terkini, bukti integritas (hash, jumlah peserta); belum publikasi → "Hasil belum diumumkan"
- [ ] `/cek`: input NOP (normalisasi titik/strip), hasil Ikut / Tidak ikut (semua alasan) / Tidak ditemukan, label "Hasil sementara" selama belum Terkunci
- [ ] API publik dengan `select` kolom eksplisit (tanpa `SELECT *`), tanpa NIK dan alamat di `/cek`
- [ ] Rate limit (`/cek` 20/10 menit; > 60 → 429), captcha proof-of-work (HMAC, 5 menit, sekali pakai)
- [ ] Responsif ponsel; `aria-live="polite"` pada hasil
- [ ] Cache `/api/publik/pemenang` 60 detik, revalidasi saat status berubah

Tes:
- [ ] E2E viewport Pixel 7: cek NOP kasus ikut, gugur, tidak ditemukan
- [ ] Sebelum publikasi tersembunyi, sesudahnya tampil
- [ ] Regex pada semua respons publik: tidak ada 16 digit NIK dan NOP 18 digit utuh
- [ ] Rate limit memicu captcha lalu 429
- [ ] axe-core tanpa pelanggaran kritis
- [ ] Demo: masyarakat melihat daftar pemenang dan mengecek NOP

---

## Task 11 — Tema Bawaan dan Pustaka Aset

Rujukan: `PRD.md` F6 · `UX_FLOWS.md` Flow 6 · `API.md` §2 (Tema & Aset), §5 · `DESIGN_SYSTEM.md` §16 · mockup Tema Undian

Implementasi:
- [ ] Tabel `tema` dan `aset`; seed tema default "Slot Mesin Bawaan"
- [ ] Aset bawaan: 3 audio (menunggu, mengacak/drumroll, pemenang) dan latar default, berlisensi bebas royalti dengan kolom `lisensi` — **perlu disediakan pengguna**; sementara placeholder senyap
- [ ] Halaman Tema Undian: pilih tema, atur durasi, kecepatan, confetti, ornamen, audio per fase dengan pratinjau ▶, "Kembalikan Default"
- [ ] Penyimpanan aset: nama `<sha256>.<ext>`, magic bytes, batas ukuran, SVG ditolak
- [ ] Tema periode (`PUT /api/periode/:id/tema`) dan peringatan "paket perlu diunduh ulang"
- [ ] Paket memuat tema dan aset; Layar Undian memakai `ThemeConfig` (fallback ke default bila aset gagal dimuat)
- [ ] Preset animasi lain dan Asisten AI ditandai NEXT (tidak diimplementasikan)

Tes:
- [ ] `ThemeConfigSchema` menolak input tidak valid dan field tambahan
- [ ] Aset bawaan tidak dapat dihapus; aset yang dipakai tema tidak dapat dihapus
- [ ] Paket memuat aset tema; tema default dapat dirender di Layar Undian
- [ ] Demo: pilih tema, unduh paket baru, layar memakai tema tersebut

---

## Task 12 — Hardening, Deploy, dan Gladi Bersih

Rujukan: `DEPLOYMENT.md` · `SECURITY.md` §5, §8, §11 · `OBSERVABILITY.md` · `TESTING.md` §5

Implementasi:
- [ ] `docker/Dockerfile` multi-stage (standalone, user non-root, tanpa `.env`)
- [ ] `docker-compose.yml` (`app`, `db`, `caddy`), `docker/Caddyfile`, healthcheck, rotasi log
- [ ] CSP berbasis nonce dan security header lengkap; uji dengan `curl -I`
- [ ] `scripts/backup.sh`, `scripts/watch.sh`; uji restore ke instance uji
- [ ] Rate limiter, trigger immutable, RBAC ditinjau ulang terhadap matriks `SECURITY.md` §2
- [ ] Hapus halaman pengembangan Task 2
- [ ] `README.md` operasional (admin dan operator) dalam Bahasa Indonesia
- [ ] `tests/e2e/gladi-bersih.spec.ts`: impor → kunci → paket → undian offline → unggah → gugur → berita acara → publikasi
- [ ] Checklist `SECURITY.md` §11 dan `DEPLOYMENT.md` Production Checklist dijalankan
- [ ] `npm audit --omit=dev` ditinjau; `CHANGELOG.md` versi rilis dicatat

Tes dan verifikasi:
- [ ] Seluruh suite lulus pada build produksi (`lint`, `typecheck`, `test:unit`, `test:int`, `build`, `test:e2e`)
- [ ] Coverage `src/lib` ≥ 95%
- [ ] Port 5432 tidak terjangkau dari luar; HTTPS dan HSTS aktif
- [ ] Restore backup berhasil
- [ ] **Gladi bersih penuh offline di laptop acara asli** dengan proyektor dan speaker (FPS ≥ 50, Berhenti → kartu ≤ 3 detik, satu kali tutup paksa browser), hasil terunggah ke staging

---

## Backlog NEXT dan LATER (di luar MVP)

Rujukan: `ROADMAP.md`

NEXT:
- [ ] Preset animasi Roda Nama, Kartu Berputar, Ticker NOP + pemilihan tema
- [ ] Unggah aset kustom (audio, gambar latar)
- [ ] Asisten AI untuk tema (menunggu penyedia AI)
- [ ] Ekspor Excel tambahan dan editor berita acara yang lebih lengkap
- [ ] Cadangan hasil parsial per slot (unduhan otomatis)
- [ ] Anonimisasi terjadwal (retensi 12 bulan)

LATER:
- [ ] Generate musik dengan AI
- [ ] Tanda tangan digital paket dan hasil
- [ ] Skrip rotasi `NIK_ENCRYPTION_KEY`
- [ ] Rate limiter bersama (PostgreSQL/Redis)
- [ ] Tabel pelunasan fleksibel (rentang tahun selain 2022–2026)
- [ ] Riwayat banyak periode dan statistik kepatuhan
- [ ] Template berita acara resmi yang dapat diunggah
- [ ] Autentikasi dua langkah untuk Admin
- [ ] Impor hasil parsial dari file cadangan

---

## Definition of Done (berlaku di setiap task)

- [ ] Persyaratan task terpenuhi sesuai dokumen rujukan
- [ ] `npm run lint`, `typecheck`, `test:unit`, `test:int`, `build` lulus (dan `test:e2e` bila menyentuh alur kritis)
- [ ] Coverage modul `src/lib` ≥ 95%
- [ ] Tidak ada NIK/NOP utuh di paket, file hasil, respons publik, log, atau fixture
- [ ] Tidak ada file yang berubah di luar cakupan task (`git diff` ditinjau)
- [ ] Alur yang menyentuh Layar Undian diverifikasi bekerja offline
- [ ] Dokumen terkait diperbarui bila perilaku, skema, API, atau variabel lingkungan berubah; keputusan baru dicatat di `DECISIONS.md`
- [ ] Task dicentang di file ini dan, bila diminta pengguna, di-commit
