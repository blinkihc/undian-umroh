# Deployment

> Status: Draf v0.1. Hosting di VPS Pemkab dengan Docker Compose (Decision 013). Variabel lingkungan di `ENVIRONMENT.md`; log dan alert di `OBSERVABILITY.md`.

## Environments

Development:
`http://localhost:3000` — `npm run dev`, PostgreSQL via `docker compose -f docker-compose.dev.yml up db`.

Staging:
`https://staging.<domain-pemkab>` — VPS (atau stack Compose terpisah di VPS yang sama) dengan data dummy (`tests/fixtures`, 46.000 baris sintetis). Dipakai untuk gladi bersih. Domain belum ditetapkan.

Production:
`https://undian.<domain-pemkab>` — VPS Pemkab OKU Selatan. Domain dan sertifikat TLS menunggu keputusan Bapenda/Diskominfo.

Aturan pemisahan: staging dan production memakai database, volume, dan seluruh rahasia yang berbeda. Data asli wajib pajak tidak pernah dimuat ke staging atau lokal.

### Persyaratan VPS

| Sumber daya | Minimum | Catatan |
|---|---|---|
| CPU / RAM | 2 vCPU / 4 GB | Impor 46.000 baris dan penyusunan paket butuh memori |
| Disk | 40 GB SSD | Aset, snapshot, backup lokal 30 hari |
| OS | Ubuntu LTS terbaru | Patch keamanan otomatis aktif |
| Jaringan | Port 80/443 terbuka; 22 hanya dari IP admin | PostgreSQL tidak diekspos |
| Waktu | NTP aktif | Timestamp audit dan hasil bergantung jam sistem |

---

## Deployment Process

1. Run tests
2. Run lint
3. Run build
4. Deploy
5. Run smoke tests
6. Verify monitoring

Rincian:

**1–3. CI (sebelum rilis):** `npm run lint` → `npm run typecheck` → `npm run test:unit` → `npm run test:int` → `npm run build` → `npm run test:e2e`; `npm audit --omit=dev` ditinjau.

**4. Deploy** (di VPS, dijalankan user `deploy`):
```bash
cd /opt/undian
git fetch --tags && git checkout v0.1.0
docker compose build app
/opt/undian/scripts/backup.sh                     # backup sebelum migrasi
docker compose run --rm app npx prisma migrate deploy
docker compose up -d app caddy db
```
Gagal di tahap migrasi → berhenti; aplikasi versi lama tetap berjalan (migrasi hanya penambahan kompatibel mundur — `DATABASE.md` §11).

**5. Smoke tests:**
- `curl -fsS https://undian.<domain-pemkab>/api/health` → `{"status":"ok","db":"ok"}`
- Login Admin, buka dasbor
- `/pemenang` dan `/cek` terbuka
- Header keamanan ada (`curl -I`: CSP, HSTS)

**6. Verifikasi monitoring:** health check hijau, tidak ada lonjakan `error` di log 15 menit pertama, backup terakhir sukses.

### Docker Compose (ringkas)

```yaml
services:
  app:
    image: undian-umroh:${APP_VERSION}
    env_file: .env.production
    depends_on:
      db: { condition: service_healthy }
    volumes:
      - app-storage:/data/storage
    expose: ["3000"]
    restart: unless-stopped
    user: "1001:1001"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    logging: { driver: json-file, options: { max-size: "10m", max-file: "5" } }
  db:
    image: postgres:16
    env_file: .env.production
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      retries: 5
    restart: unless-stopped
    # tanpa ports: hanya dapat dijangkau jaringan internal Compose
  caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
    depends_on: [app]
    restart: unless-stopped
volumes: { app-storage: {}, db-data: {}, caddy-data: {} }
```

`docker/Caddyfile`:
```text
undian.<domain-pemkab> {
  encode gzip
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    -Server
  }
  reverse_proxy app:3000 {
    header_up X-Forwarded-For {remote_host}
  }
}
```
Caddy adalah satu-satunya proxy tepercaya; aplikasi hanya membaca IP klien dari `X-Forwarded-For` yang ditetapkan Caddy (`SECURITY.md` §5). CSP dan header lain diatur aplikasi (`next.config`).

### Image aplikasi

Multi-stage `docker/Dockerfile`: `deps` → `build` (`next build`, `output: 'standalone'`) → `runtime` (node:slim, user non-root, hanya artefak standalone + Prisma CLI untuk migrasi). `.env` tidak disalin ke image. Versi image sama dengan tag git.

### Seed pertama kali

```bash
docker compose run --rm app npx prisma migrate deploy
docker compose run --rm -e SEED_ADMIN_USERNAME=admin.bapenda -e SEED_ADMIN_PASSWORD='<sementara>' app npm run db:seed
```
Setelah login pertama dan ganti kata sandi, pastikan `SEED_ADMIN_PASSWORD` tidak tersimpan di `.env.production`.

---

## Backup & Restore

Backup harian pukul 02:00 (cron user `deploy`), `scripts/backup.sh`:
```bash
set -euo pipefail
source /opt/undian/.env.production
TS=$(date +%F)
docker compose -f /opt/undian/docker-compose.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" | age -r "$BACKUP_AGE_RECIPIENT" > "$BACKUP_DIR/db-$TS.dump.age"
tar -C /var/lib/docker/volumes/undian_app-storage/_data -cf - . | age -r "$BACKUP_AGE_RECIPIENT" > "$BACKUP_DIR/storage-$TS.tar.age"
find "$BACKUP_DIR" -type f \( -name 'db-*.age' -o -name 'storage-*.age' \) -mtime +30 ! -name '*-01.*' -delete
find "$BACKUP_DIR" -type f \( -name 'db-*-01.*' -o -name 'storage-*-01.*' \) -mtime +365 -delete
```
- Retensi: harian 30 hari, bulanan (tanggal 01) 12 bulan.
- Kunci **pribadi** `age` dan `NIK_ENCRYPTION_KEY` disimpan terpisah dari server (mis. brankas fisik/penyimpanan terenkripsi milik Kepala Bidang). Tanpa `NIK_ENCRYPTION_KEY`, NIK pada backup tidak terbaca.
- Salinan backup dipindahkan ke lokasi di luar VPS (mis. penyimpanan Diskominfo) minimal mingguan.
- **Uji restore:** setiap 3 bulan dan wajib H-7 acara, ke instance staging:
  ```bash
  age -d -i kunci-backup.txt db-YYYY-MM-DD.dump.age | docker compose exec -T db pg_restore -U undian -d undian_restore --clean --if-exists
  ```
  Catat hasil di checklist.

---

## Rollback

1. **Kode saja (tanpa migrasi destruktif):**
   ```bash
   cd /opt/undian && git checkout <tag-sebelumnya>
   docker compose build app && docker compose up -d app
   ```
2. **Migrasi bermasalah:** migrasi dirancang kompatibel mundur (tambah kolom nullable/berdefault; baru dijadikan wajib di rilis berikutnya), sehingga rollback kode aman tanpa membalik skema. Bila skema terlanjur rusak: hentikan `app`, restore backup yang diambil sebelum migrasi (`pg_restore --clean`), jalankan versi lama.
3. **Data undian (hasil) tidak pernah di-rollback.** `hasil_undian`, `snapshot`, `audit_log` immutable; kesalahan hasil ditangani dengan membatalkan periode (Decision 016) atau keputusan panitia, bukan menghapus data.
4. Setelah rollback: jalankan smoke test, catat di `CHANGELOG.md` dan audit/insiden internal.

---

## Production Checklist

- [ ] Build succeeds
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Monitoring enabled
- [ ] Smoke tests pass

Tambahan sebelum go-live pertama:
- [ ] `.env.production` izin `600`; `SEED_ADMIN_PASSWORD` dihapus; semua rahasia unik per lingkungan
- [ ] HTTPS aktif, HSTS dan CSP terverifikasi (`curl -I`)
- [ ] Port 5432 tidak terjangkau dari luar (`nmap` dari luar VPS)
- [ ] Backup pertama sukses dan **uji restore** berhasil
- [ ] Kunci `age` pribadi dan `NIK_ENCRYPTION_KEY` tersimpan terpisah dan dapat ditemukan penanggung jawab
- [ ] Trigger immutable pada `snapshot`, `snapshot_peserta`, `hasil_undian`, `audit_log` terpasang (test integrasi lulus)
- [ ] Akun Admin dan Operator dibuat; kata sandi awal sudah diganti
- [ ] Tidak ada data asli di staging/dev

---

## Checklist Acara Undian

### H-14 sampai H-7
- [ ] Data PBB final diimpor; laporan validasi ditinjau Bapenda; kecamatan dipetakan
- [ ] Judul acara, tanggal, lokasi, nama wilayah dikonfirmasi; saksi ditentukan
- [ ] Tema dipilih dan dipratinjau di proyektor dan speaker lokasi acara (kunjungan lokasi)
- [ ] Uji restore backup (di atas)
- [ ] **Gladi bersih penuh** pada periode uji: skenario `TESTING.md` §5, laptop dan proyektor asli, tanpa internet

### H-1
- [ ] Data dikunci; `snapshotHash` dicatat dan dikirim ke saksi
- [ ] Paket diunduh; dimuat di **laptop utama** dan **laptop cadangan**; keduanya menampilkan "Siap Offline" dengan `snapshotHash` sama
- [ ] Uji suara dan keterbacaan layar dari baris belakang ruangan
- [ ] Laptop: baterai penuh + charger, Windows Update dimatikan sementara, mode hemat daya nonaktif, notifikasi dimatikan (Do Not Disturb), screensaver/sleep nonaktif, resolusi 1920×1080
- [ ] Browser Chrome/Edge terbaru; **bukan mode Incognito** (IndexedDB hilang); aplikasi terpasang sebagai PWA
- [ ] Salinan paket disimpan di 2 flashdisk; akun Windows laptop dibatasi (penonton tidak mengakses)
- [ ] Hapus data undian uji dari laptop sebelum memuat paket produksi

### Hari-H (sebelum acara)
- [ ] Putuskan Wi-Fi/LAN; buka layar undian; pastikan "Siap Offline"
- [ ] Tampilkan `snapshotHash` ke saksi; catat/foto
- [ ] Pasang proyektor, uji speaker; operator cadangan hadir
- [ ] **Jangan** menekan Mulai sebelum saksi siap

### Saat undian
- [ ] Dokumentasikan (foto/video) setiap kartu pemenang; saksi mencatat nama slot dan pemenang
- [ ] Setelah slot ke-6: catat hash hasil dari layar; unduh file hasil; salin ke 2 flashdisk
- [ ] Jangan menutup browser atau mematikan laptop sebelum file hasil terunduh

### Pasca acara (dalam 1 hari kerja)
- [ ] Unggah file hasil ke server (online); cocokkan hash hasil dengan catatan saksi
- [ ] Verifikasi/gugurkan pemenang; berita acara PDF dicetak dan ditandatangani
- [ ] Publikasikan hasil
- [ ] Hapus data undian dari IndexedDB laptop acara ("Hapus Data Undian") setelah hasil terunggah dan diverifikasi
- [ ] Backup manual setelah publikasi

### Prosedur gangguan hari-H

| Gangguan | Tindakan |
|---|---|
| Browser tertutup/refresh/laptop restart | Buka kembali layar undian; lanjut otomatis dari slot terakhir (Flow 10). |
| Laptop utama rusak **sebelum** ada slot diumumkan | Pindah ke laptop cadangan (paket sama, hash sama); mulai dari awal. Catat kejadian di berita acara. |
| Laptop utama rusak **setelah** sebagian slot diumumkan | Hasil di laptop itu tidak dapat dipindah otomatis (MVP). Coba pulihkan profil browser/disk. Bila gagal: keputusan panitia dan saksi dicatat di berita acara; dokumentasi foto/video setiap pemenang yang sudah diumumkan menjadi dasar. Lihat ROADMAP (cadangan hasil parsial per slot). |
| Audio tidak keluar | Klik "Aktifkan suara" lalu `M`; periksa output audio Windows. Undian tetap sah tanpa suara. |
| Proyektor mati | Laptop tetap menyimpan hasil; lanjutkan setelah tampilan pulih. |
| Hash paket tidak cocok saat dimuat | Jangan dipakai. Unduh ulang paket dari server; bandingkan `snapshotHash` dengan catatan saksi. |
| Server/internet mati | Tidak berdampak pada undian. Unggah hasil ditunda sampai online. |

---

## Pemeliharaan Rutin

- Patch OS otomatis (`unattended-upgrades`); pembaruan image `postgres:16` dan `caddy:2` diperiksa bulanan; aplikasi: `npm audit` tiap rilis.
- Cek ruang disk dan hasil backup mingguan.
- Anonimisasi data peserta 12 bulan setelah publikasi (ROADMAP NEXT: otomatis; sampai itu tersedia dijalankan manual dengan skrip dan dicatat `SISTEM_ANONIMISASI`).
- Rotasi kata sandi akun Admin saat ada pergantian petugas; nonaktifkan akun yang tidak lagi dipakai.
