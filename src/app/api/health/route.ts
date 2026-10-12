import { responsJson, withHandler } from '@/server/http';
import { cekKesehatan } from '@/server/services/kesehatan';

// Status harus dihitung setiap kali dipanggil, bukan di-cache saat build.
export const dynamic = 'force-dynamic';

export const GET = withHandler(async () => {
  const hasil = await cekKesehatan();
  return responsJson(hasil, { status: hasil.status === 'ok' ? 200 : 503 });
});
