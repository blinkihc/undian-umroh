/**
 * Generator angka acak kriptografis tanpa bias modulo (rejection sampling).
 * Modul murni (ARCHITECTURE §8, DECISIONS 003, 010).
 * DILARANG menggunakan Math.random di area undian.
 */

export type SumberAcakBytes = (bytes: Uint8Array) => void;

/**
 * Menghasilkan bilangan bulat acak seragam di dalam rentang inklusif [min, max]
 * menggunakan crypto.getRandomValues dan penolakan (rejection sampling)
 * untuk menghindari bias modulo.
 */
export function secureRandomInt(
  min: number,
  max: number,
  sumberAcak?: SumberAcakBytes,
): number {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    throw new TypeError('Batas min dan max harus berupa bilangan bulat aman.');
  }
  if (min > max) {
    throw new RangeError(`Batas min (${min.toString()}) tidak boleh lebih besar dari max (${max.toString()}).`);
  }
  if (min === max) {
    return min;
  }

  const range = max - min + 1;
  const maxUint32 = 0x1_00_00_00_00; // 2^32
  // Batas atas kelipatan range terbesar yang muat dalam 32-bit uint
  const limit = Math.floor(maxUint32 / range) * range;

  const buffer = new Uint8Array(4);
  const dataView = new DataView(buffer.buffer);

  for (;;) {
    if (sumberAcak !== undefined) {
      sumberAcak(buffer);
    } else {
      crypto.getRandomValues(buffer);
    }

    const uint32 = dataView.getUint32(0, true);
    if (uint32 < limit) {
      return min + (uint32 % range);
    }
    // Jika uint32 >= limit, ulangi (rejection sampling)
  }
}
