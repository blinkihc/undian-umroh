/**
 * Normalisasi kecamatan sebelum pemetaan (PRD §6.0): trim, huruf besar, spasi ganda dirapatkan.
 * Variasi penulisan (mis. `MUARA DUA KISAM` vs `MUARADUA KISAM`) sengaja tetap berbeda; admin
 * memetakan keduanya.
 */
export function normalizeKecamatan(mentah: string): string {
  return mentah.trim().toUpperCase().replace(/\s+/g, ' ');
}
