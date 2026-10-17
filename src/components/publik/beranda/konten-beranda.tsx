import { type ReactElement } from 'react';

import { type RingkasanBeranda } from '@/server/services/beranda';
import { FaqAccordion } from './faq-accordion';
import { HeroBeranda } from './hero-beranda';
import { KriteriaPeserta } from './kriteria-peserta';
import { KuotaWilayah } from './kuota-wilayah';
import { PortalInspeksiInline } from './portal-inspeksi-inline';
import { SidikAuditHash } from './sidik-audit-hash';

type KontenBerandaProps = {
  ringkasan: RingkasanBeranda;
};

export function KontenBeranda({ ringkasan }: KontenBerandaProps): ReactElement {
  return (
    <div className="space-y-20 py-4">
      {/* 1. Hero Panggung Utama */}
      <HeroBeranda ringkasan={ringkasan} />

      {/* 2. Terminal Cek Status NOP (Tombol: CEK DATA) */}
      <PortalInspeksiInline />

      {/* 3. Alokasi Kuota Hadiah (Zona 1 & Zona 2) */}
      <KuotaWilayah />

      {/* 4. Kriteria Sah Kepesertaan (01: Wajib Pajak Pribadi) */}
      <KriteriaPeserta />

      {/* 5. Sidik Digital Snapshot SHA-256 (Integritas Kriptografis) */}
      <SidikAuditHash
        snapshotHashPenuh={ringkasan.snapshotHashPenuh}
        statusKunci={ringkasan.statusKunci}
      />

      {/* 6. Tanya Jawab (FAQ) & WhatsApp Helpdesk Terkonfigurasi */}
      <FaqAccordion />
    </div>
  );
}
