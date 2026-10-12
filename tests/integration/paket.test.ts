import { strFromU8, unzipSync } from 'fflate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as paketGet } from '@/app/api/periode/[id]/paket/route';
import { POST as kunciPost } from '@/app/api/periode/[id]/kunci/route';
import {
  ManifestSchema,
  MetaSchema,
  SnapshotSchema,
  ThemeConfigSchema,
} from '@/lib/package/kontrak';
import { sha256Hex } from '@/lib/package/hash';
import { getDb, tutupDb } from '@/server/db';

import { buatRequest, masuk } from './helpers/aplikasi';
import { buatPengguna, type PenggunaTes } from './helpers/pengguna';
import { bersihkanPeriode, buatPeriodeTes } from './helpers/periode';

let admin: PenggunaTes;
let cookieAdmin: string;
let cookieOperator: string;

async function cookieMasuk(pengguna: PenggunaTes): Promise<string> {
  const { cookie } = await masuk(pengguna.username, pengguna.password);
  if (cookie === null) throw new Error('Login uji gagal.');
  return cookie;
}

beforeAll(async () => {
  admin = await buatPengguna({ peran: 'ADMIN' });
  const operator = await buatPengguna({ peran: 'OPERATOR' });
  cookieAdmin = await cookieMasuk(admin);
  cookieOperator = await cookieMasuk(operator);
});

afterAll(async () => {
  await bersihkanPeriode();
  await tutupDb();
});

function params(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

describe('Unduh Paket Undian (Tiket 11)', () => {
  it('menolak pengunduhan paket pada periode yang masih berstatus Draf', async () => {
    const periode = await buatPeriodeTes();

    const respons = await paketGet(
      buatRequest(`/api/periode/${periode.id}/paket`, { cookie: cookieAdmin }),
      params(periode.id),
    );
    expect(respons.status).toBe(409);
    const json = (await respons.json()) as { error: { code: string } };
    expect(json.error.code).toBe('PERIODE_BELUM_TERKUNCI');
  });

  it('mengunduh paket zip yang valid, diverifikasi manifest, byte-identik, dan tanpa NIK/NOP utuh', async () => {
    const periode = await buatPeriodeTes();
    const w1 = await getDb().wilayah.findFirstOrThrow({
      where: { periodeId: periode.id, kode: 'W1' },
    });
    const w2 = await getDb().wilayah.findFirstOrThrow({
      where: { periodeId: periode.id, kode: 'W2' },
    });

    const impor = await getDb().impor.create({
      data: {
        periodeId: periode.id,
        namaFile: 'data.csv',
        fileSha256: 'c'.repeat(64),
        totalBaris: 6,
        jumlahLolos: 6,
        jumlahGugur: 0,
        ringkasan: {
          gugurPerAlasan: {},
          nikTidakValid: 0,
          nopGanda: 0,
          lolosPerKecamatan: { MUARADUA: 3, BANDING: 3 },
        },
        importedById: admin.id,
      },
    });

    await getDb().kecamatanWilayah.createMany({
      data: [
        { periodeId: periode.id, kecamatan: 'MUARADUA', wilayahId: w1.id },
        { periodeId: periode.id, kecamatan: 'BANDING', wilayahId: w2.id },
      ],
    });

    for (let i = 1; i <= 3; i++) {
      await getDb().peserta.create({
        data: {
          periodeId: periode.id,
          imporId: impor.id,
          baris: i + 1,
          nop: `16091000000000000${i.toString()}`,
          nikMasked: `1609xxxxxxxx000${i.toString()}`,
          nikValid: true,
          nama: `Peserta W1 ${i.toString()}`,
          alamatWp: 'Alamat WP',
          alamatOp: 'Alamat OP',
          kecamatanRaw: 'MUARADUA',
          kecamatan: 'MUARADUA',
          kelurahan: 'Kelurahan A',
          lunas2022: new Date('2022-06-01T00:00:00Z'),
          lunas2023: new Date('2023-06-01T00:00:00Z'),
          lunas2024: new Date('2024-06-01T00:00:00Z'),
          lunas2025: new Date('2025-06-01T00:00:00Z'),
          lunas2026: new Date('2026-06-01T00:00:00Z'),
          lunasRaw: {},
          eligible: true,
          alasan: [],
        },
      });
    }

    for (let i = 1; i <= 3; i++) {
      await getDb().peserta.create({
        data: {
          periodeId: periode.id,
          imporId: impor.id,
          baris: i + 4,
          nop: `16092000000000000${i.toString()}`,
          nikMasked: `1609xxxxxxxx001${i.toString()}`,
          nikValid: true,
          nama: `Peserta W2 ${i.toString()}`,
          alamatWp: 'Alamat WP',
          alamatOp: 'Alamat OP',
          kecamatanRaw: 'BANDING',
          kecamatan: 'BANDING',
          kelurahan: 'Kelurahan B',
          lunas2022: new Date('2022-06-01T00:00:00Z'),
          lunas2023: new Date('2023-06-01T00:00:00Z'),
          lunas2024: new Date('2024-06-01T00:00:00Z'),
          lunas2025: new Date('2025-06-01T00:00:00Z'),
          lunas2026: new Date('2026-06-01T00:00:00Z'),
          lunasRaw: {},
          eligible: true,
          alasan: [],
        },
      });
    }

    // Kunci data terlebih dahulu
    const resKunci = await kunciPost(
      buatRequest(`/api/periode/${periode.id}/kunci`, {
        json: { version: periode.version, konfirmasiJudul: periode.judul },
        cookie: cookieAdmin,
      }),
      params(periode.id),
    );
    expect(resKunci.status).toBe(200);
    const hasilKunci = (await resKunci.json()) as { snapshotHash: string };

    // Unduh paket
    const respons = await paketGet(
      buatRequest(`/api/periode/${periode.id}/paket`, { cookie: cookieAdmin }),
      params(periode.id),
    );

    expect(respons.status).toBe(200);
    expect(respons.headers.get('content-type')).toBe('application/zip');
    const disposition = respons.headers.get('content-disposition');
    expect(disposition).toContain(`paket-undian-${periode.slug}-${hasilKunci.snapshotHash.slice(0, 8)}.zip`);

    const arrayBuffer = await respons.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    expect(bytes.length).toBeLessThan(25 * 1024 * 1024);

    // Buka dan verifikasi isi file zip
    const unzipped = unzipSync(bytes);
    expect(Object.keys(unzipped)).toEqual(
      expect.arrayContaining(['manifest.json', 'meta.json', 'snapshot.json', 'tema/theme.json']),
    );

    const manifestRaw = strFromU8(unzipped['manifest.json']!);
    const metaRaw = strFromU8(unzipped['meta.json']!);
    const snapshotRaw = strFromU8(unzipped['snapshot.json']!);
    const themeRaw = strFromU8(unzipped['tema/theme.json']!);

    // Validasi skema ketat
    const manifest = ManifestSchema.parse(JSON.parse(manifestRaw));
    const meta = MetaSchema.parse(JSON.parse(metaRaw));
    const snapshot = SnapshotSchema.parse(JSON.parse(snapshotRaw));
    const theme = ThemeConfigSchema.parse(JSON.parse(themeRaw));

    expect(manifest.versiFormat).toBe(1);
    expect(meta.versiFormat).toBe(1);
    expect(snapshot.versiFormat).toBe(1);
    expect(theme.versiFormat).toBe(1);

    // Cek kesesuaian hash di manifest
    const metaHash = await sha256Hex(metaRaw);
    const snapshotHash = await sha256Hex(snapshotRaw);
    const themeHash = await sha256Hex(themeRaw);

    expect(manifest.file['meta.json']).toBe(metaHash);
    expect(manifest.file['snapshot.json']).toBe(snapshotHash);
    expect(manifest.file['tema/theme.json']).toBe(themeHash);
    expect(snapshotHash).toBe(hasilKunci.snapshotHash);

    // Cek bahwa seluruh isi paket TIDAK memuat 16 atau 18 digit angka berurutan (NIK/NOP utuh dilarang)
    const gabunganTeks = `${metaRaw} ${snapshotRaw} ${themeRaw}`;
    expect(gabunganTeks).not.toMatch(/\b\d{16}\b/);
    expect(gabunganTeks).not.toMatch(/\b\d{18}\b/);

    // Cek pencatatan riwayat unduhan
    const riwayat = await getDb().paketUnduhan.findMany({ where: { periodeId: periode.id } });
    expect(riwayat.length).toBeGreaterThanOrEqual(1);
    expect(riwayat[0]?.snapshotHash).toBe(hasilKunci.snapshotHash);
  });
});
