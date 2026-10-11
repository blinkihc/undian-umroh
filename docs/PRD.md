# Product Requirements Document

> Status: Draf v0.1 — menunggu review Bapenda OKU Selatan.
> Bahasa: judul bagian bahasa Inggris, isi bahasa Indonesia.
> Dokumen ini adalah sumber kebenaran untuk kebutuhan produk. Dokumen lain (UX_FLOWS, DESIGN_SYSTEM, ARCHITECTURE, DATABASE, API, SECURITY) harus konsisten dengan dokumen ini.

## 1. Product Overview

Product Name:
Undian Umroh PBB OKU Selatan (nama kerja). Judul acara sementara: **"Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026"**.

One-Line Description:
Web app milik Bapenda Kabupaten Ogan Komering Ulu Selatan untuk mengundi 2 paket umroh secara adil, transparan, dan dapat diaudit di antara wajib pajak PBB-P2 yang melunasi PBB lima tahun berturut-turut (2022–2026).

Product Type:
Internal Tool (panel admin & operator) dengan halaman publik untuk transparansi.

Primary Platform:
Web (desktop/laptop untuk admin & operator; layar undian ditayangkan ke proyektor 16:9; halaman publik responsif termasuk ponsel). Layar undian berjalan sebagai PWA yang dapat bekerja tanpa internet.

---

## 2. Problem

What problem are we solving?
Bapenda ingin memberi apresiasi berupa hadiah umroh kepada wajib pajak PBB-P2 yang taat membayar. Saat ini belum ada alat untuk:
- menyaring ±45.000–46.000 NOP dari data ekspor aplikasi PBB menjadi daftar peserta yang memenuhi syarat secara konsisten;
- mengundi secara acak yang bisa dibuktikan adil dan tidak bisa dimanipulasi;
- menayangkan undian secara meriah di acara, walaupun internet di lokasi acara tidak stabil;
- mempublikasikan hasil kepada masyarakat tanpa membuka data pribadi.

Why does this problem matter?
- Undian hadiah bernilai tinggi dari pemerintah rawan dicurigai. Proses yang tidak transparan merusak kepercayaan publik dan tujuan insentif pajak.
- Data berisi NIK dan alamat wajib pajak; kebocoran berdampak hukum (perlindungan data pribadi).
- Pengolahan manual di Excel rawan salah (format tanggal, NIK terpotong, spasi berlebih, NOP ganda).

How are users solving this today?
Pengolahan manual di Excel dan pengundian dengan cara konvensional (kupon fisik atau aplikasi acak umum) tanpa jejak audit, tanpa verifikasi integritas data, dan tanpa kanal publikasi resmi.

---

## 3. Goal

Primary Goal:
Menghasilkan 2 pemenang umroh (1 per wilayah) beserta 2 cadangan per wilayah melalui proses yang adil, dapat diverifikasi, terdokumentasi dalam berita acara, dan dapat ditayangkan langsung di acara.

Secondary Goals:
- Mendorong kepatuhan pembayaran PBB-P2 melalui insentif yang kredibel.
- Memberi masyarakat cara mengecek kepesertaan NOP dan melihat pemenang secara mandiri.
- Melindungi data pribadi (NOP dan NIK selalu disamarkan di tampilan publik dan layar undian).
- Membuat proses berulang untuk periode undian berikutnya (tahun-tahun selanjutnya) tanpa membangun ulang aplikasi.

---

## 4. Target Users

### User Type 1

Name:
Admin Bapenda

Description:
Pegawai Bapenda yang bertanggung jawab atas data PBB dan penyelenggaraan undian. Terbiasa dengan Excel, bukan developer.

Needs:
- Mengimpor file ekspor PBB dan langsung tahu siapa lolos/gugur beserta alasannya.
- Mengatur aturan periode (tanggal batas) dan pemetaan kecamatan ke wilayah.
- Mengunci data sebelum undian dan menyiapkan paket untuk laptop acara.
- Mengatur tampilan dan musik undian tanpa perlu keahlian desain.
- Mengelola pemenang yang gugur, mencetak berita acara, dan mempublikasikan hasil.

Pain Points:
- Format data Excel tidak konsisten (NIK 16 digit rusak jadi notasi ilmiah, tanggal teks, spasi berlebih).
- Takut dituduh curang; butuh bukti tertulis bahwa data dan hasil tidak diubah.

### User Type 2

Name:
Operator Acara

Description:
Petugas (bisa staf Bapenda atau EO) yang menjalankan laptop yang tersambung ke proyektor di lokasi acara.

Needs:
- Layar undian yang siap dipakai tanpa internet.
- Kontrol sederhana: Mulai, Berhenti, Slot berikutnya, dengan pintasan keyboard.
- Ketahanan: jika browser tertutup atau laptop restart, undian lanjut tanpa mengulang atau mengubah hasil.

Pain Points:
- Internet di gedung/lapangan acara tidak stabil.
- Tekanan tampil di depan pejabat dan publik; tidak boleh ada kesalahan teknis.

### User Type 3

Name:
Masyarakat (Wajib Pajak)

Description:
Warga OKU Selatan, umumnya mengakses lewat ponsel.

Needs:
- Mengecek apakah NOP miliknya ikut undian dan, jika tidak, alasannya.
- Melihat daftar pemenang resmi.

Pain Points:
- Tidak percaya pada proses undian jika hasil tidak dipublikasikan secara terbuka.

---

## 5. User Stories

Format: Sebagai <peran>, saya ingin <aksi> agar <hasil>.

Admin Bapenda:
- Sebagai admin, saya ingin mengunggah file CSV/XLSX ekspor PBB agar daftar peserta tersusun otomatis.
- Sebagai admin, saya ingin melihat baris yang gugur beserta alasannya agar bisa menjawab pertanyaan wajib pajak.
- Sebagai admin, saya ingin memetakan setiap kecamatan ke Wilayah 1 atau Wilayah 2 agar peserta otomatis terbagi per wilayah.
- Sebagai admin, saya ingin mengunci daftar peserta dan mendapat sidik digital (hash) agar bisa dibuktikan data tidak berubah sebelum dan sesudah undian.
- Sebagai admin, saya ingin mengunduh paket undian agar laptop acara bisa bekerja tanpa internet.
- Sebagai admin, saya ingin memilih preset animasi dan musik, atau cukup menulis prompt ke asisten AI, agar tampilan undian sesuai suasana acara.
- Sebagai admin, saya ingin menandai pemenang yang gugur beserta alasannya agar hadiah otomatis jatuh ke cadangan berikutnya.
- Sebagai admin, saya ingin mengunduh berita acara PDF agar bisa ditandatangani panitia dan saksi.
- Sebagai admin, saya ingin mempublikasikan pemenang agar masyarakat bisa melihat hasil resmi.
- Sebagai admin, saya ingin membuat dan menonaktifkan akun operator agar akses terkendali.

Operator Acara:
- Sebagai operator, saya ingin memuat paket undian dan melihat status "Siap Offline" agar yakin undian bisa berjalan tanpa internet.
- Sebagai operator, saya ingin menekan Mulai dan Berhenti untuk setiap slot agar tempo acara bisa saya kendalikan.
- Sebagai operator, saya ingin undian melanjutkan dari slot terakhir setelah browser di-refresh agar tidak ada hasil yang berubah.
- Sebagai operator, saya ingin mengunduh dan mengunggah file hasil agar hasil resmi tercatat di server.

Masyarakat:
- Sebagai wajib pajak, saya ingin memasukkan NOP saya agar tahu apakah saya ikut undian.
- Sebagai warga, saya ingin melihat daftar pemenang per wilayah agar yakin undian benar-benar dilaksanakan.

---

## 6. Core Features

### 6.0 Aturan Bisnis Inti (berlaku untuk semua fitur)

**Format data masukan**

| Kolom | Isi | Aturan |
|---|---|---|
| `NOP` | 18 digit tanpa tanda baca, mis. `160903000300300030` | Wajib 18 digit angka setelah trim. Prefiks wajib `1609` (kode OKU Selatan). Format tampilan `PP.DD.KKK.DDD.BBB-NNNN.J` → `16.09.030.003.003-0003.0`. |
| `wp_no_ktp` | NIK 16 digit | Wajib dibaca sebagai **teks**. Jika terbaca dalam notasi ilmiah/kurang dari 16 digit, baris ditandai peringatan "NIK tidak valid" (tidak menggugurkan, karena undian per NOP). |
| `wp_nama` | Nama wajib pajak | Trim. Wajib terisi. |
| `wp_alamat` | Alamat wajib pajak | Trim. Boleh kosong. |
| `OP_ALAMAT` | Alamat objek pajak | Trim. Boleh kosong. |
| `OP_KECAMATAN` | Kecamatan objek pajak | Trim, huruf besar, spasi ganda dirapatkan. Wajib terisi. Menentukan wilayah. |
| `op_kelurahan` | Desa/kelurahan objek pajak | Trim. Boleh kosong. |
| `Tanggal Lunas 2022` … `Tanggal Lunas 2026` | Tanggal lunas per tahun pajak | Format utama `dd/mm/yyyy HH:MM:SS` (mis. `29/06/2022 14:14:36`). Parser juga menerima `dd/mm/yyyy`, `dd-mm-yyyy`, ISO `yyyy-mm-dd`, dan serial tanggal Excel (untuk XLSX). Zona waktu: WIB (Asia/Jakarta). |

- File CSV memakai pemisah `;` dan encoding UTF-8. File XLSX dibaca dari sheet pertama.
- Header wajib persis 12 kolom di atas (tidak peka huruf besar/kecil dan spasi di ujung). Header salah → impor ditolak seluruhnya.

**Syarat kepesertaan (eligibility)** — sebuah NOP **lolos** jika SEMUA terpenuhi:
1. NOP valid (18 digit, prefiks `1609`).
2. Kelima kolom `Tanggal Lunas 2022`–`Tanggal Lunas 2026` terisi dan dapat diparse.
3. Setiap tanggal lunas tahun X **tidak lebih awal dari 1 Januari tahun X** (lihat Asumsi A1).
4. Setiap tanggal lunas **paling lambat tanggal batas periode**. Default: **30 September 2026 pukul 23:59:59 WIB**. Admin dapat mengubah nilai ini selama periode berstatus Draf.
5. NOP tidak ganda di dalam periode yang sama.
6. Kecamatan sudah dipetakan ke salah satu wilayah (syarat ini memblokir penguncian, bukan menggugurkan baris).

**Pembayaran terlambat tetap sah.** Contoh: PBB 2025 yang baru dilunasi pada April 2026 tetap memenuhi syarat selama sebelum tanggal batas. Pada sampel data, 7 dari 14 baris memiliki pola ini dan semuanya lolos.

**Pembayaran kolektif wajar.** Banyak NOP dengan timestamp identik (mis. 4 NOP lunas pada detik yang sama) adalah pembayaran kolektif desa/kolektor dan tidak ditandai sebagai anomali.

**Kode alasan gugur** (dipakai konsisten di seluruh sistem):

| Kode | Pesan untuk pengguna |
|---|---|
| `NOP_INVALID` | NOP tidak valid (harus 18 digit dan diawali 1609). |
| `NOP_DUPLICATE` | NOP muncul lebih dari satu kali dalam file. |
| `NAMA_KOSONG` | Nama wajib pajak kosong. |
| `KECAMATAN_KOSONG` | Kecamatan objek pajak kosong. |
| `FORMAT_BARIS` | Jumlah kolom pada baris tidak sesuai dengan header. |
| `TANGGAL_KOSONG_<TAHUN>` | Tanggal lunas tahun <TAHUN> kosong. |
| `TANGGAL_TIDAK_DIKENALI_<TAHUN>` | Format tanggal lunas tahun <TAHUN> tidak dikenali. |
| `TANGGAL_SEBELUM_TAHUN_PAJAK_<TAHUN>` | Tanggal lunas tahun <TAHUN> lebih awal dari 1 Januari <TAHUN> (data diduga salah). |
| `LEWAT_BATAS_<TAHUN>` | Tanggal lunas tahun <TAHUN> melewati tanggal batas. |

Satu baris dapat memiliki lebih dari satu alasan gugur; semua alasan ditampilkan.

Contoh evaluasi (data dummy, batas 30/09/2026):

| NOP | Lunas 2022 | 2023 | 2024 | 2025 | 2026 | Hasil |
|---|---|---|---|---|---|---|
| `160901000100100010` | 10/06/2022 | 12/07/2023 | 05/08/2024 | 13/04/2026 | 11/08/2026 | Lolos (PBB 2025 terlambat, tetap sah) |
| `160901000100100020` | 10/06/2022 | 12/07/2023 | 05/08/2024 | 20/08/2025 | 15/09/2026 | Lolos |
| `160901000100100030` | 10/06/2022 | 12/07/2023 | *(kosong)* | 20/08/2025 | 11/08/2026 | Gugur: `TANGGAL_KOSONG_2024` |
| `160901000100100040` | 10/06/2022 | 12/07/2023 | 05/08/2024 | 20/08/2025 | 02/10/2026 | Gugur: `LEWAT_BATAS_2026` |
| `160901000100100050` | 15/12/2021 | 12/07/2023 | 05/08/2024 | 20/08/2025 | 11/08/2026 | Gugur: `TANGGAL_SEBELUM_TAHUN_PAJAK_2022` |

**Kupon:** satu NOP lolos = satu kupon. Pemilik banyak NOP memiliki peluang sebanding jumlah NOP-nya.

**Wilayah dan slot undian:**
- Terdapat tepat 2 wilayah: Wilayah 1 dan Wilayah 2. Nama tampilan wilayah dapat diatur admin.
- Setiap kecamatan dipetakan ke tepat satu wilayah.
- Urutan 6 slot undian (tetap, tidak dapat diubah):

| Urutan | Kode slot | Keterangan |
|---|---|---|
| 1 | `W1-UTAMA` | Pemenang utama Wilayah 1 |
| 2 | `W1-C1` | Cadangan 1 Wilayah 1 |
| 3 | `W1-C2` | Cadangan 2 Wilayah 1 |
| 4 | `W2-UTAMA` | Pemenang utama Wilayah 2 |
| 5 | `W2-C1` | Cadangan 1 Wilayah 2 |
| 6 | `W2-C2` | Cadangan 2 Wilayah 2 |

- Peserta suatu slot hanya berasal dari wilayah slot tersebut. Peserta yang sudah keluar tidak bisa keluar lagi.
- Pengacakan memakai generator acak kriptografis (`crypto.getRandomValues`) dengan rejection sampling (tanpa bias modulo).

**Penyamaran data:**
- NOP: `16.09.030.xxx.xxx-0003.0` (segmen ke-4 dan ke-5 disamarkan).
- NIK: `1609xxxxxxxx0012` (4 digit awal dan 4 digit akhir tampil).
- Field lain (nama, alamat WP, alamat OP, kecamatan, kelurahan, kelima tanggal lunas) ditampilkan lengkap di layar undian dan halaman publik.
- NIK utuh tidak pernah dikirim ke klien publik maupun dimasukkan ke paket undian.

---

### Feature 1 — Impor Data & Laporan Validasi

Purpose:
Mengubah file ekspor PBB menjadi daftar peserta tervalidasi untuk satu periode.

User Flow:
Admin membuka periode berstatus Draf → unggah file CSV/XLSX → sistem memvalidasi header → memproses setiap baris dengan aturan 6.0 → menampilkan laporan ringkasan dan tabel detail.

Inputs:
- File `.csv` (pemisah `;`, UTF-8) atau `.xlsx`, maksimum 20 MB.
- Periode tujuan.

Outputs:
- Ringkasan: total baris, jumlah lolos per wilayah, jumlah gugur per kode alasan, jumlah NOP ganda, daftar kecamatan belum terpetakan, jumlah peringatan NIK.
- Tabel peserta dengan filter (status, wilayah, kecamatan, alasan) dan pencarian (NOP, nama).
- Ekspor daftar gugur ke Excel.

Acceptance Criteria:
- File ±46.000 baris selesai diproses dalam ≤ 60 detik di server produksi.
- Header tidak sesuai → impor ditolak dengan pesan yang menyebut kolom yang hilang/salah; tidak ada data tersimpan.
- Nilai di-trim; kecamatan dinormalisasi (huruf besar, spasi ganda dirapatkan) sebelum pemetaan.
- NOP dan NIK dibaca sebagai teks; NIK 16 digit tidak berubah.
- Impor ulang selama periode Draf mengganti seluruh data peserta periode itu (bukan menambah) dan tercatat di log audit.
- Impor ditolak jika periode tidak berstatus Draf.
- NIK di tabel admin ditampilkan tersamar.

Edge Cases:
- File kosong atau hanya header → ditolak.
- Baris dengan jumlah kolom kurang/lebih → baris gugur dengan alasan format, baris lain tetap diproses.
- Kecamatan dengan variasi penulisan (`MUARA DUA KISAM` vs `MUARADUA KISAM`) tercatat sebagai kecamatan berbeda; admin memetakan keduanya ke wilayah yang sama.
- Encoding non-UTF-8 → sistem mencoba Windows-1252; jika gagal, impor ditolak dengan pesan jelas.

---

### Feature 2 — Pengaturan Periode & Pemetaan Wilayah

Purpose:
Menyiapkan aturan satu periode undian.

User Flow:
Admin membuat periode (judul, tahun pajak 2022–2026, tanggal batas) → mengatur nama tampilan Wilayah 1 & 2 → memetakan setiap kecamatan dari data impor ke wilayah.

Inputs:
Judul acara, tanggal batas (default 30/09/2026 23:59:59 WIB), tanggal & lokasi acara (opsional), nama wilayah, pemetaan kecamatan.

Outputs:
Periode berstatus Draf dengan pemetaan lengkap; evaluasi syarat diperbarui otomatis saat tanggal batas berubah.

Acceptance Criteria:
- Satu kecamatan hanya dapat dipetakan ke satu wilayah.
- Mengubah tanggal batas memicu evaluasi ulang seluruh peserta periode.
- Hanya dapat diubah saat periode Draf.
- Setiap perubahan tercatat di log audit.

Edge Cases:
- Kecamatan baru muncul setelah impor ulang → ditandai "belum terpetakan".
- Wilayah tanpa peserta lolos → penguncian diblokir.

---

### Feature 3 — Kunci Snapshot

Purpose:
Membekukan daftar peserta lolos sebelum undian dan menghasilkan sidik digital.

User Flow:
Admin menekan "Kunci Data" → sistem memeriksa prasyarat → membuat snapshot kanonik → menghitung SHA-256 → menampilkan hash dan jumlah peserta per wilayah.

Inputs:
Konfirmasi admin (ketik ulang judul periode).

Outputs:
`snapshotHash`, jumlah peserta per wilayah, waktu kunci. Status periode → Terkunci.

Acceptance Criteria:
- Tombol aktif hanya jika: semua kecamatan terpetakan, tidak ada NOP ganda, setiap wilayah punya ≥ 3 peserta lolos (cukup untuk 3 slot).
- Hash deterministik: data identik menghasilkan hash identik.
- Setelah terkunci: impor, ubah tanggal batas, dan ubah pemetaan ditolak.
- Penguncian tidak dapat dibuka kembali. Jika data terkunci ternyata salah (dan hasil belum diunggah), admin membatalkan periode (status Dibatalkan, alasan wajib, tercatat) lalu membuat periode baru.

Edge Cases:
- Dua admin menekan Kunci bersamaan → hanya satu yang berhasil; yang lain mendapat pesan status sudah berubah.

---

### Feature 4 — Paket Undian Offline

Purpose:
Memindahkan data undian ke laptop acara agar undian berjalan tanpa internet.

User Flow:
Admin mengunduh paket `.zip` dari periode Terkunci → paket disalin ke laptop acara → operator membuka aplikasi (PWA) dan memilih file paket → browser memverifikasi hash → data disimpan di IndexedDB → status "Siap Offline".

Inputs:
Periode Terkunci, tema aktif.

Outputs:
Paket berisi `meta.json` (periode, judul, wilayah, slot, `snapshotHash`), `snapshot.json` (peserta lolos dengan field tersamar dan ID), serta aset tema (konfigurasi, audio, gambar). Spesifikasi lengkap di `API.md`.

Acceptance Criteria:
- Paket tidak memuat NIK utuh maupun NOP utuh (hanya bentuk tersamar dan ID internal).
- Browser menghitung ulang hash snapshot; jika tidak cocok, paket ditolak dengan pesan "Paket rusak atau telah diubah".
- Setelah paket dimuat, layar undian dapat dibuka dan dijalankan dengan jaringan dimatikan.
- Ukuran paket untuk ±46.000 peserta ≤ 25 MB termasuk aset tema bawaan.

Edge Cases:
- Paket dari periode lain sudah ada di laptop → operator diminta konfirmasi untuk mengganti; hasil undian yang belum diunggah dari periode lama harus diunduh dulu.
- Penyimpanan browser penuh → pesan jelas dan undian tidak dimulai.

---

### Feature 5 — Layar Undian

Purpose:
Menjalankan dan menayangkan undian 6 slot di proyektor.

User Flow:
Operator membuka layar undian fullscreen → memilih Mulai untuk slot aktif → animasi dan musik fase "mengacak" berjalan → operator menekan Berhenti (atau durasi otomatis habis) → pemenang slot ditentukan dan disimpan → kartu pemenang tampil dengan musik fase "pemenang" → operator lanjut ke slot berikutnya → setelah 6 slot, ringkasan dan tombol unduh file hasil.

Inputs:
Paket yang sudah dimuat, kontrol operator (tombol dan pintasan keyboard: `Spasi` = Mulai/Berhenti, `→` = slot berikutnya, `F` = fullscreen, `M` = bisukan).

Outputs:
Pemenang per slot, file hasil `.json` beserta hash hasil.

Acceptance Criteria:
- Pemenang ditentukan dengan RNG kriptografis **pada saat Berhenti**, bukan dari posisi animasi; animasi hanya visual dan berakhir pada pemenang yang sudah ditentukan.
- Setiap hasil slot disimpan ke IndexedDB sebelum kartu pemenang ditampilkan.
- Refresh/crash browser: layar dibuka kembali pada slot berikutnya; pemenang yang sudah keluar tidak berubah.
- Slot yang sudah diundi tidak dapat diundi ulang dari layar undian.
- Kartu pemenang menampilkan: kode & nama slot, NOP tersamar, NIK tersamar, nama, alamat WP, alamat OP, kecamatan, kelurahan, kelima tanggal lunas.
- Ringkasan akhir menampilkan 6 pemenang, `snapshotHash`, dan hash hasil.
- Berjalan penuh tanpa internet.

Edge Cases:
- Operator menekan Mulai berkali-kali cepat → diabaikan selama animasi berjalan.
- Audio diblokir kebijakan autoplay browser → layar meminta satu klik "Aktifkan suara" sebelum mulai.
- Laptop kehabisan baterai di tengah acara → setelah menyala, lanjut dari slot terakhir.

---

### Feature 6 — Tema, Pustaka Aset & Asisten AI

Purpose:
Memungkinkan admin mengatur tampilan dan suara undian tanpa keahlian teknis.

User Flow:
Admin membuka halaman Tema → memilih preset animasi dan audio per fase → mengatur durasi, kecepatan, volume, latar, efek → pratinjau langsung → simpan. Alternatif: menulis prompt ke asisten AI → AI menghasilkan konfigurasi → pratinjau dan perbandingan dengan tema saat ini → simpan atau buang.

Inputs:
- Preset animasi (minimal 4): `slot-mesin`, `roda-nama`, `kartu-berputar`, `ticker-nop`.
- Pustaka audio bawaan bebas royalti per fase: `menunggu`, `mengacak` (termasuk drumroll), `pemenang`.
- Unggahan audio (`.mp3`, `.ogg`, maks. 10 MB per file) dan gambar latar (`.png`, `.jpg`, `.webp`, maks. 5 MB).
- Prompt AI (teks bebas, maks. 1.000 karakter).

Outputs:
`ThemeConfig` tervalidasi (skema di `API.md`) yang ikut ke paket undian.

Acceptance Criteria:
- Setiap aset dapat dipratinjau (audio diputar, animasi dijalankan dengan data dummy).
- Output AI divalidasi skema; output tidak valid ditolak dengan pesan dan tidak mengubah tema.
- AI hanya dapat memilih aset yang ada di pustaka; tidak membuat kode atau aset baru.
- Fitur AI tampil nonaktif dengan keterangan jika API key tidak dikonfigurasi atau server offline.
- Prompt dan hasil AI tercatat di log audit.
- Tema hanya dapat diubah sebelum paket diunduh; mengubah tema setelahnya membutuhkan unduh paket ulang (snapshot tidak berubah).

Edge Cases:
- Prompt meminta hal di luar kemampuan (mis. "buat lagu baru") → AI menjelaskan keterbatasan dan memilih aset terdekat.
- Admin menghapus aset yang dipakai tema → ditolak.

---

### Feature 7 — Unggah & Verifikasi Hasil

Purpose:
Memasukkan hasil undian offline ke server secara aman.

User Flow:
Operator/admin membuka halaman Unggah Hasil → memilih file hasil → server memverifikasi → jika lolos, periode menjadi Diundi dan pemenang tercatat.

Inputs:
File hasil `.json` dari layar undian.

Outputs:
Daftar 6 slot pemenang tersimpan, status periode Diundi.

Acceptance Criteria:
Server menolak file jika salah satu gagal:
- `snapshotHash` tidak sama dengan hash periode;
- ID peserta tidak ada di snapshot;
- peserta tidak berasal dari wilayah slotnya;
- ada peserta ganda;
- urutan/kode slot tidak sesuai 6 slot baku atau ada slot hilang;
- hash hasil tidak cocok dengan isi file.

Tambahan:
- Hasil hanya dapat diunggah **sekali** per periode. Unggahan kedua ditolak dan tercatat di log audit.
- Hash hasil ditampilkan setelah verifikasi agar bisa dicocokkan dengan layar acara oleh saksi.

Edge Cases:
- File hasil dari periode lain → ditolak (`snapshotHash` beda).
- Undian di layar belum selesai 6 slot → file tidak dapat diunduh dari layar undian.

---

### Feature 8 — Status Pemenang & Cadangan

Purpose:
Mengelola pemenang yang gugur dan perpindahan hadiah ke cadangan.

User Flow:
Admin melihat pemenang per wilayah → memverifikasi pemenang (status Terverifikasi) atau menandai Gugur dengan alasan → sistem otomatis menaikkan cadangan berikutnya menjadi penerima hadiah.

Inputs:
Aksi admin: Verifikasi / Gugur (alasan wajib, mis. tidak dapat dihubungi, mengundurkan diri, data tidak valid).

Outputs:
Penerima hadiah aktif per wilayah dan riwayat perubahan.

Acceptance Criteria:
- Status pemenang: `Menang` (awal untuk utama), `Cadangan` (awal untuk C1/C2), `Terverifikasi`, `Gugur`, `PerluKeputusan`.
- Jika penerima aktif Gugur → cadangan berikutnya yang belum gugur menjadi penerima aktif (status `Menang`).
- Jika utama dan kedua cadangan suatu wilayah gugur → wilayah ditandai `PerluKeputusan`. **Tidak ada undi ulang otomatis.** Keputusan lanjutan dilakukan di luar sistem dan dicatat manual.
- Status Gugur tidak dapat dibatalkan dari UI.
- Periode menjadi Final saat kedua wilayah memiliki penerima Terverifikasi.
- Semua perubahan tercatat di log audit.

Edge Cases:
- Admin menandai cadangan gugur sebelum utama diputuskan → diperbolehkan; urutan naik melewati cadangan yang gugur.

---

### Feature 9 — Berita Acara & Ekspor

Purpose:
Menyediakan dokumen resmi hasil undian.

User Flow:
Admin membuka Berita Acara → mengisi/mengedit field teks (tempat, dasar kegiatan, nama panitia & saksi) → pratinjau → unduh PDF. Ekspor Excel tersedia untuk pemenang dan log audit.

Inputs:
Data periode, hasil undian, field teks yang dapat diedit.

Outputs:
- PDF A4 berisi: kop dengan logo Pemkab OKU Selatan dan Bapenda; judul; hari, tanggal, tempat; dasar kegiatan; jumlah peserta lolos per wilayah; `snapshotHash`; hash hasil; tabel pemenang & cadangan per wilayah (data tersamar); kolom tanda tangan panitia dan saksi.
- Excel daftar pemenang (data tersamar) dan Excel log audit.

Acceptance Criteria:
- PDF dapat diunduh sejak periode Diundi.
- PDF menampilkan status terkini (termasuk pemenang yang gugur dan penggantinya) beserta tanggal cetak.
- Data di PDF tidak memuat NIK utuh.

Edge Cases:
- Nama/alamat sangat panjang → teks dibungkus, tidak terpotong.

---

### Feature 10 — Halaman Publik

Purpose:
Transparansi hasil kepada masyarakat.

User Flow:
- `/pemenang`: tampil setelah admin menekan Publikasikan.
- `/cek`: masyarakat memasukkan NOP lengkap 18 digit (dengan/tanpa titik) → melihat status.

Inputs:
NOP.

Outputs:
- `/pemenang`: judul acara, tanggal undian, pemenang & cadangan per wilayah beserta status terkini (data tersamar sesuai aturan 6.0), `snapshotHash`, hash hasil.
- `/cek`: salah satu dari "Ikut undian — Wilayah X", "Tidak ikut — <pesan alasan>", atau "NOP tidak ditemukan di data periode ini". Tidak menampilkan NIK.

Acceptance Criteria:
- Sebelum dipublikasikan, `/pemenang` menampilkan "Hasil belum diumumkan".
- `/cek` aktif sejak data diimpor. Selama periode belum Terkunci, hasil diberi label "Hasil sementara. Daftar peserta final ditetapkan saat data dikunci." Label hilang setelah data Terkunci.
- `/cek` dibatasi laju (rate limit) per IP dan dilengkapi captcha ringan setelah beberapa percobaan.
- Responsif di ponsel.

Edge Cases:
- NOP dengan format bertitik → dinormalisasi sebelum dicari.
- Belum ada periode aktif → pesan "Belum ada undian yang berjalan".

---

### Feature 11 — Manajemen Akun & Log Audit

Purpose:
Mengendalikan akses dan menyimpan jejak semua aksi penting.

User Flow:
Admin membuat akun (nama, username, peran Admin/Operator, kata sandi awal) → pengguna login → admin dapat menonaktifkan akun. Admin melihat log audit dengan filter.

Acceptance Criteria:
- Dua peran: Admin (akses penuh) dan Operator (layar undian dan unggah hasil saja).
- Akun admin pertama dibuat dari variabel lingkungan saat seed.
- Admin tidak dapat menonaktifkan akunnya sendiri.
- Log audit mencatat: aktor, aksi, target, payload ringkas, waktu, IP. Log audit tidak dapat diedit atau dihapus dari UI.
- Aksi yang dicatat minimal: login (berhasil/gagal), kelola akun, buat/ubah periode, impor, ubah pemetaan, kunci, unduh paket, ubah tema, prompt AI, unggah hasil (berhasil/ditolak), ubah status pemenang, unduh berita acara, publikasi.

---

## 7. Non-Goals

The following are intentionally NOT part of this version:
- Undian per orang/NIK (satu orang satu kesempatan) — undian per NOP.
- Kupon berbobot berdasarkan nominal PBB atau jumlah tahun.
- Integrasi langsung ke database SISMIOP/API aplikasi PBB — data masuk lewat unggah file.
- Generate musik atau audio baru dengan AI (dijadwalkan LATER di ROADMAP).
- Undi ulang otomatis ketika semua cadangan gugur.
- Aplikasi mobile native (Android/iOS).
- Pendaftaran mandiri oleh masyarakat atau login untuk publik.
- Notifikasi otomatis (SMS/WhatsApp/email) ke pemenang.
- Multi-kabupaten / multi-tenant.

---

## 8. MVP Scope

Must Have:
- Impor CSV/XLSX + laporan validasi (Feature 1)
- Periode, tanggal batas, pemetaan wilayah (Feature 2)
- Kunci snapshot dengan SHA-256 (Feature 3)
- Paket undian offline + PWA (Feature 4)
- Layar undian dengan minimal 1 preset animasi dan audio per fase (Feature 5)
- Unggah & verifikasi hasil (Feature 7)
- Status pemenang & cadangan (Feature 8)
- Berita acara PDF (Feature 9)
- Halaman publik pemenang & cek NOP (Feature 10)
- Login, peran Admin/Operator, log audit (Feature 11)

Nice to Have:
- Empat preset animasi lengkap dan unggah aset kustom (Feature 6)
- Asisten AI tema (Feature 6)
- Ekspor Excel pemenang & log audit
- Editor teks berita acara di aplikasi

Future:
- Generate musik dengan AI
- Riwayat banyak periode dengan perbandingan statistik kepatuhan
- Template berita acara resmi yang dapat diunggah

---

## 9. Success Metrics

Primary Metrics:
- Undian hari-H selesai 6 slot tanpa gangguan teknis dan tanpa internet.
- 0 temuan ketidaksesuaian saat saksi mencocokkan `snapshotHash` dan hash hasil di layar dengan berita acara.
- 0 insiden kebocoran NIK/NOP utuh di halaman publik dan paket undian.

Secondary Metrics:
- Impor ±46.000 baris ≤ 60 detik; laporan validasi dapat dijelaskan admin tanpa bantuan developer.
- Waktu dari unggah hasil sampai publikasi ≤ 1 hari kerja.
- Jumlah pengecekan NOP di halaman publik selama 30 hari setelah acara (indikator keterlibatan masyarakat).

---

## 10. Constraints

Technical:
- Stack: Next.js (App Router) + TypeScript, PostgreSQL + Prisma, Auth.js, Tailwind, zod, exceljs, Vitest, Playwright, @react-pdf/renderer, pino.
- Hosting di VPS Pemkab dengan Docker Compose; HTTPS melalui reverse proxy.
- Layar undian wajib berfungsi penuh tanpa internet setelah paket dimuat.
- Browser target: Chrome/Edge versi terbaru di laptop acara (Windows). Halaman publik: browser ponsel modern.
- Asisten AI hanya tersedia saat online dan butuh API key berbayar.

Business:
- Hadiah: 2 paket umroh (1 per wilayah); per wilayah 1 utama + 2 cadangan.
- Syarat lunas 2022–2026 dengan batas default 30 September 2026.
- Data pribadi wajib dilindungi sesuai UU Pelindungan Data Pribadi.

Design:
- Identitas Pemkab OKU Selatan dan Bapenda; warna dominan biru, hijau, putih; kuning hanya aksen.
- Bahasa antarmuka: Bahasa Indonesia.

Timeline:
- Aplikasi siap dipakai (termasuk gladi bersih) sebelum tanggal acara. Tanggal acara masih open question; batas pelunasan 30 September 2026 sehingga acara diasumsikan setelah tanggal tersebut.

---

## 11. Assumptions

- A1: Tanggal lunas tahun X yang lebih awal dari 1 Januari tahun X dianggap data salah; baris gugur dengan alasan `TANGGAL_SEBELUM_TAHUN_PAJAK_<X>`.
- A2: File ekspor dari aplikasi PBB memakai header 12 kolom persis seperti sampel `docs/contoh data.csv`.
- A3: Semua waktu pada data dalam WIB (Asia/Jakarta).
- A4: Satu periode undian aktif pada satu waktu.
- A5: Laptop acara memakai Chrome/Edge terbaru dengan ruang penyimpanan kosong ≥ 1 GB.
- A6: Saksi undian cukup mencocokkan hash secara visual (beberapa karakter awal dan akhir) antara layar, berita acara, dan halaman publik.
- A7: Aset audio bawaan berlisensi bebas royalti untuk penggunaan publik.

---

## 12. Open Questions

- Judul acara final (sementara: "Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026").
- Template berita acara resmi dari Bapenda (sementara memakai draf buatan tim).
- Penyedia AI untuk asisten tema (OpenAI / Anthropic / Gemini / lainnya) dan anggaran pemakaian.
- Tanggal dan lokasi acara undian.
- Apakah tanggal batas 30 September 2026 mungkin berubah (sistem sudah mendukung perubahan selama periode Draf).
- Pembagian kecamatan ke Wilayah 1 dan Wilayah 2 serta nama tampilan wilayah.
- Siapa saksi resmi (notaris, kepolisian, perwakilan masyarakat) untuk kolom tanda tangan berita acara.

---

## 13. Definition of Done

The feature/product is considered complete when:
- [ ] Requirements are implemented
- [ ] Critical user flows work (impor → kunci → paket → undian offline → unggah → berita acara → publikasi)
- [ ] Tests pass (unit, integrasi, E2E termasuk undian dalam mode offline)
- [ ] Build succeeds
- [ ] Security requirements are satisfied (RBAC, penyamaran, hash, rate limit)
- [ ] Documentation is updated
- [ ] Gladi bersih penuh di laptop acara tanpa internet berhasil
