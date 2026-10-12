'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactElement } from 'react';

/**
 * Tab halaman periode Admin. Tab berikutnya (Wilayah, Kunci Data, Paket Undian, …) ditambahkan
 * oleh tiket pemiliknya (DESIGN_SYSTEM §11 sub-menu Periode).
 */
function daftarTab(id: string): { href: string; label: string }[] {
  return [
    { href: `/admin/periode/${id}/peserta`, label: 'Data Peserta' },
    { href: `/admin/periode/${id}/wilayah`, label: 'Wilayah' },
    { href: `/admin/periode/${id}/kunci`, label: 'Kunci Data' },
    { href: `/admin/periode/${id}/paket`, label: 'Paket Undian' },
    { href: `/admin/periode/${id}/hasil`, label: 'Unggah Hasil' },
    { href: `/admin/periode/${id}`, label: 'Pengaturan' },
  ];
}

export function TabPeriode({ id }: { id: string }): ReactElement {
  const jalur = usePathname();
  return (
    <nav aria-label="Menu periode" className="border-b border-neutral-300">
      <ul className="flex gap-1 overflow-x-auto">
        {daftarTab(id).map((tab) => {
          const aktif = jalur === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={aktif ? 'page' : undefined}
                className={`-mb-px flex h-11 items-center border-b-[3px] px-4 text-sm font-medium whitespace-nowrap ${
                  aktif
                    ? 'border-primary-700 text-primary-700'
                    : 'border-transparent text-neutral-600 hover:text-primary-700'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
