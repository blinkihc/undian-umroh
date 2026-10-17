import { type ReactElement, type ReactNode } from 'react';

import { KerangkaPanel } from '@/components/panel/kerangka-panel';
import { wajibPeran } from '@/server/auth/halaman';

export default async function OperatorPanelLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  const pengguna = await wajibPeran(['ADMIN', 'OPERATOR']);
  return <KerangkaPanel pengguna={pengguna}>{children}</KerangkaPanel>;
}
