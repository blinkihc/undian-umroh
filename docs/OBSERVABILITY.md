# Observability

> Status: Draf v0.1. Skala kecil (satu VPS): log terstruktur, log audit di database, health check, dan alert sederhana. Aturan data sensitif: `SECURITY.md` §7.

## Logging

Log:
- Application errors
- Authentication events
- Important business events

Never log:
- Passwords
- Tokens
- API keys
- Sensitive personal data

### Log aplikasi

- Pustaka pino (`src/server/logger.ts`), JSON satu baris per kejadian ke stdout. Docker mengumpulkan dengan driver `json-file` (`max-size: 10m`, `max-file: 5`).
- Field baku: `time`, `level`, `msg`, `requestId`, `userId` (bila ada), `method`, `path`, `status`, `durationMs`.
- `requestId` dibuat per request (`req_<ulid>`), dikirim ke klien di header `X-Request-Id` dan di body error 5xx agar pengguna dapat melaporkannya.
- Level: `error` (gagal tak terduga), `warn` (ditolak karena aturan keamanan/integritas), `info` (request selesai, start/stop, aksi penting), `debug` (hanya pengembangan).
- `redact`: `req.headers.cookie`, `req.headers.authorization`, `*.password*`, `*.nik*`, `*.apiKey`, `*.captcha`. Isi baris peserta dan isi file impor tidak pernah dilog; hanya jumlah, ukuran, dan `sha256` file.
- Path dengan ID tidak berisi data pribadi (tidak ada NOP di URL; NOP untuk `/cek` dikirim di body, tidak dilog).

Kejadian `info`/`warn` wajib dilog:

| Kejadian | Level | Field tambahan |
|---|---|---|
| Aplikasi start/stop | info | `versi`, `nodeEnv` |
| Request selesai | info | `status`, `durationMs` |
| Impor selesai | info | `periodeId`, `totalBaris`, `lolos`, `gugur`, `durationMs`, `fileSha256` |
| Kunci snapshot | info | `periodeId`, `snapshotHash` |
| Hasil ditolak | warn | `periodeId`, `pemeriksaan` |
| Rate limit terlewati | warn | `target`, `ipHash` |
| `Origin` tidak sesuai | warn | `origin` |
| Login gagal beruntun | warn | `username`, `ipHash` |

IP di log aplikasi disimpan sebagai hash harian (bukan IP mentah); IP mentah hanya di `audit_log.ip`.

### Log Layar Undian (browser)

Dicatat di IndexedDB (`catatanLokal`) dan ikut file hasil: `SIMPAN_GAGAL_DIULANG`, `AUDIO_DIBLOKIR`, `ASET_GAGAL_FALLBACK`, `DILANJUTKAN_SETELAH_MUAT_ULANG` beserta waktu dan slot. Tidak memakai `console` sebagai satu-satunya jejak.

---

## Audit Log

Tabel `audit_log` (append-only, `DATABASE.md`). Kode aksi baku:

| Kelompok | Kode aksi |
|---|---|
| Autentikasi | `LOGIN_BERHASIL`, `LOGIN_GAGAL`, `LOGIN_DIBLOKIR`, `LOGOUT`, `PASSWORD_GANTI` |
| Pengguna | `PENGGUNA_BUAT`, `PENGGUNA_UBAH`, `PENGGUNA_AKTIFKAN`, `PENGGUNA_NONAKTIFKAN`, `PENGGUNA_RESET_PASSWORD` |
| Periode | `PERIODE_BUAT`, `PERIODE_UBAH`, `PERIODE_BATAL`, `PERIODE_KUNCI`, `PERIODE_PUBLIKASI` |
| Data | `IMPOR_BERHASIL`, `IMPOR_DITOLAK`, `WILAYAH_PETAKAN`, `WILAYAH_NAMA_UBAH` |
| Paket & hasil | `PAKET_UNDUH`, `HASIL_UNGGAH`, `HASIL_DITOLAK` |
| Pemenang | `PEMENANG_VERIFIKASI`, `PEMENANG_GUGUR`, `PEMENANG_LIHAT_NIK` |
| Tema | `TEMA_BUAT`, `TEMA_UBAH`, `TEMA_HAPUS`, `TEMA_PERIODE_PILIH`, `ASET_UNGGAH`, `ASET_HAPUS`, `AI_PROMPT` |
| Dokumen | `BERITA_ACARA_UBAH`, `BERITA_ACARA_UNDUH`, `EKSPOR_UNDUH` |
| Keamanan | `AKSES_DITOLAK`, `RATE_LIMIT_TERLEWATI` |
| Sistem | `SISTEM_ANONIMISASI` |

Aturan:
- Satu baris audit per mutasi, ditulis dalam transaksi yang sama dengan perubahan datanya (kecuali aksi gagal seperti `LOGIN_GAGAL`/`HASIL_DITOLAK` yang ditulis di luar transaksi yang di-rollback).
- Kolom: `at`, `aktor_id`/`aktor_label`, `aksi`, `target_tipe`, `target_id`, `payload`, `ip`, `user_agent`.
- `payload` berisi ID dan ringkasan (mis. `{ "jumlahBaris": 45812, "fileSha256": "…" }`), tanpa NIK, kata sandi, token, atau isi prompt penuh (prompt dipotong 1.000 karakter).
- Dapat dilihat dan diekspor Admin (Flow 16); tidak dapat diubah/dihapus dari UI maupun SQL (trigger).

---

## Monitoring

Monitor:
- Error rate
- API latency
- Database performance
- Availability

### Health check

`GET /api/health` (publik, tanpa data sensitif): `{ "status": "ok", "db": "ok", "versi": "0.1.0" }`; `503` bila database tidak dapat dijangkau. Dipakai oleh Docker `healthcheck` dan pemantau uptime.

### Indikator dan target

| Indikator | Sumber | Target |
|---|---|---|
| Ketersediaan `/api/health` | pemantau uptime (setiap 1 menit) | ≥ 99% per bulan; ≥ 99,9% pada H-1 s/d H+1 acara |
| Rasio 5xx | log `status` | < 1% per jam |
| Latensi p95 API umum | log `durationMs` | < 500 ms |
| Latensi p95 `POST /api/publik/cek` | log `durationMs` | < 300 ms |
| Durasi impor 46.000 baris | log `Impor selesai` | ≤ 60 detik |
| Durasi penyusunan paket | log | ≤ 30 detik |
| Koneksi/performa PostgreSQL | `pg_isready`, `pg_stat_activity`, kueri lambat > 1 detik | tanpa kueri lambat berulang |
| Ruang disk | cron `df` | alert di 80%, kritis di 90% |
| Backup | cron `scripts/backup.sh` | file terbaru < 26 jam, ukuran > 0, tidak gagal 2× berturut-turut |
| Rate limit terlewati | log `warn` | lonjakan = kemungkinan scraping `/cek` |
| Hasil ditolak | audit `HASIL_DITOLAK` | setiap kejadian ditinjau |
| Login gagal beruntun | audit `LOGIN_GAGAL` | ≥ 10/jam ditinjau |

### Alert sederhana

- Pemantau uptime ringan (disarankan Uptime Kuma, self-hosted di VPS atau layanan pemantau milik Diskominfo) memeriksa `/api/health` dan memberi notifikasi (pesan/grup yang disepakati Bapenda) saat down > 2 menit.
- Cron di host (`scripts/watch.sh`, setiap 15 menit) memeriksa: disk ≥ 80%, backup terbaru > 26 jam, container `app`/`db` tidak sehat; mengirim ke saluran yang sama.
- Selama H-1 s/d H+1 acara: penanggung jawab teknis siaga dan memeriksa panel log setiap jam.

### Dashboard

Tanpa dashboard khusus pada MVP. Ringkasan dibuat dari log (`docker compose logs app | jq`) dan halaman Log Audit. Dashboard metrik dipertimbangkan bila ada kebutuhan setelah acara pertama (ROADMAP LATER).

---

## Retensi

| Data | Retensi |
|---|---|
| Log aplikasi (Docker json-file) | rotasi 5 × 10 MB; diarsipkan mingguan selama 30 hari |
| `audit_log` | permanen |
| Backup database/storage | harian 30 hari, bulanan 12 bulan |
| `catatanLokal` Layar Undian | ikut file hasil; dihapus bersama data undian setelah acara |

## Insiden

Setiap insiden (down > 15 menit, hasil ditolak tak terduga, dugaan kebocoran data) dicatat: waktu, dampak, penyebab, tindakan. Dugaan kebocoran data pribadi: rotasi `AUTH_SECRET`, tinjau audit `PEMENANG_LIHAT_NIK` dan akses admin, informasikan Bapenda segera.
