import {
  buatStateAwal,
  lanjutSlotBerikutnya,
  mulaiSlot,
  pilihPemenang,
  simpanPemenangSlot,
} from '../src/lib/draw/engine';
import { bangunFileHasil } from '../src/lib/draw/hasil';
import { type PesertaUndian } from '../src/lib/draw/types';
import { formatHashRingkas, sha256Hex } from '../src/lib/package/hash';
import { SLOT_URUTAN } from '../src/lib/package/kontrak';

function parseArgs(): { w1: number; w2: number } {
  const args = process.argv.slice(2);
  let w1 = 50;
  let w2 = 40;

  for (let i = 0; i < args.length; i++) {
    const nextArg = args[i + 1];
    if (args[i] === '--w1' && nextArg !== undefined) {
      w1 = parseInt(nextArg, 10);
    } else if (args[i] === '--w2' && nextArg !== undefined) {
      w2 = parseInt(nextArg, 10);
    }
  }

  return { w1, w2 };
}

function buatPeserta(urut: number, wilayah: 'W1' | 'W2'): PesertaUndian {
  return {
    urut,
    wilayah,
    nopMasked: `16.09.010.xxx.xxx-${urut.toString().padStart(4, '0')}.0`,
    nikMasked: `1609xxxxxxxx${urut.toString().padStart(4, '0')}`,
    nama: `Wajib Pajak ${wilayah} Nomor ${urut.toString()}`,
    alamatWp: 'Muaradua',
    alamatOp: 'Muaradua',
    kecamatan: wilayah === 'W1' ? 'MUARADUA' : 'BANDING AGUNG',
    kelurahan: 'Pasar',
    lunas: [
      '2022-06-01T00:00:00+07:00',
      '2023-06-01T00:00:00+07:00',
      '2024-06-01T00:00:00+07:00',
      '2025-06-01T00:00:00+07:00',
      '2026-06-01T00:00:00+07:00',
    ],
  };
}

async function jalankan(): Promise<void> {
  const { w1, w2 } = parseArgs();
  console.log(`Menjalankan simulasi undian 6 slot dengan W1: ${w1.toString()} peserta, W2: ${w2.toString()} peserta...`);

  const poolW1: PesertaUndian[] = [];
  for (let i = 1; i <= w1; i++) {
    poolW1.push(buatPeserta(i, 'W1'));
  }

  const poolW2: PesertaUndian[] = [];
  for (let i = 1; i <= w2; i++) {
    poolW2.push(buatPeserta(w1 + i, 'W2'));
  }

  let state = buatStateAwal();
  const mulaiAt = new Date().toISOString();

  for (let i = 0; i < 6; i++) {
    state = mulaiSlot(state, mulaiAt);
    const slot = SLOT_URUTAN[i];
    if (slot === undefined) {
      continue;
    }
    const pool = slot.wilayah === 'W1' ? poolW1 : poolW2;
    const sudahTerpilih = new Set(state.slotSelesai.map((s) => s.urut));

    const pemenang = pilihPemenang(pool, sudahTerpilih);
    const diundiAt = new Date().toISOString();
    state = simpanPemenangSlot(state, pemenang, diundiAt);
    state = lanjutSlotBerikutnya(state);
  }

  const snapshotHash = await sha256Hex('dummy_snapshot');
  const temaConfigHash = await sha256Hex('dummy_theme');

  const fileHasil = await bangunFileHasil({
    periodeId: 'simulasi_periode_2026',
    snapshotHash,
    temaConfigHash,
    perangkat: { id: 'dev_simulasi', userAgent: 'CLI Simulator' },
    state,
  });

  console.log('\n--- HASIL SIMULASI UNDIAN ENAM SLOT ---');
  for (const s of state.slotSelesai) {
    console.log(`[${s.kode}] ${s.pemenang.nama} (${s.pemenang.nopMasked})`);
  }
  console.log('\nSnapshot Hash:', formatHashRingkas(snapshotHash), `(${snapshotHash})`);
  console.log('Hasil Hash   :', formatHashRingkas(fileHasil.hasilHash), `(${fileHasil.hasilHash})`);
  console.log('Simulasi sukses dan deterministik.');
}

void jalankan();
