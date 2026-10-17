# Panduan Menjalankan dan Menguji Aplikasi di Lingkungan Lokal

Dokumen ini memandu langkah-langkah menjalankan sistem Undian Umroh PBB-P2 di komputer lokal untuk verifikasi mandiri sebelum rilis produksi.

---

## 1. Prasyarat Sistem

- **Node.js**: Versi 22 LTS atau lebih tinggi (`node -v`).
- **Docker Desktop**: Aktif dan berjalan untuk menjalankan basis data PostgreSQL 16 (`docker -v`).
- **Terminal Shell**: PowerShell (Windows) atau Bash (Linux/macOS).

---

## 2. Persiapan Konfigurasi (`.env`)

File konfigurasi `.env` sudah disediakan di direktori utama dengan nilai kunci rahasia lokal:

- `APP_URL=http://localhost:3000`
- `DATABASE_URL=postgresql://undian:undian@127.0.0.1:5432/undian?schema=public`
- `SEED_ADMIN_USERNAME=admin.bapenda`
- `SEED_ADMIN_PASSWORD=PasswordAdmin123!`

---

## 3. Menjalankan Layanan Basis Data Lokal

Jalankan container PostgreSQL dev melalui Docker:

```powershell
# Menjalankan PostgreSQL lokal (port 5432)
npm run db:dev:up

# Menerapkan seluruh migrasi tabel
npm run db:migrate:deploy

# Menginisialisasi akun Admin pertama
npm run db:seed
```

> **Catatan Akun Seed**:
> - Username: `admin.bapenda`
> - Kata sandi sementara: `PasswordAdmin123!`
> - Saat login pertama, sistem mewajibkan penggantian kata sandi baru.

---

## 4. Menjalankan Server Pengembangan

Mulai server lokal Next.js:

```powershell
npm run dev
```

Aplikasi dapat diakses melalui peramban di:
- **Halaman Utama Publik**: [http://localhost:3000](http://localhost:3000)
- **Halaman Login Admin/Operator**: [http://localhost:3000/login](http://localhost:3000/login)
- **Halaman Cek NOP Peserta**: [http://localhost:3000/cek](http://localhost:3000/cek)
- **Halaman Pengumuman Pemenang**: [http://localhost:3000/pemenang](http://localhost:3000/pemenang)

---

## 5. Skenario Pengujian Alur Penuh (End-to-End)

| No | Tahap | Aktor | Tindakan di Antarmuka |
|---|---|---|---|
| 1 | **Login & Ganti Sandi** | Admin | Buka `/login`, masukkan `admin.bapenda` & `PasswordAdmin123!`. Masukkan kata sandi baru (mis. `AdminOKUS2026!`). |
| 2 | **Buat Periode Baru** | Admin | Buka menu Periode -> Buat Periode (mis. `Undian Umroh PBB 2026`). Status: `DRAF`. |
| 3 | **Impor Data Peserta** | Admin | Unggah berkas CSV atau XLSX peserta lolos/gugur dari `tests/fixtures/peserta-campuran.csv`. |
| 4 | **Pemetaan Wilayah** | Admin | Petakan seluruh kecamatan ke Wilayah 1 (W1) atau Wilayah 2 (W2). |
| 5 | **Kunci Data Peserta** | Admin | Klik tombol Kunci Snapshot. Sistem menghitung hash SHA-256 data kanonik. Status: `TERKUNCI`. |
| 6 | **Unduh Paket Undian** | Admin | Unduh berkas ZIP paket undian panggung (berisi daftar peserta terenkripsi, aset tema, manifest). |
| 7 | **Muat Paket di Layar Undian** | Operator | Buka `/operator/undian`, muat file ZIP paket tadi. Verifikasi identitas paket valid. Matikan koneksi internet (uji offline). |
| 8 | **Pelaksanaan Pengundian** | Operator | Undi berurutan 6 slot: Slot 1 (W1 Utama), Slot 2 (W1 C1), Slot 3 (W1 C2), Slot 4 (W2 Utama), Slot 5 (W2 C1), Slot 6 (W2 C2). Uji tombol `Spasi` (Mulai/Berhenti), `F` (Fullscreen), `M` (Mute suara). |
| 9 | **Unduh Berkas Hasil** | Operator | Setelah 6 slot selesai, unduh berkas hasil kanonik `.json` dari layar undian. Sambungkan kembali internet. |
| 10 | **Unggah & Verifikasi Hasil** | Operator / Admin | Unggah berkas hasil di `/operator/periode/[id]/unggah` atau panel Admin. Sistem memverifikasi 10 tahapan integritas. Status: `DIUNDI`. |
| 11 | **Verifikasi / Gugurkan Pemenang** | Admin | Tinjau daftar pemenang. Jika pemenang gugur, klik Gugur; sistem otomatis menaikkan status cadangan 1 menjadi penerima aktif. |
| 12 | **Pengisian Berita Acara & Cetak PDF** | Admin | Buka formulir Berita Acara, isi saksi notaris/kepolisian, simpan, dan unduh PDF resmi. |
| 13 | **Publikasi Hasil ke Publik** | Admin | Klik Publikasikan Hasil. Status: `DIPUBLIKASI`. |
| 14 | **Pengecekan Halaman Publik** | Wajib Pajak / Publik | Buka `/pemenang` (menampilkan 6 penerima resmi dengan NIK/NOP tersamar) dan `/cek` (uji cari NOP). |

---

## 6. Menghentikan Layanan Lokal

Bila pengujian telah selesai:

```powershell
# Menghentikan server dev: tekan Ctrl + C di terminal Next.js

# Menghentikan container database dev (data tetap tersimpan di volume Docker)
npm run db:dev:down
```
