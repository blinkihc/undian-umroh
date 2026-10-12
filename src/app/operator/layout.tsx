import { type ReactElement, type ReactNode } from 'react';

import { KerangkaPanel } from '@/components/panel/kerangka-panel';
import { wajibPeran } from '@/server/auth/halaman';

export default async function OperatorLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  // Admin memiliki seluruh fitur Operator (SECURITY §2), jadi keduanya boleh masuk.
  const pengguna = await wajibPeran(['ADMIN', 'OPERATOR']);
  return <KerangkaPanel pengguna={pengguna}>{children}</KerangkaPanel>;
}
