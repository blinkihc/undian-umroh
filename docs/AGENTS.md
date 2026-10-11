# AI Coding Agent Instructions

> Instruksi operasional untuk AI coding agent yang bekerja di repositori ini. Bahasa komunikasi dengan pengguna: Bahasa Indonesia.

## 1. Project Context

Project:
Undian Umroh PBB OKU Selatan — "Undian Umroh Wajib Pajak PBB-P2 OKU Selatan Tahun 2026" (judul sementara).

Purpose:
Web app Bapenda Kabupaten OKU Selatan untuk mengimpor data PBB-P2, menyaring NOP yang lunas 2022–2026 (batas default 30 September 2026), mengundi 2 paket umroh (1 per wilayah, masing-masing 1 utama + 2 cadangan) secara adil dan dapat diaudit, menjalankan undian **offline** di laptop acara, serta mempublikasikan hasil tanpa membuka data pribadi.

Primary Users:
Admin Bapenda, Operator Acara, Masyarakat (publik, tanpa login).

---

## 2. Source of Truth

Before making significant changes, read the relevant documentation inside /docs.

Core documentation:
- PRD.md — kebutuhan & aturan bisnis (§6.0 adalah aturan inti)
- DESIGN_SYSTEM.md — token visual, Layar Undian §16
- ARCHITECTURE.md — struktur folder & aturan dependensi
- DATABASE.md — skema
- SECURITY.md — RBAC, penyamaran, integritas
- CODE_STYLE.md — konvensi
- TESTING.md — kasus wajib & perintah

Juga:
- UX_FLOWS.md — alur & state UI
- API.md — kontrak endpoint, format paket/hasil, `ThemeConfig`
- ENVIRONMENT.md, ERROR_HANDLING.md, DEPLOYMENT.md, OBSERVABILITY.md, DECISIONS.md, ROADMAP.md, CHANGELOG.md

Do not contradict these documents without first identifying the conflict.

Urutan prioritas bila dokumen bertentangan: `DECISIONS.md` (keputusan terbaru) → `PRD.md` → `SECURITY.md` → `API.md`/`DATABASE.md` → dokumen lain. Tetap laporkan konfliknya.

---

## 3. General Rules

- Understand existing code before modifying it
- Reuse existing components and utilities
- Follow the design system
- Follow the architecture
- Follow database conventions
- Follow security requirements
- Follow coding conventions
- Do not invent business requirements
- Do not expose secrets
- Avoid unnecessary dependencies
- Avoid unrelated changes

Aturan khusus proyek (tidak boleh dilanggar):
- **Undian**: hanya `crypto.getRandomValues` lewat `secureRandomInt`; dilarang `Math.random`. Pemenang ditentukan saat Berhenti dan disimpan ke IndexedDB **sebelum** ditampilkan.
- **Data pribadi**: NIK utuh dan NOP utuh tidak boleh masuk paket, file hasil, respons publik, log, atau fixture. Gunakan `maskNop`/`maskNik`.
- **Immutabilitas**: jangan menulis kode yang mengubah/menghapus `snapshot`, `snapshot_peserta`, `hasil_undian`, `audit_log`.
- **Satu sumber logika**: aturan syarat, slot, hash, dan skema hanya di `src/lib`; server dan browser memakai modul yang sama.
- **Offline**: Layar Undian tidak boleh bergantung pada request jaringan (termasuk font, ikon, audio dari CDN).
- **Audit**: setiap mutasi yang terdaftar di PRD F11 memanggil `audit()` dalam transaksi yang sama.
- **Bahasa UI**: Bahasa Indonesia.
- **Data asli**: jangan membaca isi `docs/contoh data.csv`/`.xlsx` ke dalam kode, test, atau fixture; buat data dummy dengan pola yang sama.

---

## 4. Planning

Before implementing a non-trivial task:
1. Inspect relevant documentation
2. Inspect relevant code
3. Identify affected files
4. Identify dependencies
5. Identify database/API changes
6. Identify tests required
7. Create a concise implementation plan

Rencana mencantumkan: dokumen yang dirujuk (dengan nomor bagian), file yang diubah/dibuat, migrasi (jika ada), dampak keamanan, test yang ditambah, dan dokumen yang perlu diperbarui. Tunggu persetujuan pengguna untuk perubahan skema, kontrak API/paket/hasil, atau keputusan baru.

---

## 5. Implementation

- Kerjakan dalam langkah kecil yang setiap langkahnya dapat di-build dan diuji.
- Tulis/ubah test bersamaan dengan kode, terutama di `src/lib`.
- Perubahan format `snapshot.json`, `meta.json`, file hasil, atau `ThemeConfig` wajib menaikkan `versiFormat` dan memperbarui `API.md` §4–5.
- Migrasi Prisma diberi nama deskriptif; trigger/index parsial ditulis SQL manual di file migrasi.
- Dependensi baru: versi exact, paket populer & terawat; catat di `DECISIONS.md` jika signifikan. Waspadai nama mirip (typosquatting).
- Jangan menjalankan server dev/watch secara blocking; minta pengguna menjalankannya.

---

## 6. Validation

Sebelum menyatakan selesai, jalankan:
```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:int     # butuh npm run db:test:up
npm run build
npm run test:e2e     # untuk perubahan yang menyentuh alur kritis
```
Laporkan hasil apa adanya; jika suatu perintah tidak bisa dijalankan, sebutkan alasannya. Periksa `git diff` untuk perubahan yang tidak disengaja.

---

## 7. Documentation Updates

Perbarui dokumen jika perubahan menyentuh:
- Perilaku produk → `PRD.md`, `UX_FLOWS.md`
- Skema → `DATABASE.md`
- Endpoint/format file → `API.md`
- Keamanan → `SECURITY.md`
- Variabel lingkungan → `ENVIRONMENT.md` + `.env.example`
- Keputusan teknis baru → `DECISIONS.md` (ADR baru, jangan mengubah ADR lama; tandai "Digantikan oleh ADR-xxx")
- Setiap rilis → `CHANGELOG.md`

---

## 8. Conflict Handling

If requirements conflict:
- Do not guess.
- Identify the conflict and ask for clarification.

Format laporan konflik: dokumen & bagian yang bertentangan, kutipan singkat masing-masing, dampak, usulan penyelesaian.

---

## 9. Completion Criteria

A task is complete only when:
- Requirements are satisfied
- Tests pass
- Build succeeds
- No unintended files changed
- Security rules are respected
- Documentation is updated when necessary

Ditambah:
- Lint & typecheck lulus; coverage `src/lib` ≥ 95%
- Tidak ada NIK/NOP utuh di keluaran publik, paket, hasil, atau log (dibuktikan test)
- Alur yang disentuh berfungsi offline bila termasuk Layar Undian
