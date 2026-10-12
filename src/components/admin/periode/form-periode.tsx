'use client';

import { useRouter } from 'next/navigation';
import { type ReactElement, type SyntheticEvent, useState } from 'react';

import { kirimJson } from '@/client/api';
import { galatPerField, teksForm } from '@/client/form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import {
  BuatPeriodeSchema,
  JAM_BATAS_LUNAS,
  JUDUL_PERIODE_BAWAAN,
  NAMA_WILAYAH_BAWAAN,
  TAHUN_PAJAK,
  UbahPeriodeSchema,
  tanggalWib,
  type KodeWilayah,
  type StatusPeriode,
} from '@/lib/domain';

export type PeriodeUntukForm = {
  id: string;
  version: number;
  status: StatusPeriode;
  judul: string;
  batasLunas: string;
  tanggalAcara: string | null;
  lokasiAcara: string | null;
  wilayah: readonly { kode: KodeWilayah; nama: string }[];
};

type FormPeriodeProps = { mode: 'buat' } | { mode: 'ubah'; periode: PeriodeUntukForm };

type Nilai = {
  judul: string;
  batasTanggal: string;
  tanggalAcara: string;
  lokasiAcara: string;
  W1: string;
  W2: string;
};

type Pesan = { jenis: 'info' | 'galat'; teks: string } | null;

const NILAI_BAWAAN: Nilai = {
  judul: JUDUL_PERIODE_BAWAAN,
  batasTanggal: '2026-09-30',
  tanggalAcara: '',
  lokasiAcara: '',
  W1: NAMA_WILAYAH_BAWAAN.W1,
  W2: NAMA_WILAYAH_BAWAAN.W2,
};

function nilaiAwal(periode: PeriodeUntukForm): Nilai {
  const nama = (kode: KodeWilayah): string =>
    periode.wilayah.find((w) => w.kode === kode)?.nama ?? NAMA_WILAYAH_BAWAAN[kode];
  return {
    judul: periode.judul,
    batasTanggal: tanggalWib(new Date(periode.batasLunas)),
    tanggalAcara: periode.tanggalAcara ?? '',
    lokasiAcara: periode.lokasiAcara ?? '',
    W1: nama('W1'),
    W2: nama('W2'),
  };
}

function bacaNilai(data: FormData): Nilai {
  return {
    judul: teksForm(data, 'judul'),
    batasTanggal: teksForm(data, 'batasLunas'),
    tanggalAcara: teksForm(data, 'tanggalAcara'),
    lokasiAcara: teksForm(data, 'lokasiAcara'),
    W1: teksForm(data, 'namaWilayah.W1'),
    W2: teksForm(data, 'namaWilayah.W2'),
  };
}

/** Isi permintaan; pada mode ubah hanya field yang berbeda dari nilai awal yang dikirim. */
function susunIsi(nilai: Nilai, awal: Nilai | null): Record<string, unknown> {
  const isi: Record<string, unknown> = {};
  const beda = (kunci: keyof Nilai): boolean => awal === null || nilai[kunci] !== awal[kunci];
  if (beda('judul')) isi.judul = nilai.judul;
  if (beda('batasTanggal')) isi.batasLunas = `${nilai.batasTanggal}${JAM_BATAS_LUNAS}`;
  if (beda('tanggalAcara'))
    isi.tanggalAcara = nilai.tanggalAcara === '' ? null : nilai.tanggalAcara;
  if (beda('lokasiAcara')) isi.lokasiAcara = nilai.lokasiAcara;
  const namaWilayah: Record<string, string> = {};
  if (beda('W1')) namaWilayah.W1 = nilai.W1;
  if (beda('W2')) namaWilayah.W2 = nilai.W2;
  if (Object.keys(namaWilayah).length > 0) isi.namaWilayah = namaWilayah;
  return isi;
}

/**
 * Form Buat Periode (UX_FLOWS Flow 2) dan Ubah Periode. Validasi klien memakai skema yang sama
 * dengan server; server tetap menjadi penentu akhir (status, versi, satu periode aktif).
 */
export function FormPeriode(props: FormPeriodeProps): ReactElement {
  const router = useRouter();
  const periode = props.mode === 'ubah' ? props.periode : null;
  const awal = periode === null ? null : nilaiAwal(periode);
  const nilai = awal ?? NILAI_BAWAAN;
  const batasTerkunci = periode !== null && periode.status !== 'DRAF';
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [pesan, setPesan] = useState<Pesan>(null);
  const [memuat, setMemuat] = useState(false);

  async function kirim(event: SyntheticEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setPesan(null);
    const isian = bacaNilai(new FormData(event.currentTarget));
    if (batasTerkunci && awal !== null) {
      isian.batasTanggal = awal.batasTanggal;
    }
    if (isian.batasTanggal === '') {
      setGalat({ batasLunas: 'Tanggal batas wajib diisi.' });
      return;
    }
    const isi = susunIsi(isian, awal);
    if (periode !== null && Object.keys(isi).length === 0) {
      setGalat({});
      setPesan({ jenis: 'info', teks: 'Tidak ada perubahan untuk disimpan.' });
      return;
    }
    const bentuk =
      periode === null
        ? BuatPeriodeSchema.safeParse(isi)
        : UbahPeriodeSchema.safeParse({ version: periode.version, ...isi });
    if (!bentuk.success) {
      setGalat(galatPerField(bentuk.error.issues));
      return;
    }
    setGalat({});
    setMemuat(true);
    const hasil =
      periode === null
        ? await kirimJson<{ id: string }>('POST', '/api/periode', bentuk.data)
        : await kirimJson<{ id: string }>('PATCH', `/api/periode/${periode.id}`, bentuk.data);
    setMemuat(false);
    if (hasil.ok) {
      if (periode === null) {
        // UX_FLOWS Flow 2 langkah 7: langsung ke tab Data Peserta.
        router.push(`/admin/periode/${hasil.data.id}/peserta`);
        return;
      }
      setPesan({ jenis: 'info', teks: 'Perubahan periode disimpan.' });
      router.refresh();
      return;
    }
    setGalat(hasil.fields);
    if (Object.keys(hasil.fields).length === 0) {
      setPesan({ jenis: 'galat', teks: hasil.message });
    }
    if (hasil.status === 409) {
      // Versi atau status berubah di tempat lain: muat ulang agar form memakai data terbaru.
      router.refresh();
    }
  }

  return (
    <form
      noValidate
      aria-label={periode === null ? 'Buat periode' : 'Ubah periode'}
      onSubmit={(event) => {
        void kirim(event);
      }}
      className="space-y-4 rounded-md border border-neutral-300 bg-neutral-0 p-6 shadow-sm"
    >
      {periode !== null && (
        <h2 className="font-heading text-h3 font-semibold text-neutral-900">Ubah Periode</h2>
      )}
      {pesan !== null && <Alert jenis={pesan.jenis} judul={pesan.teks} />}
      {/* key = version: isian dibuat ulang dengan nilai terbaru setelah data dimuat ulang,
          sementara pesan di atas tetap tampil. */}
      <div key={periode?.version ?? 0} className="space-y-4">
        <Field
          label="Judul"
          name="judul"
          defaultValue={nilai.judul}
          autoComplete="off"
          required
          galat={galat.judul}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Tahun pajak"
            name="tahunPajak"
            defaultValue={`${TAHUN_PAJAK.awal.toString()}–${TAHUN_PAJAK.akhir.toString()}`}
            disabled
            keterangan="Tetap. Peserta wajib lunas kelima tahun ini."
          />
          <Field
            label="Tanggal batas lunas"
            name="batasLunas"
            type="date"
            defaultValue={nilai.batasTanggal}
            min="2026-01-01"
            required
            disabled={batasTerkunci}
            galat={galat.batasLunas}
            keterangan={
              batasTerkunci
                ? 'Tanggal batas hanya dapat diubah saat periode berstatus Draf.'
                : 'Pelunasan sampai pukul 23:59:59 WIB pada tanggal ini dihitung lunas.'
            }
          />
          <Field
            label="Tanggal acara (opsional)"
            name="tanggalAcara"
            type="date"
            defaultValue={nilai.tanggalAcara}
            galat={galat.tanggalAcara}
          />
          <Field
            label="Lokasi acara (opsional)"
            name="lokasiAcara"
            defaultValue={nilai.lokasiAcara}
            autoComplete="off"
            galat={galat.lokasiAcara}
          />
          <Field
            label="Nama Wilayah 1"
            name="namaWilayah.W1"
            defaultValue={nilai.W1}
            autoComplete="off"
            required
            galat={galat['namaWilayah.W1']}
          />
          <Field
            label="Nama Wilayah 2"
            name="namaWilayah.W2"
            defaultValue={nilai.W2}
            autoComplete="off"
            required
            galat={galat['namaWilayah.W2']}
          />
        </div>
      </div>
      <div className="flex gap-3">
        <Button type="submit" memuat={memuat} labelMemuat="Menyimpan…">
          Simpan
        </Button>
        {periode === null && (
          <Button
            varian="secondary"
            disabled={memuat}
            onClick={() => {
              router.push('/admin');
            }}
          >
            Batal
          </Button>
        )}
      </div>
    </form>
  );
}
