import { describe, expect, it } from 'vitest';

import {
  GugurInputSchema,
  hitungKenaikanCadangan,
  hitungStatusWilayah,
  LihatNikInputSchema,
  normalisasiKodeSlotDb,
  slotDbKePaket,
  type SlotRingkas,
  VerifikasiInputSchema,
} from '@/lib/domain/pemenang';

describe('Logika Domain Pemenang & Kenaikan Cadangan (Tiket 18)', () => {
  function buatSlotsWilayahAwal(): SlotRingkas[] {
    return [
      { kode: 'W1-UTAMA', status: 'MENANG', penerimaAktif: true },
      { kode: 'W1-C1', status: 'CADANGAN', penerimaAktif: false },
      { kode: 'W1-C2', status: 'CADANGAN', penerimaAktif: false },
    ];
  }

  describe('hitungStatusWilayah', () => {
    it('mengembalikan ADA_PENERIMA saat ada penerima aktif berstatus MENANG', () => {
      const slots = buatSlotsWilayahAwal();
      expect(hitungStatusWilayah(slots)).toBe('ADA_PENERIMA');
    });

    it('mengembalikan TERVERIFIKASI saat penerima aktif berstatus TERVERIFIKASI', () => {
      const slots: SlotRingkas[] = [
        { kode: 'W1-UTAMA', status: 'TERVERIFIKASI', penerimaAktif: true },
        { kode: 'W1-C1', status: 'CADANGAN', penerimaAktif: false },
        { kode: 'W1-C2', status: 'CADANGAN', penerimaAktif: false },
      ];
      expect(hitungStatusWilayah(slots)).toBe('TERVERIFIKASI');
    });

    it('mengembalikan PERLU_KEPUTUSAN saat ketiga slot berstatus GUGUR', () => {
      const slots: SlotRingkas[] = [
        { kode: 'W1-UTAMA', status: 'GUGUR', penerimaAktif: false },
        { kode: 'W1-C1', status: 'GUGUR', penerimaAktif: false },
        { kode: 'W1-C2', status: 'GUGUR', penerimaAktif: false },
      ];
      expect(hitungStatusWilayah(slots)).toBe('PERLU_KEPUTUSAN');
    });
  });

  describe('hitungKenaikanCadangan', () => {
    it('kasus 1: utama gugur -> C1 otomatis naik menjadi penerima aktif (MENANG)', () => {
      const slots = buatSlotsWilayahAwal();

      const hasil = hitungKenaikanCadangan(slots, 'W1-UTAMA');

      expect(hasil.promotedKode).toBe('W1-C1');
      expect(hasil.statusWilayah).toBe('ADA_PENERIMA');

      const utama = hasil.slots.find((s) => s.kode === 'W1-UTAMA');
      const c1 = hasil.slots.find((s) => s.kode === 'W1-C1');
      const c2 = hasil.slots.find((s) => s.kode === 'W1-C2');

      expect(utama).toEqual({ kode: 'W1-UTAMA', status: 'GUGUR', penerimaAktif: false });
      expect(c1).toEqual({ kode: 'W1-C1', status: 'MENANG', penerimaAktif: true });
      expect(c2).toEqual({ kode: 'W1-C2', status: 'CADANGAN', penerimaAktif: false });
    });

    it('kasus 2: utama dan C1 gugur -> C2 otomatis naik menjadi penerima aktif (MENANG)', () => {
      const slotsAwal = buatSlotsWilayahAwal();

      // Langkah 1: Utama gugur
      const setelahUtamaGugur = hitungKenaikanCadangan(slotsAwal, 'W1-UTAMA');
      expect(setelahUtamaGugur.promotedKode).toBe('W1-C1');

      // Langkah 2: C1 gugur
      const setelahC1Gugur = hitungKenaikanCadangan(setelahUtamaGugur.slots, 'W1-C1');

      expect(setelahC1Gugur.promotedKode).toBe('W1-C2');
      expect(setelahC1Gugur.statusWilayah).toBe('ADA_PENERIMA');

      const utama = setelahC1Gugur.slots.find((s) => s.kode === 'W1-UTAMA');
      const c1 = setelahC1Gugur.slots.find((s) => s.kode === 'W1-C1');
      const c2 = setelahC1Gugur.slots.find((s) => s.kode === 'W1-C2');

      expect(utama).toEqual({ kode: 'W1-UTAMA', status: 'GUGUR', penerimaAktif: false });
      expect(c1).toEqual({ kode: 'W1-C1', status: 'GUGUR', penerimaAktif: false });
      expect(c2).toEqual({ kode: 'W1-C2', status: 'MENANG', penerimaAktif: true });
    });

    it('kasus 3: C1 gugur sebelum utama -> saat utama gugur, melewati C1 dan C2 langsung naik', () => {
      const slotsAwal = buatSlotsWilayahAwal();

      // Langkah 1: C1 gugur terlebih dahulu (mis. konfirmasi di awal tidak lolos berkas)
      const setelahC1Gugur = hitungKenaikanCadangan(slotsAwal, 'W1-C1');

      // C1 bukan penerima aktif, jadi tidak ada promosi, Utama tetap aktif
      expect(setelahC1Gugur.promotedKode).toBeNull();
      expect(setelahC1Gugur.statusWilayah).toBe('ADA_PENERIMA');

      const utamaAwal = setelahC1Gugur.slots.find((s) => s.kode === 'W1-UTAMA');
      const c1Awal = setelahC1Gugur.slots.find((s) => s.kode === 'W1-C1');
      const c2Awal = setelahC1Gugur.slots.find((s) => s.kode === 'W1-C2');

      expect(utamaAwal).toEqual({ kode: 'W1-UTAMA', status: 'MENANG', penerimaAktif: true });
      expect(c1Awal).toEqual({ kode: 'W1-C1', status: 'GUGUR', penerimaAktif: false });
      expect(c2Awal).toEqual({ kode: 'W1-C2', status: 'CADANGAN', penerimaAktif: false });

      // Langkah 2: Utama kemudian gugur -> harus melompati C1 dan mempromosikan C2
      const setelahUtamaGugur = hitungKenaikanCadangan(setelahC1Gugur.slots, 'W1-UTAMA');

      expect(setelahUtamaGugur.promotedKode).toBe('W1-C2');
      expect(setelahUtamaGugur.statusWilayah).toBe('ADA_PENERIMA');

      const utamaAkhir = setelahUtamaGugur.slots.find((s) => s.kode === 'W1-UTAMA');
      const c1Akhir = setelahUtamaGugur.slots.find((s) => s.kode === 'W1-C1');
      const c2Akhir = setelahUtamaGugur.slots.find((s) => s.kode === 'W1-C2');

      expect(utamaAkhir).toEqual({ kode: 'W1-UTAMA', status: 'GUGUR', penerimaAktif: false });
      expect(c1Akhir).toEqual({ kode: 'W1-C1', status: 'GUGUR', penerimaAktif: false });
      expect(c2Akhir).toEqual({ kode: 'W1-C2', status: 'MENANG', penerimaAktif: true });
    });

    it('kasus 4: ketiganya gugur -> tidak ada yang dipromosikan dan wilayah berstatus PERLU_KEPUTUSAN', () => {
      const slotsAwal = buatSlotsWilayahAwal();

      const langkah1 = hitungKenaikanCadangan(slotsAwal, 'W1-UTAMA');
      const langkah2 = hitungKenaikanCadangan(langkah1.slots, 'W1-C1');
      const langkah3 = hitungKenaikanCadangan(langkah2.slots, 'W1-C2');

      expect(langkah3.promotedKode).toBeNull();
      expect(langkah3.statusWilayah).toBe('PERLU_KEPUTUSAN');
      expect(langkah3.slots.every((s) => s.status === 'GUGUR' && !s.penerimaAktif)).toBe(true);
    });
  });

  describe('Skema Validasi Input', () => {
    it('memvalidasi GugurInputSchema', () => {
      const valid = GugurInputSchema.safeParse({
        version: 1,
        alasan: 'TIDAK_DAPAT_DIHUBUNGI',
        catatan: 'Tidak merespons setelah 3 kali panggilan.',
      });
      expect(valid.success).toBe(true);

      const alasanSalah = GugurInputSchema.safeParse({
        version: 1,
        alasan: 'ALASAN_PALSU',
        catatan: 'Catatan valid panjangnya cukup.',
      });
      expect(alasanSalah.success).toBe(false);

      const catatanTerlaluPendek = GugurInputSchema.safeParse({
        version: 1,
        alasan: 'LAINNYA',
        catatan: 'pend',
      });
      expect(catatanTerlaluPendek.success).toBe(false);
    });

    it('memvalidasi VerifikasiInputSchema', () => {
      expect(VerifikasiInputSchema.safeParse({ version: 2 }).success).toBe(true);
      expect(VerifikasiInputSchema.safeParse({ version: 0 }).success).toBe(false);
    });

    it('memvalidasi LihatNikInputSchema', () => {
      expect(LihatNikInputSchema.safeParse({ alasan: 'Verifikasi identitas' }).success).toBe(true);
      expect(LihatNikInputSchema.safeParse({ alasan: '1234' }).success).toBe(false);
    });
  });

  describe('Konversi Kode Slot', () => {
    it('mengonversi DB ke Paket dan sebaliknya', () => {
      expect(slotDbKePaket('W1_UTAMA')).toBe('W1-UTAMA');
      expect(normalisasiKodeSlotDb('W1-UTAMA')).toBe('W1_UTAMA');
      expect(normalisasiKodeSlotDb('W2_C2')).toBe('W2_C2');
      expect(normalisasiKodeSlotDb('INVALID')).toBeNull();
    });
  });
});
