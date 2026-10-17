import { z } from 'zod';

import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { pilihTemaPeriode } from '@/server/services/tema';

const PilihTemaSchema = z.object({
  temaId: z.string().min(1, 'ID tema wajib diisi'),
});

export const PUT = withHandler<{ id: string }>(async (request, { params, konteks }) => {
  const aktor = await requireRole(request, ['ADMIN']);
  const json = await request.json();
  const parsed = PilihTemaSchema.parse(json);

  const hasil = await pilihTemaPeriode({
    periodeId: params.id,
    temaId: parsed.temaId,
    aktor,
    konteks,
  });

  return hasil;
});
