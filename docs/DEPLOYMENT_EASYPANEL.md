# Panduan Deploy Produksi ke VPS dengan Easypanel

> Sistem: Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026  
> Panel VPS: **Easypanel** (berbasis Docker & Traefik)  
> Bahasa: Indonesia | Status: Panduan Resmi

---

## 1. Persiapan Awal

• Pastikan VPS memiliki spesifikasi minimal 2 vCPU dan 4 GB RAM.  
• Pastikan domain (misal: `undian.okuselatankab.go.id`) telah diarahkan ke IP VPS (A Record).  
• Siapkan nilai rahasia acak untuk variabel lingkungan keamanan:
  - `AUTH_SECRET`: string acak base64 32 byte (`openssl rand -base64 32`).
  - `NIK_ENCRYPTION_KEY`: string acak base64 32 byte (`openssl rand -base64 32`). Simpan salinan di luar server!
  - `CAPTCHA_HMAC_KEY`: string acak base64 32 byte (`openssl rand -base64 32`).

---

## 2. Langkah 1: Buat Project di Easypanel

1. Buka dasbor Easypanel Anda di peramban (`https://ip-vps:3000` atau domain panel).
2. Klik tombol **+ New Project**.
3. Isi nama proyek: `undian-umroh`.
4. Klik **Create**.

---

## 3. Langkah 2: Tambahkan Service Database (PostgreSQL 16)

1. Di dalam project `undian-umroh`, klik tombol **+ Service**.
2. Pilih tab **Database**, lalu klik **PostgreSQL**.
3. Atur konfigurasi database:
   - **Name**: `db`
   - **Version / Image**: `postgres:16-alpine`
   - **Database Name**: `undian`
   - **User**: `undian`
   - **Password**: Buat kata sandi acak yang kuat (minimal 24 karakter).
4. Di bagian **Network / Ports**:
   - **JANGAN** centang atau buka port ke publik (Keep Disabled). Database hanya boleh diakses melalui jaringan internal Docker.
5. Klik **Deploy** dan tunggu status database berubah menjadi hijau (`Running`).

> **Catatan Koneksi Internal:**  
> URL koneksi database internal untuk aplikasi adalah:  
> `postgresql://undian:<password>@undian-umroh_db:5432/undian?schema=public`  
> *(Catatan: sesuaikan nama host internal dengan nama container database di Easypanel Anda, umumnya `<project>_<service>`)*.

---

## 4. Langkah 3: Tambahkan Service Aplikasi (Next.js)

1. Di dalam project `undian-umroh`, klik tombol **+ Service**.
2. Pilih tab **App**.
3. Atur konfigurasi sumber kode (**Source**):
   - **Source**: Pilih **GitHub** atau **Git Repository**.
   - **Repository**: Pilih repositori `undian-umroh`.
   - **Branch**: `main` (atau branch rilis produksi).
   - **Build Type**: Pilih **Dockerfile**.
   - **Dockerfile Path**: `./Dockerfile` (tersedia di root proyek).
4. Atur konfigurasi port (**General**):
   - **App Port**: `3000`.
5. Atur volume penyimpanan berkas (**Mounts / Volumes**):
   - Klik **Add Volume / Mount**.
   - **Host Path / Volume Name**: `app-storage`.
   - **Container Path**: `/data/storage`.
   *(Penting: `/data/storage` wajib menggunakan persistent volume agar berkas snapshot, tema, dan aset tidak hilang saat container restart)*.
6. Atur domain dan SSL (**Domains**):
   - Klik **Add Domain**.
   - Masukkan domain resmi: `undian.okuselatankab.go.id` (atau domain Anda).
   - Pastikan opsi HTTPS / SSL aktif (Easypanel otomatis menerbitkan sertifikat Let's Encrypt).
   - Port tujuan: `3000`.

---

## 5. Langkah 4: Konfigurasi Environment Variables

Buka tab **Environment** pada service Aplikasi, lalu tambahkan variabel berikut:

```env
# Lingkungan & URL
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
APP_URL=https://undian.okuselatankab.go.id
NEXT_PUBLIC_APP_NAME=Undian Umroh PBB OKU Selatan
NEXT_PUBLIC_APP_VERSION=0.1.0
TZ=Asia/Jakarta
LOG_LEVEL=info

# Database (Internal Easypanel)
DATABASE_URL=postgresql://undian:<password-db>@undian-umroh_db:5432/undian?schema=public

# Keamanan (Wajib Acak 32-Byte Base64)
AUTH_SECRET=<hasil_openssl_rand_base64_32>
NIK_ENCRYPTION_KEY=<hasil_openssl_rand_base64_32>
CAPTCHA_HMAC_KEY=<hasil_openssl_rand_base64_32>

# Akun Seed Admin Pertama Kali
SEED_ADMIN_USERNAME=admin.bapenda
SEED_ADMIN_PASSWORD=KatasandiKuat123#

# Penyimpanan
STORAGE_DIR=/data/storage
```

Klik **Save**.

---

## 6. Langkah 5: Deploy Aplikasi

1. Klik tombol **Deploy** pada service Aplikasi.
2. Pantau log proses build di tab **Deployments**.
3. Tunggu hingga proses build Next.js standalone selesai dan status kontainer menjadi `Running`.

---

## 7. Langkah 6: Jalankan Migrasi Database dan Seed Akun

Setelah container aplikasi berjalan:
1. Buka tab **Console** / **Terminal** pada service Aplikasi di Easypanel.
2. Jalankan perintah migrasi skema database Prisma:
   ```bash
   npx prisma migrate deploy
   ```
   *Pastikan seluruh migration (20261012022717 sampai 20261012180000) sukses diterapkan.*

3. Jalankan seeding akun Admin awal:
   ```bash
   npm run db:seed
   ```
   *Sistem akan membuat akun Admin `admin.bapenda` dan tema bawaan undian.*

---

## 8. Langkah 7: Verifikasi dan Hardening Pasca Deploy

1. **Uji Endpoint Kesehatan (Smoke Test)**:
   Buka peramban atau jalankan curl:
   ```bash
   curl -I https://undian.okuselatankab.go.id/api/health
   ```
   Respons yang diharapkan:
   - Status: HTTP 200 OK.
   - Body JSON: `{"status":"ok","db":"ok","versi":"0.1.0"}`.
   - Header keamanan ada: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`.

2. **Login Pertama dan Ganti Kata Sandi**:
   - Buka `https://undian.okuselatankab.go.id/login`.
   - Masuk dengan username `admin.bapenda` dan kata sandi seed.
   - Sistem akan langsung memaksa Anda mengganti kata sandi baru.
   - Masukkan kata sandi baru yang kuat.

3. **Hapus Password Seed dari Easypanel**:
   - Buka kembali tab **Environment** pada service Aplikasi di Easypanel.
   - Hapus variabel `SEED_ADMIN_PASSWORD`.
   - Klik **Save**.
