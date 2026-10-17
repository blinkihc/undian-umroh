# API Documentation

> Status: Draf v0.1. Semua endpoint adalah Next.js Route Handler di `src/app/api/**/route.ts`, runtime Node.js, JSON UTF-8 kecuali disebut lain.
> Hak akses per endpoint dirangkum di `SECURITY.md` §2 (matriks RBAC). Kode error lengkap di `ERROR_HANDLING.md`.
> Bagian 1–3 adalah konvensi; bagian 4–5 adalah kontrak file paket & hasil (antarmuka online ↔ offline) dan skema tema.

## 1. API Conventions

- Base path: `/api`. Nama resource kata benda Indonesia, kebab-case: `/api/periode/:id/berita-acara`.
- Autentikasi: cookie sesi Auth.js (`/api/auth/*` dikelola Auth.js). Endpoint publik di bawah `/api/publik/*` dan `/api/health`.
- Mutasi (`POST`, `PUT`, `PATCH`, `DELETE`) wajib header `Origin` sama dengan `APP_URL` (proteksi CSRF), selain mekanisme bawaan Auth.js.
- Optimistic concurrency: resource yang dapat berubah mengembalikan `version`; mutasi mengirim `version` yang dibaca. Tidak cocok → `409 CONFLICT`.
- Tanggal: ISO 8601 dengan offset, mis. `2026-09-30T23:59:59+07:00`. Respons memakai offset WIB `+07:00`.
- NOP di respons admin: `nop` (18 digit) + `nopFormat` (bertitik). Di respons publik hanya `nopMasked`.
- NIK di respons apa pun: hanya `nikMasked`, kecuali `POST /api/periode/:id/pemenang/:slot/nik` (admin, audit).
- Paginasi: query `page` (mulai 1), `pageSize` (default 50, maks. 200). Respons `{ "items": [], "page": 1, "pageSize": 50, "total": 0 }`.
- Respons sukses: objek resource langsung (tanpa amplop `data`). Respons error: format §1.1.

### 1.1 Error Format

```json
{
  "error": {
    "code": "PERIODE_TERKUNCI",
    "message": "Periode sudah terkunci. Data tidak dapat diubah.",
    "details": { "status": "TERKUNCI" },
    "requestId": "req_01J9Z3K8Q4"
  }
}
```

- `code`: SCREAMING_SNAKE, stabil, dipakai klien untuk logika.
- `message`: Bahasa Indonesia, aman ditampilkan ke pengguna.
- `details`: opsional; untuk validasi berisi `{ "fields": { "<field>": "<pesan>" } }`.
- `requestId`: untuk korelasi log (`OBSERVABILITY.md`).

| HTTP | Kapan | Contoh `code` |
|---|---|---|
| 400 | Input tidak valid | `VALIDASI_GAGAL`, `HEADER_TIDAK_SESUAI`, `FILE_TIDAK_VALID` |
| 401 | Belum login / sesi habis | `TIDAK_TERAUTENTIKASI` |
| 403 | Peran tidak berhak / Origin salah / wajib ganti kata sandi | `AKSES_DITOLAK`, `PASSWORD_HARUS_DIGANTI` |
| 404 | Resource tidak ada | `TIDAK_DITEMUKAN` |
| 409 | Konflik status/versi/duplikat | `CONFLICT`, `USERNAME_SUDAH_DIPAKAI`, `PERIODE_TERKUNCI`, `PERIODE_AKTIF_SUDAH_ADA`, `HASIL_SUDAH_DIUNGGAH` |
| 413 | File terlalu besar | `FILE_TERLALU_BESAR` |
| 422 | Aturan bisnis gagal | `PRASYARAT_KUNCI_BELUM_LENGKAP`, `HASIL_TIDAK_VALID` |
| 429 | Rate limit | `TERLALU_BANYAK_PERMINTAAN` |
| 500 | Kesalahan tak terduga | `KESALAHAN_SERVER` |
| 503 | DB/AI tidak tersedia | `LAYANAN_TIDAK_TERSEDIA`, `AI_TIDAK_TERSEDIA` |
| 507 | Disk server penuh | `PENYIMPANAN_PENUH` |

---

## 2. Endpoints — Admin & Operator

### Periode

#### GET /api/periode
Authentication: Required (ADMIN, OPERATOR)
Response:
```json
{
  "items": [
    {
      "id": "clx1a2b3c",
      "slug": "undian-umroh-2026",
      "judul": "Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026",
      "status": "DRAF",
      "batasLunas": "2026-09-30T23:59:59+07:00",
      "tanggalAcara": null,
      "lokasiAcara": null,
      "version": 3
    }
  ]
}
```

#### POST /api/periode
Authentication: Required (ADMIN)
Request:
```json
{
  "judul": "Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026",
  "batasLunas": "2026-09-30T23:59:59+07:00",
  "tanggalAcara": "2026-10-20",
  "lokasiAcara": "Gedung Kesenian Muaradua",
  "namaWilayah": { "W1": "Wilayah 1", "W2": "Wilayah 2" }
}
```
Validation:
- `judul` wajib, 5–150 karakter (dirapikan)
- `batasLunas` wajib, ISO 8601 dengan zona waktu, tidak lebih awal dari `2026-01-01T00:00:00+07:00`. Form Admin memilih tanggal saja dan mengirim `<tanggal>T23:59:59+07:00`.
- `tanggalAcara` opsional, `YYYY-MM-DD` atau `null`; `lokasiAcara` opsional, maks. 150 karakter (kosong → `null`)
- `namaWilayah` opsional; `W1`/`W2` masing-masing opsional 1–50 karakter, yang tidak dikirim memakai "Wilayah 1"/"Wilayah 2"
- Tahun pajak tetap 2022–2026 (tidak dapat dikirim); `slug` dibuat server (DATABASE §3)
- Tidak ada periode aktif lain → jika ada `409 PERIODE_AKTIF_SUDAH_ADA` dengan `details: { periodeId, judul, status }`

Response `201`: objek periode lengkap (seperti `GET /api/periode/:id`). Audit `PERIODE_BUAT`.

#### GET /api/periode/:id
Authentication: Required (ADMIN, OPERATOR)
Response:
```json
{
  "id": "clx1a2b3c",
  "judul": "…",
  "status": "TERKUNCI",
  "batasLunas": "2026-09-30T23:59:59+07:00",
  "wilayah": [
    { "kode": "W1", "nama": "Wilayah 1", "jumlahLolos": 20415 },
    { "kode": "W2", "nama": "Wilayah 2", "jumlahLolos": 20815 }
  ],
  "snapshot": { "hash": "3f9a1c0b…d27e44a1", "lockedAt": "2026-10-10T09:12:00+07:00" },
  "hasil": null,
  "publishedAt": null,
  "version": 7
}
```
Field lengkap: semua field `GET /api/periode` ditambah `tahunAwal`, `tahunAkhir`, `wilayah`, `snapshot`, `hasil`, `publishedAt`, `alasanBatal`, `createdAt`, `updatedAt`. Sampai tiket impor/pemetaan, `jumlahLolos` bernilai 0; `snapshot` dan `hasil` `null` sampai tiket kunci/unggah hasil. Periode tidak ada → `404 TIDAK_DITEMUKAN`. Daftar `GET /api/periode` terurut dari periode terbaru.

#### PATCH /api/periode/:id
Authentication: Required (ADMIN)
Request (semua opsional kecuali `version`):
```json
{ "version": 3, "judul": "…", "batasLunas": "2026-09-30T23:59:59+07:00", "tanggalAcara": "2026-10-20", "lokasiAcara": "…", "namaWilayah": { "W1": "Wilayah Barat" } }
```
Validation:
- Minimal satu field selain `version`; aturan per field sama dengan `POST`
- `batasLunas` hanya boleh berubah saat `DRAF` → memicu evaluasi ulang seluruh peserta (respons memuat ringkasan baru; aktif sejak tiket impor). Selain Draf → `409 PERIODE_TERKUNCI` `details.alasan = BATAS_HANYA_DRAF`
- `judul`, `tanggalAcara`, `lokasiAcara`, `namaWilayah` boleh berubah pada status `DRAF`, `TERKUNCI`, `DIUNDI`, dan `FINAL` (inklusif); `DIPUBLIKASI`/`DIBATALKAN` → `409 PERIODE_TERKUNCI`
- `version` basi → `409 CONFLICT` dengan `details.version` terkini. Status diperiksa lebih dulu dari versi.
- Field yang nilainya sama diabaikan; tanpa perubahan nyata `version` tidak naik dan audit tidak ditulis. Audit `PERIODE_UBAH` (`payload.perubahan.<field> = { lama, baru }`) dan/atau `WILAYAH_NAMA_UBAH` (`payload.perubahan.W1 = { lama, baru }`).

Response `200`: objek periode lengkap.

#### DELETE /api/periode/:id
Authentication: Required (ADMIN)
Environment: Khusus Pengembangan / Testing Lokal (`NODE_ENV !== 'production'`)
Tujuan: Menghapus periode pengujian beserta seluruh relasi data (impor, peserta, pemetaan kecamatan wilayah, snapshot, dan hasil undian) secara tuntas.
Validation:
- Wajib lingkungan non-production. Di production menghasilkan `403 AKSES_DITOLAK`.
- Eksekusi transaksi database menggunakan `SET LOCAL session_replication_role = 'replica'` untuk melewati trigger tabel immutable.
Audit: `PERIODE_HAPUS`
Response `200`: `{ "ok": true, "id": "clx1a2b3c", "judul": "…" }`

#### POST /api/periode/:id/batal
Authentication: Required (ADMIN)
Request: `{ "version": 7, "alasan": "Data ekspor salah kecamatan, akan diimpor ulang di periode baru" }`
Validation: status `DRAF` atau `TERKUNCI` tanpa hasil; `alasan` 10–500 karakter (dirapikan). Status lain → `409 PERIODE_TERKUNCI` (`details.alasan`: `PERIODE_SUDAH_DIUNDI`, `PERIODE_SUDAH_DIPUBLIKASI`, atau `PERIODE_SUDAH_DIBATALKAN` — Dibatalkan bersifat final). `version` basi → `409 CONFLICT`.
Response `200`: objek periode lengkap berstatus `DIBATALKAN` dengan `alasanBatal`. Audit `PERIODE_BATAL` (`judul`, `statusSebelumnya`, `alasan`).

### Impor & Peserta

#### POST /api/periode/:id/impor
Authentication: Required (ADMIN)
Request: `multipart/form-data`, field `file` (`.csv` atau `.xlsx`, ≤ 100 MB), field `version`; field lain ditolak.
Validation: periode `DRAF` (selain itu `409 PERIODE_TERKUNCI`, diperiksa sebelum versi); `version` basi → `409 CONFLICT`; header 12 kolom (PRD §6.0). Impor berhasil menaikkan `periode.version` dan mengganti seluruh peserta periode dalam satu transaksi; audit `IMPOR_BERHASIL`. Penolakan tingkat file dicatat `IMPOR_DITOLAK`.
Error file: `413 FILE_TERLALU_BESAR`; `400 FILE_TIDAK_VALID` untuk ekstensi bukan `.csv`/`.xlsx`, ekstensi/MIME/isi tidak konsisten, file kosong/hanya header ("File tidak berisi data peserta."), lebih dari 500.000 baris, XLSX rusak atau tanpa `xl/workbook.xml`, XLSX terurai > 200 MB, atau CSV yang bukan UTF-8 maupun Windows-1252/berisi byte NUL/UTF-16 ("File tidak dapat dibaca. Simpan ulang sebagai CSV UTF-8.").
Pembacaan: CSV UTF-8 (BOM dibuang), bila gagal Windows-1252. XLSX dari sheet pertama, semua sel menjadi teks: rumus tidak dievaluasi (hasil tersimpan dipakai), sel tanggal/serial di kolom "Tanggal Lunas" ditulis `dd/mm/yyyy HH:MM:SS` (WIB), angka bulat di luar rentang aman (mis. NOP 18 digit yang tersimpan sebagai angka) ditulis notasi ilmiah sehingga `NOP_INVALID`. MIME CSV yang diterima: `text/csv`, `application/csv`, `text/plain`, `application/vnd.ms-excel`, kosong, atau `application/octet-stream`.
Response `200`:
```json
{
  "imporId": "clx9z8y7",
  "namaFile": "ekspor-pbb-2026.csv",
  "diimporAt": "2026-10-12T14:05:03+07:00",
  "totalBaris": 45812,
  "jumlahLolos": 41230,
  "jumlahGugur": 4582,
  "lolosPerWilayah": { "W1": 18200, "W2": 19100, "BELUM_DIPETAKAN": 3930 },
  "gugurPerAlasan": { "TANGGAL_KOSONG_2024": 2100, "LEWAT_BATAS_2026": 1500, "NOP_DUPLICATE": 12 },
  "nikTidakValid": 37,
  "nopGanda": 6,
  "kecamatanBelumDipetakan": ["BUAY RUNJUNG"],
  "version": 4
}
```
Error khusus: `400 HEADER_TIDAK_SESUAI` dengan `details: { "hilang": ["Tanggal Lunas 2024"], "tidakDikenal": ["TGL_2024"] }` dan pesan "Header file tidak sesuai. Kolom hilang: Tanggal Lunas 2024. Kolom tidak dikenal: TGL_2024." Kolom wajib yang muncul dua kali masuk `tidakDikenal`.
`gugurPerAlasan` terurut menurut urutan kode PRD §6.0; `nopGanda` = jumlah NOP berbeda yang muncul lebih dari sekali; `kecamatanBelumDipetakan` terurut abjad. Sampai tiket 08 semua peserta lolos masuk `BELUM_DIPETAKAN`.

#### GET /api/periode/:id/ringkasan
Authentication: Required (ADMIN)
Response: bentuk sama dengan respons impor (dihitung dari impor aktif + pemetaan terkini). Belum ada impor → `404 TIDAK_DITEMUKAN` "Belum ada data peserta."

#### GET /api/periode/:id/peserta
Authentication: Required (ADMIN)
Query: `status=lolos|gugur`, `wilayah=W1|W2|BELUM_DIPETAKAN`, `kecamatan`, `alasan`, `q` (NOP atau awalan nama), `page`, `pageSize`.
Response:
```json
{
  "items": [
    {
      "id": "clp001",
      "baris": 2,
      "nop": "160901000100100010",
      "nopFormat": "16.09.010.001.001-0001.0",
      "nikMasked": "1609xxxxxxxx0012",
      "nama": "BUDI SANTOSO",
      "kecamatan": "MUARADUA",
      "kelurahan": "BATU BELANG JAYA",
      "lunas": { "2022": "2022-06-10T09:00:00+07:00", "2023": "…", "2024": "…", "2025": "2026-04-13T10:59:53+07:00", "2026": "…" },
      "eligible": true,
      "alasan": [],
      "wilayah": "W1"
    }
  ],
  "page": 1, "pageSize": 50, "total": 45812
}
```

Catatan: `q` berisi angka (titik, strip, dan spasi diabaikan) dicari sebagai awalan NOP; selain itu awalan nama tanpa peka huruf. `kecamatan` dinormalisasi seperti saat impor. Isian kosong diabaikan; parameter tak dikenal ditolak `400`. Item juga memuat `lunasRaw` (nilai sel asli) dan `wilayah` (`null` = belum dipetakan). Urutan menurut nomor baris file. NOP tidak valid: `nopFormat` = nilai mentah. `nikEnc` tidak pernah dipilih.

#### GET /api/periode/:id/peserta/ekspor-gugur
Authentication: Required (ADMIN)
Response: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` — kolom baris, NOP bertitik, NIK tersamar, nama, kecamatan, kelurahan, 5 nilai tanggal asli, kode alasan, pesan alasan. Nama file `daftar-gugur-<slug>-<yyyymmdd>.xlsx`. Sel teks yang diawali `=`, `+`, `-`, `@`, tab, atau CR diberi awalan `'`. Audit `EKSPOR_UNDUH` (`{ jenis: "DAFTAR_GUGUR", jumlahBaris }`).

#### POST /api/periode/:id/peserta/:pesertaId/gugur
Authentication: Required (ADMIN)
Request:
```json
{ "alasan": "Bukan warga setempat / diskualifikasi verifikasi lapangan" }
```
Validation:
- `alasan` wajib diisi, minimal 3 karakter, maksimal 500 karakter.
- Periode harus berstatus `DRAF` (selain itu `409 STATUS_PERIODE_TIDAK_VALID`).
- Peserta harus terdaftar pada periode terkait dan berstatus lolos (`eligible === true`). Jika peserta sudah berstatus gugur, menghasilkan error `400 AKSI_TIDAK_VALID`.
Efek:
- Mengubah status peserta menjadi `eligible: false` dan menambahkan alasan dengan format `DISKUALIFIKASI_MANUAL: <alasan>` ke array `alasan`.
- Mengurangi counter agregat `jumlahLolos` (-1) dan menambah `jumlahGugur` (+1) pada data impor aktif.
- Mencatat jejak audit `PESERTA_GUGUR` (`payload: { periodeId, nop, nama, alasan }`).
Response `200`: Objek data peserta lengkap (`PesertaApi`).

### Wilayah

#### GET /api/periode/:id/wilayah
Authentication: Required (ADMIN)
Response:
```json
{
  "wilayah": [{ "kode": "W1", "nama": "Wilayah 1" }, { "kode": "W2", "nama": "Wilayah 2" }],
  "kecamatan": [
    { "kecamatan": "MUARADUA KISAM", "wilayah": "W1", "jumlahLolos": 812, "mirip": ["MUARA DUA KISAM"] },
    { "kecamatan": "BUAY RUNJUNG", "wilayah": null, "jumlahLolos": 640, "mirip": [] }
  ],
  "version": 4
}
```

#### PUT /api/periode/:id/wilayah
Authentication: Required (ADMIN)
Request:
```json
{ "version": 4, "pemetaan": [ { "kecamatan": "MUARADUA KISAM", "wilayah": "W1" }, { "kecamatan": "BUAY RUNJUNG", "wilayah": "W2" } ] }
```
Validation: periode `DRAF` (selain itu `409 PERIODE_TERKUNCI`); `version` basi → `409 CONFLICT`; setiap `kecamatan` ada di impor aktif (selain itu `400 VALIDASI_GAGAL` dengan `details.kecamatanTidakDikenal`); `wilayah` ∈ `W1|W2|null`; tanpa duplikat kecamatan; 1–1.000 item.
Kecamatan yang tidak dikirim tidak berubah (pembaruan sebagian). Perubahan nyata menaikkan `periode.version` dan menulis audit `WILAYAH_PETAKAN` (`jumlahDiubah`, `perubahan[]{kecamatan, lama, baru}` maks. 50). Response `200`: bentuk sama dengan `GET`.
`GET` juga memuat `status` periode dan `ringkasan` (`W1`/`W2`/`BELUM_DIPETAKAN`: `jumlahKecamatan`, `jumlahLolos`); kecamatan terurut belum dipetakan dulu lalu abjad; `mirip` = kecamatan lain yang sama setelah spasi/tanda baca dibuang atau berbeda satu huruf (nama ≥ 6 huruf). Hanya kecamatan di impor aktif yang ditampilkan; pemetaan lama tetap tersimpan saat impor ulang. Nama tampilan wilayah diubah lewat `PATCH /api/periode/:id` (`namaWilayah`).

### Kunci, Paket, Hasil

#### POST /api/periode/:id/kunci
Authentication: Required (ADMIN)
Request: `{ "version": 5, "konfirmasiJudul": "Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026" }`
Validation: status `DRAF`; `konfirmasiJudul` sama persis dengan judul; prasyarat PRD F3.
Response `200`:
```json
{ "status": "TERKUNCI", "snapshotHash": "3f9a1c0b…(64 hex)", "jumlah": { "W1": 20415, "W2": 20815 }, "lockedAt": "2026-10-10T09:12:00+07:00", "version": 6 }
```
Error: `422 PRASYARAT_KUNCI_BELUM_LENGKAP` dengan `details: { "kecamatanBelumDipetakan": 2, "nopGanda": 0, "wilayahKurangPeserta": [] }`.

#### POST /api/periode/:id/kunci/buka
Authentication: Required (ADMIN)
Request:
```json
{ "version": 5, "alasan": "Perbaikan data peserta dan pemetaan wilayah sebelum pengundian" }
```
Validation:
- `alasan` wajib diisi, minimal 5 karakter, maksimal 500 karakter.
- Status periode wajib `TERKUNCI` (selain itu `409 STATUS_PERIODE_TIDAK_VALID`).
- Periode belum pernah diundi / tidak memiliki hasil undian (`periode.hasilUndian === null`). Jika sudah diundi, hasil undian harus dibatalkan terlebih dahulu (`409 AKSI_TIDAK_VALID`).
- `version` harus cocok dengan versi periode terkini (selain itu `409 CONFLICT`).
Efek:
- Menghapus data relasi paket unduhan (`paket_unduhan`), snapshot peserta (`snapshot_peserta`), dan snapshot (`snapshot`) di database dengan bypass transaksi terisolasi (`SET LOCAL session_replication_role = 'replica'`).
- Menghapus berkas fisik snapshot kanonik di storage lokal.
- Mengembalikan status periode menjadi `DRAF` dan menaikkan `version`.
- Mencatat jejak audit `PERIODE_BUKA_KUNCI` (`payload: { alasan, snapshotHash }`).
Response `200`: `{ "ok": true, "status": "DRAF", "version": 6 }`

#### GET /api/periode/:id/paket
Authentication: Required (ADMIN)
Validation: status `TERKUNCI` (juga diizinkan `DIUNDI` untuk arsip).
Response: `application/zip`, `Content-Disposition: attachment; filename="paket-undian-<slug>-<8hex>.zip"`. Struktur di §4.

#### POST /api/periode/:id/hasil
Authentication: Required (ADMIN, OPERATOR)
Request: `application/json` (≤ 1 MB), isi file hasil (§4.5).
Validation: status `TERKUNCI`; `verifyHasil` (§4.6).
Response `200`:
```json
{ "status": "DIUNDI", "hasilHash": "7c21…90ab", "slot": [ { "kode": "W1-UTAMA", "nopMasked": "16.09.030.xxx.xxx-0003.0", "nama": "BUDI SANTOSO", "kecamatan": "MUARADUA" } ], "version": 7 }
```
Error: `409 HASIL_SUDAH_DIUNGGAH` (`details: { "uploadedAt": "…", "uploadedBy": "operator1" }`), `422 HASIL_TIDAK_VALID` (`details: { "pemeriksaan": "WILAYAH_TIDAK_SESUAI", "slot": "W2-C1" }`).

#### POST /api/periode/:id/hasil/batal
Authentication: Required (ADMIN)
Request: `application/json`
```json
{
  "version": 7,
  "alasan": "Kesalahan pengundian di laptop acara, undian diulang kembali"
}
```
Validation:
- status periode harus `DIUNDI`.
- `alasan` minimal 5 karakter, maksimal 500 karakter.
- optimistic concurrency: `version` harus cocok dengan versi periode saat ini.
Action:
- Menghapus baris `hasil_undian` dan `slot_hasil` terkait periode.
- Mengembalikan status periode menjadi `TERKUNCI` dan menaikkan `version`.
- Mencatat aksi audit `HASIL_BATAL`.
Response `200`:
```json
{
  "ok": true,
  "status": "TERKUNCI",
  "version": 8
}
```
Error: `403 AKSES_DITOLAK`, `409 STATUS_PERIODE_TIDAK_VALID`, `409 CONFLICT` (jika `version` tidak cocok), `422 VALIDASI_GAGAL` (alasan kurang dari 5 karakter).

### Pemenang

#### GET /api/periode/:id/pemenang
Authentication: Required (ADMIN)
Response:
```json
{
  "wilayah": [
    {
      "kode": "W1",
      "nama": "Wilayah 1",
      "statusWilayah": "ADA_PENERIMA",
      "slot": [
        {
          "kode": "W1-UTAMA", "status": "GUGUR", "penerimaAktif": false,
          "alasanGugur": "TIDAK_DAPAT_DIHUBUNGI", "catatan": "Tidak merespons 3×24 jam",
          "peserta": { "nopFormat": "16.09.030.003.003-0003.0", "nikMasked": "1609xxxxxxxx0012", "nama": "…", "alamatWp": "…", "alamatOp": "…", "kecamatan": "…", "kelurahan": "…", "lunas": { "2022": "…" } },
          "version": 2
        },
        { "kode": "W1-C1", "status": "MENANG", "penerimaAktif": true, "version": 2 },
        { "kode": "W1-C2", "status": "CADANGAN", "penerimaAktif": false, "version": 1 }
      ]
    }
  ]
}
```
`statusWilayah`: `ADA_PENERIMA` | `TERVERIFIKASI` | `PERLU_KEPUTUSAN`.

#### POST /api/periode/:id/pemenang/:slot/verifikasi
Authentication: Required (ADMIN)
Request: `{ "version": 2 }`
Validation: slot adalah penerima aktif dengan status `MENANG`.

#### POST /api/periode/:id/pemenang/:slot/gugur
Authentication: Required (ADMIN)
Request:
```json
{ "version": 2, "alasan": "TIDAK_DAPAT_DIHUBUNGI", "catatan": "Tidak merespons 3×24 jam" }
```
Validation: status `MENANG`, `CADANGAN`, atau `TERVERIFIKASI`; `catatan` 5–500 karakter. Efek: cadangan berikutnya yang belum gugur menjadi penerima aktif; respons = `GET …/pemenang`.

#### POST /api/periode/:id/pemenang/:slot/nik
Authentication: Required (ADMIN)
Request: `{ "alasan": "Verifikasi identitas pemenang di kantor Bapenda" }`
Response: `{ "nik": "1609040301650002" }` — tidak di-cache (`Cache-Control: no-store`), tercatat `PEMENANG_LIHAT_NIK`.

### Berita Acara & Ekspor

#### GET /api/periode/:id/berita-acara
Authentication: Required (ADMIN)
Response:
```json
{ "nomor": "001/BA/BAPENDA/X/2026", "tempat": "…", "hariTanggal": "Selasa, 20 Oktober 2026", "dasarKegiatan": "…", "panitia": [{ "nama": "…", "jabatan": "…" }], "saksi": [{ "nama": "…", "instansi": "…" }], "version": 1 }
```

#### PUT /api/periode/:id/berita-acara
Authentication: Required (ADMIN)
Validation: periode `DIUNDI|FINAL|DIPUBLIKASI`; `panitia` & `saksi` maks. 5 item; teks maks. 1.000 karakter.

#### GET /api/periode/:id/berita-acara/pdf
Authentication: Required (ADMIN)
Response: `application/pdf` (A4), isi sesuai PRD F9.

#### GET /api/periode/:id/ekspor/pemenang
Authentication: Required (ADMIN)
Response: XLSX daftar 6 slot + status + riwayat (data tersamar).

### Publikasi

#### POST /api/periode/:id/publikasi
Authentication: Required (ADMIN)
Request: `{ "version": 8 }`
Validation: status `DIUNDI` atau `FINAL`.

### Tema & Aset

#### GET /api/tema
Authentication: Required (ADMIN)
Response: `{ "items": [ { "id": "…", "nama": "Slot Mesin Bawaan", "sumber": "MANUAL", "bawaan": true, "config": { /* ThemeConfig */ }, "configHash": "…" } ] }`

#### POST /api/tema · PUT /api/tema/:id · DELETE /api/tema/:id
Authentication: Required (ADMIN)
Request (POST/PUT): `{ "nama": "Nuansa Hijau Emas", "config": { /* ThemeConfig */ }, "version": 1 }`
Validation: `ThemeConfigSchema`; semua `asetId` ada dan jenisnya sesuai. DELETE ditolak jika bawaan atau dipakai periode.

#### PUT /api/periode/:id/tema
Authentication: Required (ADMIN)
Request: `{ "temaId": "…", "version": 6 }` — boleh pada `DRAF` dan `TERKUNCI`. Jika paket sudah pernah diunduh, respons memuat `"peringatan": "PAKET_PERLU_DIUNDUH_ULANG"`.

#### POST /api/tema/ai
Authentication: Required (ADMIN)
Request: `{ "prompt": "Nuansa Islami hijau emas, musik rebana, putaran 8 detik", "basisTemaId": "…" }`
Validation: `prompt` 5–1.000 karakter; rate limit 10 permintaan/jam per admin.
Response `200` (tidak menyimpan apa pun):
```json
{
  "config": { /* ThemeConfig usulan, sudah tervalidasi */ },
  "perubahan": [ { "field": "animasi.preset", "dari": "slot-mesin", "ke": "kartu-berputar" }, { "field": "animasi.durasiDetik", "dari": 6, "ke": 8 } ],
  "catatan": "Musik rebana dipilih dari aset 'Rebana Pelan'. Pustaka tidak memiliki musik gambus."
}
```
Error: `503 AI_TIDAK_TERSEDIA` (tanpa API key/gagal/timeout 30 dtk), `422 AI_OUTPUT_TIDAK_VALID`.

#### GET /api/aset · POST /api/aset · DELETE /api/aset/:id · GET /api/aset/:id/file
Authentication: Required (ADMIN); `GET /api/aset/:id/file` juga OPERATOR (pratinjau).
POST: `multipart/form-data` field `file`, `jenis` (`AUDIO|GAMBAR`), `nama`, `deskripsi`, `fase` (opsional).
Validation: audio `.mp3`/`.ogg` ≤ 10 MB, gambar `.png`/`.jpg`/`.webp` ≤ 5 MB, magic bytes sesuai; SVG ditolak.

### Pengguna & Audit

#### GET /api/pengguna · POST /api/pengguna · PATCH /api/pengguna/:id
Authentication: Required (ADMIN)
POST request: `{ "username": "operator1", "nama": "Operator Satu", "peran": "OPERATOR", "passwordAwal": "min-12-karakter-acak" }`
PATCH request: tepat satu dari `{ "aktif": false }`, `{ "resetPassword": "…" }`, atau `{ "peran": "ADMIN" }`, ditambah `version`.
Validation: username dirapikan (trim, huruf kecil) lalu wajib `[a-z0-9._-]{3,32}` dan unik; `nama` 1–100 karakter; kata sandi awal/reset 12–128 karakter dan tidak sama dengan username; admin tidak dapat menonaktifkan/menurunkan peran dirinya sendiri; minimal satu admin aktif harus tersisa (diperiksa di transaksi berkunci).
Response (`GET` → `{ "items": [...] }`, `POST` → `201`, `PATCH` → `200`), tanpa hash kata sandi:
```json
{ "id": "clx…", "username": "operator1", "nama": "Operator Satu", "peran": "OPERATOR", "aktif": true, "mustChangePassword": true, "lastLoginAt": null, "createdAt": "2026-10-12T14:05:03+07:00", "version": 1 }
```
Akun baru dan akun yang di-reset selalu `mustChangePassword: true`. Perubahan tanpa efek (mis. mengaktifkan akun yang sudah aktif) tidak menaikkan `version` dan tidak menulis audit.
Errors: `400 VALIDASI_GAGAL` (`details.fields`), `404 TIDAK_DITEMUKAN`, `409 USERNAME_SUDAH_DIPAKAI` (`details.fields.username`), `409 CONFLICT` (`version` basi; `details.version` = versi terkini), `422 PERUBAHAN_AKUN_DITOLAK` (`details.alasan`: `UBAH_DIRI_SENDIRI` | `ADMIN_TERAKHIR`).
Audit: `PENGGUNA_BUAT`, `PENGGUNA_AKTIFKAN`, `PENGGUNA_NONAKTIFKAN`, `PENGGUNA_RESET_PASSWORD`, `PENGGUNA_UBAH` (`peranLama`, `peranBaru`); payload tidak pernah memuat kata sandi.

#### POST /api/akun/ganti-password
Authentication: Required (ADMIN, OPERATOR); satu-satunya endpoint (selain `/api/auth/*`) yang tetap dapat dipakai akun `mustChangePassword`.
Request: `{ "passwordLama": "…", "passwordBaru": "…" }` — wajib saat login pertama (`mustChangePassword`).
Validation: `passwordBaru` 12–128 karakter, tidak sama dengan username (tanpa memandang huruf besar-kecil), dan berbeda dari `passwordLama`. Kesalahan dikembalikan sebagai `400 VALIDASI_GAGAL` dengan `details.fields.passwordLama` atau `details.fields.passwordBaru`. Kata sandi lama yang salah dibatasi 5 kali / 15 menit per pengguna (`429`).
Response `200`: `{ "mustChangePassword": false }`. Tercatat `PASSWORD_GANTI`.

#### Autentikasi (Auth.js) — /api/auth/*
Dikelola Auth.js (Credentials provider, JWT); route dibungkus `withHandler` sehingga semua respons membawa `X-Request-Id` dan `POST` memeriksa `Origin`. Formulir login memakai:
1. `GET /api/auth/csrf` → `{ "csrfToken": "…" }` (+ cookie CSRF).
2. `POST /api/auth/callback/credentials` (`application/x-www-form-urlencoded`: `csrfToken`, `username`, `password`, `callbackUrl`; header `X-Auth-Return-Redirect: 1`) → `200 { "url": "…" }`. Bila `url` berisi `error=CredentialsSignin` login gagal (pesan selalu "Username atau kata sandi salah."); bila berisi `code=login_diblokir` atau respons `429` (format error standar + `Retry-After`) kombinasi username+IP diblokir 15 menit setelah 5 kegagalan dalam 15 menit. Berhasil → cookie sesi diset.
3. `POST /api/auth/signout` (CSRF) → menghapus cookie sesi; tercatat `LOGOUT`.

Cookie sesi: `authjs.session-token` (`__Secure-authjs.session-token` bila `APP_URL` https), `httpOnly`, `SameSite=Lax`, `Secure` bila https, berlaku 8 jam, diperbarui bergulir maksimal 12 jam sejak login. Token hanya berisi `sub` (ID pengguna) dan `loginAt`; peran dan status akun dibaca dari database pada setiap request. Login berhasil/gagal/diblokir tercatat `LOGIN_BERHASIL`/`LOGIN_GAGAL`/`LOGIN_DIBLOKIR`.

#### GET /api/audit · GET /api/audit/ekspor
Authentication: Required (ADMIN)
Query: `aksi` (kode baku OBSERVABILITY), `aktor` (bagian username, tanpa memandang huruf besar-kecil), `dari` dan `sampai` (`YYYY-MM-DD`, WIB, inklusif; `sampai` ≥ `dari`), `page`, `pageSize` (≤ 200). Isian kosong diabaikan. Terbaru di atas.
Response: `{ "items": [...], "page": 1, "pageSize": 50, "total": 0 }` dengan item `{ "id": 1024, "at": "2026-10-12T14:05:03+07:00", "aktor": "admin.bapenda", "aksi": "PERIODE_KUNCI", "targetTipe": "periode", "targetId": "clx1a2b3c", "payload": { "snapshotHash": "…" }, "ip": "10.0.0.5" }`
`GET /api/audit/ekspor` (Excel) menyusul di tiket 19.
Payload audit selalu disaring saat ditulis: field bernama kata sandi, token, secret, apiKey, captcha, cookie, atau NIK dibuang dan teks berisi 16/18 digit utuh disamarkan.

---

## 3. Endpoints — Publik

#### GET /api/publik/pemenang
Authentication: Tidak (publik). Cache 60 detik.
Response (periode terakhir berstatus `DIPUBLIKASI`):
```json
{
  "dipublikasi": true,
  "judul": "Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026",
  "tanggalAcara": "2026-10-20",
  "lokasiAcara": "…",
  "diperbaruiAt": "2026-10-23T14:00:00+07:00",
  "integritas": { "snapshotHash": "…", "hasilHash": "…", "jumlahPeserta": { "W1": 20415, "W2": 20815 } },
  "wilayah": [
    {
      "kode": "W1", "nama": "Wilayah 1", "statusWilayah": "TERVERIFIKASI",
      "slot": [
        { "kode": "W1-UTAMA", "label": "Pemenang Utama", "status": "TERVERIFIKASI", "penerimaAktif": true,
          "peserta": { "nopMasked": "16.09.030.xxx.xxx-0003.0", "nikMasked": "1609xxxxxxxx0012", "nama": "…", "alamatWp": "…", "alamatOp": "…", "kecamatan": "…", "kelurahan": "…", "lunas": { "2022": "2022-06-29", "2023": "…", "2024": "…", "2025": "…", "2026": "…" } } }
      ]
    }
  ]
}
```
Belum dipublikasi: `{ "dipublikasi": false }`. Alasan gugur tidak ditampilkan ke publik (hanya status "Gugur").

#### POST /api/publik/cek
Authentication: Tidak (publik). Rate limit + captcha (SECURITY.md §5).
Request: `{ "nop": "16.09.030.003.003-0003.0", "captcha": "<token, wajib jika diminta>" }`
Validation: setelah dibuang titik/strip/spasi harus 18 digit.
Response:
```json
{ "ditemukan": true, "ikut": true, "nopMasked": "16.09.030.xxx.xxx-0003.0", "nama": "BUDI SANTOSO", "wilayah": "Wilayah 1", "alasan": [] }
```
```json
{ "ditemukan": true, "ikut": false, "nopMasked": "…", "nama": "…", "wilayah": null, "alasan": [ { "kode": "TANGGAL_KOSONG_2024", "pesan": "Tanggal lunas tahun 2024 kosong." } ] }
```
```json
{ "ditemukan": false }
```
`429 TERLALU_BANYAK_PERMINTAAN` dengan `details: { "captchaDiperlukan": true }` jika ambang terlewati.
Sumber data: periode aktif terbaru (status apa pun selain `DIBATALKAN`) — kepesertaan dapat dicek sejak impor, ditandai `"sementara": true` selama periode masih `DRAF`.

#### GET /api/publik/captcha
Authentication: Tidak. Mengembalikan tantangan proof-of-work.

#### GET /api/health
Authentication: Tidak.
Response `200`: `{ "status": "ok", "db": "ok", "versi": "0.1.0" }`; `503` jika DB gagal dengan badan `{ "status": "gagal", "db": "gagal", "versi": "0.1.0" }` (tanpa detail galat). Selalu `Cache-Control: no-store`.

---

## 4. Kontrak File Paket & Hasil

### 4.1 Hash Kanonik

- `canonicalStringify(value)`: JSON tanpa spasi, kunci objek diurutkan leksikografis (UTF-16 code unit) secara rekursif, urutan array dipertahankan, angka bilangan bulat saja (tidak ada float), string UTF-8 apa adanya (tanpa normalisasi Unicode tambahan), tanpa `undefined`.
- `sha256Hex(string)`: SHA-256 dari byte UTF-8, hex huruf kecil, 64 karakter.
- Tampilan untuk saksi: 8 karakter awal + `…` + 8 karakter akhir, huruf besar, mis. `3F9A1C0B…D27E44A1`.
- Implementasi tunggal di `src/lib/package/hash.ts`, dipakai server dan browser.

### 4.2 Struktur Paket `.zip`

```text
paket-undian-undian-umroh-2026-3f9a1c0b.zip
├── manifest.json          # daftar file + sha256 masing-masing (tanpa dirinya sendiri)
├── meta.json
├── snapshot.json          # file kanonik, byte identik dengan /data/storage/snapshot/<id>.json
└── tema/
    ├── theme.json         # ThemeConfig
    └── aset/
        ├── <sha256>.mp3
        └── <sha256>.webp
```

`manifest.json`:
```json
{
  "versiFormat": 1,
  "file": {
    "meta.json": "a1b2…",
    "snapshot.json": "3f9a1c0b…",
    "tema/theme.json": "c3d4…",
    "tema/aset/9e8f….mp3": "9e8f…"
  }
}
```
Browser menolak paket jika ada file yang hilang, file tambahan, atau sha256 tidak cocok.

### 4.3 meta.json

```json
{
  "versiFormat": 1,
  "aplikasiVersi": "0.1.0",
  "dibuatAt": "2026-10-18T10:00:00+07:00",
  "periode": {
    "id": "clx1a2b3c",
    "slug": "undian-umroh-2026",
    "judul": "Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026",
    "tanggalAcara": "2026-10-20",
    "lokasiAcara": "Gedung Kesenian Muaradua"
  },
  "wilayah": [
    { "kode": "W1", "nama": "Wilayah 1", "jumlahPeserta": 20415 },
    { "kode": "W2", "nama": "Wilayah 2", "jumlahPeserta": 20815 }
  ],
  "slot": [
    { "urutan": 1, "kode": "W1-UTAMA", "wilayah": "W1", "label": "Pemenang Utama" },
    { "urutan": 2, "kode": "W1-C1", "wilayah": "W1", "label": "Cadangan 1" },
    { "urutan": 3, "kode": "W1-C2", "wilayah": "W1", "label": "Cadangan 2" },
    { "urutan": 4, "kode": "W2-UTAMA", "wilayah": "W2", "label": "Pemenang Utama" },
    { "urutan": 5, "kode": "W2-C1", "wilayah": "W2", "label": "Cadangan 1" },
    { "urutan": 6, "kode": "W2-C2", "wilayah": "W2", "label": "Cadangan 2" }
  ],
  "snapshotHash": "3f9a1c0b…(64 hex)",
  "temaConfigHash": "c3d4…(64 hex)"
}
```

### 4.4 snapshot.json

Peserta terurut berdasarkan NOP naik; `urut` = indeks mulai 1 dan menjadi ID peserta di paket & hasil. Field tersamar saja.

```json
{
  "versiFormat": 1,
  "periodeId": "clx1a2b3c",
  "batasLunas": "2026-09-30T23:59:59+07:00",
  "peserta": [
    {
      "urut": 1,
      "wilayah": "W1",
      "nopMasked": "16.09.010.xxx.xxx-0001.0",
      "nikMasked": "1609xxxxxxxx0012",
      "nama": "BUDI SANTOSO",
      "alamatWp": "DUSUN I",
      "alamatOp": "DUSUN I",
      "kecamatan": "MUARADUA",
      "kelurahan": "BATU BELANG JAYA",
      "lunas": ["2022-06-10T09:00:00+07:00", "2023-07-12T10:00:00+07:00", "2024-08-05T11:00:00+07:00", "2026-04-13T10:59:53+07:00", "2026-08-11T14:07:29+07:00"]
    }
  ]
}
```
(Kunci di file fisik terurut sesuai §4.1; contoh di atas ditulis untuk keterbacaan.)

`snapshotHash = sha256Hex(canonicalStringify(snapshot))`. File disimpan sebagai hasil `canonicalStringify` sehingga sha256 file = `snapshotHash`.

### 4.5 File Hasil `hasil-undian-<slug>-<8hex>.json`

```json
{
  "versiFormat": 1,
  "periodeId": "clx1a2b3c",
  "snapshotHash": "3f9a1c0b…",
  "temaConfigHash": "c3d4…",
  "perangkat": { "id": "dev_7f3a…", "userAgent": "Mozilla/5.0 …" },
  "dimulaiAt": "2026-10-20T09:30:12+07:00",
  "selesaiAt": "2026-10-20T10:05:40+07:00",
  "slot": [
    { "urutan": 1, "kode": "W1-UTAMA", "urut": 10234, "diundiAt": "2026-10-20T09:34:01+07:00" },
    { "urutan": 2, "kode": "W1-C1", "urut": 552, "diundiAt": "…" },
    { "urutan": 3, "kode": "W1-C2", "urut": 18877, "diundiAt": "…" },
    { "urutan": 4, "kode": "W2-UTAMA", "urut": 30111, "diundiAt": "…" },
    { "urutan": 5, "kode": "W2-C1", "urut": 25002, "diundiAt": "…" },
    { "urutan": 6, "kode": "W2-C2", "urut": 40999, "diundiAt": "…" }
  ],
  "catatanLokal": [ { "at": "…", "jenis": "SIMPAN_GAGAL_DIULANG", "slot": "W1-C1" } ],
  "hasilHash": "7c21…90ab"
}
```
`hasilHash = sha256Hex(canonicalStringify(hasil tanpa kunci hasilHash))`.
`perangkat.id` = ID acak yang dibuat sekali per instalasi PWA.

### 4.6 Aturan Verifikasi Hasil (`verifyHasil`)

Dijalankan berurutan; pemeriksaan pertama yang gagal menentukan `details.pemeriksaan`:

| # | Kode pemeriksaan | Aturan |
|---|---|---|
| 1 | `FORMAT` | Lolos `HasilSchema` (zod), `versiFormat = 1` |
| 2 | `PERIODE` | `periodeId` sama dengan periode tujuan |
| 3 | `SNAPSHOT_HASH` | `snapshotHash` = `snapshot.hash` periode |
| 4 | `HASIL_HASH` | `hasilHash` dihitung ulang cocok |
| 5 | `SLOT_LENGKAP` | Lengkap sesuai `SLOT_URUTAN` (W1-UTAMA, W2-UTAMA) |
| 6 | `PESERTA_ADA` | Setiap `urut` ada di `snapshot_peserta` |
| 7 | `PESERTA_UNIK` | Tidak ada `urut` ganda |
| 8 | `WILAYAH_SESUAI` | Wilayah peserta = wilayah slot |
| 9 | `WAKTU` | `diundiAt` naik sesuai urutan, di antara `dimulaiAt` dan `selesaiAt`, dan setelah `snapshot.lockedAt` |
| 10 | `BELUM_ADA_HASIL` | Belum ada `hasil_undian` untuk periode (cek terakhir di dalam transaksi) |

Catatan integritas: `hasilHash` mendeteksi kerusakan/perubahan tidak sengaja. Perlindungan terhadap pemalsuan disengaja adalah pencatatan hash hasil oleh saksi di lokasi acara dan pencocokan dengan berita acara (SECURITY.md §9).

---

## 5. ThemeConfig

Skema zod tunggal di `src/lib/package/theme.ts`. Juga dipakai sebagai JSON Schema untuk structured output LLM.

```ts
export const ThemeConfigSchema = z.object({
  versiFormat: z.literal(1),
  animasi: z.object({
    preset: z.enum(['slot-mesin', 'roda-nama', 'kartu-berputar', 'ticker-nop']),
    durasiDetik: z.number().int().min(3).max(30),          // durasi auto-stop fase Mengacak
    autoStop: z.boolean(),                                  // false = hanya berhenti saat operator menekan Berhenti
    kecepatan: z.enum(['lambat', 'sedang', 'cepat']),
    perlambatanDetik: z.number().int().min(1).max(3),
  }),
  tampilan: z.object({
    latarAsetId: z.string().nullable(),                     // aset GAMBAR; null = latar default
    overlayGelapPersen: z.number().int().min(60).max(90),
    ornamenIslami: z.boolean(),
    warnaAksen: z.enum(['kuning', 'hijau', 'biru-muda']),   // hanya token dari DESIGN_SYSTEM
    confetti: z.boolean(),
  }),
  audio: z.object({
    menunggu: z.object({ asetId: z.string().nullable(), volumePersen: z.number().int().min(0).max(100), loop: z.literal(true) }),
    mengacak: z.object({ asetId: z.string().nullable(), volumePersen: z.number().int().min(0).max(100), loop: z.boolean() }),
    pemenang: z.object({ asetId: z.string().nullable(), volumePersen: z.number().int().min(0).max(100), loop: z.literal(false) }),
  }),
  teks: z.object({
    ucapanPemenang: z.string().min(3).max(80),              // mis. "Selamat kepada"
    subjudul: z.string().max(120).nullable(),
  }),
}).strict();
```

Default (`tema` bawaan):
```json
{
  "versiFormat": 1,
  "animasi": { "preset": "slot-mesin", "durasiDetik": 6, "autoStop": false, "kecepatan": "sedang", "perlambatanDetik": 3 },
  "tampilan": { "latarAsetId": null, "overlayGelapPersen": 70, "ornamenIslami": true, "warnaAksen": "kuning", "confetti": true },
  "audio": {
    "menunggu": { "asetId": "aset_bawaan_menunggu_1", "volumePersen": 40, "loop": true },
    "mengacak": { "asetId": "aset_bawaan_drumroll_1", "volumePersen": 70, "loop": true },
    "pemenang": { "asetId": "aset_bawaan_fanfare_1", "volumePersen": 90, "loop": false }
  },
  "teks": { "ucapanPemenang": "Selamat kepada", "subjudul": null }
}
```

Validasi tambahan di server (setelah skema):
- Setiap `asetId` non-null ada di tabel `aset`; `latarAsetId` berjenis `GAMBAR`; aset audio berjenis `AUDIO`.
- Untuk output AI: server mengirim katalog aset (`id`, `jenis`, `fase`, `nama`, `deskripsi`, `durasiDetik`) dan tema basis; **tidak** mengirim data peserta.

### Endpoint Aset Multimedia

- `GET /api/aset`: Ambil katalog semua aset (gambar & audio).
- `GET /api/aset/:id`: Streaming file fisik aset (gambar/audio) langsung dengan header `Content-Type` dan caching.
- `POST /api/aset`: Unggah berkas gambar/audio kustom (`multipart/form-data`) dengan validasi MIME, ekstensi, batas ukuran, dan kalkulasi SHA-256.

---

## API Rules

- Validate all inputs (zod di setiap handler; skema dibagi dengan klien)
- Authenticate protected endpoints (`requireRole` di setiap handler non-publik)
- Authorize resource access (matriks RBAC `SECURITY.md`; status periode dicek di service)
- Return consistent error responses (§1.1)
- Do not expose internal implementation details (tanpa stack trace, pesan Prisma, atau path file di respons)
- Semua mutasi terdaftar menulis `audit_log` dalam transaksi yang sama
- Respons yang memuat data pribadi: `Cache-Control: no-store` (kecuali `/api/publik/pemenang`)
