import { requireRole } from '@/server/auth/sesi';
import { withHandler } from '@/server/http';
import { hapusFotoDokumentasiPemenang } from '@/server/services/pemenang';

export const DELETE = withHandler<{ id: string; slot: string; fotoId: string }>(
  async (request, ctx) => {
    const pengguna = await requireRole(request, ['ADMIN']);

    const hasil = await hapusFotoDokumentasiPemenang(
      ctx.params.id,
      ctx.params.slot,
      ctx.params.fotoId,
      pengguna,
      ctx.konteks,
    );

    return { sukses: true, ...hasil };
  },
);
