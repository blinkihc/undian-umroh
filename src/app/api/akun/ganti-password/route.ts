import { GantiPasswordSchema } from '@/lib/domain';
import { requireUser } from '@/server/auth/sesi';
import { bacaJson, withHandler } from '@/server/http';
import { gantiPassword } from '@/server/services/autentikasi';

export const POST = withHandler(async (request, ctx) => {
  // Akun wajib-ganti kata sandi harus tetap dapat memanggil endpoint ini.
  const pengguna = await requireUser(request, { izinkanGantiPassword: true });
  ctx.userId = pengguna.id;
  const masukan = await bacaJson(request, GantiPasswordSchema);
  await gantiPassword({ penggunaId: pengguna.id, ...masukan, konteks: ctx.konteks });
  return { mustChangePassword: false };
});
