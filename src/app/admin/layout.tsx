import { type ReactElement, type ReactNode } from 'react';

import { KerangkaPanel } from '@/components/panel/kerangka-panel';
import { wajibPeran } from '@/server/auth/halaman';

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  const pengguna = await wajibPeran(['ADMIN']);
  return <KerangkaPanel pengguna={pengguna}>{children}</KerangkaPanel>;
}
