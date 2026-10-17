import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireRole } from '@/server/auth/sesi';
import { AppError } from '@/server/errors';
import { withHandler } from '@/server/http';
import { ambilDaftarAset, simpanAset } from '@/server/services/tema';

const JenisAsetSchema = z.enum(['AUDIO', 'GAMBAR']);
const FaseAudioSchema = z.enum(['MENUNGGU', 'MENGACAK', 'PEMENANG']).optional();

export const GET = withHandler(async (request) => {
  await requireRole(request, ['ADMIN', 'OPERATOR']);
  const url = new URL(request.url);
  const jenisParam = url.searchParams.get('jenis');
  const jenis = jenisParam === 'AUDIO' || jenisParam === 'GAMBAR' ? jenisParam : undefined;

  const items = await ambilDaftarAset(jenis);
  return NextResponse.json({ items });
});

export const POST = withHandler(async (request, { konteks }) => {
  const aktor = await requireRole(request, ['ADMIN']);
  const contentType = request.headers.get('content-type') ?? '';

  let buffer: Buffer;
  let nama: string;
  let deskripsi: string;
  let lisensi: string;
  let jenis: 'AUDIO' | 'GAMBAR';
  let fase: 'MENUNGGU' | 'MENGACAK' | 'PEMENANG' | undefined;
  let durasiDetik: number | undefined;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new AppError('FILE_TIDAK_VALID', 400, 'Berkas file wajib diunggah.');
    }
    buffer = Buffer.from(await file.arrayBuffer());
    nama = (formData.get('nama') as string | null)?.trim() || file.name;
    deskripsi = (formData.get('deskripsi') as string | null)?.trim() || '';
    lisensi = (formData.get('lisensi') as string | null)?.trim() || 'Lisensi Bapenda OKU Selatan';
    jenis = JenisAsetSchema.parse(formData.get('jenis'));
    const faseRaw = formData.get('fase');
    fase = faseRaw ? (FaseAudioSchema.parse(faseRaw) as typeof fase) : undefined;
    const durasiRaw = formData.get('durasiDetik');
    durasiDetik = durasiRaw ? Number(durasiRaw) : undefined;
  } else {
    // Format JSON (mendukung base64 untuk pengujian terprogram)
    const json = await request.json();
    const skema = z.object({
      fileBase64: z.string().min(1, 'File base64 wajib diisi'),
      nama: z.string().trim().min(1, 'Nama wajib diisi'),
      deskripsi: z.string().default(''),
      lisensi: z.string().default('Bebas Royalti'),
      jenis: JenisAsetSchema,
      fase: FaseAudioSchema,
      durasiDetik: z.number().optional(),
    });
    const parsed = skema.parse(json);
    buffer = Buffer.from(parsed.fileBase64, 'base64');
    nama = parsed.nama;
    deskripsi = parsed.deskripsi;
    lisensi = parsed.lisensi;
    jenis = parsed.jenis;
    fase = parsed.fase;
    durasiDetik = parsed.durasiDetik;
  }

  const hasil = await simpanAset({
    buffer,
    nama,
    deskripsi,
    lisensi,
    jenis,
    fase,
    durasiDetik,
    aktor,
    konteks,
  });

  return NextResponse.json(hasil, { status: 201 });
});
