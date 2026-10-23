import { z } from 'zod';

import { requireRole } from '@/server/auth/sesi';
import { AppError } from '@/server/errors';
import { withHandler } from '@/server/http';
import {
  perbaruiCatatanSimbolisPemenang,
  unggahFotoDokumentasiPemenang,
} from '@/server/services/pemenang';

const CatatanInputSchema = z.object({
  catatan: z.string().trim().max(500, 'Catatan maksimal 500 karakter.').optional().default(''),
  diserahkanAt: z.string().trim().nullable().optional(),
});

export const POST = withHandler<{ id: string; slot: string }>(async (request, ctx) => {
  const pengguna = await requireRole(request, ['ADMIN']);
  const contentType = request.headers.get('content-type') ?? '';

  let buffer: Buffer;
  let nama: string;
  let catatan: string | undefined;

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new AppError('FILE_TIDAK_VALID', 400, 'Berkas foto bukti penyerahan wajib diunggah.');
    }
    buffer = Buffer.from(await file.arrayBuffer());
    nama = file.name;
    const catatanRaw = formData.get('catatan');
    catatan = typeof catatanRaw === 'string' ? catatanRaw.trim() : undefined;
  } else {
    const json = (await request.json()) as Record<string, unknown>;
    const skema = z.object({
      fileBase64: z.string().min(1, 'File base64 wajib diisi'),
      nama: z.string().trim().min(1, 'Nama file wajib diisi'),
      catatan: z.string().trim().max(500).optional(),
    });
    const parsed = skema.parse(json);
    buffer = Buffer.from(parsed.fileBase64, 'base64');
    nama = parsed.nama;
    catatan = parsed.catatan;
  }

  const hasil = await unggahFotoDokumentasiPemenang(
    ctx.params.id,
    ctx.params.slot,
    { buffer, nama },
    catatan,
    pengguna,
    ctx.konteks,
  );

  return { sukses: true, ...hasil };
});

export const PATCH = withHandler<{ id: string; slot: string }>(async (request, ctx) => {
  const pengguna = await requireRole(request, ['ADMIN']);
  const json = (await request.json()) as Record<string, unknown>;
  const parsed = CatatanInputSchema.parse(json);

  const hasil = await perbaruiCatatanSimbolisPemenang(
    ctx.params.id,
    ctx.params.slot,
    parsed.catatan,
    parsed.diserahkanAt,
    pengguna,
    ctx.konteks,
  );

  return { sukses: true, ...hasil };
});
