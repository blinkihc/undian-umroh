import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { ambilDaftarTema, simpanTema } from '@/server/services/tema';

const SimpanTemaSchema = z.object({
  nama: z.string().trim().min(3, 'Nama tema minimal 3 karakter').max(80),
  config: z.record(z.string(), z.unknown()),
});

export const GET = withHandler(async (request) => {
  await requireRole(request, ['ADMIN']);
  const items = await ambilDaftarTema();
  return NextResponse.json({ items });
});

export const POST = withHandler(async (request, { konteks }) => {
  const aktor = await requireRole(request, ['ADMIN']);
  const json = await request.json();
  const parsed = SimpanTemaSchema.parse(json);

  const hasil = await simpanTema({
    nama: parsed.nama,
    config: parsed.config,
    aktor,
    konteks,
  });

  return NextResponse.json(hasil, { status: 201 });
});
