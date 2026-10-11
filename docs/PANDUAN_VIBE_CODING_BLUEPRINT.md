# PANDUAN PENGEMBANGAN DENGAN VIBE CODING BLUEPRINT
*Sistem Dokumentasi Lengkap untuk Membangun Aplikasi Menggunakan AI*

---

## 1. PENDAHULUAN & KONSEP UTAMA

### Mengapa Vibe Coding Membutuhkan Dokumentasi?
Secara sederhana, **Vibe Coding** memungkinkan pengembang dari ide menjadi perangkat lunak yang berjalan dengan cepat: Anda mendeskripsikan keinginan, AI menulis kode, Anda menjalankan dan memperbaikinya secara berulang.

Namun, saat aplikasi semakin kompleks, masalah utama muncul: **AI Coding Agent mulai menebak-nebak** (alur fitur, visual UI, struktur database, mekanisme autentikasi, lokasi berkas, dan perilaku API). Akibatnya, bagian-bagian aplikasi berjalan dengan asumsi yang saling bertentangan.

Dokumentasi memberikan konteks yang cukup agar AI mengurangi tebakan dan lebih banyak fokus pada implementasi yang presisi. Dokumentasi menjadi **satu-satunya sumber kebenaran (shared source of truth)** bagi pengembang dan AI agent.

### Rumus Utama
Jangan hanya memberi AI prompt singkat. Berikan AI kombinasi berikut:

$$\text{Konteks} + \text{Aturan} + \text{Batasan} + \text{Arsitektur} + \text{Contoh} + \text{Validasi}$$

### Mental Model Vibe Coding
```
IDE ANDA
   ↓
PRODUCT REQUIREMENTS (PRD)
   ↓
USER FLOWS (UX_FLOWS)
   ↓
DESIGN SYSTEM
   ↓
ARCHITECTURE
   ↓
DATABASE
   ↓
API CONTRACTS
   ↓
SECURITY
   ↓
CODE CONVENTIONS
   ↓
TESTING
   ↓
AI AGENT INSTRUCTIONS (AGENTS)
   ↓
IMPLEMENTATION
   ↓
VALIDATION
```

---

## 2. DOKUMENTASI INTI & LANJUTAN (17 BERKAS)

Dokumentasi terbagi menjadi **8 Dokumen Inti** dan **9 Dokumen Lanjutan**.

### 8 Dokumen Inti (Core Documents)
1. **`PRD.md`** (*Product Requirements Document*): Menjelaskan apa yang dibangun, latar belakang masalah, target pengguna, fitur utama, scope MVP, non-goals, dan kriteria sukses.
2. **`DESIGN_SYSTEM.md`**: Menentukan bahasa visual aplikasi (palet warna, tipografi, spacing, border radius, tombol, input, status UI, dan responsivitas) agar AI tidak membuat desain yang tidak konsisten.
3. **`ARCHITECTURE.md`**: Menentukan pola arsitektur (Monolith/Microservices/Serverless), teknologi stack, struktur folder proyek, diagram data flow, dan aturan dependensi.
4. **`DATABASE.md`**: Sumber kebenaran skema data, tabel, kolom, relasi, indeks, aturan migrasi, dan penanganan data sensitif.
5. **`SECURITY.md`**: Menentukan mekanisme autentikasi, otorisasi peran (RBAC), perlindungan *secrets*, keamanan API, enkripsi, dan *logging*.
6. **`CODE_STYLE.md`**: Mengatur standar penulisan kode, konvensi penamaan berkas/fungsi/variabel, error handling, formatting, dan linter.
7. **`TESTING.md`**: Strategi pengujian (Unit, Integration, E2E), alur pengguna kritis, target cakupan (coverage), dan perintah pengujian.
8. **`AGENTS.md`**: Instruksi operasional langsung untuk AI agent tentang aturan proyek, sumber kebenaran, alur perencanaan, dan kriteria penyelesaian (*Definition of Done*).

### 9 Dokumen Lanjutan (Advanced Layer)
9. **`UX_FLOWS.md`**: Pemetaan alur perjalanan pengguna (*user journeys*) dari landing page hingga penyelesaian tugas.
10. **`API.md`**: Kontrak API, format request/response, aturan validasi, dan penanganan struktur error standar.
11. **`ENVIRONMENT.md`**: Dokumentasi semua variabel lingkungan (publik dan privat) beserta aturan konfigurasinya.
12. **`DECISIONS.md`**: *Architecture Decision Records* (ADR) untuk mencatat keputusan teknis penting beserta pertimbangan alternatif dan dampaknya.
13. **`ROADMAP.md`**: Skala prioritas pengembangan fitur (*NOW, NEXT, LATER, DEFERRED, NOT PLANNED*).
14. **`ERROR_HANDLING.md`**: Aturan sistem dalam menangani berbagai kegagalan (validation error, network timeout, HTTP status code, retry logic, dan pesan ke pengguna).
15. **`OBSERVABILITY.md`**: Panduan *logging*, metrik kinerja, pemantauan error, dan peringatan (*alerts*) di lingkungan produksi.
16. **`DEPLOYMENT.md`**: Prosedur rilis, konfigurasi staging/produksi, *checklist* sebelum deploy, dan langkah *rollback*.
17. **`CHANGELOG.md`**: Catatan riwayat perubahan versi aplikasi (*Added, Changed, Fixed, Removed*).

---

## 3. STRUKTUR PROYEK YANG DIREKOMENDASIKAN

Letakkan seluruh berkas dokumentasi di dalam folder `/docs` di akar proyek:

```text
my-app/
├── src/
├── public/
├── tests/
├── scripts/
├── docs/
│   ├── PRD.md
│   ├── DESIGN_SYSTEM.md
│   ├── UX_FLOWS.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SECURITY.md
│   ├── CODE_STYLE.md
│   ├── TESTING.md
│   ├── AGENTS.md
│   ├── ENVIRONMENT.md
│   ├── ERROR_HANDLING.md
│   ├── DEPLOYMENT.md
│   ├── OBSERVABILITY.md
│   ├── DECISIONS.md
│   ├── ROADMAP.md
│   └── CHANGELOG.md
├── .env.example
├── README.md
└── package.json
```

---

## 4. TAHAPAN PEMBUATAN DOKUMEN SESUAI SKALA PROYEK

Tidak semua proyek membutuhkan 17 dokumen secara langsung sejak awal. Gunakan tingkatan berikut:

- **Proyek Kecil (Small/Experimental)**:
  - `PRD.md`, `DESIGN_SYSTEM.md`, `ARCHITECTURE.md`, `AGENTS.md`
- **Proyek Menengah (Medium)**:
  - Tambahkan `DATABASE.md`, `SECURITY.md`, `API.md`, `TESTING.md`, `UX_FLOWS.md`
- **Proyek Skala Produksi (Serious/Production)**:
  - Lengkapi dengan `ENVIRONMENT.md`, `ERROR_HANDLING.md`, `DEPLOYMENT.md`, `OBSERVABILITY.md`, `DECISIONS.md`, `ROADMAP.md`, `CHANGELOG.md`

---

## 5. ALUR KERJA BERSAMA AI CODING AGENT (6 LANGKAH)

Gunakan alur terstruktur ini daripada langsung menyuruh AI menulis kode secara serampangan:

1. **Langkah 1: Berikan Konteks (Context)**
   Instruksikan AI untuk membaca dokumentasi di `/docs` terlebih dahulu tanpa mengubah kode, lalu meminta AI merangkum pemahamannya serta mengidentifikasi ketidakjelasan atau konflik.
2. **Langkah 2: Minta Perencanaan (Plan)**
   Minta AI membuat rencana implementasi fitur yang mencakup berkas yang akan diubah, kebutuhan skema database, dampak API, keamanan, dan pengujian.
3. **Langkah 3: Tinjau Rencana (Review Plan)**
   Pengembang meninjau dan menyetujui rencana yang diajukan AI sebelum eksekusi dilakukan.
4. **Langkah 4: Eksekusi Kode (Implement)**
   AI mengimplementasikan kode sesuai rencana yang disetujui, memanfaatkan kembali komponen/utilitas yang ada, dan mengikuti konvensi proyek.
5. **Langkah 5: Validasi (Validate)**
   Jalankan *unit test*, *linting*, *type checking*, dan *build*. Periksa perubahan kode (*git diff*) untuk memastikan tidak ada efek samping yang merusak.
6. **Langkah 6: Perbarui Dokumentasi (Update Docs)**
   Jika implementasi mengubah perilaku produk, arsitektur, skema database, atau API, perbarui berkas `.md` terkait agar dokumentasi tetap relevan.

---

## 6. PROMPT SIAP PAKAI (COPY-PASTE PROMPTS)

### A. Prompt Inisialisasi Proyek Baru (Bootstrap Prompt)
```text
Saya ingin membangun aplikasi baru. Jangan mulai menulis kode sekarang.
Pertama, bantu saya membuat dokumentasi proyek di dalam folder /docs.

Buatkan dokumentasi berikut:
1. PRD.md
2. DESIGN_SYSTEM.md
3. UX_FLOWS.md
4. ARCHITECTURE.md
5. DATABASE.md
6. API.md
7. SECURITY.md
8. CODE_STYLE.md
9. TESTING.md
10. AGENTS.md

Untuk setiap dokumen:
- Jelaskan tujuannya dengan jelas
- Identifikasi asumsi dan pertanyaan yang belum terbukti
- Jaga agar persyaratan tetap eksplisit
- Gunakan keputusan secara konsisten antar dokumen

Mulailah dengan PRD.md. Ajukan pertanyaan yang diperlukan untuk mendefinisikan produk ini dengan benar. Jangan buat kode aplikasi sampai dokumentasi ditinjau dan disetujui.
```

### B. Prompt Penambahan Fitur (Feature Prompt)
```text
Saya ingin menambahkan fitur berikut: [NAMA FITUR]

Sebelum mengubah kode:
1. Baca dokumentasi terkait di /docs.
2. Identifikasi dokumen mana saja yang terdampak.
3. Periksa implementasi yang ada saat ini.
4. Jelaskan arsitektur yang relevan dengan fitur ini.
5. Identifikasi berkas frontend dan backend/API yang terdampak.
6. Identifikasi perubahan database, keamanan, dan tes yang diperlukan.
7. Buat rencana implementasi singkat.

Jangan ubah bagian proyek yang tidak relevan.
Setelah implementasi disetujui dan dibuat:
- Jalankan tes, lint, type check, dan build.
- Tinjau diff akhir dan perbarui dokumentasi jika diperlukan.
```

### C. Prompt Code Review (Senior Engineer Review)
```text
Tinjau perubahan yang baru saja Anda buat sebagai seorang Senior Engineer.
Periksa hal-hal berikut:
- Persyaratan yang tidak sesuai atau penyimpangan arsitektur
- Logika duplikat atau abstraksi yang tidak perlu
- Masalah keamanan, database, API, atau eror handling
- State UI yang hilang (loading, empty, error)
- Masalah performa, responsivitas, atau aksesibilitas
- Perubahan berkas yang tidak disengaja

Bandingkan implementasi dengan berkas di /docs.
Jangan ubah apapun dulu. Berikan:
1. Temuan audit
2. Tingkat keparahan (Severity)
3. Rekomendasi perbaikan
4. Berkas dokumentasi yang perlu diperbarui
```

---

## 7. TIPS MEMBUAT DOKUMENTASI YANG AI-FRIENDLY

1. **Gunakan Heading yang Jelas**: Pisahkan struktur dokumen dengan sub-heading spesifik (`## Authentication`, `## Database Schema`), hindari paragraf panjang tanpa struktur.
2. **Berikan Aturan Eksplisit**: Jangan tulis *"Gunakan komponen yang bisa dipakai ulang jika memungkinkan"*. Tulis *"Gunakan kembali komponen yang ada jika memenuhi kebutuhan. Buat komponen baru hanya jika komponen yang ada tidak dapat mendukung penggunaan tersebut."*
3. **Gunakan Contoh Kode/JSON**: Berikan contoh konkret struktur data request/response untuk menghilangkan ambiguitas.

---

## 8. ATURAN EMAS (THE GOLDEN RULES)

- **Aturan 1**: Konteks sebelum kode (*Context before code*).
- **Aturan 2**: Arsitektur sebelum implementasi (*Architecture before implementation*).
- **Aturan 3**: Tentukan keputusan penting satu kali, jangan berulang kali membuat keputusan yang sama.
- **Aturan 4**: Buat persyaratan tertulis secara eksplisit.
- **Aturan 5**: Jangan biarkan AI menebak jika jawabannya bisa didokumentasikan.
- **Aturan 6**: Simpan dokumentasi dekat dengan kode proyek (dalam repositori).
- **Aturan 7**: Selalu validasi kode buatan AI, jangan percaya secara buta.
- **Aturan 8**: Perbarui dokumentasi setiap kali sistem mengalami perubahan.
- **Aturan 9**: Gunakan AI untuk mempercepat implementasi, bukan menggantikan pemikiran produk (*product thinking*).

---
*Gagasan Utama: Idea → Context → Documentation → Plan → Code → Validate → Ship* 🚀
