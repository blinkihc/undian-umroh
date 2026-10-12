import { describe, expect, it } from 'vitest';

import { bangunFileHasil } from '@/lib/draw/hasil';
import {
  verifikasiHasilMurni,
  type KonteksVerifikasiHasil,
  type PesertaSnapshotInfo,
} from '@/lib/draw/verifikasi';
import { type StateUndian } from '@/lib/draw/types';

describe('Verifikasi Hasil Undian (10 Pemeriksaan Berurutan)', () => {
  const periodeId = 'clx_periode_01';
  const snapshotHash = '1111111111111111111111111111111111111111111111111111111111111111';
  const temaConfigHash = '2222222222222222222222222222222222222222222222222222222222222222';
  const snapshotLockedAt = '2026-10-12T08:00:00.000Z';

  // Siapkan map peserta snapshot:
  // Slot W1 butuh peserta wilayah W1 (misal urut 1, 2, 3)
  // Slot W2 butuh peserta wilayah W2 (misal urut 4, 5, 6)
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

  async function buatHasilValid() {
    const state: StateUndian = {
      fase: 'SELESAI',
      slotAktifIndex: 5,
      slotSelesai: [
        {
          urutan: 1,
          kode: 'W1-UTAMA',
          urut: 1,
          peserta: { nop: '1609010001', nama: 'Pemenang 1', kecamatan: 'MUARADUA' },
          diundiAt: '2026-10-12T09:05:00.000Z',
        },
        {
          urutan: 2,
          kode: 'W1-C1',
          urut: 2,
          peserta: { nop: '1609010002', nama: 'Cadangan 1 W1', kecamatan: 'MUARADUA' },
          diundiAt: '2026-10-12T09:10:00.000Z',
        },
        {
          urutan: 3,
          kode: 'W1-C2',
          urut: 3,
          peserta: { nop: '1609010003', nama: 'Cadangan 2 W1', kecamatan: 'MUARADUA' },
          diundiAt: '2026-10-12T09:15:00.000Z',
        },
        {
          urutan: 4,
          kode: 'W2-UTAMA',
          urut: 4,
          peserta: { nop: '1609020001', nama: 'Pemenang 2', kecamatan: 'BANDING AGUNG' },
          diundiAt: '2026-10-12T09:20:00.000Z',
        },
        {
          urutan: 5,
          kode: 'W2-C1',
          urut: 5,
          peserta: { nop: '1609020002', nama: 'Cadangan 1 W2', kecamatan: 'BANDING AGUNG' },
          diundiAt: '2026-10-12T09:25:00.000Z',
        },
        {
          urutan: 6,
          kode: 'W2-C2',
          urut: 6,
          peserta: { nop: '1609020003', nama: 'Cadangan 2 W2', kecamatan: 'BANDING AGUNG' },
          diundiAt: '2026-10-12T09:30:00.000Z',
        },
      ],
      pemenangTampil: null,
      animasiMulaiAt: null,
      dimulaiAt: '2026-10-12T09:00:00.000Z',
      selesaiAt: '2026-10-12T09:35:00.000Z',
      catatanLokal: [],
    };

    return bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: { id: 'dev_test_123', userAgent: 'Vitest' },
      state,
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
    const hasil = await buatHasilValid();
    // Ubah urutan slot
    const slotSalah = [...hasil.slot];
    slotSalah[0] = { ...slotSalah[0], kode: 'W1-C1' as const };
    slotSalah[1] = { ...slotSalah[1], kode: 'W1-UTAMA' as const };

    const stateSalah: StateUndian = {
      fase: 'SELESAI',
      slotAktifIndex: 5,
      slotSelesai: slotSalah.map((s) => ({
        ...s,
        peserta: { nop: 'test', nama: 'test', kecamatan: 'test' },
      })),
      pemenangTampil: null,
      animasiMulaiAt: null,
      dimulaiAt: hasil.dimulaiAt,
      selesaiAt: hasil.selesaiAt,
      catatanLokal: [],
    };
    const hasilSalah = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: hasil.perangkat,
      state: stateSalah,
    });

    const verif = await verifikasiHasilMurni(hasilSalah, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('SLOT_LENGKAP');
      expect(verif.pesan).toBe('Slot undian tidak lengkap atau urutannya salah.');
    }
  });

  it('7. Menolak bila peserta tidak ada di snapshot (Pemeriksaan PESERTA_ADA)', async () => {
    const hasil = await buatHasilValid();
    const slotHilang = [...hasil.slot];
    slotHilang[0] = { ...slotHilang[0], urut: 99999 }; // tidak ada di snapshot

    const stateSalah: StateUndian = {
      fase: 'SELESAI',
      slotAktifIndex: 5,
      slotSelesai: slotHilang.map((s) => ({
        ...s,
        peserta: { nop: 'test', nama: 'test', kecamatan: 'test' },
      })),
      pemenangTampil: null,
      animasiMulaiAt: null,
      dimulaiAt: hasil.dimulaiAt,
      selesaiAt: hasil.selesaiAt,
      catatanLokal: [],
    };
    const hasilSalah = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: hasil.perangkat,
      state: stateSalah,
    });

    const verif = await verifikasiHasilMurni(hasilSalah, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('PESERTA_ADA');
      expect(verif.pesan).toContain('tidak ditemukan di data terkunci');
    }
  });

  it('8. Menolak bila wilayah peserta tidak sesuai slot (Pemeriksaan WILAYAH_SESUAI)', async () => {
    const hasil = await buatHasilValid();
    const slotTukarWilayah = [...hasil.slot];
    // Peserta 4 adalah wilayah W2, tapi ditaruh di slot W1-UTAMA
    slotTukarWilayah[0] = { ...slotTukarWilayah[0], urut: 4 };

    const stateSalah: StateUndian = {
      fase: 'SELESAI',
      slotAktifIndex: 5,
      slotSelesai: slotTukarWilayah.map((s) => ({
        ...s,
        peserta: { nop: 'test', nama: 'test', kecamatan: 'test' },
      })),
      pemenangTampil: null,
      animasiMulaiAt: null,
      dimulaiAt: hasil.dimulaiAt,
      selesaiAt: hasil.selesaiAt,
      catatanLokal: [],
    };
    const hasilSalah = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: hasil.perangkat,
      state: stateSalah,
    });

    const verif = await verifikasiHasilMurni(hasilSalah, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('WILAYAH_SESUAI');
      expect(verif.pesan).toContain('bukan dari Wilayah 1');
    }
  });

  it('9. Menolak peserta duplikat di lebih dari 1 slot (Pemeriksaan PESERTA_UNIK)', async () => {
    const hasil = await buatHasilValid();
    const slotGanda = [...hasil.slot];
    // Peserta urut 1 muncul di slot 1 dan slot 2
    slotGanda[1] = { ...slotGanda[1], urut: 1 };

    const stateSalah: StateUndian = {
      fase: 'SELESAI',
      slotAktifIndex: 5,
      slotSelesai: slotGanda.map((s) => ({
        ...s,
        peserta: { nop: 'test', nama: 'test', kecamatan: 'test' },
      })),
      pemenangTampil: null,
      animasiMulaiAt: null,
      dimulaiAt: hasil.dimulaiAt,
      selesaiAt: hasil.selesaiAt,
      catatanLokal: [],
    };
    const hasilSalah = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: hasil.perangkat,
      state: stateSalah,
    });

    const verif = await verifikasiHasilMurni(hasilSalah, konteksValid);
    expect(verif.valid).toBe(false);
    if (!verif.valid) {
      expect(verif.kode).toBe('PESERTA_UNIK');
      expect(verif.pesan).toBe('Peserta yang sama muncul di lebih dari satu slot.');
    }
  });

  it('10. Menolak waktu undian yang tidak valid atau sebelum data terkunci (Pemeriksaan WAKTU)', async () => {
    const hasil = await buatHasilValid();

    // Kasus A: Waktu dimulai sebelum snapshot lockedAt
    const stateWaktuAwal: StateUndian = {
      fase: 'SELESAI',
      slotAktifIndex: 5,
      slotSelesai: hasil.slot.map((s) => ({
        ...s,
        peserta: { nop: 'test', nama: 'test', kecamatan: 'test' },
      })),
      pemenangTampil: null,
      animasiMulaiAt: null,
      dimulaiAt: '2026-10-12T07:00:00.000Z', // Sebelum lockedAt 08:00
      selesaiAt: '2026-10-12T09:35:00.000Z',
      catatanLokal: [],
    };
    const hasilWaktuAwal = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: hasil.perangkat,
      state: stateWaktuAwal,
    });
    const verifA = await verifikasiHasilMurni(hasilWaktuAwal, konteksValid);
    expect(verifA.valid).toBe(false);
    if (!verifA.valid) {
      expect(verifA.kode).toBe('WAKTU');
    }

    // Kasus B: Waktu slot mundur
    const slotMundur = [...hasil.slot];
    slotMundur[2] = { ...slotMundur[2], diundiAt: '2026-10-12T09:01:00.000Z' }; // Lebih awal dari slot 2
    const stateMundur: StateUndian = {
      fase: 'SELESAI',
      slotAktifIndex: 5,
      slotSelesai: slotMundur.map((s) => ({
        ...s,
        peserta: { nop: 'test', nama: 'test', kecamatan: 'test' },
      })),
      pemenangTampil: null,
      animasiMulaiAt: null,
      dimulaiAt: hasil.dimulaiAt,
      selesaiAt: hasil.selesaiAt,
      catatanLokal: [],
    };
    const hasilMundur = await bangunFileHasil({
      periodeId,
      snapshotHash,
      temaConfigHash,
      perangkat: hasil.perangkat,
      state: stateMundur,
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
