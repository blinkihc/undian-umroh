import { type Result } from './result';

/** Prefiks NOP Kabupaten OKU Selatan (provinsi 16, kabupaten 09). */
export const PREFIKS_NOP = '1609';

const POLA_NOP = /^\d{18}$/;

/** Bentuk bertitik `PP.DD.KKK.DDD.BBB-NNNN.J`. */
const POLA_NOP_BERTITIK = /^(\d{2})\.(\d{2})\.(\d{3})\.(\d{3})\.(\d{3})-(\d{4})\.(\d)$/;

/**
 * NOP 18 digit hasil normalisasi (PRD §6.0): nilai di-trim, bentuk bertitik diubah ke 18 digit.
 * Tidak valid bila bukan 18 digit atau tidak berprefiks 1609 (termasuk notasi ilmiah Excel).
 */
export function normalizeNop(mentah: string): Result<string, 'NOP_INVALID'> {
  const nilai = mentah.trim();
  const bertitik = POLA_NOP_BERTITIK.exec(nilai);
  const digit = bertitik === null ? nilai : bertitik.slice(1).join('');
  if (!POLA_NOP.test(digit) || !digit.startsWith(PREFIKS_NOP)) {
    return { ok: false, error: 'NOP_INVALID' };
  }
  return { ok: true, value: digit };
}

function segmen(nop: string): [string, string, string, string, string, string, string] {
  return [
    nop.slice(0, 2),
    nop.slice(2, 4),
    nop.slice(4, 7),
    nop.slice(7, 10),
    nop.slice(10, 13),
    nop.slice(13, 17),
    nop.slice(17, 18),
  ];
}

/** `160903000300300030` → `16.09.030.003.003-0003.0`. Masukan wajib NOP 18 digit valid. */
export function formatNop(nop: string): string {
  const [pp, dd, kkk, ddd, bbb, nnnn, j] = segmen(nop);
  return `${pp}.${dd}.${kkk}.${ddd}.${bbb}-${nnnn}.${j}`;
}

/** `160903000300300030` → `16.09.030.xxx.xxx-0003.0` (segmen ke-4 dan ke-5 disamarkan). */
export function maskNop(nop: string): string {
  const [pp, dd, kkk, , , nnnn, j] = segmen(nop);
  return `${pp}.${dd}.${kkk}.xxx.xxx-${nnnn}.${j}`;
}
