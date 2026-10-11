# Testing

> Status: Draf v0.1. Strategi pengujian untuk aturan bisnis (`PRD.md` §6.0), kontrak (`API.md`), dan alur kritis (`UX_FLOWS.md`).

## 1. Testing Goals

Critical functionality:
- Aturan syarat kepesertaan (parse NOP/NIK/tanggal, batas lunas, pembayaran terlambat sah, kode alasan)
- Keadilan & ketahanan mesin undian (RNG tanpa bias, unik, wilayah benar, resume setelah crash)
- Integritas paket & hasil (hash kanonik deterministik, verifikasi 10 pemeriksaan)
- Undian berjalan penuh **tanpa internet**
- Perlindungan data (penyamaran, NIK tidak bocor ke publik/paket, RBAC)
- Kenaikan cadangan dan status pemenang

---

## 2. Test Types

### Unit Testing

Test:
- Utility functions (`src/lib/domain`, `src/lib/draw`, `src/lib/package`)
- Business logic (evaluasi syarat, state machine undian, `verifyHasil`, kenaikan cadangan sebagai fungsi murni)
- Components where appropriate (`KartuPemenang` menampilkan data tersamar, `ChipStatus` ikon+label)

Kasus wajib:

**NOP**
| Input | Harapan |
|---|---|
| `160903000300300030` | valid; format `16.09.030.003.003-0003.0`; mask `16.09.030.xxx.xxx-0003.0` |
| `16.09.030.003.003-0003.0` | dinormalisasi ke 18 digit, valid |
| `" 160903000300300030 "` | trim, valid |
| `170903000300300030` | `NOP_INVALID` (prefiks bukan 1609) |
| `16090300030030003` (17 digit) | `NOP_INVALID` |
| `1,60903E+17` (notasi ilmiah) | `NOP_INVALID` |

**NIK**
| Input | Harapan |
|---|---|
| `1609040301650002` | valid; mask `1609xxxxxxxx0002` |
| `1.60904E+15` | tidak valid → peringatan, mask `-`, baris tidak gugur karena NIK |
| `160904030165000` (15 digit) | tidak valid |

**Tanggal lunas** (`parseTanggalLunas`, zona WIB)
| Input | Harapan |
|---|---|
| `29/06/2022 14:14:36` | 2022-06-29T14:14:36+07:00 |
| `29/06/2022` | 2022-06-29T00:00:00+07:00 |
| `29-06-2022` | valid |
| `2022-06-29` | valid |
| serial Excel `44741.5932` | 2022-06-29 14:14:12 (±1 detik) |
| `29/02/2024 08:00:00` | valid (kabisat) |
| `29/02/2023 08:00:00` | `TANGGAL_TIDAK_DIKENALI` |
| `31/04/2025` | `TANGGAL_TIDAK_DIKENALI` |
| `""` / spasi | `TANGGAL_KOSONG` |
| `06/29/2022` (format AS) | `TANGGAL_TIDAK_DIKENALI` |

**Evaluasi syarat** (batas default 30/09/2026 23:59:59 WIB) — data dummy dengan pola dari sampel:
| Kasus | Harapan |
|---|---|
| Semua tahun lunas tepat waktu | lolos |
| PBB 2025 dibayar 13/04/2026 (pola 7 dari 14 baris sampel) | **lolos** |
| PBB 2026 dibayar 15/09/2026 | lolos |
| PBB 2026 dibayar 30/09/2026 23:59:59 | lolos (batas inklusif) |
| PBB 2026 dibayar 01/10/2026 00:00:00 | `LEWAT_BATAS_2026` |
| Lunas 2022 tertulis 15/12/2021 | `TANGGAL_SEBELUM_TAHUN_PAJAK_2022` |
| Kolom 2024 kosong | `TANGGAL_KOSONG_2024` |
| 2024 kosong dan 2026 lewat batas | dua alasan sekaligus |
| Nama kosong / kecamatan kosong | `NAMA_KOSONG` / `KECAMATAN_KOSONG` |
| 4 NOP dengan timestamp identik | semua lolos (pembayaran kolektif bukan anomali) |
| NOP muncul dua kali | kedua baris `NOP_DUPLICATE` |
| Batas diubah ke 31/08/2026 | baris lunas 2026 bulan September menjadi `LEWAT_BATAS_2026` |

**Normalisasi kecamatan**: `"MUARA DUA KISAM "` → `MUARA DUA KISAM`; `"muaradua  kisam"` → `MUARADUA KISAM`.

**Hash & paket** (`src/lib/package`)
- `canonicalStringify` mengurutkan kunci rekursif; objek dengan urutan kunci berbeda → string identik.
- Data identik → `snapshotHash` identik (deterministik lintas Node & browser/jsdom).
- Ubah satu karakter nama → hash berbeda.
- `MetaSchema`, `SnapshotSchema`, `HasilSchema`, `ThemeConfigSchema` menolak field tambahan (`strict`).
- `snapshot.json` tidak memuat kunci `nik`, `nop`, `nikEnc` (hanya `nikMasked`, `nopMasked`).

**Mesin undian** (`src/lib/draw`)
- `secureRandomInt(n)` selalu di rentang `[0, n)`; rejection sampling diuji dengan RNG tiruan yang mengembalikan nilai di atas batas (harus diulang, bukan modulo).
- 10.000 simulasi undian penuh pada pool dummy (W1: 50, W2: 40): tidak pernah ada peserta ganda; setiap slot berasal dari wilayahnya; selalu 6 slot dengan urutan `SLOT_URUTAN`.
- **Uji distribusi (chi-square)**: pool 10 peserta, 100.000 tarikan slot pertama; statistik chi-square dengan df = 9 harus < 27,88 (p > 0,001). Seed tidak dipakai (RNG nyata); test ditandai `retry: 2` untuk mengurangi flakiness statistik.
- Resume: `serializeDrawState` → `deserialize` di tengah (setelah slot 3) → slot yang sudah keluar tidak berubah, sisa slot tidak memilih peserta yang sudah keluar.
- Pool wilayah < 3 peserta → error saat `createDrawState`.

**Verifikasi hasil** (`verifyHasil`) — satu test per pemeriksaan `API.md` §4.6: file valid lolos; setiap jenis manipulasi (ubah `urut`, tukar wilayah, duplikasi peserta, hapus slot, ubah urutan, ubah `snapshotHash`, ubah isi tanpa update `hasilHash`, waktu sebelum `lockedAt`) ditolak dengan kode pemeriksaan yang tepat.

**Status pemenang** (fungsi murni `applyGugur`)
- Utama gugur → C1 penerima aktif.
- Utama & C1 gugur → C2 penerima aktif.
- C1 gugur sebelum utama diputuskan → jika utama kemudian gugur, C2 yang naik.
- Ketiganya gugur → `PERLU_KEPUTUSAN`, tidak ada penerima aktif.

---

### Integration Testing

Test:
- APIs (route handler + service + PostgreSQL nyata)
- Database interactions (constraint unik, trigger immutable, index parsial periode aktif)
- Authentication flows (login, rate limit, akun nonaktif kehilangan akses, wajib ganti kata sandi)
- Service integrations (adapter AI dengan mock HTTP; tanpa panggilan nyata)

Kasus wajib:
- Impor fixture campuran (header benar) → ringkasan & alasan sesuai; NIK 16 digit utuh setelah dekripsi.
- Impor header salah → `400 HEADER_TIDAK_SESUAI`, 0 baris tersimpan.
- Impor ulang mengganti data; pemetaan kecamatan lama dipertahankan.
- **Performa**: impor 46.000 baris sintetis (`scripts/generate-fixture.ts`) selesai < 60 detik di runner CI (ditandai `@slow`, dijalankan di pipeline `test:int`).
- Kunci: prasyarat gagal → `422`; sukses → hash sama dengan `sha256` file snapshot; impor/ubah batas/ubah pemetaan setelah kunci → `409 PERIODE_TERKUNCI`.
- Dua permintaan kunci bersamaan → satu `200`, satu `409`.
- UPDATE/DELETE langsung pada `snapshot`, `snapshot_peserta`, `hasil_undian`, `audit_log` via SQL ditolak trigger.
- Paket: zip berisi file sesuai `API.md` §4.2; manifest cocok; tidak ada NIK/NOP utuh (scan seluruh isi zip dengan regex 16 dan 18 digit).
- Unggah hasil valid → `DIUNDI`; unggahan kedua → `409 HASIL_SUDAH_DIUNGGAH` + audit.
- Gugur + kenaikan cadangan lewat API dengan `version`; `version` basi → `409`.
- RBAC: setiap baris matriks `SECURITY.md` §2 diuji (OPERATOR ditolak di endpoint admin, publik ditolak di endpoint terautentikasi).
- `Origin` asing pada mutasi → `403`.
- `/api/publik/cek`: lolos, gugur dengan alasan, tidak ditemukan; respons tidak memuat `nik`, `alamat`.
- `/api/publik/pemenang` sebelum publikasi → `{ dipublikasi: false }`.
- AI: mock mengembalikan JSON tidak valid → `422`; valid → pratinjau tanpa menyimpan; tanpa `AI_API_KEY` → `503`; payload ke mock tidak memuat data peserta.
- Setiap mutasi terdaftar menulis tepat satu baris audit.

---

### End-to-End Testing

Test critical user journeys:
- Sign up: Tidak berlaku (tidak ada pendaftaran) — diganti Login & ganti kata sandi pertama
- Sign in: login Admin & Operator, redirect sesuai peran
- Create project: diganti Buat Periode → impor → pemetaan → kunci
- Complete checkout: Tidak berlaku
- Muat paket & undian **offline** (lihat §5)
- Pemulihan setelah reload di tengah undian
- Unggah hasil → gugur → cadangan naik → berita acara PDF → publikasi → halaman publik
- Cek NOP publik di viewport ponsel
- Paket dimanipulasi ditolak

---

## 3. Testing Tools

Unit:
Vitest (environment `node` untuk `src/lib` & server; `jsdom` + Testing Library untuk komponen). Web Crypto tersedia di Node 22 (`globalThis.crypto`).

Integration:
Vitest + PostgreSQL 16 nyata (container `db-test` di `docker-compose.test.yml`, `DATABASE_URL_TEST`). Setiap file test memakai skema/DB bersih (`prisma migrate reset --force --skip-seed` sekali per run + truncate antar test).

E2E:
Playwright (Chromium & Edge channel; viewport 1920×1080 untuk Layar Undian, 1440×900 untuk Panel, Pixel 7 untuk Publik). Offline via `context.setOffline(true)`.

Aksesibilitas otomatis: `@axe-core/playwright` pada halaman Panel utama & Publik (melengkapi, bukan menggantikan, uji manual).

---

## 4. Test File Structure

```text
tests/
├── unit/
│   ├── domain/          # nop.test.ts, nik.test.ts, tanggal.test.ts, eligibility.test.ts, kecamatan.test.ts
│   ├── draw/            # random.test.ts, draw-state.test.ts, distribusi.test.ts
│   ├── package/         # hash.test.ts, schema.test.ts, verify-hasil.test.ts, theme.test.ts
│   ├── pemenang/        # apply-gugur.test.ts
│   └── components/
├── integration/
│   ├── impor.test.ts
│   ├── kunci.test.ts
│   ├── paket.test.ts
│   ├── hasil.test.ts
│   ├── pemenang.test.ts
│   ├── rbac.test.ts
│   ├── publik.test.ts
│   ├── ai.test.ts
│   └── db-triggers.test.ts
├── e2e/
│   ├── login.spec.ts
│   ├── persiapan-periode.spec.ts
│   ├── undian-offline.spec.ts
│   ├── pemulihan.spec.ts
│   ├── pasca-undian.spec.ts
│   ├── publik.spec.ts
│   └── gladi-bersih.spec.ts
└── fixtures/
    ├── peserta-dummy.csv         # ±40 baris, mencakup semua kode alasan
    ├── peserta-header-salah.csv
    ├── peserta-dummy.xlsx        # NIK & NOP sebagai teks + satu kolom tanggal serial Excel
    └── hasil/                    # file hasil valid & varian manipulasi (dibangkitkan di test)
```

---

## 5. Critical User Flows

Flow: Persiapan periode sampai paket

Steps:
1. Admin login, buat periode (batas default)
2. Impor `peserta-dummy.csv`
3. Petakan semua kecamatan ke W1/W2
4. Kunci data
5. Unduh paket

Expected result:
Ringkasan sesuai fixture; hash tampil; file zip terunduh dan lolos verifikasi manifest.

---

Flow: Undian offline 6 slot

Steps:
1. Operator login online, buka `/operator/undian`, tunggu service worker aktif
2. Muat paket dari Flow sebelumnya → "Siap Offline"
3. `context.setOffline(true)`; reload halaman
4. Jalankan 6 slot dengan `Spasi` dan `→`
5. Unduh file hasil

Expected result:
Halaman tetap terbuka saat offline; 6 pemenang unik dan sesuai wilayah; file hasil lolos `verifyHasil`; tidak ada request jaringan yang gagal yang memblokir undian.

---

Flow: Pemulihan

Steps:
1. Offline, undi 3 slot
2. Reload halaman (dan sekali lagi saat fase Pemenang slot ke-3)
3. Lanjutkan sampai selesai

Expected result:
Pemenang slot 1–3 identik sebelum & sesudah reload; slot 3 ditampilkan ulang dengan hasil sama; 6 slot selesai.

---

Flow: Paket dimanipulasi

Steps:
1. Ubah satu nama di `snapshot.json` dalam zip (tanpa memperbarui hash)
2. Muat paket

Expected result:
Ditolak "Paket rusak atau telah diubah"; IndexedDB tidak berubah.

---

Flow: Pasca undian & publikasi

Steps:
1. Unggah file hasil (online) → cocokkan hash
2. Tandai `W1-UTAMA` gugur dengan alasan → `W1-C1` menjadi penerima
3. Verifikasi penerima kedua wilayah → Final
4. Unduh berita acara PDF (cek teks: judul, hash, nama penerima)
5. Publikasikan; buka `/pemenang` sebagai publik

Expected result:
Status sesuai; PDF memuat hash; halaman publik menampilkan data tersamar tanpa NIK utuh/NOP utuh (assert regex).

---

### Skenario Gladi Bersih (manual + `gladi-bersih.spec.ts`)

Dijalankan H-7 dan H-1 di **laptop acara asli** dengan data produksi terkunci (atau periode uji dengan data dummy 46.000 baris):
1. Unduh paket dari server produksi; salin via flashdisk
2. Matikan Wi-Fi & cabut LAN
3. Muat paket, cek "Siap Offline", uji suara di speaker gedung
4. Tampilkan di proyektor; cek keterbacaan dari baris belakang (ukuran huruf `DESIGN_SYSTEM.md` §16)
5. Jalankan 6 slot pada **periode uji** (bukan periode produksi), termasuk satu kali tutup paksa browser
6. Ukur: FPS animasi ≥ 50, waktu Berhenti → kartu ≤ 3 detik
7. Unduh hasil, unggah ke periode uji di server
8. Hapus data undian uji dari laptop, muat paket produksi, berhenti sebelum Mulai

Expected result:
Semua langkah berhasil; catatan masalah diisi di checklist `DEPLOYMENT.md`.

---

## 6. Coverage

Target:
- `src/lib/domain`, `src/lib/draw`, `src/lib/package`: **≥ 95% baris & cabang** (wajib, gagal CI jika kurang)
- `src/server/services`: ≥ 80% baris
- Komponen UI: tanpa target angka; komponen yang menampilkan data pribadi wajib punya test

Prioritize:
- Critical business logic (syarat, undian, hash, verifikasi)
- Authentication
- Payments: Tidak berlaku
- Data mutations (impor, kunci, hasil, status pemenang)
- Important user journeys (undian offline)

---

## 7. Commands

Test:
`npm test` (= `vitest run`, unit + integration) · `npm run test:unit` · `npm run test:int` · `npm run test:e2e` (= `playwright test`) · `npm run test:coverage`

Lint:
`npm run lint`

Build:
`npm run build`

Type Check:
`npm run typecheck`

Lainnya:
- `npm run db:test:up` — jalankan PostgreSQL test (Docker)
- `npm run fixture:generate -- --rows 46000` — data sintetis
- `npm run simulate-draw -- --w1 50 --w2 40` — simulasi undian CLI

Semua perintah test berjalan sekali (tanpa watch). CI menjalankan: `lint` → `typecheck` → `test:unit` → `test:int` → `build` → `test:e2e`.

---

## 8. Definition of Done

- Tests pass
- Build passes
- Lint passes
- Type checking passes
- Critical flow verified
- No blocking errors
- Coverage modul `src/lib` ≥ 95%
- Test baru ditulis untuk setiap aturan bisnis yang ditambah/diubah
- E2E undian offline lulus
