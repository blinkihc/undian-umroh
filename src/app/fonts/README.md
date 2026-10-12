# Font lokal

Font di-host sendiri (tanpa CDN) agar Layar Undian tetap bisa tampil tanpa internet (DESIGN_SYSTEM §4).

| Berkas                                      | Sumber                                                                       | Lisensi     |
| ------------------------------------------- | ---------------------------------------------------------------------------- | ----------- |
| `plus-jakarta-sans-latin-wght-normal.woff2` | `@fontsource-variable/plus-jakarta-sans@5.3.0` (subset latin, bobot 200–800) | SIL OFL 1.1 |
| `inter-latin-wght-normal.woff2`             | `@fontsource-variable/inter@5.3.0` (subset latin, bobot 100–900)             | SIL OFL 1.1 |
| `jetbrains-mono-latin-wght-normal.woff2`    | `@fontsource-variable/jetbrains-mono@5.3.0` (subset latin, bobot 100–800)    | SIL OFL 1.1 |

Berkas diambil dari paket npm di atas (`npm pack`) dan disalin apa adanya. Subset latin sudah mencakup semua huruf Bahasa Indonesia serta tanda baca umum (— … · ×).
