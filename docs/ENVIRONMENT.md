# Environment Configuration

> Status: Draf v0.1. Semua variabel divalidasi saat start oleh `src/config/env.ts` (zod); aplikasi gagal cepat bila ada yang hilang atau salah format.
> File: `.env` (lokal, tidak di-commit), `.env.example` (di-commit, tanpa nilai rahasia), `.env.production` di VPS (izin `600`).

## Public Variables

Variabel berawalan `NEXT_PUBLIC_` ikut terkirim ke browser. Jangan menaruh rahasia di sini.

NEXT_PUBLIC_APP_NAME=Undian Umroh PBB OKU Selatan
NEXT_PUBLIC_APP_VERSION=0.1.0

Tidak berlaku:
- `NEXT_PUBLIC_APP_URL` — URL aplikasi dibaca server dari `APP_URL`; klien memakai path relatif.
- `NEXT_PUBLIC_API_URL` — API berada di origin yang sama (`/api`), tanpa CORS.

---

## Private Variables

Aplikasi:

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `NODE_ENV` | ya | `production` | `development` / `test` / `production` |
| `APP_URL` | ya | `https://undian.example.go.id` | Origin publik tanpa garis miring akhir. Dipakai cek `Origin` pada mutasi dan tautan absolut. |
| `LOG_LEVEL` | tidak | `info` | `error` / `warn` / `info` / `debug`. Default `info`. |
| `TZ` | tidak | `Asia/Jakarta` | Zona waktu proses. Default `Asia/Jakarta`. |

Database:

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `DATABASE_URL` | ya | `postgresql://undian:<kata-sandi>@db:5432/undian?schema=public` | Koneksi aplikasi. Host `db` adalah service Docker Compose. |
| `DATABASE_URL_TEST` | hanya dev/CI | `postgresql://undian:undian@localhost:5433/undian_test` | PostgreSQL untuk test integrasi (`docker-compose.test.yml`). |
| `POSTGRES_USER` | ya (Compose) | `undian` | Dipakai container `db`. |
| `POSTGRES_PASSWORD` | ya (Compose) | *(acak, ≥ 24 karakter)* | Dipakai container `db`. |
| `POSTGRES_DB` | ya (Compose) | `undian` | Dipakai container `db`. |

Keamanan:

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `AUTH_SECRET` | ya | *(base64 32 byte)* | Kunci sesi Auth.js. Rotasi memaksa semua pengguna login ulang. |
| `NIK_ENCRYPTION_KEY` | ya | *(base64 32 byte)* | Kunci AES-256-GCM untuk NIK. **Hilang = NIK tidak terbaca.** Cadangkan terpisah dari server. |
| `CAPTCHA_HMAC_KEY` | ya | *(base64 32 byte)* | Penanda tangan tantangan captcha proof-of-work. |
| `SEED_ADMIN_USERNAME` | hanya seed | `admin.bapenda` | Akun Admin pertama. |
| `SEED_ADMIN_PASSWORD` | hanya seed | *(≥ 12 karakter)* | Wajib diganti saat login pertama. **Hapus dari env produksi setelah seed.** |

Penyimpanan:

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `STORAGE_DIR` | ya | `/data/storage` | Direktori aset, snapshot kanonik, dan salinan file hasil. Volume `app-storage`. |

Asisten AI (opsional; fitur nonaktif bila `AI_API_KEY` kosong):

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `AI_PROVIDER` | tidak | `openai` | Penyedia ditentukan nanti (open question PRD). Diakses lewat adapter `src/server/ai/`. |
| `AI_API_KEY` | tidak | *(rahasia)* | Hanya dibaca di `src/server/ai/`. |
| `AI_MODEL` | tidak | *(nama model)* | Model yang dipakai. |

Backup (dibaca skrip di host, bukan aplikasi):

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `BACKUP_AGE_RECIPIENT` | ya | `age1…` | Kunci **publik** `age` untuk mengenkripsi backup. Kunci pribadi disimpan terpisah, bukan di server. |
| `BACKUP_DIR` | ya | `/var/backups/undian` | Tujuan file backup. |

Tidak berlaku: `STRIPE_SECRET_KEY` (tidak ada pembayaran), kredensial email (tidak ada email).

### Membuat nilai rahasia

```bash
openssl rand -base64 32     # AUTH_SECRET, NIK_ENCRYPTION_KEY, CAPTCHA_HMAC_KEY
openssl rand -base64 24     # POSTGRES_PASSWORD
age-keygen -o kunci-backup.txt   # jalankan di komputer admin, bukan di server
```

### Contoh `.env.example`

```dotenv
NODE_ENV=development
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Undian Umroh PBB OKU Selatan"
NEXT_PUBLIC_APP_VERSION=0.1.0
LOG_LEVEL=debug
TZ=Asia/Jakarta

DATABASE_URL=postgresql://undian:undian@localhost:5432/undian?schema=public
DATABASE_URL_TEST=postgresql://undian:undian@localhost:5433/undian_test
POSTGRES_USER=undian
POSTGRES_PASSWORD=ganti-di-produksi
POSTGRES_DB=undian

AUTH_SECRET=
NIK_ENCRYPTION_KEY=
CAPTCHA_HMAC_KEY=
SEED_ADMIN_USERNAME=admin.bapenda
SEED_ADMIN_PASSWORD=

STORAGE_DIR=./.storage

AI_PROVIDER=
AI_API_KEY=
AI_MODEL=

BACKUP_AGE_RECIPIENT=
BACKUP_DIR=./.backups
```

---

## Rules

- Never commit real secrets
- Never expose private variables to client-side code
- Keep local and production configuration separate
- Document newly introduced variables

Validasi saat start:
- `src/config/env.ts` memvalidasi variabel aplikasi (`NODE_ENV`, `APP_URL`, `DATABASE_URL`, tiga kunci base64 32 byte, `STORAGE_DIR`, serta `LOG_LEVEL`, `TZ`, `AI_*`, `NEXT_PUBLIC_*` yang opsional). Hook `src/instrumentation.ts` menjalankannya saat server mulai; bila salah, pesan Indonesia berisi nama variabel (bukan nilainya) ditulis ke stderr dan proses keluar dengan kode 1.
- `POSTGRES_*` (Compose), `BACKUP_*` (skrip host), dan `SEED_*` (skrip seed) dibaca oleh konsumennya sendiri dan tidak divalidasi oleh aplikasi.
- `npm run db:seed` membaca `.env` (bila ada) dan memvalidasi env aplikasi seperti server, jadi butuh `DATABASE_URL`, tiga kunci, `APP_URL`, dan `STORAGE_DIR` selain `SEED_ADMIN_USERNAME` dan `SEED_ADMIN_PASSWORD`. Perintah ini memakai `tsx` (devDependency); image produksi (tiket 25) harus menyertakannya atau menjalankan seed dari tahap build.
- Pengembangan lokal: salin `.env.example` ke `.env`, lalu isi `AUTH_SECRET`, `NIK_ENCRYPTION_KEY`, dan `CAPTCHA_HMAC_KEY` (base64 dari 32 byte acak) sebelum `npm run dev`.

Tambahan:
- Variabel baru wajib ditambahkan ke tabel di atas, `.env.example`, `src/config/env.ts`, dan (jika sensitif) `SECURITY.md` §4.
- Nilai di `.env.example` tidak boleh berupa rahasia nyata, termasuk kata sandi yang dipakai di produksi.
- Dilarang membuat variabel rahasia berawalan `NEXT_PUBLIC_`.
- Pengembangan, test, dan produksi memakai database dan kunci berbeda. Kunci `NIK_ENCRYPTION_KEY` produksi tidak boleh dipakai di lokal.
- `.env` produksi berada di VPS dengan izin `600`, pemilik user deploy, dan tidak disalin ke image Docker.
- Rotasi: `AUTH_SECRET` aman diganti kapan saja (pengguna login ulang); `NIK_ENCRYPTION_KEY` hanya dengan skrip re-enkripsi (ROADMAP LATER) — jangan diganti manual.
