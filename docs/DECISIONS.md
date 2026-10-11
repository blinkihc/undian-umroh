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
