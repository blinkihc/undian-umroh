# Panduan Pelaksanaan Gladi Bersih Fisik Acara Undian Umroh

> Bapenda Kabupaten OKU Selatan — Tahun Anggaran 2026  
> Bahasa: Indonesia | Status: Standar Operasional Prosedur (SOP) Gladi Bersih

---

## 1. Tujuan Gladi Bersih
1. Memastikan perangkat laptop acara, proyektor, dan tata suara panggung berfungsi sempurna.
2. Membuktikan aplikasi berjalan 100% offline tanpa sambungan internet atau Wi-Fi.
3. Menguji ketahanan pemulihan sistem jika browser tertutup paksa atau listrik padam di tengah pengundian.
4. Menyelaraskan catatan saksi, notaris, dan kepolisian terhadap hash integritas data di layar proyektor.

---

## 2. Jadwal dan Tahapan

| Tahap | Waktu | Fokus Kegiatan | Penanggung Jawab |
|---|---|---|---|
| **Gladi Kotor (Staging)** | H-7 | Uji alur data dummy 46.000 baris, uji restore backup, uji coba di kantor Bapenda | Tim Pengembang & Operator |
| **Gladi Bersih (Panggung)** | H-1 | Uji coba di gedung acara, proyektor, audio panggung, simulasi crash, uji offline penuh | Panitia, Saksi, Notaris, Operator |
| **Hari-H** | Hari Pelaksanaan | Pengundian resmi 6 slot, penandatanganan Berita Acara basah, ekspor hasil | Seluruh Pihak Terkait |

---

## 3. Checklist Persiapan Perangkat

### A. Laptop Panggung (Utama & Cadangan)
- [ ] Sistem operasi Windows 10/11 terbarui.
- [ ] Terpasang Google Chrome atau Microsoft Edge versi terbaru.
- [ ] Akun pengguna Windows non-administrator (bukan akun tamu).
- [ ] Fitur Sleep, Screen Saver, dan Automatic Updates **dinonaktifkan**.
- [ ] Baterai terisi 100% dan charger original terpasang ke stopkontak ber-UPS (Uninterruptible Power Supply).
- [ ] Wi-Fi, Bluetooth, dan kabel LAN **dimatikan total** sebelum paket undian dibuka.

### B. Proyektor dan Tata Suara
- [ ] Resolusi proyektor diatur ke rasio aspek **16:9** (1920x1080 atau 1280x720).
- [ ] Tulisan NOP, nama peserta, dan wilayah terbaca jelas dari deretan kursi paling belakang (jarak ±15–20 meter).
- [ ] Kabel audio 3.5mm terhubung ke mixer panggung; volume suara diuji (musik menunggu, efek putaran, gong pemenang terdengar mantap tanpa distorsi).

---

## 4. Skenario Pengujian Lapangan Saat Gladi Bersih

### Skenario 1: Verifikasi Muat Paket & Keadaan Offline
1. Serahkan flashdisk berisi `paket-undian-[slug]-[hash].zip` ke Operator.
2. Operator membuka halaman Layar Undian di peramban (`/undian`).
3. Unggah file paket zip ke tombol **Muat Paket**.
4. Periksa indikator status: harus berubah menjadi **"Siap Offline"**.
5. Putuskan Wi-Fi/LAN laptop. Muat ulang halaman (F5). Halaman harus tetap terbuka normal dari penyimpanan IndexedDB lokal.

### Skenario 2: Kinerja Animasi dan Waktu Putaran
1. Tekan tombol **Mulai Undi** (atau tombol Spasi).
2. Perhatikan animasi putaran angka ticker: gerakan harus mulus (minimal 50 FPS, tidak patah-patah).
3. Tekan tombol **Berhenti** (atau tombol Spasi).
4. Jeda waktu dari tombol Berhenti ditekan hingga kartu pemenang muncul tidak boleh lebih dari 3 detik.
5. Periksa kartu pemenang: NIK dan NOP harus termasker dengan format benar.

### Skenario 3: Simulasi Crash / Pemadaman Listrik Mendadak
1. Jalankan pengundian hingga Slot 1 (W1) dan Slot 2 (W2) selesai.
2. Pada Slot 3 (W1), saat kartu pemenang muncul, tutup paksa jendela browser (Alt + F4 atau Task Manager).
3. Buka kembali browser dan akses alamat Layar Undian.
4. **Hasil yang Wajib**:
   - Sistem otomatis memulihkan state dari IndexedDB.
   - Pemenang Slot 1, Slot 2, dan Slot 3 tetap utuh dan identik.
   - Tombol **Lanjut Slot 4** aktif dan pengundian dapat diteruskan tanpa kehilangan data.

### Skenario 4: Penyelesaian 6 Slot dan Ekspor Hasil
1. Lanjutkan pengundian hingga seluruh 6 slot selesai:
   - Slot 1: W1 Pemenang Utama
   - Slot 2: W2 Pemenang Utama
   - Slot 3: W1 Cadangan 1
   - Slot 4: W2 Cadangan 1
   - Slot 5: W1 Cadangan 2
   - Slot 6: W2 Cadangan 2
2. Klik tombol **Ekspor Paket Hasil**.
3. Simpan berkas `hasil-undian-[slug]-[timestamp].zip` ke 2 buah flashdisk panitia yang berbeda.

---

## 5. Prosedur Wajib Pembersihan Pasca Gladi (Data Sanitization)

Sebelum hari-H acara resmi dimulai:
1. Hapus seluruh file paket dummy dan hasil uji dari folder laptop acara.
2. Buka peramban, bersihkan IndexedDB dan cache situs dengan menekan tombol **Reset / Ganti Paket** di layar undian.
3. Kosongkan Recycle Bin secara permanen.
4. Pastikan laptop dalam kondisi bersih siap menerima paket data resmi periode final.
