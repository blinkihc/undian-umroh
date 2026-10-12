/**
 * Data peserta sintetis untuk uji (TESTING §7). Seluruhnya dummy: NOP berkode kecamatan 9xx dan
 * NIK berawalan 160999 tidak dipakai wilayah mana pun, nama berbentuk "WAJIB PAJAK 000123".
 * Deterministik untuk seed yang sama (PRNG mulberry32, bukan untuk undian).
 */

import { HEADER_IMPOR } from '@/lib/domain';

/** Kecamatan di Kabupaten OKU Selatan (nama wilayah publik, bukan data pribadi). */
export const KECAMATAN_SINTETIS = [
  'MUARADUA',
  'BUAY RUNJUNG',
  'KISAM TINGGI',
  'MUARADUA KISAM',
  'SIMPANG',
  'BUANA PEMACA',
  'BANDING AGUNG',
  'PULAU BERINGIN',
  'BUAY SANDANG AJI',
  'BUAY PEMATANG RIBU RANAU TENGAH',
  'WARKUK RANAU SELATAN',
  'MEKAKAU ILIR',
  'SUNGAI ARE',
  'SINDANG DANAU',
  'KISAM ILIR',
  'BUAY PEMACA',
  'RUNJUNG AGUNG',
  'BUAY RAWAN',
  'TIGA DIHAJI',
] as const;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dua(n: number): string {
  return n.toString().padStart(2, '0');
}

/** Tanggal acak `dd/mm/yyyy HH:MM:SS` antara dua tanggal (inklusif hari). */
function tanggalAcak(
  acak: () => number,
  dari: [number, number, number],
  sampai: [number, number, number],
): string {
  const a = Date.UTC(dari[0], dari[1] - 1, dari[2]);
  const b = Date.UTC(sampai[0], sampai[1] - 1, sampai[2], 23, 59, 59);
  const t = new Date(a + Math.floor(acak() * (b - a)));
  return `${dua(t.getUTCDate())}/${dua(t.getUTCMonth() + 1)}/${t.getUTCFullYear().toString()} ${dua(t.getUTCHours())}:${dua(t.getUTCMinutes())}:${dua(t.getUTCSeconds())}`;
}

export type OpsiSintetis = { rows: number; seed?: number };

/**
 * Baris sintetis 12 kolom (tanpa header). Sebaran kira-kira: 90% lolos tepat waktu, 5% lolos
 * dengan PBB 2025 dibayar tahun 2026, sisanya gugur (tanggal kosong, lewat batas, sebelum tahun
 * pajak, format tidak dikenali, nama kosong) serta sedikit NOP ganda dan NIK rusak.
 */
export function barisSintetis(opsi: OpsiSintetis): string[][] {
  const acak = mulberry32(opsi.seed ?? 20261012);
  const hasil: string[][] = [];
  for (let i = 0; i < opsi.rows; i += 1) {
    const kecIndeks = Math.floor(acak() * KECAMATAN_SINTETIS.length);
    const kode = (900 + kecIndeks).toString();
    const urut = i.toString().padStart(10, '0');
    let nop = `1609${kode}${urut.slice(0, 3)}${urut.slice(3, 6)}${urut.slice(6, 10)}0`;
    const nik = `160999${i.toString().padStart(10, '0')}`;
    const lunas = [
      tanggalAcak(acak, [2022, 3, 1], [2022, 12, 31]),
      tanggalAcak(acak, [2023, 3, 1], [2023, 12, 31]),
      tanggalAcak(acak, [2024, 3, 1], [2024, 12, 31]),
      tanggalAcak(acak, [2025, 3, 1], [2025, 12, 31]),
      tanggalAcak(acak, [2026, 3, 1], [2026, 9, 30]),
    ];
    let nama = `WAJIB PAJAK ${(i + 1).toString().padStart(6, '0')}`;
    let nikTeks = nik;
    const r = acak();
    if (r < 0.05) lunas[3] = tanggalAcak(acak, [2026, 1, 2], [2026, 9, 30]);
    else if (r < 0.07) lunas[2] = '';
    else if (r < 0.08) lunas[4] = tanggalAcak(acak, [2026, 10, 1], [2026, 10, 31]);
    else if (r < 0.083) lunas[0] = tanggalAcak(acak, [2021, 10, 1], [2021, 12, 31]);
    else if (r < 0.085) lunas[1] = '31/02/2023';
    else if (r < 0.086) nama = '';
    else if (r < 0.091) nikTeks = `1.60999E+15`;
    // Sekitar 0,1% baris memakai ulang NOP baris sebelumnya (NOP ganda).
    if (i > 0 && acak() < 0.001) {
      nop = hasil[i - 1]?.[0] ?? nop;
    }
    const kec = KECAMATAN_SINTETIS[kecIndeks] ?? 'MUARADUA';
    hasil.push([
      nop,
      nikTeks,
      nama,
      `JL. CONTOH NO. ${((i % 200) + 1).toString()}`,
      `DUSUN ${((i % 7) + 1).toString()}`,
      kec,
      `DESA CONTOH ${((i % 25) + 1).toString()}`,
      ...lunas,
    ]);
  }
  return hasil;
}

/** CSV pemisah `;` UTF-8 lengkap dengan header. */
export function csvSintetis(opsi: OpsiSintetis): string {
  return [HEADER_IMPOR.join(';'), ...barisSintetis(opsi).map((b) => b.join(';'))].join('\n');
}
