# Design System

> Status: Draf v0.1. Berlaku untuk tiga permukaan: **Panel** (admin & operator), **Layar Undian** (proyektor), **Publik** (`/pemenang`, `/cek`).
> Implementasi: token sebagai variabel CSS di blok `@theme` pada `src/app/globals.css` (Tailwind v4, lihat Decision 022). Komponen UI wajib memakai token, bukan nilai hex langsung.

## 1. Design Direction

Style:
Resmi pemerintahan yang modern dan bersih (Panel & Publik); megah dan meriah dengan sentuhan Islami yang sopan (Layar Undian).

Mood:
Terpercaya, transparan, tenang di panel kerja; khidmat lalu bersemangat di layar undian — seperti acara resmi yang ditutup dengan perayaan.

Design Principles:
- **Kejelasan di atas dekorasi.** Data (jumlah peserta, status, hash) selalu lebih menonjol dari ornamen.
- **Transparansi terlihat.** Hash, status kunci, dan alasan gugur selalu ditampilkan, bukan disembunyikan di menu.
- **Terbaca dari jauh.** Semua teks layar undian terbaca dari baris belakang ruangan (aturan §16).
- **Aman secara default.** Data pribadi selalu tampil tersamar; tidak ada komponen yang menampilkan NIK utuh.
- **Konsisten.** Gunakan kembali komponen yang ada. Buat komponen baru hanya jika komponen yang ada tidak dapat mendukung kebutuhan tersebut.

---

## 2. Brand

Brand Name:
Undian Umroh PBB OKU Selatan — diselenggarakan oleh Bapenda Kabupaten Ogan Komering Ulu Selatan.

Logo:
- Berkas: `docs/logo okus.png` (lambang Pemkab OKU Selatan) dan `docs/logo bapenda.png` (logo Bapenda). Di aplikasi disalin ke `public/brand/logo-okus.png` dan `public/brand/logo-bapenda.png`.
- Urutan selalu: **Pemkab di kiri, Bapenda di kanan**. Jarak antar logo = 1× tinggi huruf "b" pada logo Bapenda (minimal 16px).
- Tinggi minimum: lambang Pemkab 32px (Panel), 48px (Publik), 96px (Layar Undian). Logo Bapenda diselaraskan tingginya dengan lambang Pemkab ×0,6 (logo Bapenda berbentuk melebar).
- Area bebas di sekitar logo minimal 0,25× tinggi lambang Pemkab.
- Latar yang diizinkan: putih `#FFFFFF`, `surface` `#F5F8FC`, atau panel putih di atas latar gelap layar undian. Logo Bapenda **tidak** diletakkan langsung di atas latar biru tua (biru logo tenggelam) — gunakan pelat putih ber-radius `md`.
- Dilarang: mengubah warna, memutar, meregangkan, memberi bayangan, atau memotong logo.

Brand Voice:
Bahasa Indonesia baku yang ramah dan lugas. Kalimat pendek. Sapaan "Anda". Tidak memakai singkatan tidak baku. Pesan error menjelaskan apa yang terjadi dan apa yang harus dilakukan, mis. "File harus .csv atau .xlsx, maksimal 20 MB." Di layar undian: khidmat dan apresiatif, mis. "Selamat kepada Pemenang Utama Wilayah 1".

---

## 3. Color Palette

Diturunkan dari logo: biru Bapenda, hijau gunung lambang Pemkab, kuning lambang Pemkab (aksen saja).

Primary:
#0B4F9C (biru Bapenda) — tombol utama, tautan, header aktif.

Secondary:
#1E8F3A (hijau Pemkab) — elemen dekoratif, ikon status sukses besar, aksen layar undian. Untuk teks hijau gunakan `success` #17712E.

Background:
#FFFFFF

Surface:
#F5F8FC (kartu/area sekunder Panel & Publik)

Text:
#0F172A

Muted Text:
#475569

Border:
#CBD5E1

Success:
#17712E

Warning:
#B45309

Error:
#B91C1C

### Token Lengkap

| Token | Hex | Pemakaian |
|---|---|---|
| `primary-900` | #062A55 | Latar Layar Undian, header gelap |
| `primary-700` | #0B4F9C | Primary (tombol, tautan) |
| `primary-500` | #3A86C8 | Garis aksen, ikon, ilustrasi, fokus ring. **Bukan untuk teks kecil di atas putih.** |
| `primary-100` | #EAF2FB | Latar badge info, baris tabel terpilih |
| `secondary-600` | #1E8F3A | Hijau dekoratif, isian progress, ornamen |
| `secondary-100` | #E8F5EC | Latar badge sukses |
| `accent-400` | #F5C518 | Kuning sorotan pemenang (Layar Undian), bintang/confetti. **Hanya aksen.** |
| `neutral-0` | #FFFFFF | Background |
| `neutral-50` | #F5F8FC | Surface |
| `neutral-300` | #CBD5E1 | Border |
| `neutral-600` | #475569 | Muted text |
| `neutral-900` | #0F172A | Text |
| `success-700` | #17712E | Teks/ikon sukses |
| `warning-700` | #B45309 | Teks/ikon peringatan |
| `warning-100` | #FEF3C7 | Latar banner peringatan |
| `danger-700` | #B91C1C | Teks/ikon/tombol bahaya |
| `danger-100` | #FEE2E2 | Latar banner error |
| `info-700` | #0B4F9C | Teks info (= primary-700) |

### Rasio Kontras (WCAG 2.1)

Dihitung dari luminans relatif; dibulatkan. AA: teks normal ≥ 4,5:1, teks besar (≥ 24px, atau ≥ 18,66px tebal) & komponen UI ≥ 3:1.

| Teks / Latar | Rasio | Status |
|---|---|---|
| `neutral-900` #0F172A / #FFFFFF | ≈ 17,9:1 | AAA |
| `neutral-600` #475569 / #FFFFFF | ≈ 7,6:1 | AAA |
| `primary-700` #0B4F9C / #FFFFFF | ≈ 8,0:1 | AAA |
| #FFFFFF / `primary-700` #0B4F9C (tombol) | ≈ 8,0:1 | AAA |
| `success-700` #17712E / #FFFFFF | ≈ 6,1:1 | AA |
| `warning-700` #B45309 / #FFFFFF | ≈ 5,0:1 | AA |
| `danger-700` #B91C1C / #FFFFFF | ≈ 6,5:1 | AA |
| `neutral-900` #0F172A / `neutral-50` #F5F8FC | ≈ 16,8:1 | AAA |
| `neutral-900` #0F172A / `primary-100` #EAF2FB | ≈ 15,8:1 | AAA |
| #FFFFFF / `primary-900` #062A55 (Layar Undian) | ≈ 14,3:1 | AAA |
| `accent-400` #F5C518 / `primary-900` #062A55 | ≈ 8,8:1 | AAA |
| `neutral-900` #0F172A / `accent-400` #F5C518 | ≈ 11,0:1 | AAA |
| `primary-500` #3A86C8 / #FFFFFF | ≈ 3,9:1 | **Hanya teks besar & komponen UI** |
| `secondary-600` #1E8F3A / #FFFFFF | ≈ 4,2:1 | **Hanya teks besar & komponen UI** |
| `primary-500` #3A86C8 / `primary-900` #062A55 | ≈ 3,7:1 | **Hanya teks besar & dekorasi** |

Aturan:
- Teks < 24px wajib memakai pasangan berstatus AA/AAA di atas.
- Status tidak boleh dibedakan hanya dengan warna — selalu sertakan ikon dan label teks.
- Validasi WCAG penuh tetap membutuhkan uji manual dengan teknologi bantu dan review aksesibilitas ahli; tabel ini hanya pemeriksaan kontras warna.

---

## 4. Typography

Font Family:
Font di-host sendiri (`next/font/local` atau `next/font/google` yang di-bundle saat build) agar tetap tersedia saat offline. Tidak boleh memuat font dari CDN saat runtime.

Heading Font:
Plus Jakarta Sans (600, 700, 800) — juga dipakai untuk display Layar Undian.

Body Font:
Inter (400, 500, 600). Angka NOP, NIK, hash, dan tanggal memakai `font-variant-numeric: tabular-nums`. Hash memakai JetBrains Mono (500).

H1:
32px / 700 / 40px (Panel & Publik). Mobile: 28px / 700 / 36px.

H2:
24px / 700 / 32px

H3:
20px / 600 / 28px

Body:
16px / 400 / 24px

Small:
14px / 400 / 20px (minimum di Panel). Teks 12px hanya untuk label tabel sekunder dan footer.

Layar Undian (1920×1080 sebagai acuan; skala dengan `clamp()` terhadap tinggi layar):

| Peran | Ukuran @1080p | Weight | Line height |
|---|---|---|---|
| Judul acara | 56px | 800 | 1.1 |
| Label slot ("Wilayah 1 — Pemenang Utama") | 48px | 700 | 1.15 |
| Nama pemenang | 96px | 800 | 1.05 |
| NOP tersamar (animasi & kartu) | 64px | 700 mono-tabular | 1.1 |
| Detail kartu (alamat, kecamatan, tanggal) | 32px | 500 | 1.3 |
| Hash di ringkasan | 40px | 500 JetBrains Mono | 1.2 |
| Minimum absolut | 28px | — | — |

---

## 5. Spacing

Base Unit:
4px

Spacing Scale:
4px
8px
12px
16px
24px
32px
48px
64px
96px

Aturan:
- Padding kartu Panel: 24px; Publik mobile: 16px.
- Jarak antar field formulir: 16px; antar section: 32px.
- Layar Undian memakai kelipatan 16px (32, 48, 64, 96).

---

## 6. Border Radius

Small:
6px (input, badge, tombol kecil)

Medium:
10px (tombol, kartu Panel, pelat logo)

Large:
16px (dialog, kartu pemenang Layar Undian, kartu Publik)

Pill:
9999px (chip status, toggle)

---

## 7. Shadows

Small:
`0 1px 2px rgba(15, 23, 42, 0.06)` — input, kartu statis.

Medium:
`0 4px 12px rgba(15, 23, 42, 0.08)` — dropdown, kartu hover, toast.

Large:
`0 16px 40px rgba(6, 42, 85, 0.35)` — dialog, kartu pemenang di Layar Undian. Kartu pemenang ditambah glow `0 0 0 4px #F5C518` saat muncul.

---

## 8. Buttons

Primary Button:
Latar `primary-700`, teks putih 16px/600, tinggi 44px, padding horizontal 20px, radius `md`. Hover: `#093F7D`. Active: `primary-900`. Satu tombol Primary per area tindakan.

Secondary Button:
Latar putih, border 1px `neutral-300`, teks `primary-700`. Hover: latar `primary-100`.

Danger Button:
Latar `danger-700`, teks putih. Dipakai untuk aksi permanen: Kunci Data, Tandai Gugur, Nonaktifkan Akun, Publikasikan. Selalu didahului dialog konfirmasi.

Disabled:
Latar `neutral-50`, teks `neutral-600`, border `neutral-300`, `cursor: not-allowed`, atribut `disabled`. Jika alasan nonaktif tidak jelas, tampilkan teks keterangan di dekatnya (mis. "Selesaikan pemetaan kecamatan dulu").

Loading:
Spinner 16px di kiri label, label berubah (mis. "Menyimpan…"), tombol nonaktif, lebar tidak berubah. `aria-busy="true"`.

Layar Undian:
Bilah kontrol operator memakai tombol 56px tinggi, latar putih 90% opasitas, teks `primary-900`, dapat disembunyikan (`H`).

---

## 9. Inputs

Default:
Tinggi 44px, border 1px `neutral-300`, radius `sm`, latar putih, teks 16px `neutral-900`. Label di atas field (14px/500), wajib ada — tidak memakai placeholder sebagai label.

Focus:
Border `primary-700` + ring 3px `primary-500` 40% opasitas.

Error:
Border `danger-700`, ikon `AlertCircle` + pesan 14px `danger-700` di bawah field, `aria-invalid="true"` dan `aria-describedby` ke pesan.

Disabled:
Latar `neutral-50`, teks `neutral-600`.

Placeholder:
`neutral-600`, hanya contoh format (mis. "160903000300300030"), bukan instruksi.

Input khusus:
- NOP: `inputmode="numeric"`, menerima titik/strip, menampilkan pratinjau format bertitik di bawah field.
- Unggah file: area drag-and-drop 160px tinggi, border putus-putus `neutral-300`, menyebut format & ukuran maksimum.

---

## 10. Cards

- Panel: latar putih, border 1px `neutral-300`, radius `md`, padding 24px, shadow `sm`.
- Kartu ringkasan angka: angka 32px/700 `neutral-900`, label 14px `neutral-600`, ikon 24px di kiri atas.
- Kartu hash: latar `neutral-50`, hash JetBrains Mono, tombol "Salin", tampilan ringkas 8 karakter awal + "…" + 8 karakter akhir.
- Kartu Publik: latar putih, radius `lg`, padding 16px (mobile) / 24px (desktop).
- Kartu pemenang Layar Undian: lihat §16.

---

## 11. Navigation

Header:
Tinggi 64px, latar putih, border bawah `neutral-300`. Kiri: logo Pemkab + Bapenda (32px) dan nama aplikasi. Kanan: nama pengguna, peran (chip), tombol Keluar. Publik: header sama tanpa menu pengguna, tinggi 72px.

Sidebar:
Panel Admin: lebar 256px, latar `neutral-50`. Menu: Dasbor, Periode (Data Peserta, Wilayah, Kunci Data, Paket Undian, Unggah Hasil, Pemenang, Berita Acara), Tema Undian, Pengguna, Log Audit. Item aktif: latar `primary-100`, teks `primary-700`, garis kiri 3px `primary-700`. Panel Operator: tanpa sidebar — dua kartu besar "Layar Undian" dan "Unggah Hasil".

Mobile Navigation:
Panel tidak dioptimalkan untuk ponsel (ditujukan ke laptop); di < 768px sidebar menjadi drawer. Publik: tanpa menu kompleks — tautan "Pemenang" dan "Cek NOP" di header.

Layar Undian:
Tanpa navigasi. Hanya bilah kontrol operator di bawah (dapat disembunyikan).

---

## 12. States

Loading:
Skeleton (latar `neutral-50` beranimasi pulse) untuk tabel/kartu; spinner untuk tombol; progress bar bertahap untuk impor dan paket. Jangan memblokir seluruh layar kecuali proses yang tidak boleh diganggu (impor, kunci).

Empty:
Ikon 48px `neutral-600`, judul 16px/600, satu kalimat penjelasan, satu tombol aksi utama.

Error:
Banner `danger-100` dengan ikon `XCircle` `danger-700`, judul + penjelasan + langkah selanjutnya. Error field → §9. Error fatal Layar Undian → layar penuh latar `danger-700`, teks putih 40px.

Success:
Toast kanan atas, latar putih, ikon `CheckCircle2` `success-700`, hilang setelah 5 detik (dapat ditutup). Aksi permanen (kunci, verifikasi hasil) → banner `secondary-100` yang menetap.

Disabled:
§8 Disabled. Selalu sertakan alasan.

Warning:
Banner `warning-100`, ikon `AlertTriangle` `warning-700` (mis. kecamatan belum dipetakan).

Chip status:

| Status | Latar | Teks | Ikon |
|---|---|---|---|
| Draf | `neutral-50` | `neutral-600` | `FilePen` |
| Terkunci | `primary-100` | `primary-700` | `Lock` |
| Diundi | `primary-100` | `primary-700` | `Dices` |
| Final | `secondary-100` | `success-700` | `BadgeCheck` |
| Dipublikasi | `secondary-100` | `success-700` | `Globe` |
| Dibatalkan | `danger-100` | `danger-700` | `Ban` |
| Lolos | `secondary-100` | `success-700` | `Check` |
| Gugur | `danger-100` | `danger-700` | `X` |
| Menang | `primary-100` | `primary-700` | `Trophy` |
| Cadangan | `neutral-50` | `neutral-600` | `Users` |
| Terverifikasi | `secondary-100` | `success-700` | `BadgeCheck` |
| PerluKeputusan | `warning-100` | `warning-700` | `AlertTriangle` |

---

## 13. Icons

Icon Library:
lucide-react

Default Size:
20px (Panel & Publik), 24px di kartu ringkasan, 48px di Layar Undian.

Icon Style:
Outline, stroke 2px (1,75px untuk ukuran ≥ 48px). Ikon dekoratif `aria-hidden="true"`; ikon tanpa label teks wajib punya `aria-label`.

---

## 14. Responsive Design

Mobile:
Hanya Publik yang wajib optimal: satu kolom, tabel pemenang menjadi kartu bertumpuk, tombol lebar penuh, area sentuh ≥ 44×44px.

Tablet:
Publik dua kolom (Wilayah 1 & 2 berdampingan ≥ 768px). Panel dapat dipakai dengan sidebar drawer.

Desktop:
Panel dirancang untuk ≥ 1280px (laptop kantor). Lebar konten maksimum 1280px; tabel peserta boleh penuh.

Breakpoints:
Mobile:
0–767px

Tablet:
768–1279px

Desktop:
≥ 1280px

Layar Undian:
Rasio 16:9 tetap (letterbox jika layar berbeda), acuan 1920×1080, minimum 1280×720.

---

## 15. Accessibility

- Use semantic HTML (`header`, `nav`, `main`, `table` dengan `th scope`, `button` untuk aksi)
- Maintain sufficient contrast (tabel §3)
- Support keyboard navigation (semua aksi Panel bisa dijalankan dengan keyboard; Layar Undian lewat pintasan di UX_FLOWS Flow 9)
- Provide visible focus states (ring 3px `primary-500`; di Layar Undian ring 4px `accent-400`)
- Provide accessible labels (`label` untuk input, `aria-label` untuk tombol ikon)
- Do not rely only on color (chip status selalu berikon + teks)
- Hormati `prefers-reduced-motion`: animasi undian diganti transisi fade sederhana, confetti dimatikan; durasi dan hasil tidak berubah.
- Pengumuman pemenang di Layar Undian dan hasil `/cek` memakai `aria-live="polite"`.
- Bahasa halaman `lang="id"`.

---

## 16. Layar Undian (Proyektor)

Kanvas:
- 16:9, acuan 1920×1080. Area aman: margin 5% di setiap sisi (96px horizontal, 54px vertikal) — tidak ada teks penting di luar area ini.
- Latar default: gradien `primary-900` → `#0A3A73` dengan ornamen geometris Islami (pola bintang delapan) 6% opasitas berwarna `secondary-600`. Latar kustom dari tema boleh, dengan overlay gelap minimal 60% agar kontras teks terjaga.

Tata letak fase Menunggu & Mengacak:
```
┌──────────────────────────────────────────────────────────┐
│ [Pelat putih: Logo Pemkab | Logo Bapenda]   Judul acara  │  ← tinggi 15%
│                                                          │
│            WILAYAH 1 — PEMENANG UTAMA                    │  ← label slot
│                                                          │
│        ┌──────────────────────────────────────┐          │
│        │   Area animasi preset (60% tinggi)   │          │
│        │   NOP tersamar + nama berputar       │          │
│        └──────────────────────────────────────┘          │
│                                                          │
│  Peserta Wilayah 1: 20.415      Slot 1 dari 6  ●○○○○○    │  ← footer info
└──────────────────────────────────────────────────────────┘
```

Kartu pemenang (fase Pemenang):
- Lebar 80% kanvas, latar putih, radius `lg`, shadow `lg`, glow `accent-400` 4px.
- Pita atas latar `secondary-600` teks putih: "SELAMAT — PEMENANG UTAMA WILAYAH 1".
- Isi (urutan tetap): Nama (96px) · NOP tersamar (64px) · NIK tersamar · Alamat WP · Alamat OP · Kecamatan / Kelurahan · Baris 5 tanggal lunas (2022–2026) dalam chip kecil 28px.
- Teks pada kartu putih memakai `neutral-900` / `neutral-600` (rasio §3).

Ringkasan akhir:
- Tabel 2 kolom (Wilayah 1 | Wilayah 2), masing-masing 3 baris (Utama, Cadangan 1, Cadangan 2) — nama 40px, NOP tersamar 32px.
- Kotak hash di bawah: `snapshotHash` dan hash hasil, 8 karakter awal & akhir dalam 40px JetBrains Mono, hash lengkap 20px di bawahnya (pengecualian ukuran minimum, khusus hash lengkap untuk difoto saksi).

Animasi preset (semua dikendalikan `ThemeConfig`):

| Preset | Deskripsi | Catatan |
|---|---|---|
| `slot-mesin` | 3 kolom gulung vertikal: kecamatan, NOP tersamar, nama | Default |
| `roda-nama` | Roda berputar berisi 24 nama acak dari wilayah aktif, diganti tiap putaran | Penunjuk `accent-400` |
| `kartu-berputar` | Kartu peserta membalik cepat, melambat lalu berhenti | Nuansa Islami: bingkai ornamen |
| `ticker-nop` | Digit NOP tersamar bergulir per segmen seperti papan bandara | Cocok untuk penonton yang fokus ke NOP |

Aturan animasi:
- Frame rate target 60 fps di laptop kelas kantor; hanya animasikan `transform` dan `opacity`.
- Data animasi diambil dari sampel acak maks. 200 peserta wilayah aktif (bukan merender 46.000 elemen).
- Perlambatan akhir maks. 3 detik dan selalu berakhir di pemenang yang sudah ditentukan RNG.
- Confetti: warna `accent-400`, `secondary-600`, `primary-500`, putih; durasi 4 detik.

Audio:
- Tiga fase: Menunggu (loop, volume default 40%), Mengacak (loop/drumroll, 70%), Pemenang (sekali putar, 90%).
- Transisi antar fase: fade 300ms.
- Indikator bisu (ikon `VolumeX`) tampil di pojok kanan bawah saat `M` aktif.
