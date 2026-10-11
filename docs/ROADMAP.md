# Roadmap

> Status: Draf v0.1. Urutan prioritas pengembangan setelah dokumentasi disetujui. Rincian fitur MVP ada di `PRD.md` §8.

## NOW

Dokumentasi dan desain (selesai/berjalan):
- 17 dokumen di `docs/` (dibuat bertahap, review per batch)
- Mockup 11 layar di `design/undian-umroh.pen`

Kerangka dan MVP "Must Have" (urutan implementasi):
- Kerangka proyek, token desain, branding (Next.js, Prisma, Docker Compose)
- Login, peran Admin/Operator, log audit
- Modul murni `src/lib`: NOP/NIK/tanggal/syarat, hash kanonik, mesin undian (dengan test 95%)
- Periode, tanggal batas, pemetaan wilayah
- Impor CSV/XLSX dan laporan validasi
- Kunci snapshot (SHA-256)
- Paket undian dan Layar Undian PWA offline dengan preset Slot Mesin dan audio bawaan
- Unggah dan verifikasi hasil, status pemenang dan kenaikan cadangan
- Berita acara PDF
- Halaman publik: pemenang dan cek NOP (dengan label sementara)
- Deploy ke VPS dan gladi bersih

## NEXT

Setelah MVP berjalan dan sebelum/di sekitar acara:
- Tiga preset animasi lainnya (Roda Nama, Kartu Berputar, Ticker NOP) dan pemilihan tema
- Unggah aset kustom (audio, gambar latar)
- Asisten AI untuk tema (setelah penyedia AI ditentukan)
- Ekspor Excel pemenang dan log audit
- Editor teks berita acara di aplikasi
- Cadangan hasil parsial per slot: setiap slot selesai, layar menawarkan unduhan file cadangan sementara (mitigasi laptop rusak di tengah acara)
- Anonimisasi terjadwal (retensi 12 bulan) dengan laporan audit

## LATER

- Generate musik atau audio baru dengan AI (butuh layanan berbayar dan penelaahan lisensi)
- Tanda tangan digital pada paket dan file hasil (kunci pribadi dipegang panitia) untuk memperkuat bukti anti-pemalsuan
- Skrip rotasi `NIK_ENCRYPTION_KEY`
- Rate limiter bersama (PostgreSQL/Redis) bila aplikasi dijalankan lebih dari satu instance
- Tabel pelunasan fleksibel (rentang tahun selain 2022–2026) menggantikan kolom `lunas_2022`…`lunas_2026`
- Riwayat banyak periode dan statistik kepatuhan antar-tahun
- Template berita acara resmi yang dapat diunggah
- Autentikasi dua langkah untuk Admin
- Impor hasil parsial dari file cadangan (pemulihan jika laptop rusak setelah sebagian slot diumumkan)

## DEFERRED

- Mekanisme keputusan lanjutan bila ketiga kandidat suatu wilayah gugur (saat ini ditangani di luar sistem dan dicatat manual). Ditunda sampai ada kebijakan Bapenda.

## NOT PLANNED

- Undian per orang/NIK
- Kupon berbobot berdasarkan nominal PBB atau jumlah tahun
- Integrasi langsung ke database SISMIOP/API aplikasi PBB
- Undi ulang otomatis
- Aplikasi mobile native
- Pendaftaran mandiri atau login untuk masyarakat
- Notifikasi otomatis (SMS/WhatsApp/email) ke pemenang
- Multi-kabupaten atau multi-tenant
