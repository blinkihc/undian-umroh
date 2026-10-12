import { describe, expect, it } from 'vitest';

import { bangunFileHasil } from '@/lib/draw/hasil';
import { type HasilSlotUndian, type StateUndian } from '@/lib/draw/types';
import {
  verifikasiHasilMurni,
  type KonteksVerifikasiHasil,
  type PesertaSnapshotInfo,
} from '@/lib/draw/verifikasi';
import { type PesertaSnapshot } from '@/lib/package/snapshot';

describe('Verifikasi Hasil Undian (10 Pemeriksaan Berurutan)', () => {
  const periodeId = 'clx_periode_01';
  const snapshotHash = '1111111111111111111111111111111111111111111111111111111111111111';
  const temaConfigHash = '2222222222222222222222222222222222222222222222222222222222222222';
  const snapshotLockedAt = '2026-10-12T08:00:00.000Z';

  const pesertaMap = new Map<number, PesertaSnapshotInfo>([
    [1, { id: 'peserta_1', wilayah: 'W1' }],
    [2, { id: 'peserta_2', wilayah: 'W1' }],
    [3, { id: 'peserta_3', wilayah: 'W1' }],
    [4, { id: 'peserta_4', wilayah: 'W2' }],
    [5, { id: 'peserta_5', wilayah: 'W2' }],
    [6, { id: 'peserta_6', wilayah: 'W2' }],
    [7, { id: 'peserta_7', wilayah: 'W1' }],
    [8, { id: 'peserta_8', wilayah: 'W2' }],
  ]);

  const konteksValid: KonteksVerifikasiHasil = {
    periodeId,
    snapshotHash,
    snapshotLockedAt,
    pesertaByUrut: pesertaMap,
    sudahAdaHasil: null,
  };

  function dummyPeserta(
    urut: number,
    wilayah: 'W1' | 'W2',
    nama: string,
    kecamatan: string,
  ): PesertaSnapshot {
    return {
      urut,
      wilayah,
      nopMasked: '16.09.010.xxx.xxx-0001.0',
      nikMasked: '1609xxxxxxxx0001',
      nama,
      alamatWp: 'Alamat WP',
      alamatOp: 'Alamat OP',
      kecamatan,
      kelurahan: 'Kelurahan',
      lunas: [
        '2022-06-01T00:00:00Z',
        '2023-06-01T00:00:00Z',
        '2024-06-01T00:00:00Z',
        '2025-06-01T00:00:00Z',
        '2026-06-01T00:00:00Z',
      ],
    };
  }

  function slotBawaan(): HasilSlotUndian[] {
    return [
      {
        urutan: 1,
        kode: 'W1-UTAMA',
        urut: 1,
        pemenang: dummyPeserta(1, 'W1', 'Pemenang 1', 'MUARADUA'),
        diundiAt: '2026-10-12T09:05:00.000Z',
      },
      {
        urutan: 2,
        kode: 'W1-C1',
        urut: 2,
        pemenang: dummyPeserta(2, 'W1', 'Cadangan 1 W1', 'MUARADUA'),
        diundiAt: '2026-10-12T09:10:00.000Z',
      },
      {
        urutan: 3,
        kode: 'W1-C2',
        urut: 3,
        pemenang: dummyPeserta(3, 'W1', 'Cadangan 2 W1', 'MUARADUA'),
        diundiAt: '2026-10-12T09:15:00.000Z',
      },
      {
        urutan: 4,
        kode: 'W2-UTAMA',
        urut: 4,
        pemenang: dummyPeserta(4, 'W2', 'Pemenang 2', 'BANDING AGUNG'),
        diundiAt: '2026-10-12T09:20:00.000Z',
      },
      {
        urutan: 5,
        kode: 'W2-C1',
        urut: 5,
        pemenang: dummyPeserta(5, 'W2', 'Cadangan 1 W2', 'BANDING AGUNG'),
        diundiAt: '2026-10-12T09:25:00.000Z',
      },
      {
        urutan: 6,
        kode: 'W2-C2',
        urut: 6,
        pemenang: dummyPeserta(6, 'W2', 'Cadangan 2 W2', 'BANDING AGUNG'),
        diundiAt: '2026-10-12T09:30:00.000Z',
      },
    ];
  }

  function buatState(
    slotSelesai: HasilSlotUndian[],
    dimulaiAt?: string,
    selesaiAt?: string,
  ): StateUndian {
    return {
      fase: 'SELESAI',
      slotAktifIndex: 5,
      slotSelesai,
      dimulaiAt: dimulaiAt ?? '2026-10-12T09:00:00.000Z',
      selesaiAt: selesaiAt ?? '2026-10-12T09:35:00.000Z',
      catatanLokal: [],
    };
  }

  async function buatHasilValid() {
    return bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: { id: 'dev_test_123', userAgent: 'Vitest' },
      state: buatState(slotBawaan()),
    });
  }

  it('1. Lolos verifikasi untuk hasil yang valid dan utuh', async () => {
    const hasil = await buatHasilValid();
    const verif = await verifikasiHasilMurni(hasil, konteksValid);
    expect(verif.valid).toBe(true);
    if (verif.valid) {
      expect(verif.data.hasilHash).toBe(hasil.hasilHash);
    }
  });

  it('2. Menolak format file yang tidak valid (Pemeriksaan FORMAT)', async () => {
    const verif = await verifikasiHasilMurni({ invalid: true }, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('FORMAT');
      expect(verif.pesan).toBe('File hasil tidak valid.');
    }
  });

  it('3. Menolak periodeId yang tidak cocok (Pemeriksaan PERIODE)', async () => {
    const hasil = await buatHasilValid();
    const rusak = { ...hasil, periodeId: 'clx_periode_lain' };
    const verif = await verifikasiHasilMurni(rusak, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('PERIODE');
      expect(verif.pesan).toBe('File hasil bukan untuk periode ini.');
    }
  });

  it('4. Menolak snapshotHash yang tidak cocok (Pemeriksaan SNAPSHOT_HASH)', async () => {
    const hasil = await buatHasilValid();
    const rusak = {
      ...hasil,
      snapshotHash: '3333333333333333333333333333333333333333333333333333333333333333',
    };
    const verif = await verifikasiHasilMurni(rusak, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('SNAPSHOT_HASH');
      expect(verif.pesan).toBe('File hasil bukan untuk periode ini (hash data tidak cocok).');
    }
  });

  it('5. Menolak hasilHash yang dimanipulasi atau isi diubah (Pemeriksaan HASIL_HASH)', async () => {
    const hasil = await buatHasilValid();
    const manipulasi = {
      ...hasil,
      slot: hasil.slot.map((s, idx) => (idx === 0 ? { ...s, urut: 7 } : s)),
    };
    const verif = await verifikasiHasilMurni(manipulasi, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('HASIL_HASH');
      expect(verif.pesan).toBe('Isi file hasil telah diubah.');
    }
  });

  it('6. Menolak bila slot tidak lengkap atau urutan salah (Pemeriksaan SLOT_LENGKAP)', async () => {
    const daftarSlot = slotBawaan();
    const s0 = daftarSlot[0];
    const s1 = daftarSlot[1];
    if (!s0 || !s1) {
      throw new Error('Data slot awal tidak valid');
    }
    const slotSalah: HasilSlotUndian[] = [
      {
        urutan: 1,
        kode: 'W1-C1',
        urut: s0.urut,
        pemenang: s0.pemenang,
        diundiAt: s0.diundiAt,
      },
      {
        urutan: 2,
        kode: 'W1-UTAMA',
        urut: s1.urut,
        pemenang: s1.pemenang,
        diundiAt: s1.diundiAt,
      },
      ...daftarSlot.slice(2),
    ];

    const hasilSalah = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: { id: 'dev_1', userAgent: 'Vitest' },
      state: buatState(slotSalah),
    });

    const verif = await verifikasiHasilMurni(hasilSalah, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('SLOT_LENGKAP');
      expect(verif.pesan).toBe('Slot undian tidak lengkap atau urutannya salah.');
    }
  });

  it('7. Menolak bila peserta tidak ada di snapshot (Pemeriksaan PESERTA_ADA)', async () => {
    const daftarSlot = slotBawaan();
    const s0 = daftarSlot[0];
    if (!s0) {
      throw new Error('Data slot awal tidak valid');
    }
    const slotHilang: HasilSlotUndian[] = [
      {
        urutan: s0.urutan,
        kode: s0.kode,
        urut: 99999,
        pemenang: s0.pemenang,
        diundiAt: s0.diundiAt,
      },
      ...daftarSlot.slice(1),
    ];

    const hasilSalah = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: { id: 'dev_1', userAgent: 'Vitest' },
      state: buatState(slotHilang),
    });

    const verif = await verifikasiHasilMurni(hasilSalah, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('PESERTA_ADA');
      expect(verif.pesan).toContain('tidak ditemukan di data terkunci');
    }
  });

  it('8. Menolak bila wilayah peserta tidak sesuai slot (Pemeriksaan WILAYAH_SESUAI)', async () => {
    const daftarSlot = slotBawaan();
    const s0 = daftarSlot[0];
    if (!s0) {
      throw new Error('Data slot awal tidak valid');
    }
    // Peserta urut 4 adalah wilayah W2, tapi ditaruh di slot W1-UTAMA
    const slotTukar: HasilSlotUndian[] = [
      {
        urutan: s0.urutan,
        kode: s0.kode,
        urut: 4,
        pemenang: s0.pemenang,
        diundiAt: s0.diundiAt,
      },
      ...daftarSlot.slice(1),
    ];

    const hasilSalah = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: { id: 'dev_1', userAgent: 'Vitest' },
      state: buatState(slotTukar),
    });

    const verif = await verifikasiHasilMurni(hasilSalah, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('WILAYAH_SESUAI');
      expect(verif.pesan).toContain('bukan dari Wilayah 1');
    }
  });

  it('9. Menolak peserta duplikat di lebih dari 1 slot (Pemeriksaan PESERTA_UNIK)', async () => {
    const daftarSlot = slotBawaan();
    const s0 = daftarSlot[0];
    const s1 = daftarSlot[1];
    if (!s0 || !s1) {
      throw new Error('Data slot awal tidak valid');
    }
    // Peserta urut 1 muncul di slot 1 dan slot 2
    const slotGanda: HasilSlotUndian[] = [
      s0,
      {
        urutan: s1.urutan,
        kode: s1.kode,
        urut: 1,
        pemenang: s1.pemenang,
        diundiAt: s1.diundiAt,
      },
      ...daftarSlot.slice(2),
    ];

    const hasilSalah = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: { id: 'dev_1', userAgent: 'Vitest' },
      state: buatState(slotGanda),
    });

    const verif = await verifikasiHasilMurni(hasilSalah, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('PESERTA_UNIK');
      expect(verif.pesan).toBe('Peserta yang sama muncul di lebih dari satu slot.');
    }
  });

  it('10. Menolak waktu undian yang tidak valid atau sebelum data terkunci (Pemeriksaan WAKTU)', async () => {
    // Kasus A: Waktu dimulai sebelum snapshot lockedAt
    const hasilWaktuAwal = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: { id: 'dev_1', userAgent: 'Vitest' },
      state: buatState(slotBawaan(), '2026-10-12T07:00:00.000Z', '2026-10-12T09:35:00.000Z'),
    });
    const verifA = await verifikasiHasilMurni(hasilWaktuAwal, konteksValid);
    expect(verifA.valid).toBe(false);
    if (!verifA.valid) {
      expect(verifA.kode).toBe('WAKTU');
    }

    // Kasus B: Waktu slot mundur
    const daftarSlot = slotBawaan();
    const s0 = daftarSlot[0];
    const s1 = daftarSlot[1];
    const s2 = daftarSlot[2];
    if (!s0 || !s1 || !s2) {
      throw new Error('Data slot awal tidak valid');
    }
    const slotMundur: HasilSlotUndian[] = [
      s0,
      s1,
      {
        urutan: s2.urutan,
        kode: s2.kode,
        urut: s2.urut,
        pemenang: s2.pemenang,
        diundiAt: '2026-10-12T09:01:00.000Z',
      },
      ...daftarSlot.slice(3),
    ];
    const hasilMundur = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: { id: 'dev_1', userAgent: 'Vitest' },
      state: buatState(slotMundur),
    });
    const verifB = await verifikasiHasilMurni(hasilMundur, konteksValid);
    expect(verifB.valid).toBe(false);
    if (!verifB.valid) {
      expect(verifB.kode).toBe('WAKTU');
    }
  });

  it('11. Menolak jika sudah ada hasil sebelumnya (Pemeriksaan BELUM_ADA_HASIL)', async () => {
    const hasil = await buatHasilValid();
    const konteksSudahAda: KonteksVerifikasiHasil = {
      ...konteksValid,
      sudahAdaHasil: {
        uploadedAt: '12/10/2026 10:00 WIB',
        uploadedByName: 'Operator Panggung',
      },
    };

    const verif = await verifikasiHasilMurni(hasil, konteksSudahAda);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('BELUM_ADA_HASIL');
      expect(verif.pesan).toContain('Operator Panggung');
      expect(verif.pesan).toContain('Unggahan ditolak');
    }
  });
});
