/**
 * Deteksi magic bytes dan validasi tipe berkas aset (SECURITY §8, API.md §5, Tiket 23).
 */

import { AppError } from '@/server/errors';

export const MAKS_UKURAN_AUDIO_BYTE = 10 * 1024 * 1024; // 10 MB
export const MAKS_UKURAN_GAMBAR_BYTE = 5 * 1024 * 1024; // 5 MB

export type InfoFormatBerkas = {
  mime: string;
  ekstensi: string;
  jenis: 'AUDIO' | 'GAMBAR';
};

/**
 * Memeriksa apakah buffer berisi teks SVG (SECURITY §8: SVG dilarang keras untuk mencegah XSS).
 */
export function isSvg(buffer: Buffer): boolean {
  const teksAwal = buffer.subarray(0, 1024).toString('utf-8').toLowerCase();
  return (
    teksAwal.includes('<svg') ||
    teksAwal.includes('xmlns="http://www.w3.org/2000/svg"') ||
    teksAwal.includes('<?xml') && teksAwal.includes('<svg')
  );
}

/**
 * Memvalidasi magic bytes dan ukuran berkas.
 * Melempar AppError jika ukuran melebihi batas, berformat SVG, atau format tidak dikenali.
 */
export function deteksiDanValidasiFormat(
  buffer: Buffer,
  jenisDiharapkan: 'AUDIO' | 'GAMBAR',
): InfoFormatBerkas {
  // 1. Periksa batas ukuran
  const batasUkuran =
    jenisDiharapkan === 'AUDIO' ? MAKS_UKURAN_AUDIO_BYTE : MAKS_UKURAN_GAMBAR_BYTE;
  if (buffer.length > batasUkuran) {
    throw new AppError(
      'FILE_TERLALU_BESAR',
      413,
      `Ukuran berkas melebihi batas maksimal ${jenisDiharapkan === 'AUDIO' ? '10 MB' : '5 MB'}.`,
    );
  }

  // 2. Tolak SVG secara mutlak
  if (isSvg(buffer)) {
    throw new AppError(
      'FILE_TIDAK_VALID',
      400,
      'Format SVG tidak diizinkan demi keamanan sistem. Gunakan PNG, JPEG, atau WebP.',
    );
  }

  // 3. Deteksi magic bytes
  if (jenisDiharapkan === 'GAMBAR') {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { mime: 'image/png', ekstensi: 'png', jenis: 'GAMBAR' };
    }

    // JPEG: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mime: 'image/jpeg', ekstensi: 'jpg', jenis: 'GAMBAR' };
    }

    // WebP: RIFF .... WEBP
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { mime: 'image/webp', ekstensi: 'webp', jenis: 'GAMBAR' };
    }

    throw new AppError(
      'FILE_TIDAK_VALID',
      400,
      'Format gambar tidak didukung. Hanya PNG, JPEG, atau WebP yang diterima.',
    );
  }

  if (jenisDiharapkan === 'AUDIO') {
    // MP3 dengan ID3 tag: 'ID3' (49 44 33)
    if (buffer.length >= 3 && buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
      return { mime: 'audio/mpeg', ekstensi: 'mp3', jenis: 'AUDIO' };
    }

    // MP3 tanpa ID3 (frame sync 0xFF 0xEx atau 0xFF 0xFx)
    if (buffer.length >= 2 && buffer[0] === 0xff && ((buffer[1] ?? 0) & 0xe0) === 0xe0) {
      return { mime: 'audio/mpeg', ekstensi: 'mp3', jenis: 'AUDIO' };
    }

    // Ogg: 'OggS' (4F 67 67 53)
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x4f &&
      buffer[1] === 0x67 &&
      buffer[2] === 0x67 &&
      buffer[3] === 0x53
    ) {
      return { mime: 'audio/ogg', ekstensi: 'ogg', jenis: 'AUDIO' };
    }

    // WAV: RIFF .... WAVE
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x41 &&
      buffer[10] === 0x56 &&
      buffer[11] === 0x45
    ) {
      return { mime: 'audio/wav', ekstensi: 'wav', jenis: 'AUDIO' };
    }

    throw new AppError(
      'FILE_TIDAK_VALID',
      400,
      'Format audio tidak didukung. Hanya MP3, OGG, atau WAV yang diterima.',
    );
  }

  throw new AppError('FILE_TIDAK_VALID', 400, 'Format berkas tidak valid.');
}
