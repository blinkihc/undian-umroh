# Code Style & Conventions

> Status: Draf v0.1. Berlaku untuk seluruh kode di repositori. Struktur folder mengikuti `ARCHITECTURE.md` §7.

## 1. General Principles

- Prefer readable code
- Keep functions focused
- Avoid unnecessary abstractions
- Reuse existing components
- Reuse existing utilities
- Prefer consistency over novelty

Tambahan proyek ini:
- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`. Dilarang `any` (gunakan `unknown` + validasi zod). `@ts-ignore` dilarang; `@ts-expect-error` hanya dengan komentar alasan.
- Logika bisnis yang bisa murni **harus** murni dan diletakkan di `src/lib`.
- Satu sumber kebenaran untuk setiap aturan: kode alasan, kode slot, penyamaran, hash, skema — jangan menduplikasi konstanta atau regex di tempat lain.

---

## 2. Naming

Bahasa: **kata benda domain dalam Bahasa Indonesia, kata kerja/istilah teknis boleh Bahasa Inggris.** Contoh: `evaluateEligibility(peserta, aturan)`, `maskNop`, `drawNext`, `PesertaRow`, `buildPaket`. Teks antarmuka selalu Bahasa Indonesia.

Glosarium domain (wajib dipakai konsisten):

| Istilah kode | Arti |
|---|---|
| `periode` | penyelenggaraan undian |
| `peserta` | baris data wajib pajak/NOP |
| `wilayah` (`W1`, `W2`) | wilayah undian |
| `kecamatan`, `kelurahan` | lokasi objek pajak |
| `lunas` | tanggal lunas per tahun |
| `batasLunas` | tanggal batas pelunasan |
| `alasan` | kode alasan gugur |
| `snapshot` | daftar peserta terkunci |
| `paket` | file `.zip` untuk laptop acara |
| `hasil` | file/rekaman hasil undian |
| `slot` | salah satu dari 6 posisi undian |
| `urut` | ID peserta di snapshot (1..N) |
| `pemenang`, `cadangan`, `penerimaAktif` | status hadiah |
| `tema`, `aset` | tampilan & media Layar Undian |
| `beritaAcara` | dokumen resmi |

Components:
`PascalCase`, nama Indonesia untuk konsep domain: `KartuPemenang`, `TabelPeserta`, `ChipStatus`, `BilahKontrolUndian`. Komponen generik UI boleh Inggris bila lazim: `Button`, `Dialog`, `Input`.

Functions:
`camelCase`, diawali kata kerja: `parseTanggalLunas`, `normalizeNop`, `hitungRingkasan`, `requireRole`. Fungsi boolean diawali `is`/`has`/`can`: `isValidNik`, `canKunci`.

Variables:
`camelCase`, deskriptif: `jumlahLolos`, `snapshotHash`. Hindari singkatan selain glosarium dan `id`, `db`, `url`.

Constants:
`SCREAMING_SNAKE_CASE` untuk konstanta modul: `SLOT_URUTAN`, `BATAS_LUNAS_DEFAULT`, `UKURAN_IMPOR_MAKS`. Kode error & alasan: `SCREAMING_SNAKE` string literal union (`'LEWAT_BATAS_2026'`).

Files:
`kebab-case` untuk semua file: `kartu-pemenang.tsx`, `evaluate-eligibility.ts`, `hash.test.ts`. Konvensi Next.js tetap (`page.tsx`, `route.ts`, `layout.tsx`). Test berdampingan di `tests/` dengan nama `<modul>.test.ts` (lihat `TESTING.md`).

Types:
`PascalCase`, tanpa awalan `I`/`T`: `Peserta`, `ThemeConfig`, `HasilUndian`. Tipe dari zod: `export type Meta = z.infer<typeof MetaSchema>`.

Database fields:
Prisma `camelCase` di model, `snake_case` fisik via `@map` (`DATABASE.md` §2).

API routes:
`/api/<resource-kebab-case>` kata benda Indonesia, tunggal: `/api/periode/:id/berita-acara`. Aksi non-CRUD sebagai sub-resource kata kerja/kata benda: `/kunci`, `/publikasi`, `/batal`.

---

## 3. Folder Structure

- Ikuti `ARCHITECTURE.md` §7 persis; jangan membuat folder tingkat atas baru tanpa memperbarui dokumen itu.
- `src/lib/<modul>/index.ts` menjadi satu-satunya titik ekspor publik modul; impor dari luar modul lewat `@/lib/<modul>`.
- Satu service per agregat di `src/server/services/<nama>.ts` (mis. `periode.ts`, `impor.ts`, `hasil.ts`).
- Route handler di `src/app/api/.../route.ts` maksimal ±40 baris; logika dipindah ke service.
- Komponen per permukaan: `components/admin`, `components/undian`, `components/publik`; komponen yang dipakai ≥ 2 permukaan dipindah ke `components/ui`.
- Fixture test di `tests/fixtures/`; tidak ada data asli.

---

## 4. Imports

Rules:
- Gunakan alias `@/` (`@/lib/domain`, `@/server/services/periode`). Impor relatif hanya di dalam folder yang sama.
- Urutan (dipaksa ESLint `import/order`): bawaan Node → paket eksternal → `@/` → relatif; baris kosong antar grup.
- `src/lib/**` dilarang mengimpor `@/server`, `@/client`, `@/components`, `@/app`, `@prisma/client`, `node:*`.
- File di `src/server/**` diawali `import 'server-only'`.
- Client Component (`'use client'`) dilarang mengimpor `@/server/**`.
- Hanya `src/server/ai/**` yang boleh memakai `fetch` ke host eksternal.
- Dilarang `Math.random` di `src/lib/draw/**` dan `src/client/offline/**` (`no-restricted-properties`).

---

## 5. Components

Components should:
- Have a single responsibility
- Prefer reusable patterns
- Avoid unnecessary duplication

Tambahan:
- Server Component secara default; `'use client'` hanya bila butuh state/efek/event/API browser.
- Props bertipe eksplisit (`type KartuPemenangProps = {...}`); tidak memakai `React.FC`.
- Semua warna, spacing, radius memakai token `DESIGN_SYSTEM.md` (kelas Tailwind dari token); dilarang hex langsung di komponen.
- Setiap komponen data menangani state loading, empty, error (`DESIGN_SYSTEM.md` §12).
- Data pribadi hanya ditampilkan lewat helper `maskNop`/`maskNik`; komponen tidak menerima NIK utuh kecuali `DialogNikPemenang`.
- Aksesibilitas: label input, `aria-*` sesuai `DESIGN_SYSTEM.md` §15.

---

## 6. Functions

Functions should:
- Do one logical thing
- Have clear names
- Avoid unnecessary complexity

Tambahan:
- Fungsi murni di `src/lib` tidak membaca waktu/acak global secara implisit; terima `now`/`random` sebagai parameter bila perlu agar dapat diuji (kecuali `secureRandomInt` yang membungkus Web Crypto dan dapat diinjeksi).
- Parameter > 3 → gunakan objek bernama.
- Return type eksplisit untuk fungsi yang diekspor.

---

## 7. Error Handling

Use:
- **Kegagalan yang diharapkan di modul murni** → kembalikan `Result`:
  ```ts
  type Result<T, E extends string = string> =
    | { ok: true; value: T }
    | { ok: false; error: E; details?: Record<string, unknown> };
  ```
  Contoh: `parseTanggalLunas(raw): Result<Date, 'TANGGAL_KOSONG' | 'TANGGAL_TIDAK_DIKENALI'>`.
- **Kegagalan di service** → lempar `AppError` dari `src/server/errors.ts`:
  ```ts
  throw new AppError('PERIODE_TERKUNCI', 409, 'Periode sudah terkunci. Data tidak dapat diubah.', { status });
  ```
- **Route handler** dibungkus `withHandler()` (`src/server/http.ts`) yang memetakan `AppError` → format error `API.md` §1.1, `ZodError` → `400 VALIDASI_GAGAL`, error Prisma `P2002` → `409 CONFLICT`, selain itu → `500 KESALAHAN_SERVER` + log error.
- **Klien** menampilkan `error.message` dari server; logika bercabang memakai `error.code`.
- Daftar kode & pesan: `ERROR_HANDLING.md`.

Do not:
- Melempar string atau objek non-`Error`.
- Menelan error (`catch {}` kosong) — minimal log + rethrow atau kembalikan `Result`.
- Mengirim `error.stack`, pesan Prisma, atau path file ke klien.
- Memakai `try/catch` untuk alur kontrol normal.

---

## 8. Comments

Comments should explain:
- Why something exists
- Important tradeoffs
- Non-obvious behavior

Avoid comments that simply repeat the code.

Tambahan:
- Fungsi yang diekspor dari `src/lib` diberi JSDoc singkat berisi aturan bisnis dan rujukan dokumen, mis. `/** Aturan PRD §6.0 butir 3. */`.
- `TODO` wajib berformat `// TODO(<nama>): <apa> — <tiket/alasan>`.
- Bahasa komentar: Indonesia.

---

## 9. Logging

Use:
pino (`src/server/logger.ts`), output JSON ke stdout.

Rules:
- Gunakan `logger.child({ requestId, userId })` di handler; jangan `console.log` di kode server (ESLint `no-console`, kecuali `scripts/`).
- Level: `error` (gagal tak terduga), `warn` (ditolak karena aturan keamanan/integritas), `info` (aksi penting, start/stop), `debug` (pengembangan saja).
- Pesan log singkat bahasa Inggris atau Indonesia konsisten per modul; data dalam field terstruktur, bukan string interpolasi.
- Konfigurasi `redact` dan larangan di `SECURITY.md` §7 wajib diikuti. Tidak pernah log baris peserta atau isi file.
- Audit log (DB) berbeda dari log aplikasi; aksi audit memanggil `audit()`, bukan hanya `logger`.
- Layar Undian (browser) mencatat kejadian penting ke `catatanLokal` di IndexedDB, bukan `console`.

---

## 10. Formatting

Formatter:
Prettier — `printWidth: 100`, `singleQuote: true`, `semi: true`, `trailingComma: 'all'`, plugin `prettier-plugin-tailwindcss`.

Linter:
ESLint (flat config) dengan `next/core-web-vitals`, `@typescript-eslint/strict-type-checked`, `eslint-plugin-import`, aturan khusus proyek: `no-restricted-imports` (§4), `no-restricted-properties` (`Math.random`), `no-console`, `react/no-danger`.

Type Checking:
`tsc --noEmit` (script `npm run typecheck`).

Perintah: `npm run format`, `npm run lint`, `npm run typecheck` (lihat `TESTING.md` §7). Lint, typecheck, dan test wajib lulus sebelum merge.

---

## 11. Do

- Reuse existing patterns
- Keep changes focused
- Follow project conventions
- Remove dead code
- Tulis test untuk setiap aturan bisnis yang ditambah/diubah
- Perbarui dokumen di `docs/` bila perilaku, skema, atau API berubah
- Gunakan transaksi Prisma untuk mutasi + audit

---

## 12. Don't

- Create duplicate utilities
- Introduce unnecessary dependencies (dependensi baru wajib dicatat di `DECISIONS.md` bila signifikan, versi dipin exact)
- Ignore existing architecture
- Change unrelated files
- Memakai `Math.random` untuk apa pun yang berkaitan dengan undian
- Menampilkan atau mengirim NIK/NOP utuh di luar jalur yang diizinkan
- Menulis teks UI dalam Bahasa Inggris
- Memakai data asli wajib pajak di test, fixture, atau contoh
