# Architecture Decisions

> Catatan keputusan teknis dan produk (ADR). Keputusan lama tidak diubah; bila diganti, buat ADR baru dan tandai yang lama "Digantikan oleh Decision NNN".
> Prioritas bila dokumen bertentangan: Decision terbaru yang berstatus Accepted → `PRD.md` → `SECURITY.md` → dokumen lain.
> Semua keputusan di bawah dibuat pada fase perancangan (tanggal 2026-10-11) bersama pemilik produk, kecuali disebut lain.

## Decision 001

Title:
Satu NOP = satu kupon (undian per NOP)

Date:
2026-10-11

Status:
Accepted

Context:
Undian dapat dihitung per orang (NIK), per NOP, atau berbobot (nominal/jumlah tahun). Data sumber berbasis NOP dan NIK tidak selalu bersih.

Decision:
Setiap NOP yang lolos syarat adalah satu kupon. Pemilik banyak NOP memiliki peluang sebanding jumlah NOP-nya. NOP ganda dalam file adalah error yang memblokir penguncian.

Alternatives:
- Satu orang satu kesempatan berdasarkan NIK
- Kupon berbobot berdasarkan nominal PBB

Reason:
Unit data resmi di Bapenda adalah NOP. NIK sering kosong atau rusak di ekspor Excel sehingga tidak dapat dijadikan dasar keadilan. Aturan sederhana lebih mudah dijelaskan kepada publik.

Consequences:

Positive:
Aturan mudah dijelaskan dan diaudit; tidak bergantung pada kualitas NIK.

Tradeoff:
Wajib pajak dengan banyak objek pajak memiliki peluang lebih besar.

---

## Decision 002

Title:
Undian berjalan offline lewat paket undian dan file hasil

Date:
2026-10-11

Status:
Accepted

Context:
Internet di lokasi acara tidak stabil, tetapi hasil harus tetap tercatat dan dapat diverifikasi di server.

Decision:
Admin mengunduh paket `.zip` (snapshot tersamar + meta + tema) dari periode Terkunci. Layar Undian (PWA) memuatnya ke IndexedDB, menjalankan 6 slot tanpa internet, lalu menghasilkan file hasil `.json` yang diunggah dan diverifikasi server (10 pemeriksaan, `API.md` §4.6). Hasil hanya dapat diunggah sekali.

Alternatives:
- Undian online langsung ke server
- Aplikasi dijalankan sebagai server lokal di laptop lalu database disalin ke server

Reason:
Paling tahan gangguan jaringan dan menghasilkan artefak (paket dan hasil) yang dapat diarsipkan serta diverifikasi ulang.

Consequences:

Positive:
Undian tidak terganggu jaringan; hasil punya hash yang dapat dibuktikan.

Tradeoff:
Ada langkah manual memindahkan file; data hasil sebagian tidak otomatis tersinkron bila laptop rusak di tengah acara (mitigasi di `DEPLOYMENT.md`).

---

## Decision 003

Title:
RNG kriptografis, pemenang ditentukan saat tombol Berhenti

Date:
2026-10-11

Status:
Accepted

Context:
Animasi yang berhenti pada posisi tertentu sulit dibuktikan adil dan bisa bias.

Decision:
Pemenang dipilih dengan `crypto.getRandomValues` memakai rejection sampling (tanpa bias modulo) dari peserta wilayah yang belum keluar, pada saat operator menekan Berhenti. Hasil disimpan ke IndexedDB sebelum kartu pemenang ditampilkan. Animasi hanya visual dan berakhir pada pemenang yang sudah ditentukan. `Math.random` dilarang di `src/lib/draw`.

Alternatives:
- Pemenang ditentukan oleh posisi animasi saat berhenti
- RNG berbasis seed yang dipublikasikan

Reason:
Keadilan dapat dibuktikan lewat kode dan uji distribusi; hasil tidak berubah setelah refresh atau crash.

Consequences:

Positive:
Dapat diuji (chi-square) dan diaudit; tahan crash.

Tradeoff:
Animasi harus mengakhiri tampilan di pemenang yang sudah ditentukan (sedikit logika tambahan di setiap preset).

---

## Decision 004

Title:
Pembayaran terlambat tetap sah

Date:
2026-10-11

Status:
Accepted

Context:
Pada sampel data, 7 dari 14 baris membayar PBB suatu tahun di tahun berikutnya (mis. PBB 2025 dilunasi April 2026).

Decision:
Syarat lunas diukur hanya dengan tanggal batas periode, bukan jatuh tempo tiap tahun. Pembayaran terlambat tetap sah selama paling lambat tanggal batas.

Alternatives:
- Wajib lunas tepat waktu setiap tahun
- Terlambat boleh asal masih di tahun yang sama

Reason:
Tujuan insentif adalah wajib pajak yang melunasi lima tahun; keterlambatan yang sudah dilunasi tidak dijadikan alasan gugur.

Consequences:

Positive:
Jumlah peserta lebih banyak; aturan sederhana.

Tradeoff:
Tidak membedakan pembayar tepat waktu dan pembayar terlambat.

---

## Decision 005

Title:
Tanggal batas pelunasan default 30 September 2026

Date:
2026-10-11

Status:
Accepted

Context:
Perlu batas akhir pelunasan lima tahun (2022–2026) untuk menentukan kepesertaan.

Decision:
Default 30 September 2026 pukul 23:59:59 WIB, inklusif. Admin dapat mengubahnya di pengaturan periode selama status Draf; perubahan memicu evaluasi ulang seluruh peserta. Setelah Terkunci tidak dapat diubah.

Alternatives:
- Tanggal jatuh tempo PBB 2026
- Tanggal tetap di kode

Reason:
Fleksibel bila kebijakan berubah sebelum penguncian, tanpa mengubah kode.

Consequences:

Positive:
Perubahan kebijakan tidak butuh rilis baru.

Tradeoff:
Cek NOP publik dapat berubah hasilnya sebelum penguncian (diberi label sementara, Decision 017).

---

## Decision 006

Title:
Tanggal lunas yang mendahului tahun pajaknya dianggap data salah

Date:
2026-10-11

Status:
Accepted

Context:
Data ekspor dapat berisi salah ketik tahun (mis. lunas 2022 bertanggal Desember 2021).

Decision:
Tanggal lunas tahun X yang lebih awal dari 1 Januari tahun X menggugurkan baris dengan alasan `TANGGAL_SEBELUM_TAHUN_PAJAK_<X>`.

Alternatives:
- Menerima semua tanggal yang valid
- Menandai sebagai peringatan tanpa menggugurkan

Reason:
Pembayaran sebelum tahun pajak berjalan tidak masuk akal; lebih aman menandai agar admin memeriksanya.

Consequences:

Positive:
Data mencurigakan terdeteksi.

Tradeoff:
Pembayaran di muka yang sah (bila ada) akan gugur; admin perlu menjelaskan atau memperbaiki data sumber. Asumsi A1 di `PRD.md`.

---

## Decision 007

Title:
Hadiah: 1 pemenang utama + 2 cadangan per wilayah, tanpa undi ulang otomatis

Date:
2026-10-11

Status:
Accepted

Context:
Dua paket umroh dibagi dua wilayah; pemenang dapat gugur (tidak dapat dihubungi, mundur, data tidak valid).

Decision:
Enam slot tetap: `W1-UTAMA`, `W1-C1`, `W1-C2`, `W2-UTAMA`, `W2-C1`, `W2-C2`, diundi pada satu sesi. Pemenang yang gugur digantikan cadangan berikutnya secara otomatis. Jika ketiganya gugur, wilayah berstatus "Perlu keputusan" dan keputusan dilakukan di luar sistem.

Alternatives:
- Undi ulang otomatis bila cadangan habis
- Cadangan diundi belakangan oleh admin

Reason:
Seluruh pemenang dan cadangan diundi di depan saksi sehingga transparan; undi ulang di luar acara melemahkan kepercayaan publik.

Consequences:

Positive:
Seluruh proses undian terjadi satu kali, di depan saksi.

Tradeoff:
Bila ketiga kandidat gugur, tidak ada mekanisme otomatis (jarang terjadi).

---

## Decision 008

Title:
Wilayah ditentukan oleh pemetaan kecamatan yang diatur admin

Date:
2026-10-11

Status:
Accepted

Context:
Dua wilayah harus dibentuk dari data yang memiliki kolom kecamatan.

Decision:
Admin memetakan setiap `OP_KECAMATAN` (hasil normalisasi) ke Wilayah 1 atau Wilayah 2. Kecamatan belum terpetakan memblokir penguncian. Nama tampilan wilayah dapat diubah.

Alternatives:
- Pembagian perkotaan vs perdesaan
- Pembagian tetap di kode

Reason:
Kebijakan pembagian wilayah ada di Bapenda dan dapat berubah per periode.

Consequences:

Positive:
Fleksibel tanpa perubahan kode.

Tradeoff:
Variasi penulisan kecamatan harus dipetakan satu per satu (ada saran "mungkin sama dengan").

---

## Decision 009

Title:
Modular monolith Next.js + PostgreSQL + Prisma

Date:
2026-10-11

Status:
Accepted

Context:
Skala kecil (±46.000 baris, puluhan pengguna internal), tim kecil, satu VPS.

Decision:
Satu aplikasi Next.js (App Router, TypeScript) dengan Route Handlers, Prisma, PostgreSQL 16, Auth.js, Tailwind, zod. Deploy sebagai satu container.

Alternatives:
- PHP/Laravel + MySQL
- Microservices terpisah untuk undian dan publik

Reason:
Satu bahasa untuk server dan browser memungkinkan modul murni bersama (Decision 010); operasi sederhana.

Consequences:

Positive:
Pengembangan dan operasi sederhana; satu basis kode.

Tradeoff:
Beban publik dan admin berbagi satu proses; skala besar butuh perubahan (ROADMAP LATER).

---

## Decision 010

Title:
Logika inti sebagai modul murni yang dipakai server dan browser

Date:
2026-10-11

Status:
Accepted

Context:
Perhitungan hash, aturan syarat, dan verifikasi hasil harus identik di server dan laptop acara.

Decision:
`src/lib/domain`, `src/lib/draw`, `src/lib/package` bebas I/O (tanpa UI, DB, `node:*`) dan dipaksa lewat aturan ESLint.

Alternatives:
- Implementasi terpisah per sisi
- Layanan validasi terpusat di server

Reason:
Satu sumber logika dan satu set test; verifikasi tetap bisa berjalan offline.

Consequences:

Positive:
Hasil hitung konsisten; mudah diuji (target coverage 95%).

Tradeoff:
Modul harus tetap kompatibel dengan Web Crypto di dua lingkungan.

---

## Decision 011

Title:
Route Handlers, bukan Server Actions, untuk semua mutasi

Date:
2026-10-11

Status:
Accepted

Context:
Kontrak antarmuka harus terdokumentasi, dapat diuji integrasi, dan seragam dalam keamanan.

Decision:
Semua mutasi lewat Route Handler dengan zod strict, `requireRole`, cek `Origin`, optimistic concurrency (`version`), dan audit dalam transaksi yang sama.

Alternatives:
- Server Actions

Reason:
Kontrak HTTP eksplisit di `API.md` dan mudah diuji tanpa UI.

Consequences:

Positive:
Kontrak jelas, mudah diuji dan diamankan seragam.

Tradeoff:
Sedikit lebih banyak kode dibanding Server Actions.

---

## Decision 012

Title:
Asisten AI hanya menghasilkan JSON ThemeConfig tervalidasi

Date:
2026-10-11

Status:
Accepted

Context:
Admin ingin mengatur animasi dan musik cukup dengan prompt.

Decision:
LLM menerima prompt dan katalog aset (tanpa data peserta) lalu mengembalikan JSON yang divalidasi `ThemeConfigSchema` dan hanya merujuk aset pustaka. Hasil ditampilkan sebagai pratinjau dan perbandingan sebelum disimpan. Fitur nonaktif tanpa API key atau saat offline. Generate audio dengan AI ditunda (ROADMAP LATER).

Alternatives:
- AI menghasilkan kode atau CSS tema
- Tanpa AI

Reason:
Menjaga keamanan (tidak ada kode dinamis), data pribadi tidak keluar, dan hasil selalu dapat dipratinjau dan dibatalkan.

Consequences:

Positive:
Aman dan terkendali; aplikasi tetap berfungsi penuh tanpa AI.

Tradeoff:
Kreativitas AI dibatasi isi pustaka aset. Penyedia AI masih open question di `PRD.md`.

---

## Decision 013

Title:
Hosting di VPS Pemkab dengan Docker Compose dan Caddy

Date:
2026-10-11

Status:
Accepted

Context:
Data wajib pajak (NIK, alamat) sensitif; pemilik produk memilih server milik sendiri.

Decision:
Docker Compose berisi `app`, `db` (PostgreSQL 16), dan `caddy` (HTTPS otomatis). PostgreSQL tidak terekspos ke internet. Backup harian terenkripsi.

Alternatives:
- Cloud terkelola (Vercel + Neon/Supabase)
- Server tanpa Docker

Reason:
Data tetap berada di infrastruktur Pemkab.

Consequences:

Positive:
Kontrol data penuh; biaya rendah.

Tradeoff:
Tim bertanggung jawab atas patch OS, backup, dan monitoring (`DEPLOYMENT.md`).

---

## Decision 014

Title:
NIK dienkripsi di database dan selalu tampil tersamar

Date:
2026-10-11

Status:
Accepted

Context:
NIK adalah data pribadi; undian dihitung per NOP sehingga NIK tidak diperlukan untuk tampilan.

Decision:
NIK disimpan terenkripsi AES-256-GCM (`nik_enc`) dengan kunci dari env, ditampilkan `1609xxxxxxxx0012`. NIK utuh hanya dapat dilihat Admin untuk 6 kandidat pemenang lewat aksi berlog (`PEMENANG_LIHAT_NIK`). NIK tidak pernah masuk paket, file hasil, atau respons publik.

Alternatives:
- Menyimpan NIK polos
- Tidak menyimpan NIK sama sekali

Reason:
Pemenang perlu diverifikasi identitasnya; selain itu NIK tidak dibutuhkan.

Consequences:

Positive:
Kebocoran database tidak langsung membuka NIK.

Tradeoff:
Kunci enkripsi harus dijaga dan dicadangkan terpisah; kehilangan kunci berarti NIK tidak terbaca.

---

## Decision 015

Title:
Hash hasil mendeteksi kerusakan, bukan pemalsuan; kontrol utama adalah saksi

Date:
2026-10-11

Status:
Accepted

Context:
Laptop acara tidak menyimpan rahasia sehingga hash hasil tidak dapat berfungsi sebagai tanda tangan.

Decision:
`snapshotHash` dan `hasilHash` ditampilkan di layar, dicatat saksi, dicetak di berita acara, dan ditampilkan di halaman publik. Server hanya menerima satu unggahan dan mencatat pengunggahnya.

Alternatives:
- Tanda tangan digital hasil dengan kunci di laptop
- Menunjuk server sebagai pemilik RNG

Reason:
Kunci rahasia di laptop acara menambah risiko tanpa menghilangkan kebutuhan saksi.

Consequences:

Positive:
Sederhana dan sesuai praktik undian resmi.

Tradeoff:
Bergantung pada kedisiplinan saksi; tanda tangan digital dijadwalkan LATER.

---

## Decision 016

Title:
Status periode "Dibatalkan"

Date:
2026-10-11

Status:
Accepted

Context:
Penguncian tidak dapat dibuka. Bila data terkunci ternyata salah, aturan satu periode aktif akan menghalangi periode baru.

Decision:
Admin dapat membatalkan periode berstatus Draf atau Terkunci (belum ada hasil) dengan alasan wajib. Status bersifat final dan tercatat di audit.

Alternatives:
- Membuka kunci periode
- Menghapus periode

Reason:
Menjaga bukti (tidak ada penghapusan) sambil memberi jalan keluar.

Consequences:

Positive:
Ada jalur pemulihan tanpa merusak jejak audit.

Tradeoff:
Data harus diimpor ulang pada periode baru.

---

## Decision 017

Title:
Cek NOP publik aktif sejak data diimpor, dengan label "sementara" sampai dikunci

Date:
2026-10-11

Status:
Accepted

Context:
Masyarakat ingin mengecek kepesertaan lebih awal, tetapi data dan tanggal batas masih dapat berubah sebelum penguncian.

Decision:
`/cek` tersedia sejak impor. Selama periode belum Terkunci, hasil diberi label "Hasil sementara. Daftar peserta final ditetapkan saat data dikunci." (API: `"sementara": true`).

Alternatives:
- Baru aktif setelah data dikunci

Reason:
Memberi waktu bagi masyarakat dan petugas menemukan data yang perlu diperbaiki sebelum penguncian.

Consequences:

Positive:
Kesalahan data dapat ditemukan lebih awal.

Tradeoff:
Hasil bisa berubah sebelum dikunci; label wajib tampil jelas.

---

## Decision 018

Title:
Retensi data peserta 12 bulan setelah publikasi, lalu anonimisasi

Date:
2026-10-11

Status:
Accepted

Context:
Data pribadi tidak boleh disimpan lebih lama dari yang diperlukan, sementara hasil undian harus tetap dapat dibuktikan.

Decision:
12 bulan setelah publikasi: `nik_enc` dihapus dan nama/alamat diganti `-` untuk semua peserta kecuali 6 kandidat pemenang. `snapshot`, `hasil_undian`, dan `audit_log` disimpan permanen (hanya data tersamar/ID).

Alternatives:
- Menyimpan permanen
- Menghapus segera setelah acara

Reason:
Menyeimbangkan pelindungan data pribadi dan kebutuhan audit.

Consequences:

Positive:
Eksposur data pribadi berkurang; bukti undian tetap ada.

Tradeoff:
Pertanyaan wajib pajak setelah 12 bulan tidak dapat dijawab dari data lengkap. Disetujui pemilik produk.

---

## Decision 019

Title:
Bahasa dokumen campuran dan antarmuka Bahasa Indonesia

Date:
2026-10-11

Status:
Accepted

Context:
Dokumen akan dibaca tim Bapenda dan dikerjakan developer/AI agent.

Decision:
Heading template tetap bahasa Inggris; isi bahasa Indonesia. Seluruh teks antarmuka bahasa Indonesia. Identifier kode memakai glosarium domain di `CODE_STYLE.md`.

Alternatives:
- Dokumen sepenuhnya Indonesia
- Dokumen sepenuhnya Inggris

Reason:
Heading stabil untuk tooling; isi mudah ditinjau oleh pemilik produk.

Consequences:

Positive:
Mudah ditinjau dan konsisten dengan template.

Tradeoff:
Campuran bahasa perlu disiplin istilah.

---

## Decision 020

Title:
Captcha ringan berbasis proof-of-work mandiri

Date:
2026-10-11

Status:
Proposed

Context:
`/cek` publik perlu dilindungi dari scraping tanpa memuat skrip pihak ketiga.

Decision:
Tantangan proof-of-work yang ditandatangani HMAC (`CAPTCHA_HMAC_KEY`), kedaluwarsa 5 menit, sekali pakai, aktif setelah ambang rate limit terlewati.

Alternatives:
- reCAPTCHA / hCaptcha
- Hanya rate limit

Reason:
Tidak mengirim data pengunjung ke pihak ketiga dan tidak butuh akun layanan.

Consequences:

Positive:
Privasi terjaga; tanpa ketergantungan eksternal.

Tradeoff:
Perlindungan lebih lemah dari captcha komersial. Perlu dikonfirmasi saat implementasi (bisa diganti tanpa mengubah kontrak API).

---

## Decision 021

Title:
Layar Undian offline tidak memeriksa sesi

Date:
2026-10-11

Status:
Accepted

Context:
Sesi tidak dapat diverifikasi tanpa internet, padahal layar harus tetap berjalan.

Decision:
Pemasangan dan akses awal `/operator/undian` mewajibkan login saat online. Saat offline, service worker menyajikan shell yang sudah ter-cache. Risiko diterima karena paket tidak memuat NIK/NOP utuh, hasil baru sah setelah diunggah pengguna terautentikasi dan lolos verifikasi, dan hash dicatat saksi.

Alternatives:
- Token offline berumur pendek
- Melarang mode offline

Reason:
Ketahanan di lokasi acara lebih penting dan risikonya rendah.

Consequences:

Positive:
Undian tetap berjalan tanpa internet.

Tradeoff:
Siapa pun dengan akses fisik ke laptop yang sudah memuat paket dapat membuka layar; dimitigasi dengan laptop khusus dan akun Windows terkontrol (`DEPLOYMENT.md`).

---

## Decision 022

Title:
Versi dasar tumpukan teknologi dan cara token desain diimplementasikan

Date:
2026-10-12

Status:
Accepted

Context:
Saat inisialisasi proyek (tiket 01) versi pasti tiap paket harus dipin (`ARCHITECTURE.md` §3). Beberapa rilis terbaru tidak serasi satu sama lain: `typescript-eslint` mendukung TypeScript sebelum 6.1, dan `eslint-plugin-import` (dibawa `eslint-config-next`) baru mendukung ESLint sampai 9.

Decision:
Versi dipin exact di `package.json`: Next.js 16.4.0, React 19.3.0, TypeScript 5.9.3 (bukan 7.x), ESLint 9.39.5 (bukan 10.x), typescript-eslint 8.71.1, Tailwind CSS 4.3.3, Vitest 5.0.3 dengan Vite 8.3.4 dan `@vitejs/plugin-react` 6.1.2, Playwright 1.64.0, Prettier 3.9.10, zod 4.6.6, lucide-react 1.55.0. Token desain `DESIGN_SYSTEM.md` §3–7 diimplementasikan CSS-first lewat blok `@theme` di `src/app/globals.css` (Tailwind v4 tidak memakai `tailwind.config`), dengan palet, radius, dan bayangan bawaan Tailwind dikosongkan agar hanya token proyek yang tersedia. Font (Plus Jakarta Sans, Inter, JetBrains Mono; subset latin, SIL OFL 1.1) disalin dari paket `@fontsource-variable/*` ke `src/app/fonts/` dan dimuat dengan `next/font/local`, tanpa CDN. Env divalidasi di `src/config/env.ts` dan dijalankan saat server mulai lewat hook `instrumentation`; karena Next.js hanya mencatat error hook lalu tetap hidup, proses dihentikan sendiri dengan kode 1.

Alternatives:
- TypeScript 7.x dan ESLint 10.x (terbaru, tetapi belum didukung typescript-eslint dan eslint-plugin-import)
- Tailwind v3 dengan `tailwind.config`
- Memuat font lewat `@fontsource` CSS atau Google Fonts

Reason:
Memilih kombinasi yang saling didukung agar lint type-aware berjalan penuh dan build dapat direproduksi. Tailwind v4 adalah versi terkini dan token sebagai variabel CSS sejalan dengan `DESIGN_SYSTEM.md`. Font lokal wajib agar Layar Undian tetap utuh saat offline.

Consequences:

Positive:
Seluruh toolchain berjalan tanpa peringatan kompatibilitas; kelas Tailwind di luar token tidak tersedia sehingga warna hex liar sulit masuk.

Tradeoff:
ESLint 9 sudah ditandai tidak lagi didukung oleh penerbitnya; migrasi ke ESLint 10 menunggu `eslint-plugin-import` (atau penggantinya) mendukungnya. `npm audit` melaporkan 5 kerentanan tingkat tinggi hanya pada rantai alat lint (`braces` lewat `eslint-config-next`); `npm audit --omit=dev` bersih. Naik versi TypeScript/ESLint nanti wajib lewat ADR baru.

---

## Decision 023

Title:
Versi dasar autentikasi dan basis data, serta cara sesi dan login diimplementasikan

Date:
2026-10-12

Status:
Accepted

Context:
Tiket 02 menambah Prisma, Auth.js, argon2id, pino, dan kerangka server. Auth.js v5 (`next-auth`) masih berstatus beta di npm dan, sejak dikelola Better Auth, hanya menerima perbaikan keamanan (beta.32 terbit Juli 2026 membawa perbaikan keamanan). Prisma 7.10.0 adalah rilis stabil; kanal `latest` npm sudah menunjuk rilis kandidat 8.0. Auth.js membawa halaman dan alur sendiri, sedangkan proyek ini mewajibkan kontrak Route Handler seragam (Decision 011), pesan galat Indonesia, blokir login 429, dan audit.

Decision:
- Versi dipin exact: `next-auth` 5.0.0-beta.32, `@node-rs/argon2` 2.2.2, `prisma` dan `@prisma/client` 7.10.0 dengan `@prisma/adapter-pg` 7.10.0 dan `pg` 8.23.1, `pino` 10.4.0, `ulid` 3.0.2, `tsx` 4.23.15 (menjalankan seed dan skrip TypeScript). Klien Prisma dihasilkan ke `src/generated/prisma` (tidak di-commit; `postinstall` menjalankan `prisma generate`) dan konfigurasi CLI ada di `prisma.config.ts`.
- Sesi memakai JWT Auth.js dalam cookie `httpOnly`, `SameSite=Lax`, `Secure` bila `APP_URL` berawalan `https://`, berlaku 8 jam dan diperbarui bergulir oleh `src/proxy.ts` tiap 15 menit aktivitas dengan batas mutlak 12 jam sejak login. Token hanya memuat ID pengguna dan waktu login; peran, status aktif, dan kewajiban ganti kata sandi dibaca dari database pada setiap request (`requireUser`, `requireRole`, penjaga halaman).
- Login memakai Credentials provider Auth.js di `/api/auth/*`, tetapi `authorize` hanya memanggil service `masuk()` (pembatas 5 gagal / 15 menit, argon2id, audit). Route `[...nextauth]` dibungkus `withHandler` agar mendapat `X-Request-Id`, cek `Origin`, dan balasan `429` berformat standar saat diblokir. Formulir login memanggil endpoint Auth.js lewat `fetch` (CSRF + `X-Auth-Return-Redirect`) alih-alih `next-auth/react`, sehingga status 429 dapat dibaca.
- Kata sandi baru juga tidak boleh sama dengan kata sandi lama (tambahan atas SECURITY §1) agar kewajiban ganti kata sandi pertama tidak dapat dilewati dengan memasukkan ulang kata sandi sementara.
- `audit_log` dijaga trigger terhadap UPDATE, DELETE, dan TRUNCATE; fungsi pemicu `tolak_ubah_tabel_immutable` dipakai ulang oleh tabel immutable lain pada migrasinya.

Alternatives:
- Better Auth atau implementasi sesi sendiri (menyimpang dari keputusan awal tumpukan teknologi)
- Prisma 8 rilis kandidat (belum stabil)
- `next-auth/react` `signIn` (tidak dapat membaca status 429)

Reason:
Mengikuti keputusan Auth.js dengan risiko yang dikurangi: kode kita hanya bergantung pada bagian kecil Auth.js (cookie JWT, CSRF, handler), sedangkan aturan keamanan penting (verifikasi, blokir, audit, status akun) ada di kode kita dan diuji terhadap PostgreSQL asli.

Consequences:

Positive:
Kontrak login dan error seragam dengan endpoint lain; akun nonaktif kehilangan akses seketika; semua perilaku diuji integrasi.

Tradeoff:
Auth.js v5 beta dalam mode perawatan: pembaruan wajib dipantau dan dipin manual; bila dihentikan, sesi dapat diganti karena token hanya memuat `sub` dan `loginAt`. `npm audit` melaporkan temuan tinggi pada rantai CLI Prisma 7 (`mysql2` dan `deepmerge-ts` di dalam `prisma`, tidak dipakai saat runtime dan tidak memproses masukan luar); perbaikannya hanya ada di Prisma 8 rilis kandidat, jadi ditinjau lagi saat 8.x stabil. TRUNCATE yang dilakukan pemilik database dengan menonaktifkan trigger (`session_replication_role`) tetap di luar jangkauan trigger; dilindungi oleh akses database dan backup.

---

## Decision 024

Title:
Penyederhanaan kuota pemenang menjadi 1 pemenang utama per zona wilayah tanpa cadangan

Date:
2026-10-14

Status:
Accepted

Context:
Kebijakan bisnis penyelenggaraan undian umroh disesuaikan: setiap zona wilayah hanya menetapkan tepat 1 orang pemenang utama (W1-UTAMA dan W2-UTAMA) tanpa slot cadangan (menggantikan kuota lama 1 pemenang utama + 2 cadangan per wilayah).

Decision:
1. `SLOT_URUTAN` di `src/lib/package/kontrak.ts` disederhanakan dari 6 slot menjadi 2 slot resmi: `W1-UTAMA` (urutan 1) dan `W2-UTAMA` (urutan 2).
2. Engine undian offline (`src/lib/draw/engine.ts`) dan pembangun berkas hasil (`src/lib/draw/hasil.ts`) disesuaikan agar dinamis mengacu pada `SLOT_URUTAN.length` tanpa magic number hardcoded 6.
3. Batas minimum peserta per wilayah diturunkan menjadi `< 1` (hanya menolak bila pool wilayah kosong).
4. Verifikasi hasil undian (`src/lib/draw/verifikasi.ts`) memvalidasi tepat 2 slot resmi; pemeriksaan `PESERTA_UNIK` diposisikan mendahului `WILAYAH_SESUAI` demi konsistensi deteksi duplikasi.
5. Antarmuka publik (`/` dan `/pemenang`), panel admin, serta berkas PDF Berita Acara disesuaikan untuk menampilkan hanya pemenang utama terpilih tanpa referensi cadangan.

Alternatives:
- Mempertahankan skema 6 slot dengan cadangan opsional / kosong.

Reason:
Penyederhanaan alur panggung, kepastian pemenang di lokasi, dan konsistensi seluruh modul sistem.

Consequences:

Positive:
Alur pengundian panggung jauh lebih cepat, tidak ada kompleksitas promosi cadangan di lapangan, data hasil undian lebih ringkas dan mudah diaudit.

Tradeoff:
Bila pemenang utama berhalangan atau digugurkan setelah verifikasi, penentuan pengganti membutuhkan keputusan panitia (status wilayah menjadi `PERLU_KEPUTUSAN`).

---

## Decision 025

Title:
Pembatalan hasil undian dan undi ulang mandiri tanpa unduh ulang paket

Date:
2026-10-15

Status:
Accepted

Context:
Pada situasi pengujian, gladi resik, atau pembatalan di panggung acara sebelum publikasi resmi, Admin memerlukan fleksibilitas untuk membatalkan hasil undian yang telah tersimpan di server dan melakukan pengundian ulang langsung di Layar Undian tanpa perlu mengunduh atau mengunggah ulang paket data zip dari awal.

Decision:
1. Endpoint `POST /api/periode/:id/hasil/batal`: Admin dapat membatalkan periode berstatus `DIUNDI` (selama belum `DIPUBLIKASI`). Menghapus baris `hasil_undian` dan `slot_hasil` menggunakan transaksi terkawal `session_replication_role = 'replica'`, mengembalikan status periode menjadi `TERKUNCI`, serta mencatat jejak audit `HASIL_BATAL`.
2. Antarmuka Admin (`UnggahHasil`): Menambahkan tombol dan formulir konfirmasi pembatalan hasil berstatus `DIUNDI` dengan input alasan wajib.
3. Antarmuka Layar Undian (`LayarUndian`): Menambahkan fungsi reset state di IndexedDB (`resetStateUndianDb()`) dan tombol "Ulangi Pengundian" di bilah kontrol serta tampilan `RingkasanAkhir` agar operator/admin dapat mengulang undian seketika tanpa kehilangan cache paket peserta.
4. Auto-fetch Paket Online: Layar Undian mendukung parameter query URL `?periodeId=<id>` yang memungkinkan pemuatan paket snapshot otomatis dari server ke IndexedDB tanpa proses manual unduh/unggah zip.

Alternatives:
- Mengharuskan penghapusan periode atau re-impor data secara keseluruhan.

Reason:
Efisiensi operasional tinggi saat pengujian lokal dan ketenangan operator saat gladi resik tanpa merusak integritas audit sistem.

Consequences:

Positive:
Alur pengujian dan pemulihan pengundian sangat cepat dan fleksibel, tidak membebani jaringan atau penyimpanan lokal dengan file zip berulang kali.

Tradeoff:
Pembatalan hasil hanya diizinkan untuk peran Admin dan hanya berlaku pada status `DIUNDI` sebelum `DIPUBLIKASI`.

---

## Decision 026

Title:
Pembukaan kunci data peserta dan diskualifikasi peserta lolos secara manual oleh Admin

Date:
2026-10-15

Status:
Accepted

Context:
Setelah data peserta dikunci (status `TERKUNCI`), penyelenggara mungkin menemukan kesalahan administrasi pada data peserta atau pemetaan wilayah sebelum acara undian berlangsung. Selain itu, pada tahap peninjauan data peserta (status `DRAF`), Admin membutuhkan wewenang untuk menggugurkan peserta tertentu yang lolos verifikasi sistem otomatis (misalnya karena hasil verifikasi lapangan menunjukkan bahwa yang bersangkutan adalah pejabat/pegawai yang tidak berhak ikut, atau objek pajak bermasalah) dengan alasan yang dapat dipertanggungjawabkan.

Decision:
1. Pembukaan Kunci Data (`POST /api/periode/:id/kunci/buka`):
   - Admin dapat membuka kunci periode berstatus `TERKUNCI` kembali ke `DRAF` selama periode tersebut belum pernah diundi (tidak ada `hasil_undian`).
   - Transaksi database menghapus relasi paket unduhan (`paket_unduhan`), snapshot peserta (`snapshot_peserta`), dan snapshot (`snapshot`) menggunakan bypass terkontrol `SET LOCAL session_replication_role = 'replica'`.
   - Berkas fisik snapshot kanonik di storage lokal dihapus.
   - Status periode kembali ke `DRAF`, versi dinaikkan, dan audit `PERIODE_BUKA_KUNCI` dicatat bersama alasan.
2. Diskualifikasi Peserta Manual (`POST /api/periode/:id/peserta/:pesertaId/gugur`):
   - Admin dapat menggugurkan peserta yang berstatus `eligible === true` pada periode berstatus `DRAF`.
   - Mengubah `eligible` menjadi `false`, menyimpan alasan ke kolom array `alasan` dengan format `DISKUALIFIKASI_MANUAL: <alasan>`, memperbarui agregat `jumlahLolos` (-1) dan `jumlahGugur` (+1) pada data impor aktif, dan mencatat audit `PESERTA_GUGUR`.
   - Antarmuka tabel peserta (`TabelPeserta`) menyediakan kolom Aksi dengan tombol "Gugurkan" dan dialog modal konfirmasi alasan diskualifikasi.

Alternatives:
- Mengharuskan pembuatan periode baru sejak awal ketika data perlu diubah.
- Mengizinkan pengubahan data saat status masih `TERKUNCI` (ditolak karena melanggar jaminan snapshot immutable).

Reason:
Menjaga fleksibilitas operasional Bapenda tanpa mengorbankan integritas audit, kepastian hukum, maupun ketatnya aturan keamanan snapshot sebelum acara undian.

Consequences:

Positive:
Admin dapat mengoreksi peserta yang tidak berhak dan memperbaiki data terkunci tanpa harus mengulang proses administrasi periode dari nol.

Tradeoff:
Membuka kunci data menghapus paket unduhan dan snapshot, sehingga panitia wajib melakukan penguncian ulang dan mengunduh paket undian baru sebelum pelaksanaan undian di panggung.

---

## Decision 027

Title:
Manajemen musik latar (BGM) terintegrasi IndexedDB dan tampilan layar undian fullscreen murni tanpa header web

Date:
2026-10-16

Status:
Accepted

Context:
Layar undian acara dirancang untuk laptop panggung dan proyektor acara tanpa ketergantungan koneksi internet. Saat ditampilkan di proyektor panggung, tampilan sebelumnya masih dibungkus oleh kerangka panel operator umum (`KerangkaPanel` dengan navbar web dan padding batas `max-w-[1280px]`), sehingga saat mode fullscreen diaktifkan, layar tidak murni memenuhi viewport. Selain itu, penyelenggara membutuhkan judul acara kustom di atas tema undian yang dapat dikonfigurasi fleksibel, serta pemutar musik latar (BGM) dengan slot standby dan drumroll/tegang yang dapat dikelola di Pengaturan dan terintegrasi mulus dengan audio ducking saat pengumuman pemenang.

Decision:
1. Pemisahan Halaman Panel vs Layar Undian:
   - Route group `src/app/operator/(panel)/layout.tsx` memisahkan antarmuka panel operator (Dasbor dan Unggah Hasil) yang memakai `KerangkaPanel`.
   - Rute `/operator/undian` langsung merender `LayarUndian` tanpa header web dan tanpa batas kontainer, menghasilkan tampilan 100% full screen / viewport.
   - Panggilan fullscreen memakai `wadahRef.current?.requestFullscreen()` pada root container layar undian disertai sinkronisasi `fullscreenchange` otomatis.
2. Judul di Atas Tema Undian:
   - Menambahkan properti `ThemeConfig.teks.judulAtas` (maks. 120 karakter) dengan nilai bawaan `'GEBYAR UNDIAN UMROH PBB-P2'`.
   - Input teks judul tersedia di menu Pengaturan Tema Admin (`/admin/tema`) dan terhubung langsung ke kanvas pratinjau 16:9 serta layar undian panggung.
3. Arsitektur Musik Latar (BGM):
   - Berkas biner audio (`Blob`) dan preferensi disimpan pada basis data IndexedDB peramban (`undian_umroh_bgm`) agar tetap persisten dan berfungsi penuh secara offline tanpa konsumsi kuota server.
   - Dua slot audio khusus disediakan: (1) "Musik Latar Standby" untuk fase menunggu, (2) "Musik Tegang / Drum Roll" untuk fase mengacak saat tombol Putar ditekan.
   - Playlist audio tambahan mendukung unggah multi-berkas (`.mp3`, `.wav`, `.ogg`), durasi terhitung otomatis, tombol uji putar, dan hapus berkas.
   - Komponen melayang `FloatingAudioPlayer` di pojok kanan bawah dengan efek glassmorphism terukur, mode minimize waveform/equalizer berdenyut saat lagu diputar, dan kontrol playlist/volume/progress bar.
   - Logika Audio Ducking: Saat status beralih ke `PEMENANG`, volume musik latar diturunkan secara bertahap (fade-out hingga 15%) agar suara pengumuman pemenang terdengar megah dan jelas, lalu dipulihkan bertahap (fade-in) saat kembali ke fase standby/menunggu.

Alternatives:
- Mengunggah audio BGM ke server PostgreSQL (ditolak karena membebani database dan membatasi ukuran file audio saat offline).
- Menggunakan localStorage (ditolak karena batas kuota 5 MB terlalu kecil untuk berkas MP3).

Reason:
Menghadirkan pengalaman panggung undian offline yang imersif, profesional, dan bebas gangguan antarmuka web, dengan fleksibilitas audio panggung yang tinggi bagi operator.

Consequences:

Positive:
Layar undian benar-benar penuh di proyektor panggung, audio tersimpan aman di IndexedDB tanpa server, dan audio ducking otomatis menjamin pengumuman pemenang terdengar dramatis dan jernih.

Tradeoff:
Penyimpanan IndexedDB bersifat lokal per perangkat laptop operator, sehingga file audio yang diunggah diatur pada laptop yang akan digunakan untuk acara.

---

## Decision 028

Title:
Dokumentasi penyerahan hadiah secara simbolis pada pemenang masing-masing zona dengan galeri multi-foto dan modal lightbox

Date:
2026-10-20

Status:
Accepted

Context:
Setelah pemenang masing-masing zona (W1 dan W2) ditetapkan dan diverifikasi, panitia menyelenggarakan prosesi penyerahan hadiah umroh secara simbolis (misalnya penyerahan tiket simbolis dan cinderamata oleh Bupati/pejabat daerah). Penyelenggara dan masyarakat membutuhkan bukti dokumentasi otentik yang transparan pada halaman pemenang publik bahwa hadiah benar-benar telah diserahkan secara sah dan simbolis kepada pemenang bersangkutan.

Decision:
1. Skema Database & Penyimpanan Berkas:
   - Menambahkan kolom pada model `SlotHasil`:
     - `foto_dokumentasi`: `text[]` (array ID aset, default kosong, dibatasi maksimal 3 foto dokumentasi per pemenang slot).
     - `diserahkan_at`: `timestamptz` (waktu penyerahan hadiah simbolis).
     - `diserahkan_catatan`: `text` (catatan/keterangan resmi serah terima simbolis).
   - Berkas foto diproses melalui layanan aset (`simpanAset`) dengan validasi magic bytes (format JPG, PNG, WebP; batas 5 MB per berkas), deduplikasi berbasis SHA-256, dan disimpan fisik pada direktori storage aset server.
2. Endpoint API Pengelolaan:
   - `POST /api/periode/:id/pemenang/:slot/foto`: Mengunggah foto dokumentasi penyerahan simbolis (mendukung multipart/form-data dan JSON base64) dengan batas 3 foto per slot.
   - `PATCH /api/periode/:id/pemenang/:slot/foto`: Memperbarui catatan/keterangan serah terima simbolis.
   - `DELETE /api/periode/:id/pemenang/:slot/foto/:fotoId`: Menghapus foto dokumentasi tertentu dari slot pemenang.
   - Aksi mutasi diaudit dengan kode `PEMENANG_DOKUMENTASI_SIMBOLIS` dan `PEMENANG_HAPUS_FOTO`.
3. Antarmuka Panel Admin (`DokumentasiSimbolisAdmin`):
   - Disediakan kartu "Bukti Penyerahan Simbolis" pada slot pemenang sah yang belum gugur di panel kelola pemenang (`/admin/periode/[id]/pemenang`).
   - Menyediakan galeri thumbnail foto, tombol unggah foto bukti dengan sisa slot kuota (maksimal 3 foto), tombol hapus foto berkonfirmasi, input catatan penyerahan dengan tombol simpan, dan modal lightbox pratinjau resolusi penuh.
4. Tampilan Publik (`TampilanPemenangPublik`):
   - Pada kartu pemenang masing-masing zona di halaman publik (`/pemenang`), jika terdapat foto dokumentasi, ditampilkan lencana hijau "Hadiah Telah Diserahkan" beserta thumbnail galeri foto dokumentasi.
   - Mengklik thumbnail akan membuka modal lightbox interaktif yang mendukung navigasi keyboard (Escape untuk keluar, Panah Kiri/Kanan untuk berpindah foto), tombol navigasi sebelumnya/selanjutnya, dan keterangan waktu serta catatan serah terima simbolis.

Alternatives:
- Menyimpan hanya 1 foto tunggal (ditolak karena acara penyerahan simbolis seringkali membutuhkan dokumentasi dari beberapa sudut atau bersama pejabat).
- Menyimpan URL foto eksternal (ditolak karena tidak menjamin ketersediaan jangka panjang dan integritas berkas di server Pemkab).

Reason:
Meningkatkan akuntabilitas, transparansi, dan kepercayaan publik terhadap hasil penyelenggaraan undian umroh resmi Kabupaten OKU Selatan.

Consequences:

Positive:
Publik dapat melihat bukti nyata penyerahan hadiah kepada pemenang masing-masing zona secara langsung dan interaktif; admin dapat mengelola hingga 3 foto bukti penyerahan simbolis dengan audit log lengkap.

Tradeoff:
Penyimpanan server menampung berkas foto bukti penyerahan simbolis dengan kuota terkontrol (maksimal 3 foto per pemenang, 5 MB per foto).



