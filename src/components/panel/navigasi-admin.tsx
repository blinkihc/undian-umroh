'use client';

import { CalendarRange, LayoutDashboard, ScrollText, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactElement } from 'react';

type ItemMenu = { href: string; label: string; Ikon: LucideIcon; tepat?: boolean };

/**
 * Menu Panel Admin (DESIGN_SYSTEM §11). Item ditambahkan oleh tiket pemilik fiturnya
 * (Tema Undian) saat halaman tersebut tersedia; sub-menu periode (Data Peserta, Wilayah, dst.)
 * menjadi tab di halaman periode.
 */
export const MENU_ADMIN: readonly ItemMenu[] = [
  { href: '/admin', label: 'Dasbor', Ikon: LayoutDashboard, tepat: true },
  { href: '/admin/periode', label: 'Periode', Ikon: CalendarRange },
  { href: '/admin/pengguna', label: 'Pengguna', Ikon: Users },
  { href: '/admin/audit', label: 'Log Audit', Ikon: ScrollText },
];

function aktif(jalur: string, item: ItemMenu): boolean {
  if (item.tepat === true) {
    return jalur === item.href;
  }
  return jalur === item.href || jalur.startsWith(`${item.href}/`);
}

/** Sidebar 256px; di bawah 768px menjadi baris menu di atas konten. */
export function NavigasiAdmin(): ReactElement {
  const jalur = usePathname();
  return (
    <nav
      aria-label="Menu Admin"
      className="border-b border-neutral-300 bg-neutral-50 md:w-64 md:shrink-0 md:border-r md:border-b-0"
    >
      <ul className="flex gap-1 overflow-x-auto px-4 py-2 md:flex-col md:px-3 md:py-6">
        {MENU_ADMIN.map((item) => {
          const sedangAktif = aktif(jalur, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={sedangAktif ? 'page' : undefined}
                className={`flex h-11 items-center gap-3 rounded-sm border-l-[3px] px-3 text-sm font-medium whitespace-nowrap ${
                  sedangAktif
                    ? 'border-primary-700 bg-primary-100 text-primary-700'
                    : 'border-transparent text-neutral-900 hover:bg-primary-100'
                }`}
              >
                <item.Ikon aria-hidden="true" className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
