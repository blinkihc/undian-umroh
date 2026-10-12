import { type ReactElement, type ReactNode } from 'react';

import { LogoResmi } from '@/components/ui/logo-resmi';

type KartuAutentikasiProps = {
  judul: string;
  deskripsi: string;
  children: ReactNode;
};

/** Kerangka halaman tanpa navigasi untuk login dan ganti kata sandi: logo resmi di atas kartu. */
export function KartuAutentikasi({
  judul,
  deskripsi,
  children,
}: KartuAutentikasiProps): ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-8">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center">
          <LogoResmi tinggiOkus={48} />
        </div>
        <section className="mt-6 rounded-md border border-neutral-300 bg-neutral-0 p-6 shadow-sm">
          <h1 className="font-heading text-h2 font-bold text-neutral-900">{judul}</h1>
          <p className="mt-1 text-sm text-neutral-600">{deskripsi}</p>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
