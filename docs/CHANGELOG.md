# Changelog

> Format mengikuti Keep a Changelog; versi mengikuti Semantic Versioning. Perubahan dokumen yang mengubah perilaku produk dicatat di sini.

## [Unreleased]

## Revisi Versi 1 - 2026-10-18

### Added

- Fitur Berita Acara PDF Resmi dan Publikasi Hasil Undian (Tiket 19–21):
  - Generator PDF Berita Acara Pelaksanaan Undian (`src/server/pdf/berita-acara.ts`): Menghasilkan dokumen resmi PDF penetapan pemenang lengkap dengan kop surat Pemkab OKU Selatan, tabel pemenang per zona, data saksi/notaris/pejabat penandatangan, dan QR Code verifikasi integritas kriptografis.
  - Alur Publikasi Periode dan Hasil Undian (`src/server/services/berita-acara.ts`, `src/app/api/periode/[id]/publikasi/route.ts`): Mempublikasikan hasil undian secara resmi ke publik, mengunci perubahan, dan membuka akses unduh Berita Acara PDF di portal publik.
  - Antarmuka Kelola Berita Acara di Panel Admin (`src/app/admin/periode/[id]/berita-acara/page.tsx`, `src/components/admin/berita-acara/`): Formulir penetapan saksi, penandatangan, pratinjau Berita Acara, serta tombol aksi cetak dan publikasi hasil.

- Portal Publik Interaktif & Layanan Mandiri:
  - Beranda Publik Tematik Islami (`src/app/(publik)/page.tsx`, `src/components/publik/beranda/`): Hero visual 3D Makkah & Kabah, animasi motion split reveal, navigasi responsif, dan kartu informasi transparansi undian umroh.
  - Modul Cek NOP Publik Mandiri (`src/app/(publik)/cek/page.tsx`): Formulir pencarian status kepesertaan berbasis NOP dengan proteksi Captcha matematis lokal (`src/server/captcha.ts`), penyamaran NIK sesuai UU PDP, dan pembatas laju permintaan (*rate limiting*).
  - Halaman Pengumuman Pemenang Publik (`src/app/(publik)/pemenang/page.tsx`): Menampilkan daftar pemenang resmi per zona pasca-publikasi dan tombol unduh Berita Acara PDF terverifikasi.

- Ekosistem Docker, Kontainerisasi, dan Skrip Operasional:
  - Multi-stage `Dockerfile` Next.js mandiri berbasis Alpine Linux dengan layer optimasi standalone.
  - Konfigurasi `docker-compose.yml` (lingkungan produksi) dan `docker-compose.dev.yml` (lingkungan dev lokal).
  - Dokumentasi operasional dan deployment lengkap: `docs/DEPLOYMENT_EASYPANEL.md`, `docs/OPERASIONAL.md`, `docs/GLADI_BERSIH.md`, dan `docs/PANDUAN_LOKAL.md`.
  - Skrip otomatisasi pemeliharaan database di `scripts/`: `backup.sh`, `restore.sh`, dan `watch.sh`.

- Fitur Pembatalan Putaran & Slot pada Layar Undian (Antisipasi Salah Pencet Petugas):
  - Logika Mesin Undian (`src/lib/draw/engine.ts`):
    - `batalkanPutaran`: Mengembalikan fase dari `MENGACAK` ke `MENUNGGU` saat putaran/animasi sedang berputar tanpa menghasilkan pemenang, mereset `dimulaiAt` jika masih di slot pertama.
    - `batalkanPemenangSlot`: Membatalkan pemenang fase `PEMENANG` pada slot aktif, menghapus entri pemenang slot terakhir dari `slotSelesai`, dan mengembalikan status ke `MENUNGGU` pada slot yang sama untuk pengundian ulang mandiri.
  - Kontrol Operator & Pintasan Keyboard Layar Undian (`src/components/undian/layar-undian.tsx`):
    - Tombol "Batal Putaran [.]" di bilah operator bawah saat fase `MENGACAK` untuk membatalkan putaran seketika, menghentikan efek suara drumroll/ticker, dan mengembalikan layar ke fase `MENUNGGU`.
    - Tombol "Batal Pemenang Slot Ini [.]" di bilah operator bawah saat fase `PEMENANG` dengan dialog konfirmasi aman untuk mengundi ulang slot tertentu tanpa mereset slot-slot yang telah selesai sebelumnya.
    - Integrasi pintasan keyboard tombol titik `.` (`Period` / `NumpadDecimal`) yang memicu pembatalan putaran (`MENGACAK`) atau konfirmasi undi ulang slot (`PEMENANG`), menggantikan tombol `Escape` guna menghindari konflik dengan fungsi keluar layar penuh (*fullscreen*) bawaan peramban.
    - Penyederhanaan Visual Layar Undian: Penghapusan lencana slot (`Slot X dari Y...`), penghapusan teks jumlah pool peserta lolos (`Pool Peserta Lolos: ...`), penghapusan label keterangan preset di bawah animasi undian (`Preset: ...`), dan penggantian judul "Pemenang Utama" menjadi "Zona 1" atau "Zona 2" secara proporsional.
    - Penyimpanan mutasi state undian terkini ke IndexedDB (`simpanStateKeDb`) secara persisten dan sinkronisasi audio terintegrasi.

- Ekstensi Preset Audio Web Audio API dan Audio Kustom IndexedDB:
  - 6 Preset Sintetis Fase Mengacak (`src/client/offline/audio.ts`): Sintetis Bawaan (Klik Ticker Cepat), Snare Drumroll Tegang (White Noise buffer + BiquadFilter bandpass ~1000Hz), Arcade 8-Bit Cepat (Square oscillator tangga nada pentatonik), Roda Roulette Kasino (Triangle oscillator pitch bend menurun cepat), Sci-Fi Nada Naik / Rising Suspense (Sawtooth oscillator + lowpass filter cutoff naik bertahap), dan Mute.
  - 6 Preset Sintetis Fase Pemenang (`src/client/offline/audio.ts`): Sintetis Bawaan (Fanfare Megah C-E-G-C), Terompet Kerajaan / Royal Brass (2 Sawtooth detuned ±5 cents + lowpass hangat, akor C -> F -> G -> C tinggi), Arcade 8-Bit Level Up (Square oscillator pola retro G4-C5-E5-G5), Jackpot Lonceng Emas (Sine & Triangle frekuensi tinggi 1200-2600Hz decay panjang), Chime Harmoni Lembut (Akor Cmaj9 serentak attack lembut & release 2.5s), dan Mute.
  - Opsi Audio Kustom Berbasis IndexedDB (`src/client/offline/custom-audio-store.ts`): Penyimpanan berkas audio biner (`Blob`) kustom secara persisten di IndexedDB peramban untuk fase Mengacak dan Pemenang, memungkinkan penggunaan berkas audio instan tanpa ketergantungan koneksi server.
  - Antarmuka Dropdown & Input Berkas Panel Admin (`src/components/admin/tema/kelola-tema.tsx`): Integrasi dropdown pemilih preset, tombol pratinjau "Putar" yang terhubung langsung ke Web Audio API dan audio kustom, slider volume terkalibrasi, serta kondisional pemilih berkas audio kustom.
  - Penyelarasan Otomatis Layar Undian (`src/components/undian/layar-undian.tsx`): Eksekusi dinamis preset audio sintetis maupun audio kustom IndexedDB saat fase pengacakan dan pengumuman pemenang berlangsung.

- Desain Kartu Penghargaan Pemenang "Imperial Midnight Sapphire & Gilded Arch Monolith" (Penyempurnaan 1 Layar):
  - Tata Letak Kompak & Pas 1 Layar Penuh (`src/components/undian/kartu-pemenang.tsx`): Pengecilan tinggi kartu secara terukur agar muat 100% tanpa gulir (*scroll*) pada layar monitor atau proyektor panggung (`max-w-4xl`), penghapusan pita header atas yang redundan, penghapusan header/footer pada kotak kredensial, dan penghapusan lencana status kepatuhan.
  - Penyesuaian Penamaan Zona: Label "Pemenang Utama" digantikan secara otomatis menjadi "Pemenang Zona 1" atau "Pemenang Zona 2" berdasarkan wilayah peserta undian (`W1` atau `W2`).
  - Rekonfigurasi Timeline Kepatuhan Pajak 5 Tahun (2022 — 2026): Penataan ulang posisi node timeline dengan meletakkan teks tahun di atas bulatan centang emas, bulatan centang di tengah terhubung garis konduit horizontal, tanggal pelunasan (`dd/mm/yyyy`) di bawah bulatan, serta eliminasi label "LUNAS".
  - Kerapian Kotak Kredensial Resmi: Tampilan NOP dan NIK tersamar yang bersih dan fokus tanpa elemen dekoratif berlebih, menjamin kepatuhan UU PDP dan tata estetika antislop-ui.

- Sinkronisasi Tema Undian, Efek Visual Confetti, dan Kontrol Audio Lengkap:
  - 4 Preset Tema Mandiri di Database (`src/server/services/tema.ts`): Men-seed 4 tema resmi bawaan (`tema_bawaan_slot_mesin`, `tema_bawaan_roda_nama`, `tema_bawaan_kartu_berputar`, `tema_bawaan_ticker_nop`) secara idempoten di basis data PostgreSQL sehingga setiap preset memiliki konfigurasi dan entri mandiri yang dapat dipilih dan diedit.
  - Pemilih Tema dan Sinkronisasi Pengaturan di Admin (`KelolaTema`): Dropdown pemilih preset/tema yang ingin diedit, tombol preset yang otomatis menyelaraskan tema aktif, slider kepekatan lapisan gelap latar (`overlayGelapPersen` 60% - 90%), dan slider volume interaktif (0% - 100%) untuk ketiga fase suara (Menunggu, Mengacak, Pemenang).
  - Efek Visual Perayaan Confetti Canvas 60 FPS (`ConfettiCanvas`): Komponen partikel konfeti HTML5 Canvas tanpa pustaka luar, mendukung *prefers-reduced-motion*, variasi bentuk pita/persegi, palet warna tematik (zamrud, emas, sian, mawar, putih), dan pembersihan instan saat fase berganti.
  - Sinkronisasi Otomatis Layar Undian (`LayarUndian`): Sinkronisasi paket dan konfigurasi tema terkini dari server saat online tanpa mereset progres undian IndexedDB, memastikan latar belakang (*background*), ornamen islami, subjudul, dan ucapan pemenang selalu mutakhir.
  - Penyaluran Parameter Audio Lengkap (`PengelolaAudio`): Menyalurkan opsi `loop` dan `volumePersen` per fase sesuai pengaturan tema ke pemutar audio.

- Manajemen Musik Latar (BGM) Terintegrasi dan Pemutar Melayang (Floating Audio Player):
  - Penyimpanan Audio IndexedDB (`src/client/offline/bgm-store.ts`): Menyimpan berkas audio biner (`Blob`) secara persisten di peramban untuk mode offline, metadata durasi dan ukuran berkas, serta preferensi pemutaran.
  - Seksi Pengaturan Musik Latar di Panel Admin (`PengaturanBgm`):
    - 2 Slot Audio Terpisah: "Musik Latar Standby" (diputar sebelum undian dimulai) dan "Musik Tegang / Drum Roll" (diputar otomatis saat undian diputar).
    - Daftar Playlist Audio: Unggah multi-berkas (`.mp3`, `.wav`, `.ogg`), tabel daftar lagu dengan nama, durasi (MM:SS), tombol uji putar/jeda, dan tombol hapus lagu.
    - Preferensi Pemutaran: Saklar toggle auto-play saat masuk Layar Undian, saklar loop/ulangi terus-menerus, dan slider volume default (0% - 100%).
  - Pemutar Musik Nav Bar Satu Baris di Layar Undian (`FloatingAudioPlayer`):
    - Integrasi langsung ke bilah navigasi operator (nav bar) kanan bawah dalam satu baris, menggantikan mode melayang (*floating widget*).
    - Kontrol ringkas & terpadu: Tombol lingkaran Play/Pause utama, visualisasi spektrum gelombang suara (*waveform bars*) bernuansa toska/cyan berdenyut saat lagu aktif, tombol Stop (berhenti & reset), tombol Next (lagu berikutnya), serta judul lagu ringkas.
    - Logika Audio Ducking & Transisi Fase: Pengecilan volume perlahan (fade-out) saat pemenang muncul agar pengumuman pemenang terdengar megah dan jernih, pemulihan volume bertahap saat kembali ke fase menunggu, serta otomatisasi lagu tegang saat pengacakan.

- Tampilan Layar Undian Fullscreen Murni dan Judul di Atas Tema:
  - Pemisahan Route Group Operator (`src/app/operator/(panel)` vs `/operator/undian`): Menghilangkan header web (`HeaderPanel`) dan pembatas lebar (`max-w-[1280px]`) pada Layar Undian sehingga halaman tampil 100% full viewport.
  - Fullscreen API Adaptif: Memakai `wadahRef.current?.requestFullscreen()` dan sinkronisasi `fullscreenchange` otomatis.
  - Pengaturan Judul Tema (`ThemeConfig.teks.judulAtas`): Teks judul di atas tema undian yang dapat dikonfigurasi melalui menu Pengaturan Tema dan tampil mencolok di atas tema undian acara.

- Fitur Buka Kunci Data Peserta dan Diskualifikasi Peserta Lolos (Decision 026):
  - Endpoint `POST /api/periode/:id/kunci/buka`: Admin dapat membuka kembali periode berstatus `TERKUNCI` ke status `DRAF` (selama belum pernah diundi). Data paket unduhan dan snapshot (termasuk file kanonik di storage) dibersihkan secara aman melalui transaksi bypass replikasi, versi dinaikkan, dan audit `PERIODE_BUKA_KUNCI` dicatat dengan alasan wajib.
  - Tombol dan Dialog "Buka Kunci Data" di Panel Admin (`KunciData`): Admin dapat mengonfirmasi pembukaan kunci data peserta dengan alasan minimal 5 karakter.
  - Endpoint `POST /api/periode/:id/peserta/:pesertaId/gugur`: Admin dapat mendiskualifikasi peserta lolos (`eligible: true`) pada periode berstatus `DRAF`, menyimpan alasan dengan format `DISKUALIFIKASI_MANUAL: <alasan>`, memperbarui counter agregat `jumlahLolos` & `jumlahGugur` pada data impor aktif, serta mencatat jejak audit `PESERTA_GUGUR`.
  - Kolom Aksi dan Dialog "Gugurkan" di Tabel Peserta (`TabelPeserta`): Menyediakan tombol aksi gugurkan untuk setiap peserta lolos (hanya aktif saat periode berstatus `DRAF`), lengkap dengan dialog konfirmasi input alasan diskualifikasi minimal 3 karakter.
  - Penyesuaian label formulir filter peserta menjadi "Cari NOP atau Nama" di `FormFilterPeserta`.

- Fitur Pembatalan Hasil Undian dan Undi Ulang Mandiri (Decision 025):
  - Endpoint `POST /api/periode/:id/hasil/batal`: Admin dapat membatalkan hasil undian berstatus `DIUNDI` (sebelum dipublikasi), menghapus baris `hasil_undian` dan `slot_hasil` melalui transaksi aman ber-bypass `session_replication_role = 'replica'`, mengembalikan status periode menjadi `TERKUNCI`, dan mencatat jejak audit `HASIL_BATAL`.
  - Formulir Pembatalan Hasil di Panel Admin (`UnggahHasil`): Tombol dan formulir pembatalan hasil dengan input alasan wajib bagi Admin.
  - Reset Undian di Layar Undian (`LayarUndian`): Tombol "Ulangi Pengundian" di tampilan `RingkasanAkhir` dan bilah kontrol bawah yang mereset progres undian via `resetStateUndianDb()` di IndexedDB tanpa menghapus paket peserta.
  - Pemuatan Otomatis Paket Online (`/operator/undian?periodeId=<id>`): Layar Undian dapat otomatis mengunduh & memvalidasi paket snapshot langsung dari API server jika belum tersimpan di browser, serta tombol "Buka Layar Undian Langsung" pada tab Paket Undian Admin.

- Optimasi Drastis Impor Data Peserta Skala Besar (100k-500k Baris):
  - Fast OpenXML Streaming Parser: Penggantian pemrosesan DOM ExcelJS penuh dengan parser streaming berbasis dekompresi selektif `fflate` (`xl/sharedStrings.xml` dan `xl/worksheets/sheet1.xml`), memotong waktu ekstraksi XLSX 100k baris dari 35.5 detik menjadi ~4.9 detik. Fallback transparan ke ExcelJS dipertahankan untuk format di luar spesifikasi standar.
  - Pool Enkripsi Kriptografis AES-256-GCM NIK: Alokasi vektor inisialisasi (IV) ter-pool per 10.000 batch dan `Buffer.allocUnsafe` mengurangi beban garbage collection hingga 50% (dari 7.2 detik menjadi 3.5 detik per 100k baris).
  - Bulk Database UNNEST & Manajemen Indeks: Penonaktifkan pemeriksaan relasi berulang via `session_replication_role = 'replica'`, pelepasan sementara 6 indeks sekunder (`DROP INDEX IF EXISTS`) sebelum insert batch berparameter `UNNEST` (20.000 baris/kueri), dan pembuatan ulang indeks secara massal (`CREATE INDEX IF NOT EXISTS`) setelah insert selesai. Memangkas waktu transaksi database 100.000 baris dari ~350 detik menjadi ~17 detik (penurunan waktu total pipeline impor dari ~400 detik menjadi ~25–28 detik).
- Hapus Periode (Khusus Lingkungan Lokal/Dev): Tombol dan rute `DELETE /api/periode/:id` untuk membersihkan periode uji coba beserta seluruh relasinya (peserta, impor, wilayah, snapshot, hasil) menggunakan bypass transaksi `session_replication_role = 'replica'`. Di lingkungan produksi (`NODE_ENV === 'production'`), aksi ditolak keras dengan status HTTP 403 `AKSES_DITOLAK`.
- Animasi Proses Impor Latar Belakang (Anime.js): Komponen visual `AnimasiProsesImpor` pada alur unggah data peserta dengan penelusuran 4 fase proses latar belakang (Pemindaian Berkas, Validasi NOP 5 Tahun, Enkripsi Kriptografis AES-256-GCM NIK, Sinkronisasi PostgreSQL), progress bar berfisika spring, dan efek gerak staggered.
- Optimasi Performa Data Peserta (>100.000 Baris): Penambahan indeks komposit `peserta(periode_id, baris)` di PostgreSQL/Prisma, pengalihan pencarian daftar kecamatan ke tabel `kecamatan_wilayah` (~19 baris) menggantikan pemindaian seluruh tabel peserta, dan bypass `count(*)` menggunakan ringkasan impor aktif saat paginasi tanpa filter rinci.
- Tema undian dan multimedia kustom: implementasi 4 preset animasi undian penuh (`slot-mesin`, `roda-nama`, `kartu-berputar`, `ticker-nop`), endpoint streaming aset fisik `GET /api/aset/:id`, modal unggah gambar latar & audio kustom per fase di panel admin Tema (`/admin/tema`), pratinjau canvas interaktif 16:9, serta engine audio hybrid (`HTMLAudioElement` untuk aset kustom dan Web Audio API untuk profil sintetis bawaan/ceria/formal).

- Pemetaan kecamatan ke wilayah (tiket 08): tabel `kecamatan_wilayah` (dibuat otomatis saat impor, dipertahankan saat impor ulang), `GET/PUT /api/periode/:id/wilayah` dengan `version` dan audit `WILAYAH_PETAKAN`, saran kecamatan mirip, ringkasan per wilayah; tab Wilayah (tombol segmen, simpan/batalkan, banner belum dipetakan, kartu wilayah dengan ubah nama tampilan); ringkasan Data Peserta dan filter wilayah memakai pemetaan.
- Impor file nyata (tiket 07): XLSX sheet pertama via exceljs (semua sel teks, rumus tidak dievaluasi, serial/sel tanggal Excel), pemeriksaan zip (fflate) `xl/workbook.xml` dan batas terurai 200 MB, konsistensi ekstensi/MIME/magic bytes, CSV Windows-1252, generator data sintetis `npm run fixture:generate`, tes `@slow` 46.000 baris, tes impor terputus (rollback). Dependensi `fflate` 0.8.3.
- Tabel peserta dan ekspor gugur (tiket 06): `GET /api/periode/:id/peserta` (filter status, wilayah, kecamatan, alasan, pencarian NOP/awalan nama, paginasi), `GET /api/periode/:id/peserta/ekspor-gugur` (XLSX, penetralan rumus, audit `EKSPOR_UNDUH`); `FilterPesertaSchema`, `tafsirkanPencarian`, `netralkanSelExcel`; tabel peserta, form filter GET, paginasi, skeleton dan galat di tab Data Peserta. Dependensi `exceljs` 4.4.0 (ARCHITECTURE §3).
- Impor CSV dan evaluasi syarat (tiket 05): modul murni `normalizeNop`/`formatNop`/`maskNop`, `isValidNik`/`maskNik`, `normalizeKecamatan`, `parseTanggalLunas` (WIB; `dd/mm/yyyy[ HH:MM[:SS]]`, `dd-mm-yyyy`, ISO, serial Excel), `evaluateEligibility` dengan seluruh kode alasan PRD §6.0, `periksaHeader`, `evaluasiImpor` (NOP ganda, ringkasan); tabel `impor` dan `peserta` (NIK AES-256-GCM, index unik parsial `impor_satu_aktif`); `POST /api/periode/:id/impor` (CSV UTF-8 `;`, ≤ 20 MB, satu transaksi, audit `IMPOR_BERHASIL`/`IMPOR_DITOLAK`), `GET /api/periode/:id/ringkasan`; kode galat `HEADER_TIDAK_SESUAI`, `FILE_TIDAK_VALID`; tab Data Peserta (kartu ringkasan, banner kecamatan belum terpetakan, gugur per alasan, unggah dengan kemajuan) dan tab Pengaturan di halaman periode; contoh header `/contoh/format-impor.csv`. Dependensi `papaparse` 5.7.0 (ARCHITECTURE §3).
- Kelola periode (tiket 04): tabel `periode` dan `wilayah` (W1/W2 dibuat otomatis), index unik parsial `periode_satu_aktif`, CHECK alasan wajib saat Dibatalkan; `GET/POST /api/periode`, `GET/PATCH /api/periode/:id` (optimistic concurrency, batas lunas hanya saat Draf), `POST /api/periode/:id/batal`; kode galat `PERIODE_AKTIF_SUDAH_ADA` dan `PERIODE_TERKUNCI`; audit `PERIODE_BUAT`, `PERIODE_UBAH`, `WILAYAH_NAMA_UBAH`, `PERIODE_BATAL`; daftar periode berchip status di Dasbor dan `/admin/periode`, halaman Buat Periode dan detail periode (ubah, batalkan); menu Periode; daftar dan detail periode baca-saja untuk Operator.
- Kelola pengguna dan log audit (tiket 03): `GET/POST /api/pengguna`, `PATCH /api/pengguna/:id` (aktif/nonaktif, reset kata sandi yang memaksa ganti, ubah peran) dengan `version`, aturan akun sendiri dan Admin aktif terakhir di transaksi berkunci, `GET /api/audit` dengan filter aksi, aktor, rentang tanggal WIB, dan paginasi; halaman `/admin/pengguna` dan `/admin/audit`; sidebar Panel Admin; penyaringan payload audit (field rahasia dibuang, NIK/NOP utuh disamarkan); kolom `pengguna.version`.
- Login dan peran (tiket 02): tabel `pengguna` dan `audit_log` (append-only lewat trigger), login Admin/Operator dengan Auth.js + argon2id, sesi JWT 8 jam (batas mutlak 12 jam) dengan pengecekan akun aktif ke database di setiap request, wajib ganti kata sandi pertama, pembatas 5 gagal / 15 menit, pengecekan `Origin` pada mutasi, `withHandler`/`AppError`/`audit()`/pino dengan `X-Request-Id`, seed Admin idempoten (`npm run db:seed`), `/api/health`, header keamanan dasar, serta halaman `/login`, `/akun/ganti-password`, `/admin`, dan `/operator`. Keputusan di Decision 023.
- Kerangka aplikasi (tiket 01): Next.js 16 App Router, TypeScript strict, Tailwind v4 dengan token `DESIGN_SYSTEM.md`, font lokal, ESLint (batas modul murni, larangan `Math.random` di area undian, larangan `console`), Prettier, Vitest (node + jsdom), Playwright, PostgreSQL tes via `docker-compose.test.yml`, validasi env gagal cepat, dan beranda publik bermerek (`lang="id"`). Versi dasar dicatat di Decision 022.

### Changed
- Penyelarasan Desain Papan Pemenang Akhir Layar Undian (`RingkasanAkhir`):
  - Penyesuaian tema warna mengikuti Kartu Pemenang resmi (*Imperial Midnight Sapphire & Gilded Arch Monolith*), menggantikan wadah putih datar dengan gradien safir gelap (`from-[#08182f] via-[#041021] to-[#020914]`) dan bingkai emas monolitik.
  - Penonjolan data pemenang per zona (nama pemenang berukuran besar `text-2xl sm:text-3xl font-black text-neutral-0`, NOP, dan kecamatan berformat kredensial rapi) pada kartu kaca gelap terpisah untuk Zona 1 dan Zona 2.
  - Pengecilan porsi sidik digital hash (*snapshot hash* dan *hasil hash*) menjadi kartu ringkas minimalis di bagian bawah (`text-xs` dan `text-[9px]`) agar tidak mendominasi panggung visual.
  - Harmonisasi tombol aksi unduh hasil undian dan ulangi pengundian sesuai palet desain resmi panggung undian.
- Layar Undian: Randomness Animasi Multi-Kecamatan dan Penampilan Pemenang Seketika:
  - Interleaved Multi-Kecamatan Sampling (`src/components/undian/layar-undian.tsx`): Animasi pengacakan mengelompokkan peserta berdasarkan kecamatan (`Map<string, PesertaSnapshot[]>`) dan merotasikan pengambilan sampel peserta secara round-robin antar kecamatan yang berbeda bergantian tiap interval putaran, memastikan visual pengacakan menunjukkan keberagaman wilayah secara nyata dan tidak terpaku pada satu kecamatan.
  - Tampilan Identitas Kecamatan di Seluruh Preset Animasi (`src/components/undian/animasi-undian.tsx`): Menampilkan badge/label teks nama kecamatan yang jelas dan bergradien kontras pada 4 preset animasi undian (`roda-nama`, `kartu-berputar`, `ticker-nop`, `slot-mesin`).
  - Eliminasi Jeda Pengumuman Pemenang (`src/components/undian/layar-undian.tsx`): Menghapus penundaan buatan `setTimeout` (2-3 detik dari `perlambatanDetik`) pada aksi tombol "Berhenti" (klik kedua), sehingga kartu pemenang resmi langsung muncul seketika di layar saat tombol ditekan.
- Penyesuaian Kuota Pemenang Undian (1 Pemenang Utama per Zona Tanpa Cadangan, Decision 024):
  - Konstanta `SLOT_URUTAN` disederhanakan dari 6 slot menjadi 2 slot resmi (`W1-UTAMA` urutan 1 dan `W2-UTAMA` urutan 2).
  - Engine undian offline (`engine.ts`, `hasil.ts`) disesuaikan agar dinamis mengacu ke `SLOT_URUTAN.length` tanpa magic number hardcoded 6.
  - Verifikasi integritas hasil 10 langkah disesuaikan dengan 2 slot resmi dan meletakkan `PESERTA_UNIK` sebelum `WILAYAH_SESUAI`.
  - Antarmuka beranda publik (`kuota-wilayah.tsx`), pengumuman pemenang (`tampilan-pemenang.tsx`), ringkasan panggung (`ringkasan-akhir.tsx`), panel admin kelola pemenang, dan berkas PDF Berita Acara diselaraskan tanpa klausa/tabel cadangan.
- Komponen React yang diekspor wajib bertipe kembalian eksplisit dan dipaksa ESLint (CODE_STYLE §6).
## [0.1.0] - 2026-10-11

Rilis dokumentasi dan desain awal. Belum ada kode aplikasi.

### Added

- 17 dokumen di `docs/` berbasis Vibe Coding Blueprint: `PRD`, `UX_FLOWS`, `DESIGN_SYSTEM`, `ARCHITECTURE`, `DATABASE`, `API`, `SECURITY`, `CODE_STYLE`, `TESTING`, `AGENTS`, `DECISIONS`, `ROADMAP`, `ENVIRONMENT`, `ERROR_HANDLING`, `DEPLOYMENT`, `OBSERVABILITY`, `CHANGELOG`.
- Aturan bisnis inti: syarat lunas 2022–2026, batas default 30 September 2026, pembayaran terlambat tetap sah, kode alasan gugur, 6 slot undian (1 utama + 2 cadangan per wilayah).
- Kontrak paket undian offline dan file hasil (hash SHA-256 kanonik, 10 pemeriksaan verifikasi), skema `ThemeConfig`.
- 21 keputusan arsitektur (ADR) di `DECISIONS.md`.
- Mockup 11 layar di `design/undian-umroh.pen`: Layar Undian (kartu pemenang, ringkasan akhir, halaman depan 4 preset), Panel Admin (data peserta, pemetaan wilayah, tema undian), dan Halaman Publik mobile (cek NOP: ikut dan tidak ikut).
- Aset merek: logo Pemkab OKU Selatan dan Bapenda di `design/assets/`.
- Token desain (warna, font, spasi) sebagai variabel di file desain.

### Changed

- Judul acara sementara menjadi "Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026" di seluruh dokumen dan mockup.
- Cek NOP publik aktif sejak data diimpor dengan label "Hasil sementara" sampai data dikunci.
- Retensi data peserta 12 bulan setelah publikasi, lalu anonimisasi.

### Fixed

- (tidak ada)

### Removed

- (tidak ada)
