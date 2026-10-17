import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireRole } from '@/server/auth/sesi';
import { getDb } from '@/server/db';
import { AppError } from '@/server/errors';
import { withHandler } from '@/server/http';
import { simpanTema } from '@/server/services/tema';

const UbahTemaSchema = z.object({
  nama: z.string().trim().min(3).max(80),
  config: z.record(z.string(), z.unknown()),
});

export const GET = withHandler<{ id: string }>(async (request, { params }) => {
  await requireRole(request, ['ADMIN']);
  const tema = await getDb().tema.findUnique({
    where: { id: params.id },
  });

  if (tema === null) {
    throw new AppError('TIDAK_DITEMUKAN', 404, 'Tema tidak ditemukan.');
  }

  return NextResponse.json(tema);
});

export const PUT = withHandler<{ id: string }>(async (request, { params, konteks }) => {
  const aktor = await requireRole(request, ['ADMIN']);
  const json = await request.json();
  const parsed = UbahTemaSchema.parse(json);

  const hasil = await simpanTema({
    id: params.id,
    nama: parsed.nama,
    config: parsed.config,
    aktor,
    konteks,
  });

  return NextResponse.json(hasil);
});
