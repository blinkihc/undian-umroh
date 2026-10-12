import { type Result } from './result';

export type GalatTanggal = 'TANGGAL_KOSONG' | 'TANGGAL_TIDAK_DIKENALI';

const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

/** `dd/mm/yyyy` atau `dd-mm-yyyy`, opsional jam `HH:MM` atau `HH:MM:SS`. */
const POLA_HARI_DULU = /^(\d{1,2})([/-])(\d{1,2})\2(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

/** ISO `yyyy-mm-dd`, opsional jam dipisah spasi atau `T`. */
const POLA_ISO = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

/** Hari 0 serial tanggal Excel (sistem 1900, sudah memperhitungkan bug tahun kabisat 1900). */
const AWAL_SERIAL_EXCEL_MS = Date.UTC(1899, 11, 30);

/** Batas serial Excel yang masuk akal: 1 Januari 1900 sampai 31 Desember 9999. */
const SERIAL_MIN = 1;
const SERIAL_MAKS = 2_958_465;

type Bagian = {
  tahun: number;
  bulan: number;
  hari: number;
  jam: number;
  menit: number;
  detik: number;
};

/** Waktu WIB dari komponen kalender; null bila tanggal/jam tidak ada di kalender. */
function keWaktuWib(b: Bagian): Date | null {
  if (b.bulan < 1 || b.bulan > 12 || b.jam > 23 || b.menit > 59 || b.detik > 59) {
    return null;
  }
  const utc = Date.UTC(b.tahun, b.bulan - 1, b.hari, b.jam, b.menit, b.detik);
  const cek = new Date(utc);
  if (cek.getUTCFullYear() !== b.tahun || cek.getUTCDate() !== b.hari) {
    return null;
  }
  return new Date(utc - OFFSET_WIB_MS);
}

function angka(teks: string | undefined): number {
  return teks === undefined ? 0 : Number(teks);
}

function dariSerialExcel(serial: number): Result<Date, GalatTanggal> {
  if (!Number.isFinite(serial) || serial < SERIAL_MIN || serial > SERIAL_MAKS) {
    return { ok: false, error: 'TANGGAL_TIDAK_DIKENALI' };
  }
  // Serial dibaca sebagai waktu dinding WIB, dibulatkan ke detik terdekat.
  const detik = Math.round(serial * 86_400);
  return { ok: true, value: new Date(AWAL_SERIAL_EXCEL_MS + detik * 1000 - OFFSET_WIB_MS) };
}

/**
 * Tanggal lunas dalam WIB (PRD §6.0). Teks: `dd/mm/yyyy HH:MM:SS` (format utama), `dd/mm/yyyy`,
 * `dd-mm-yyyy`, atau ISO `yyyy-mm-dd`. Angka: serial tanggal Excel dari sel XLSX. Format AS
 * (`mm/dd/yyyy`) sengaja tidak dikenali agar tidak tertukar diam-diam.
 */
export function parseTanggalLunas(nilai: string | number): Result<Date, GalatTanggal> {
  if (typeof nilai === 'number') {
    return dariSerialExcel(nilai);
  }
  const teks = nilai.trim();
  if (teks === '') {
    return { ok: false, error: 'TANGGAL_KOSONG' };
  }
  const hariDulu = POLA_HARI_DULU.exec(teks);
  const iso = hariDulu === null ? POLA_ISO.exec(teks) : null;
  let bagian: Bagian | null = null;
  if (hariDulu !== null) {
    bagian = {
      hari: angka(hariDulu[1]),
      bulan: angka(hariDulu[3]),
      tahun: angka(hariDulu[4]),
      jam: angka(hariDulu[5]),
      menit: angka(hariDulu[6]),
      detik: angka(hariDulu[7]),
    };
  } else if (iso !== null) {
    bagian = {
      tahun: angka(iso[1]),
      bulan: angka(iso[2]),
      hari: angka(iso[3]),
      jam: angka(iso[4]),
      menit: angka(iso[5]),
      detik: angka(iso[6]),
    };
  }
  const waktu = bagian === null ? null : keWaktuWib(bagian);
  return waktu === null
    ? { ok: false, error: 'TANGGAL_TIDAK_DIKENALI' }
    : { ok: true, value: waktu };
}

function dua(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Teks `dd/mm/yyyy HH:MM:SS` (format utama file ekspor) dari waktu WIB. Dipakai untuk menyimpan
 * sel tanggal XLSX sebagai nilai asli yang dapat dibaca ulang `parseTanggalLunas`.
 */
export function formatTanggalLunas(waktu: Date): string {
  const g = new Date(waktu.getTime() + OFFSET_WIB_MS);
  return `${dua(g.getUTCDate())}/${dua(g.getUTCMonth() + 1)}/${g.getUTCFullYear().toString()} ${dua(g.getUTCHours())}:${dua(g.getUTCMinutes())}:${dua(g.getUTCSeconds())}`;
}

/**
 * Teks sel angka XLSX. Bilangan bulat di luar rentang aman (mis. NOP 18 digit yang tersimpan
 * sebagai angka) sudah kehilangan presisi di Excel, jadi ditulis dalam notasi ilmiah agar
 * dikenali tidak valid, bukan berubah diam-diam menjadi NOP lain.
 */
export function teksSelAngka(nilai: number): string {
  if (Number.isInteger(nilai) && !Number.isSafeInteger(nilai)) {
    return nilai.toExponential().toUpperCase();
  }
  return nilai.toString();
}

/** Awal tahun pajak (1 Januari 00:00:00 WIB). */
export function awalTahunWib(tahun: number): Date {
  return new Date(Date.UTC(tahun, 0, 1) - OFFSET_WIB_MS);
}
