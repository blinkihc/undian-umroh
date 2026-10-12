/**
 * Waktu tampilan dan API dalam WIB (UTC+7, tanpa musim panas). Dihitung manual, bukan lewat
 * Intl, agar hasilnya sama di Node, peramban, dan mesin dengan data zona waktu berbeda.
 */

const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

const POLA_TANGGAL = /^(\d{4})-(\d{2})-(\d{2})$/;

function dua(angka: number): string {
  return angka.toString().padStart(2, '0');
}

/** Komponen tanggal-waktu WIB dari sebuah Date. */
function bagianWib(waktu: Date): {
  tahun: number;
  bulan: number;
  hari: number;
  jam: number;
  menit: number;
  detik: number;
} {
  const geser = new Date(waktu.getTime() + OFFSET_WIB_MS);
  return {
    tahun: geser.getUTCFullYear(),
    bulan: geser.getUTCMonth() + 1,
    hari: geser.getUTCDate(),
    jam: geser.getUTCHours(),
    menit: geser.getUTCMinutes(),
    detik: geser.getUTCSeconds(),
  };
}

/** ISO 8601 berzona WIB, mis. `2026-10-12T14:05:03+07:00` (API.md §1). */
export function isoWib(waktu: Date): string {
  const b = bagianWib(waktu);
  return `${b.tahun.toString()}-${dua(b.bulan)}-${dua(b.hari)}T${dua(b.jam)}:${dua(b.menit)}:${dua(b.detik)}+07:00`;
}

/** Tanggal kalender WIB `YYYY-MM-DD` dari sebuah Date (mis. untuk kolom `date` dan isian form). */
export function tanggalWib(waktu: Date): string {
  const b = bagianWib(waktu);
  return `${b.tahun.toString()}-${dua(b.bulan)}-${dua(b.hari)}`;
}

/** Tampilan tanggal saja, mis. `20/10/2026`, dari tanggal `YYYY-MM-DD` yang sudah divalidasi. */
export function formatTanggal(tanggal: string): string {
  return tanggal.replace(POLA_TANGGAL, '$3/$2/$1');
}

/** Tampilan antarmuka, mis. `12/10/2026 14:05:03 WIB`. */
export function formatWaktuWib(waktu: Date): string {
  const b = bagianWib(waktu);
  return `${dua(b.hari)}/${dua(b.bulan)}/${b.tahun.toString()} ${dua(b.jam)}:${dua(b.menit)}:${dua(b.detik)} WIB`;
}

/** Tanggal kalender `YYYY-MM-DD` yang sah (termasuk tahun kabisat). */
export function isTanggalKalender(nilai: string): boolean {
  const cocok = POLA_TANGGAL.exec(nilai);
  if (cocok === null) {
    return false;
  }
  const [tahun, bulan, hari] = [Number(cocok[1]), Number(cocok[2]), Number(cocok[3])];
  const tanggal = new Date(Date.UTC(tahun, bulan - 1, hari));
  return (
    tanggal.getUTCFullYear() === tahun &&
    tanggal.getUTCMonth() === bulan - 1 &&
    tanggal.getUTCDate() === hari
  );
}

/** Awal hari (00:00:00 WIB) dari tanggal `YYYY-MM-DD` yang sudah divalidasi. */
export function awalHariWib(tanggal: string): Date {
  const [tahun, bulan, hari] = tanggal.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(tahun, bulan - 1, hari) - OFFSET_WIB_MS);
}

/**
 * Rentang waktu untuk filter tanggal inklusif dalam WIB: `dari` mulai 00:00:00 WIB, `sampai`
 * sampai akhir hari itu (batas atas eksklusif = awal hari berikutnya).
 */
export function rentangTanggalWib(rentang: { dari?: string; sampai?: string }): {
  gte?: Date;
  lt?: Date;
} {
  const hasil: { gte?: Date; lt?: Date } = {};
  if (rentang.dari !== undefined) {
    hasil.gte = awalHariWib(rentang.dari);
  }
  if (rentang.sampai !== undefined) {
    hasil.lt = new Date(awalHariWib(rentang.sampai).getTime() + 24 * 60 * 60 * 1000);
  }
  return hasil;
}
