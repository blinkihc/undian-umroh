const POLA_NIK = /^\d{16}$/;

/** NIK valid = tepat 16 digit angka setelah trim (notasi ilmiah Excel tidak valid). */
export function isValidNik(mentah: string): boolean {
  return POLA_NIK.test(mentah.trim());
}

/**
 * `1609040301650002` → `1609xxxxxxxx0002` (4 digit awal dan akhir tampil, PRD §6.0).
 * NIK tidak valid ditampilkan `-` agar potongan nilai rusak tidak ikut terbuka.
 */
export function maskNik(mentah: string): string {
  const nilai = mentah.trim();
  if (!isValidNik(nilai)) {
    return '-';
  }
  return `${nilai.slice(0, 4)}xxxxxxxx${nilai.slice(12)}`;
}
