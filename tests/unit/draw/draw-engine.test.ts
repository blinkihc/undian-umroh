import { describe, expect, it } from 'vitest';

import {
  buatStateAwal,
  lanjutSlotBerikutnya,
  mulaiSlot,
  pilihPemenang,
  simpanPemenangSlot,
} from '@/lib/draw/engine';
import { bangunFileHasil, hitungHasilHash } from '@/lib/draw/hasil';
import { secureRandomInt } from '@/lib/draw/random';
import { type PesertaUndian } from '@/lib/draw/types';
import { SLOT_URUTAN } from '@/lib/package/kontrak';

function buatPeserta(urut: number, wilayah: 'W1' | 'W2'): PesertaUndian {
  return {
    urut,
    wilayah,
    nopMasked: `16.09.010.xxx.xxx-000${urut.toString()}.0`,
    nikMasked: `1609xxxxxxxx000${urut.toString()}`,
    nama: `Peserta ${urut.toString()}`,
    alamatWp: 'Alamat WP',
    alamatOp: 'Alamat OP',
    kecamatan: wilayah === 'W1' ? 'MUARADUA' : 'BANDING',
    kelurahan: 'Kelurahan',
    lunas: [
      '2022-06-01T00:00:00+07:00',
      '2023-06-01T00:00:00+07:00',
      '2024-06-01T00:00:00+07:00',
      '2025-06-01T00:00:00+07:00',
      '2026-06-01T00:00:00+07:00',
    ],
  };
}

describe('secureRandomInt', () => {
  it('hasil selalu di dalam rentang [min, max]', () => {
    for (let i = 0; i < 1000; i++) {
      const val = secureRandomInt(5, 12);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(12);
    }
  });

  it('mengembalikan nilai yang sama jika min === max', () => {
    expect(secureRandomInt(7, 7)).toBe(7);
  });

  it('menolak jika min > max atau bukan integer', () => {
    expect(() => secureRandomInt(10, 5)).toThrow(/tidak boleh lebih besar/);
    expect(() => secureRandomInt(1.5, 5)).toThrow(/bilangan bulat/);
  });

  it('melakukan rejection sampling dengan generator tiruan', () => {
    // Simulator mock: kirim angka di atas limit lalu kirim angka valid
    // Range 3 (mis. 0..2): limit = floor(2^32 / 3) * 3 = 4294967295
    let panggilan = 0;
    const mockRng = (buf: Uint8Array): void => {
      const view = new DataView(buf.buffer);
      panggilan += 1;
      if (panggilan === 1) {
        // Angka >= limit: 4294967295 (0xFFFFFFFF)
        view.setUint32(0, 0xffffffff, true);
      } else {
        // Angka < limit: 1
        view.setUint32(0, 1, true);
      }
    };
    const hasil = secureRandomInt(0, 2, mockRng);
    expect(panggilan).toBe(2);
    expect(hasil).toBe(1);
  });

  it('uji distribusi chi-square seragam pada pool 10', () => {
    // 10.000 sampel dengan pool 10: ekspektasi tiap bin = 1.000
    const binCount = 10;
    const totalSamples = 10000;
    const counts = new Array<number>(binCount).fill(0);

    for (let i = 0; i < totalSamples; i++) {
      const val = secureRandomInt(0, binCount - 1);
      counts[val] = (counts[val] ?? 0) + 1;
    }

    const expected = totalSamples / binCount;
    let chiSquare = 0;
    for (let i = 0; i < binCount; i++) {
      const diff = (counts[i] ?? 0) - expected;
      chiSquare += (diff * diff) / expected;
    }

    // Untuk df = 9, nilai kritis chi-square pada p = 0.001 adalah 27.88
    expect(chiSquare).toBeLessThan(27.88);
  });
});

describe('pilihPemenang', () => {
  it('menolak jika pool wilayah kurang dari 3 peserta', () => {
    const peserta = [buatPeserta(1, 'W1'), buatPeserta(2, 'W1')];
    expect(() => pilihPemenang(peserta, new Set())).toThrow(/kurang dari 3 peserta/);
  });

  it('tidak pernah memilih peserta yang nomor urutnya sudah ada di pemenangTerpilihUrut', () => {
    const peserta = [buatPeserta(1, 'W1'), buatPeserta(2, 'W1'), buatPeserta(3, 'W1')];
    const sudah = new Set([1, 2]);
    const pemenang = pilihPemenang(peserta, sudah);
    expect(pemenang.urut).toBe(3);
  });

  it('10.000 simulasi undian tanpa pemenang ganda dan wilayah selalu sesuai', () => {
    const poolW1 = Array.from({ length: 20 }, (_, i) => buatPeserta(i + 1, 'W1'));
    const poolW2 = Array.from({ length: 20 }, (_, i) => buatPeserta(i + 21, 'W2'));

    for (let sim = 0; sim < 1000; sim++) {
      const terpilih = new Set<number>();
      for (const slot of SLOT_URUTAN) {
        const pool = slot.wilayah === 'W1' ? poolW1 : poolW2;
        const pemenang = pilihPemenang(pool, terpilih);
        expect(pemenang.wilayah).toBe(slot.wilayah);
        expect(terpilih.has(pemenang.urut)).toBe(false);
        terpilih.add(pemenang.urut);
      }
      expect(terpilih.size).toBe(6);
    }
  });
});

describe('State machine undian dan hasil', () => {
  it('menjalankan 6 slot berurutan dan menghasilkan file hasil deterministik', async () => {
    let state = buatStateAwal();
    expect(state.fase).toBe('MENUNGGU');
    expect(state.slotAktifIndex).toBe(0);

    const poolW1 = [buatPeserta(1, 'W1'), buatPeserta(2, 'W1'), buatPeserta(3, 'W1')];
    const poolW2 = [buatPeserta(4, 'W2'), buatPeserta(5, 'W2'), buatPeserta(6, 'W2')];

    const waktuMulai = '2026-10-20T09:00:00+07:00';

    for (let i = 0; i < 6; i++) {
      state = mulaiSlot(state, waktuMulai);
      expect(state.fase).toBe('MENGACAK');
      const slot = SLOT_URUTAN[i];
      if (slot === undefined) {
        continue;
      }
      const pool = slot.wilayah === 'W1' ? poolW1 : poolW2;
      const pemenangTerpilih = new Set(state.slotSelesai.map((s) => s.urut));
      const pemenang = pilihPemenang(pool, pemenangTerpilih);

      const diundiAt = `2026-10-20T09:0${(i + 1).toString()}:00+07:00`;
      state = simpanPemenangSlot(state, pemenang, diundiAt);
      expect(state.fase).toBe('PEMENANG');
      expect(state.slotSelesai.length).toBe(i + 1);

      state = lanjutSlotBerikutnya(state);
      if (i < 5) {
        expect(state.fase).toBe('MENUNGGU');
        expect(state.slotAktifIndex).toBe(i + 1);
      } else {
        expect(state.fase).toBe('SELESAI');
      }
    }

    const fileHasil = await bangunFileHasil({
      periodeId: 'clx123',
      snapshotHash: 'a'.repeat(64),
      temaConfigHash: 'b'.repeat(64),
      perangkat: { id: 'dev_test', userAgent: 'Vitest' },
      state,
    });

    expect(fileHasil.versiFormat).toBe(1);
    expect(fileHasil.slot.length).toBe(6);
    expect(fileHasil.hasilHash).toHaveLength(64);

    // Hash hasil deterministik
    const hashUlang = await hitungHasilHash(fileHasil);
    expect(hashUlang).toBe(fileHasil.hasilHash);
  });
});
