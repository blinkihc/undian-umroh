# Error Handling

> Status: Draf v0.1. Format error API ada di `API.md` §1.1; pola kode ada di `CODE_STYLE.md` §7; pesan UI dalam Bahasa Indonesia.

## Overview

Prinsip:
- Tidak ada kegagalan senyap: setiap aksi pengguna menghasilkan sukses atau pesan yang menjelaskan apa yang terjadi dan apa yang harus dilakukan.
- Pesan untuk pengguna aman (tanpa stack trace, pesan Prisma, path file, atau data pribadi). Detail teknis hanya di log dengan `requestId`.
- Aksi gagal tidak boleh meninggalkan data setengah jadi: mutasi dibungkus transaksi.
- Layar Undian harus tetap berjalan saat server atau database gangguan (berjalan offline).
- Kegagalan yang diharapkan di modul murni dikembalikan sebagai `Result`; kegagalan di service dilempar sebagai `AppError`; route handler memetakan keduanya ke format error standar.

Kategori yang ditangani:
- Validation errors
- API failures
- Network errors
- Authentication errors
- Permission errors
- Database failures
- Third-party failures
- Timeouts
- Empty states
- Loading states
- Retry behavior
- User-facing messages

---

## API Errors

Format respons:
```json
{ "error": { "code": "PERIODE_TERKUNCI", "message": "Periode sudah terkunci. Data tidak dapat diubah.", "details": {}, "requestId": "req_01J9Z3K8Q4" } }
```

400:
Validation error — `VALIDASI_GAGAL`, `HEADER_TIDAK_SESUAI`, `FILE_TIDAK_VALID`. UI menampilkan pesan di bawah field (`details.fields`) atau banner untuk file.

401:
Authentication required — `TIDAK_TERAUTENTIKASI`. Klien mengalihkan ke `/login` dan kembali ke halaman semula setelah login. Sama untuk sesi habis dan akun dinonaktifkan.

403:
Permission denied — `AKSES_DITOLAK` (peran tidak berhak atau `Origin` salah). UI menampilkan "Anda tidak memiliki akses ke halaman ini." dan mengarahkan ke beranda peran. `PASSWORD_HARUS_DIGANTI` — akun wajib-ganti kata sandi memanggil endpoint selain ganti kata sandi; pesan "Anda harus mengganti kata sandi sebelum melanjutkan." dan halaman dialihkan ke "Ganti kata sandi".

404:
Resource not found — `TIDAK_DITEMUKAN`. Halaman "Data tidak ditemukan" dengan tautan kembali.

409:
Konflik status/versi/duplikat — `CONFLICT`, `USERNAME_SUDAH_DIPAKAI`, `PERIODE_TERKUNCI`, `PERIODE_AKTIF_SUDAH_ADA`, `HASIL_SUDAH_DIUNGGAH`. UI memuat ulang data dan menampilkan siapa/kapan perubahan lain terjadi (bila ada di `details`).

413:
File terlalu besar — `FILE_TERLALU_BESAR` (impor 20 MB, audio 10 MB, gambar 5 MB, hasil 1 MB).

422:
Aturan bisnis gagal — `PERUBAHAN_AKUN_DITOLAK` (`details.alasan`: akun sendiri atau Admin aktif terakhir), `PRASYARAT_KUNCI_BELUM_LENGKAP`, `HASIL_TIDAK_VALID` (dengan `details.pemeriksaan`), `AI_OUTPUT_TIDAK_VALID`.

429:
Rate limit exceeded — `TERLALU_BANYAK_PERMINTAAN`. Header `Retry-After` disertakan. Untuk `/cek` dengan `details.captchaDiperlukan` UI menampilkan captcha.

500:
Unexpected server error — `KESALAHAN_SERVER`. Pesan generik "Terjadi kesalahan pada server. Coba lagi. Jika berulang, hubungi admin dan sebutkan kode: <requestId>." Dicatat sebagai `error` di log.

503:
Layanan tidak tersedia — `LAYANAN_TIDAK_TERSEDIA` (database), `AI_TIDAK_TERSEDIA`.

507:
Penyimpanan penuh — `PENYIMPANAN_PENUH` (disk VPS). Impor dan unggah aset ditolak; alert dikirim.

---

## Validation Errors

- Validasi bentuk (zod) di klien dan server dengan skema yang sama; server selalu menjadi sumber kebenaran.
- Pesan di bawah field terkait, bahasa Indonesia, menyebut aturan (mis. "Judul minimal 5 karakter.").
- NOP: setelah titik/strip/spasi dibuang harus 18 digit; selain itu "NOP harus 18 digit angka."
- Kata sandi: minimal 12 karakter, tidak boleh sama dengan username.

### Kesalahan impor per baris

Kesalahan baris tidak menghentikan impor; baris ditandai gugur dengan kode alasan (`PRD.md` §6.0) dan tampil di laporan.

| Kasus | Perilaku |
|---|---|
| Header salah/hilang | Impor ditolak seluruhnya, 0 baris tersimpan. Pesan menyebut kolom hilang dan tidak dikenal. |
| File kosong atau hanya header | Ditolak: "File tidak berisi data peserta." |
| Encoding tidak terbaca | Coba UTF-8, lalu Windows-1252; jika gagal: "File tidak dapat dibaca. Simpan ulang sebagai CSV UTF-8." |
| Jumlah kolom baris tidak sesuai | Baris gugur (`FORMAT_BARIS`), baris lain tetap diproses. |
| NOP/tanggal/nama/kecamatan bermasalah | Baris gugur dengan kode alasan yang sesuai (semua alasan ditampilkan). |
| NIK tidak valid | Peringatan saja; baris tidak gugur. |
| Lebih dari 100.000 baris atau XLSX tak terkompresi > 200 MB | Ditolak (`FILE_TIDAK_VALID`), perlindungan zip bomb. |
| Proses terputus (koneksi putus, server restart) | Transaksi di-rollback; data periode lama tetap utuh. Admin mengulang impor. |

---

## Network Errors

Panel Admin/Operator/Publik:
- Gagal menjangkau server → toast "Koneksi terputus. Perubahan belum tersimpan." dengan tombol "Coba lagi". Formulir tidak dikosongkan.
- Mutasi aman diulang: dilindungi `version` (optimistic concurrency) dan constraint unik (mis. hasil sekali unggah), sehingga pengulangan tidak menggandakan efek.
- Unggahan besar (impor): progress terhenti → pesan "Unggahan terputus" dan opsi ulang dari awal.

Layar Undian (offline):
- Tidak ada ketergantungan jaringan setelah paket dimuat (tanpa CDN untuk font, ikon, audio).
- Indikator "Siap Offline" selalu terlihat; layar tidak menampilkan error karena offline.
- Unggah hasil dari layar ("Unggah ke Server") hanya tampil bila online; bila gagal, tampil "Tidak dapat terhubung. Simpan file hasil dan unggah dari Panel nanti." File hasil tetap dapat diunduh.

---

## Authentication Errors

- Kredensial salah atau akun nonaktif → "Username atau kata sandi salah." (tidak membedakan).
- 5 percobaan gagal per 15 menit → blokir 15 menit: "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
- Sesi habis → kembali ke `/login`; setelah login, kembali ke halaman semula.
- `must_change_password` → semua halaman selain "Ganti kata sandi" dialihkan sampai kata sandi diganti.
- Semua kejadian dicatat di audit (`LOGIN_GAGAL`, dst.).

## Permission Errors

- Peran tidak berhak → 403 dengan pesan di atas; tidak mengungkap keberadaan resource.
- Tombol/menu yang tidak diizinkan peran disembunyikan di UI, tetapi server tetap memeriksa (UI bukan pertahanan).
- Aksi tidak diizinkan oleh status periode (mis. impor saat Terkunci) → `409 PERIODE_TERKUNCI`; UI menampilkan kontrol dalam keadaan nonaktif dengan alasan (bukan sekadar abu-abu).

## Database Failures

- Database tidak tersedia → Panel dan Publik menampilkan halaman "Layanan sedang gangguan, coba beberapa saat lagi" (HTTP 503); `/api/health` gagal; alert aktif (`OBSERVABILITY.md`). Layar Undian tidak terdampak.
- Pelanggaran constraint unik (`P2002`) → `409 CONFLICT`; kegagalan transaksi → rollback penuh.
- Deadlock/timeout kueri → satu kali retry otomatis di service (maks. 1×) untuk operasi baca; mutasi tidak di-retry otomatis, pengguna yang mengulang.
- Kesalahan migrasi → deploy dihentikan (`DEPLOYMENT.md`), aplikasi versi lama tetap berjalan.

## Third-party Failures

Satu-satunya pihak ketiga adalah penyedia LLM (Asisten AI):

| Situasi | Perilaku |
|---|---|
| `AI_API_KEY` kosong | Panel AI nonaktif: "Asisten AI tidak tersedia. Atur tema secara manual." |
| Server offline/penyedia gagal/timeout 30 detik | `503 AI_TIDAK_TERSEDIA`: "Asisten AI gagal menyusun tema. Coba lagi atau atur manual." Tema tidak berubah. |
| Output tidak lolos `ThemeConfigSchema` atau merujuk aset tidak ada | `422 AI_OUTPUT_TIDAK_VALID`, tidak ditampilkan sebagai usulan. |
| Rate limit AI (10/jam/admin) | `429`; "Batas penggunaan Asisten AI per jam tercapai." |

Kegagalan AI tidak boleh mengganggu fitur lain; tidak ada retry otomatis.

## Timeouts

| Operasi | Batas | Perilaku saat terlampaui |
|---|---|---|
| Permintaan API umum | 30 detik | 504 dari Caddy → pesan "Server lambat merespons. Coba lagi." |
| Impor (46.000 baris) | target ≤ 60 detik; batas keras 5 menit | Transaksi di-rollback; pesan dan opsi ulang. |
| Penyusunan paket | 60 detik | Pesan dan opsi ulang. |
| Panggilan LLM | 30 detik | Lihat Third-party Failures. |
| Verifikasi hasil | 10 detik | Pesan generik; tidak ada hasil tersimpan. |

## Empty States

Mengikuti `DESIGN_SYSTEM.md` §12: ikon, judul, satu kalimat penjelasan, dan satu aksi utama. Contoh pesan:
- Belum ada periode: "Belum ada periode undian."
- Belum ada data peserta: "Belum ada data peserta. Unggah file ekspor PBB (CSV pemisah titik koma atau XLSX)."
- Belum ada paket di laptop: "Belum ada paket undian. Muat file paket dari admin."
- Hasil belum diumumkan (publik): "Hasil undian belum diumumkan. Pantau halaman ini setelah acara."
- Log audit kosong: "Belum ada aktivitas tercatat."

## Loading States

Skeleton untuk tabel/kartu, spinner untuk tombol, progress bertahap untuk impor dan paket, daftar pemeriksaan bertahap untuk verifikasi hasil. Tombol aksi nonaktif selama proses dan `aria-busy="true"`.

## Retry Behavior

| Konteks | Retry |
|---|---|
| Pembacaan data di Panel | Otomatis 1× bila jaringan gagal; lalu tombol "Coba lagi" |
| Mutasi (impor, kunci, simpan, status) | Tidak otomatis; pengguna mengulang secara sadar (aman karena `version` dan constraint) |
| Penyimpanan hasil slot ke IndexedDB | Layar Undian tidak mengulang diam-diam; menampilkan pesan dan mengizinkan slot dicoba lagi (pemilihan acak baru karena hasil sebelumnya tidak tersimpan; dicatat di `catatanLokal`) |
| Panggilan LLM | Tidak ada |
| Cron backup | Dicoba ulang sekali setelah 15 menit; gagal kedua memicu alert |

---

## Layar Undian: Kegagalan Khusus

| Situasi | Perilaku pengguna |
|---|---|
| Paket rusak/dimanipulasi (hash atau manifest tidak cocok) | Layar merah: "Paket rusak atau telah diubah. Unduh ulang paket dari server." Tidak ada data tersimpan. |
| Penyimpanan browser penuh | "Ruang penyimpanan browser tidak cukup. Kosongkan ruang disk lalu coba lagi." Undian tidak dimulai. |
| Audio diblokir kebijakan autoplay | Overlay "Klik untuk mengaktifkan suara" sebelum fase Menunggu pertama. |
| Gagal menyimpan hasil slot | Animasi berhenti; "Hasil gagal disimpan. Jangan tutup browser. Hubungi operator cadangan." Pemenang tidak ditampilkan; slot dapat dicoba lagi. |
| Refresh/crash di tengah undian | Banner "Melanjutkan undian. N dari 6 slot sudah diundi." Hasil tidak berubah. |
| Data IndexedDB terhapus | "Data undian tidak ditemukan." Muat paket lagi; hasil lama hilang dan wajib dilaporkan ke admin. |
| Aset tema/audio gagal dimuat | Fallback ke tema default bawaan di paket; peringatan kecil di bilah kontrol, undian tetap berjalan. |
| Tombol Mulai ditekan berulang saat animasi | Diabaikan tanpa pesan. |

## Unggah Hasil: Penolakan

Semua penolakan: tidak ada data tersimpan, tercatat di audit (`HASIL_DITOLAK`), pesan menyebut penyebab (tabel di `UX_FLOWS.md` Flow 11). Unggahan kedua → `409 HASIL_SUDAH_DIUNGGAH` dengan waktu dan nama pengunggah pertama.

## User-facing Messages

Pedoman: kalimat pendek, sapaan "Anda", apa yang terjadi + langkah berikutnya, tanpa istilah teknis (mis. "hash" hanya di konteks integritas). Contoh:

| Kode | Pesan |
|---|---|
| `TIDAK_TERAUTENTIKASI` | Sesi Anda berakhir. Silakan masuk lagi. |
| `AKSES_DITOLAK` | Anda tidak memiliki akses ke halaman ini. |
| `PERIODE_TERKUNCI` | Periode sudah terkunci. Data tidak dapat diubah. |
| `PRASYARAT_KUNCI_BELUM_LENGKAP` | Data belum bisa dikunci. Selesaikan: 2 kecamatan belum dipetakan. |
| `HASIL_SUDAH_DIUNGGAH` | Hasil periode ini sudah diunggah pada {waktu} oleh {nama}. Unggahan ditolak. |
| `HASIL_TIDAK_VALID` | Isi file hasil tidak sesuai data terkunci ({pemeriksaan}). |
| `TERLALU_BANYAK_PERMINTAAN` | Terlalu banyak permintaan. Coba lagi beberapa menit lagi. |
| `LAYANAN_TIDAK_TERSEDIA` | Layanan sedang gangguan. Coba beberapa saat lagi. |
| `KESALAHAN_SERVER` | Terjadi kesalahan pada server. Kode: {requestId}. |

## Logging Kesalahan

- `4xx` karena aturan keamanan/integritas (akses ditolak, hasil ditolak, rate limit, `Origin` salah) → `warn` + baris audit bila terkait aksi penting.
- `5xx` → `error` dengan `requestId`, tanpa payload sensitif (`SECURITY.md` §7).
- Kesalahan validasi biasa → tidak dilog sebagai error.
