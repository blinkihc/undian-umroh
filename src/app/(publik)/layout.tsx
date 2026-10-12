import type { ReactNode } from 'react';

import { FooterPublik } from '@/components/publik/footer-publik';
import { HeaderPublik } from '@/components/publik/header-publik';

export default function PublikLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col">
      <HeaderPublik />
      <main className="flex-1">{children}</main>
      <FooterPublik />
    </div>
  );
}
