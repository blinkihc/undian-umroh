import { type PesertaSnapshot } from '@/lib/package/snapshot';
import { type KodeSlotPaket } from '@/lib/package/kontrak';

export type PesertaUndian = PesertaSnapshot;

export type HasilSlotUndian = {
  urutan: number;
  kode: KodeSlotPaket;
  urut: number;
  diundiAt: string;
  pemenang: PesertaUndian;
};

export type FaseUndian =
  | 'MEMUAT'
  | 'SIAP'
  | 'MENUNGGU'
  | 'MENGACAK'
  | 'PEMENANG'
  | 'SELESAI';

export type CatatanLokalUndian = {
  at: string;
  jenis: string;
  slot?: string;
  detail?: string;
};

export type StateUndian = {
  fase: FaseUndian;
  slotAktifIndex: number; // 0..5
  slotSelesai: HasilSlotUndian[];
  dimulaiAt: string | null;
  selesaiAt: string | null;
  catatanLokal: CatatanLokalUndian[];
};
