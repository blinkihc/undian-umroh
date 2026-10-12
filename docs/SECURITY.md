# Security Guidelines

> Status: Draf v0.1. Berlaku untuk server, Layar Undian (PWA offline), dan halaman publik.
> Validasi keamanan menyeluruh tetap membutuhkan review manual dan uji penetrasi sebelum produksi.

## 1. Authentication

Authentication Provider:
Auth.js (NextAuth v5) dengan Credentials provider. Hash kata sandi argon2id (`@node-rs/argon2`, parameter: memory 19 MiB, iterations 2, parallelism 1 — rekomendasi OWASP minimum).

Methods:
- Username + kata sandi
- OAuth: Tidak berlaku — tidak ada penyedia identitas eksternal
- Magic link: Tidak berlaku — tidak ada email
- Tidak ada pendaftaran mandiri; akun dibuat Admin

Aturan:
- Kata sandi minimal 12 karakter; ditolak jika sama dengan username. Tidak ada aturan komposisi rumit. Saat mengganti, kata sandi baru juga harus berbeda dari yang lama (Decision 023).
- Akun baru dan akun yang di-reset wajib ganti kata sandi saat login pertama (`must_change_password`); semua halaman lain diblokir sampai diganti.
- Sesi: JWT di cookie `httpOnly`, `Secure`, `SameSite=Lax`, masa berlaku 8 jam, perpanjangan bergulir maksimal 12 jam sejak login. `Secure` dan awalan `__Secure-` aktif bila `APP_URL` berawalan `https://` (produksi di balik Caddy); pengembangan lokal lewat `http://localhost` memakai cookie tanpa `Secure`. Perpanjangan dilakukan `src/proxy.ts` (tiap 15 menit aktivitas); batas 12 jam ditegakkan `requireUser` di setiap request. Detail di Decision 023.
- Setiap request terautentikasi memanggil `requireUser()` yang mengecek ke DB: akun ada, `aktif = true`, peran sesuai. Akun yang dinonaktifkan langsung kehilangan akses tanpa menunggu token kedaluwarsa.
- Pesan login gagal selalu generik: "Username atau kata sandi salah." (kredensial salah, username tak dikenal, dan akun nonaktif). Waktu respons username tak dikenal disamakan dengan verifikasi hash palsu. Teks yang diketik di kolom username dan tidak berpola username tidak dicatat di audit.
- Admin awal dibuat dari `SEED_ADMIN_USERNAME`/`SEED_ADMIN_PASSWORD` dan wajib ganti kata sandi saat login pertama. Hapus `SEED_ADMIN_PASSWORD` dari env produksi setelah seed.

### Layar Undian Offline

- `/operator/undian` hanya dapat **dipasang dan diakses online** oleh pengguna login berperan OPERATOR/ADMIN. Middleware menolak akses tanpa sesi saat online.
- Saat offline, service worker menyajikan shell yang sudah di-cache tanpa memeriksa sesi (tidak mungkin dicek). Risiko diterima karena:
  - paket tidak memuat NIK/NOP utuh;
  - hasil hanya berlaku setelah diunggah oleh pengguna terautentikasi dan lolos verifikasi;
  - hash hasil dicatat saksi di lokasi.
- Tombol "Hapus Data Undian" menghapus IndexedDB setelah hasil terunggah; wajib dijalankan setelah acara (checklist `DEPLOYMENT.md`).

---

## 2. Authorization

Roles:
- ADMIN
- OPERATOR
- Publik (tanpa login)

Permissions:

### Admin
Seluruh fitur: periode, impor, peserta, pemetaan, kunci, batal, tema & aset, AI, paket, unggah hasil, pemenang (termasuk lihat NIK kandidat), berita acara, ekspor, publikasi, pengguna, log audit.

### Operator
- Melihat daftar & detail periode (tanpa data peserta)
- Membuka dan menjalankan Layar Undian, memuat paket, pratinjau aset
- Mengunggah file hasil
- Mengganti kata sandi sendiri

### Publik
- `/`, `/pemenang`, `/cek` dan API `/api/publik/*`, `/api/health`

Authorization must be enforced server-side.

### Matriks RBAC (setiap endpoint `API.md`)

| Endpoint | ADMIN | OPERATOR | Publik |
|---|---|---|---|
| `GET /api/periode`, `GET /api/periode/:id` | ✓ | ✓ | – |
| `POST /api/periode`, `PATCH /api/periode/:id`, `POST …/batal` | ✓ | – | – |
| `POST …/impor`, `GET …/ringkasan`, `GET …/peserta`, `GET …/peserta/ekspor-gugur` | ✓ | – | – |
| `GET/PUT …/wilayah` | ✓ | – | – |
| `POST …/kunci` | ✓ | – | – |
| `GET …/paket` | ✓ | – | – |
| `POST …/hasil` | ✓ | ✓ | – |
| `GET …/pemenang`, `POST …/pemenang/:slot/verifikasi`, `…/gugur`, `…/nik` | ✓ | – | – |
| `GET/PUT …/berita-acara`, `GET …/berita-acara/pdf`, `GET …/ekspor/pemenang` | ✓ | – | – |
| `POST …/publikasi` | ✓ | – | – |
| `GET/POST/PUT/DELETE /api/tema`, `PUT …/periode/:id/tema`, `POST /api/tema/ai` | ✓ | – | – |
| `GET/POST/DELETE /api/aset` | ✓ | – | – |
| `GET /api/aset/:id/file` | ✓ | ✓ | – |
| `GET/POST/PATCH /api/pengguna` | ✓ | – | – |
| `POST /api/akun/ganti-password` | ✓ | ✓ | – |
| `GET /api/audit`, `GET /api/audit/ekspor` | ✓ | – | – |
| `GET /api/publik/pemenang`, `POST /api/publik/cek`, `GET /api/publik/captcha` | ✓ | ✓ | ✓ |
| `GET /api/health` | ✓ | ✓ | ✓ |

Aturan tambahan:
- Otorisasi status (mis. impor hanya saat `DRAF`) dicek di service, bukan hanya di UI.
- Halaman (`/admin/*`, `/operator/*`) dilindungi middleware **dan** pengecekan ulang di Server Component/handler. Middleware bukan satu-satunya lapisan.

---

## 3. Secrets

Rules:
- Never hard-code credentials
- Never commit production secrets
- Never expose private secrets to the client
- Use environment variables
- Rotate compromised credentials
- Use appropriate secret storage

Penerapan:
- `.env` produksi berada di VPS dengan izin `600`, pemilik user deploy; tidak disalin ke image Docker.
- `.env.example` hanya berisi nama variabel dan nilai contoh non-rahasia.
- Rotasi `AUTH_SECRET` memaksa semua pengguna login ulang. Rotasi `NIK_ENCRYPTION_KEY` membutuhkan skrip re-enkripsi (`scripts/rotate-nik-key.ts`, LATER) — jangan rotasi tanpa skrip.
- `AI_API_KEY` hanya dibaca di `src/server/ai/`.

---

## 4. Environment Variables

Daftar lengkap dan format di `ENVIRONMENT.md`.

Public:
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_VERSION`

Private:
- `DATABASE_URL`
- `AUTH_SECRET`
- `APP_URL`
- `NIK_ENCRYPTION_KEY`
- `STORAGE_DIR`
- `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`
- `CAPTCHA_HMAC_KEY`
- `SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`
- `LOG_LEVEL`

Aturan: tidak ada rahasia dengan awalan `NEXT_PUBLIC_`. `src/config/env.ts` memvalidasi semua variabel saat start dan gagal cepat jika salah.

---

## 5. API Security

Input validation:
- Setiap handler mem-parse body/query/params dengan zod `.strict()`; field tak dikenal ditolak.
- Batas ukuran body: JSON umum 100 KB, hasil undian 1 MB, unggah file sesuai §8.
- String dibatasi panjangnya; tidak ada HTML yang dirender dari input pengguna (React escape default; `dangerouslySetInnerHTML` dilarang).
- Prisma dipakai untuk semua query (parameterized). Raw SQL hanya di migrasi atau `$queryRaw` dengan template tag (tanpa `$queryRawUnsafe`).

Rate limiting (memori proses, kunci per IP dan/atau username):

| Target | Batas | Aksi saat terlewati |
|---|---|---|
| Login | 5 gagal / 15 menit per username+IP | blokir 15 menit, `429` |
| `POST /api/publik/cek` | 20 / 10 menit per IP | wajib captcha; > 60 / 10 menit → `429` |
| `GET /api/publik/pemenang` | 120 / menit per IP | `429` |
| `POST /api/tema/ai` | 10 / jam per admin | `429` |
| Mutasi admin lain | 120 / menit per pengguna | `429` |

IP klien dibaca dari header `X-Forwarded-For` **hanya** yang ditetapkan Caddy (trusted proxy tunggal).

CORS:
Tidak ada CORS — API hanya untuk origin sendiri. Tidak ada header `Access-Control-Allow-Origin`. Mutasi menolak `Origin` yang tidak sama dengan `APP_URL` (`403 AKSES_DITOLAK`).

Authentication:
Semua endpoint non-publik memanggil `requireUser()` / `requireRole()`. Respons `401` tidak membedakan "tidak ada sesi" dan "akun nonaktif".

Authorization:
Sesuai matriks §2; ditegakkan di handler dan service.

Security headers (via `next.config` + Caddy). Tiket 02 memasang semua header di bawah **kecuali** CSP berbasis nonce, yang ditambahkan di tiket hardening (27) setelah diuji bersama Layar Undian, PDF, dan PWA:
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<per-request>' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: DENY`

Captcha:
Proof-of-work mandiri (tantangan ditandatangani HMAC `CAPTCHA_HMAC_KEY`, kedaluwarsa 5 menit, sekali pakai). Tidak memuat skrip pihak ketiga.

---

## 6. Data Protection

Sensitive data:
- NIK (`peserta.nik_enc`)
- NOP utuh, nama, alamat WP/OP, kecamatan, kelurahan, tanggal lunas
- Kata sandi (hash), sesi
- IP di log audit

Encryption:
- In transit: HTTPS (TLS dari Caddy) untuk semua akses; HTTP dialihkan ke HTTPS.
- At rest: NIK dienkripsi AES-256-GCM di tingkat aplikasi (`DATABASE.md` §10). Disk VPS dan backup dienkripsi (backup dengan `age`/GPG, kunci disimpan terpisah dari server).
- Aturan penyamaran (fungsi tunggal di `src/lib/domain/mask.ts`):
  - `maskNop("160903000300300030")` → `16.09.030.xxx.xxx-0003.0`
  - `maskNik("1609040301650002")` → `1609xxxxxxxx0002`
  - NIK tidak valid → `-`
- NIK utuh hanya dapat dilihat Admin untuk 6 kandidat pemenang lewat aksi `…/pemenang/:slot/nik` dengan alasan, tercatat `PEMENANG_LIHAT_NIK`.
- Tabel peserta admin menampilkan NIK tersamar; NOP utuh (dibutuhkan admin untuk menjawab wajib pajak).
- Halaman publik: data per PRD §6.0 (nama dan alamat lengkap, NOP & NIK tersamar). Tidak ada endpoint publik yang mengembalikan daftar peserta massal; `/cek` hanya satu NOP per permintaan dan tidak mengembalikan alamat atau NIK.

Retention:
- Data peserta periode disimpan sampai **12 bulan setelah publikasi**, lalu dianonimkan: `nik_enc` dihapus, `nama`/alamat diganti `-` untuk semua peserta **kecuali** 6 kandidat pemenang (arsip berita acara). Masa retensi 12 bulan sudah disetujui pemilik produk.
- `snapshot`, `hasil_undian`, `audit_log` disimpan permanen sebagai bukti (hanya data tersamar/ID).
- Backup harian disimpan 30 hari, backup bulanan 12 bulan.
- Data di laptop acara (IndexedDB) dihapus setelah hasil terunggah.

Deletion:
- Tidak ada penghapusan data periode dari UI. Anonimisasi lewat skrip terjadwal yang tercatat di audit (`SISTEM_ANONIMISASI`).
- Permintaan penghapusan dari wajib pajak diteruskan ke Bapenda dan ditangani manual oleh admin teknis.

---

## 7. Logging

Never log:
- Passwords
- API keys
- Tokens
- Sensitive personal information (NIK, isi baris peserta, isi file impor, isi prompt yang berisi data pribadi)

Log:
- Authentication events (login berhasil/gagal, logout, ganti kata sandi)
- Important actions (semua aksi audit PRD F11)
- Errors (dengan `requestId`, tanpa payload sensitif)
- Security events (rate limit terlewati, `Origin` salah, unggah hasil ditolak, paket/hasil dimanipulasi)

pino dikonfigurasi `redact`: `req.headers.cookie`, `req.headers.authorization`, `*.password*`, `*.nik*`, `*.apiKey`, `*.captcha`. Detail di `OBSERVABILITY.md`.

---

## 8. File Uploads

Allowed file types:
| Tujuan | Ekstensi | MIME | Magic bytes |
|---|---|---|---|
| Impor | `.csv` | `text/csv` | teks UTF-8/Windows-1252, tanpa byte NUL |
| Impor | `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `PK\x03\x04` + berisi `xl/workbook.xml` |
| Aset audio | `.mp3`, `.ogg` | `audio/mpeg`, `audio/ogg` | `ID3`/frame sync, `OggS` |
| Aset gambar | `.png`, `.jpg`, `.webp` | sesuai | `\x89PNG`, `\xFF\xD8\xFF`, `RIFF....WEBP` |
| Hasil undian | `.json` | `application/json` | JSON valid |

SVG, HTML, dan arsip lain ditolak.

Maximum size:
Impor 20 MB (XLSX: total ukuran tak terkompresi ≤ 200 MB, ≤ 100.000 baris — perlindungan zip bomb). Audio 10 MB. Gambar 5 MB (dimensi ≤ 4096×4096). Hasil 1 MB.

Validation:
- Cek ekstensi + MIME + magic bytes; ketiganya harus konsisten.
- File impor diproses di memori/stream dan **tidak** disimpan setelah impor selesai (hanya `file_sha256` yang dicatat).
- Sel XLSX dibaca sebagai nilai tampilan string; rumus tidak dievaluasi. Ekspor Excel dari aplikasi menetralkan sel yang diawali `=`, `+`, `-`, `@` (CSV/formula injection) dengan awalan `'`.
- Nama file asli tidak dipakai di filesystem; aset disimpan sebagai `<sha256>.<ext>`.

Storage:
`STORAGE_DIR` (default `/data/storage`): `aset/`, `snapshot/`, `hasil/` (salinan file hasil asli). Disajikan hanya lewat route handler terautentikasi dengan `Content-Type` tetap dan `X-Content-Type-Options: nosniff`; tidak ada direktori publik statis untuk unggahan.

---

## 9. Integritas Undian

- **Snapshot terkunci**: SHA-256 kanonik; tabel immutable (trigger DB); hash tampil di panel, Layar Undian, berita acara, halaman publik.
- **RNG**: `crypto.getRandomValues` dengan rejection sampling; dilarang `Math.random` di `src/lib/draw` (aturan ESLint).
- **Pemenang ditentukan saat Berhenti** dan disimpan sebelum ditampilkan; slot tidak dapat diundi ulang dari UI.
- **Unggah sekali**: constraint unik `hasil_undian.periode_id` + pemeriksaan di transaksi.
- **Verifikasi server** 10 pemeriksaan (`API.md` §4.6).
- **Keterbatasan yang disadari**: laptop acara tidak menyimpan rahasia, sehingga `hasilHash` bukan tanda tangan. Kontrol anti-pemalsuan adalah:
  1. Saksi mencatat/memfoto `snapshotHash` sebelum undian dan hash hasil setelah undian di layar.
  2. Hash yang sama tercetak di berita acara yang ditandatangani dan tampil di halaman publik.
  3. Server hanya menerima satu unggahan dan mencatat siapa pengunggahnya.
- **Kendali operasional**: laptop acara khusus, akun Windows tanpa hak admin bagi penonton, Incognito dilarang, operator cadangan hadir (`DEPLOYMENT.md`).

---

## 10. Asisten AI

- Request keluar hanya ke penyedia LLM yang dikonfigurasi, dari server.
- Data yang dikirim: prompt admin, tema basis, katalog aset (nama/deskripsi). **Tidak** ada data peserta, NIK, NOP, atau isi log.
- Admin diperingatkan di UI: "Jangan menulis data pribadi di prompt."
- Output hanya diterima jika lolos `ThemeConfigSchema` + validasi aset; output tidak pernah dieksekusi sebagai kode atau HTML.
- Prompt dicatat di audit (dipotong 1.000 karakter); respons mentah LLM tidak disimpan.
- Fitur nonaktif jika `AI_API_KEY` kosong.

---

## 11. Security Checklist

- [ ] Authentication implemented (Auth.js, argon2id, ganti kata sandi pertama)
- [ ] Authorization implemented (matriks §2 di handler & service)
- [ ] Server-side validation (zod strict di semua handler)
- [ ] Secrets protected (`.env` 600, tidak ada di image/repo)
- [ ] Sensitive data protected (enkripsi NIK, penyamaran, `no-store`)
- [ ] Rate limiting considered (§5)
- [ ] File uploads validated (§8)
- [ ] Errors do not expose sensitive details
- [ ] Dependencies reviewed (`npm audit` di CI, versi dipin)
- [ ] Security headers & CSP aktif dan diuji
- [ ] Trigger immutable snapshot/hasil/audit terpasang
- [ ] Halaman publik tanpa autentikasi diverifikasi tidak membocorkan NIK/NOP utuh
- [ ] Data laptop acara dihapus setelah unggah
