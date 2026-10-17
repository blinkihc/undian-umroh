'use client';

import {
  Download,
  FileSpreadsheet,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import { type BeritaAcaraDetailRespons } from '@/server/services/berita-acara';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { TextareaField } from '@/components/ui/textarea-field';

type FormBeritaAcaraProps = {
  periodeId: string;
  statusPeriode: string;
};

type PanitiaRow = { nama: string; jabatan: string };
type SaksiRow = { nama: string; instansi: string };

export function FormBeritaAcara({
  periodeId,
  statusPeriode: _statusPeriode,
}: FormBeritaAcaraProps): ReactElement {
  const [dataBa, setDataBa] = useState<BeritaAcaraDetailRespons | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [pesanKonflik, setPesanKonflik] = useState<string | null>(null);

  // Field states
  const [nomor, setNomor] = useState('');
  const [tempat, setTempat] = useState('');
  const [hariTanggal, setHariTanggal] = useState('');
  const [dasarKegiatan, setDasarKegiatan] = useState('');
  const [panitia, setPanitia] = useState<PanitiaRow[]>([]);
  const [saksi, setSaksi] = useState<SaksiRow[]>([]);
  const [version, setVersion] = useState(0);

  const muatData = useCallback(async () => {
    setMemuat(true);
    setGalat(null);
    setPesanKonflik(null);
    try {
      const res = await fetch(`/api/periode/${periodeId}/berita-acara`);
      if (!res.ok) {
        throw new Error('Gagal memuat data berita acara');
      }
      const data: BeritaAcaraDetailRespons = await res.json();
      setDataBa(data);
      setNomor(data.nomor || '');
      setTempat(data.tempat || '');
      setHariTanggal(data.hariTanggal || '');
      setDasarKegiatan(data.dasarKegiatan || '');
      setPanitia(
        data.panitia && data.panitia.length > 0
          ? data.panitia.map((p) => ({ nama: p.nama ?? '', jabatan: p.jabatan ?? '' }))
          : [{ nama: '', jabatan: '' }],
      );
      setSaksi(
        data.saksi && data.saksi.length > 0
          ? data.saksi.map((s) => ({ nama: s.nama ?? '', instansi: s.instansi ?? '' }))
          : [{ nama: '', instansi: '' }],
      );
      setVersion(data.version);
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setMemuat(false);
    }
  }, [periodeId]);

  useEffect(() => {
    void muatData();
  }, [muatData]);

  const handleTambahPanitia = () => {
    if (panitia.length >= 5) return;
    setPanitia([...panitia, { nama: '', jabatan: '' }]);
  };

  const handleHapusPanitia = (index: number) => {
    if (panitia.length <= 1) {
      setPanitia([{ nama: '', jabatan: '' }]);
      return;
    }
    setPanitia(panitia.filter((_, i) => i !== index));
  };

  const handleUbahPanitia = (index: number, field: 'nama' | 'jabatan', nilai: string) => {
    const baru = [...panitia];
    const itemLama = baru[index] ?? { nama: '', jabatan: '' };
    baru[index] = {
      nama: field === 'nama' ? nilai : itemLama.nama,
      jabatan: field === 'jabatan' ? nilai : itemLama.jabatan,
    };
    setPanitia(baru);
  };

  const handleTambahSaksi = () => {
    if (saksi.length >= 5) return;
    setSaksi([...saksi, { nama: '', instansi: '' }]);
  };

  const handleHapusSaksi = (index: number) => {
    if (saksi.length <= 1) {
      setSaksi([{ nama: '', instansi: '' }]);
      return;
    }
    setSaksi(saksi.filter((_, i) => i !== index));
  };

  const handleUbahSaksi = (index: number, field: 'nama' | 'instansi', nilai: string) => {
    const baru = [...saksi];
    const itemLama = baru[index] ?? { nama: '', instansi: '' };
    baru[index] = {
      nama: field === 'nama' ? nilai : itemLama.nama,
      instansi: field === 'instansi' ? nilai : itemLama.instansi,
    };
    setSaksi(baru);
  };

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    setMenyimpan(true);
    setGalat(null);
    setSukses(null);
    setPesanKonflik(null);

    const panitiaBersih = panitia.filter((p) => p.nama.trim() !== '' || p.jabatan.trim() !== '');
    const saksiBersih = saksi.filter((s) => s.nama.trim() !== '' || s.instansi.trim() !== '');

    try {
      const res = await fetch(`/api/periode/${periodeId}/berita-acara`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomor,
          tempat,
          hariTanggal,
          dasarKegiatan,
          panitia: panitiaBersih,
          saksi: saksiBersih,
          version: version === 0 ? 1 : version,
        }),
      });

      if (res.status === 409) {
        setPesanKonflik('Data berita acara telah diubah oleh admin lain. Silakan perbarui halaman.');
        return;
      }

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { pesan?: string };
        throw new Error(errJson.pesan || 'Gagal menyimpan berita acara');
      }

      const hasil: BeritaAcaraDetailRespons = await res.json();
      setDataBa(hasil);
      setVersion(hasil.version);
      setSukses('Data berita acara berhasil disimpan');
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setMenyimpan(false);
    }
  };

  if (memuat) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-700 border-t-transparent" />
        <span className="ml-3 text-sm text-neutral-600">Memuat data berita acara...</span>
      </div>
    );
  }

  if (dataBa && !dataBa.tersedia) {
    return (
      <div className="mt-6 rounded-lg border border-neutral-300 bg-white p-8 text-center shadow-xs">
        <FileText className="mx-auto h-12 w-12 text-neutral-400" />
        <h3 className="mt-3 text-base font-semibold text-neutral-900">Berita Acara Belum Tersedia</h3>
        <p className="mt-2 text-sm text-neutral-600">
          {dataBa.pesan || 'Tersedia setelah hasil undian diunggah.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Kartu Tombol Unduh & Ekspor */}
      <div className="rounded-lg border border-neutral-300 bg-white p-6 shadow-xs">
        <h2 className="text-base font-semibold text-neutral-900">Dokumen dan Berkas Ekspor</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Unduh Berita Acara resmi format PDF A4 berlogo atau ekspor daftar pemenang dan log audit ke format Excel.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href={`/api/periode/${periodeId}/berita-acara/pdf`}
            download
            className="inline-flex items-center gap-2 rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-primary-800 focus:outline-hidden focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
          >
            <Download className="h-4 w-4" />
            Unduh Berita Acara (PDF)
          </a>

          <a
            href={`/api/periode/${periodeId}/ekspor/pemenang`}
            download
            className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-xs hover:bg-neutral-50 focus:outline-hidden focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Ekspor Pemenang (Excel)
          </a>

          <a
            href={`/api/periode/${periodeId}/ekspor/audit`}
            download
            className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-xs hover:bg-neutral-50 focus:outline-hidden focus:ring-2 focus:ring-primary-600 focus:ring-offset-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-neutral-600" />
            Ekspor Log Audit (Excel)
          </a>
        </div>
      </div>

      {/* Formulir Pengaturan Teks Berita Acara */}
      <form onSubmit={handleSimpan} className="rounded-lg border border-neutral-300 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Pengaturan Teks Berita Acara</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Versi dokumen: {version} {dataBa?.updatedAt ? `• Terakhir diubah: ${new Date(dataBa.updatedAt).toLocaleString('id-ID')}` : ''}
            </p>
          </div>
          <Button
            type="submit"
            disabled={menyimpan}
            memuat={menyimpan}
            labelMemuat="Menyimpan..."
          >
            Simpan Perubahan
          </Button>
        </div>

        {sukses && (
          <div className="mt-4">
            <Alert jenis="info" judul="Berhasil">
              {sukses}
            </Alert>
          </div>
        )}

        {galat && (
          <div className="mt-4">
            <Alert jenis="galat" judul="Galat">
              {galat}
            </Alert>
          </div>
        )}

        {pesanKonflik && (
          <div className="mt-4 flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            <span>{pesanKonflik}</span>
            <Button
              type="button"
              varian="secondary"
              onClick={() => void muatData()}
            >
              Muat Ulang
            </Button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field
            label="Nomor Berita Acara"
            value={nomor}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNomor(e.target.value)}
            placeholder="Contoh: 973/01/BA/BAPENDA/2026"
            keterangan="Nomor surat dinas resmi"
          />

          <Field
            label="Hari dan Tanggal Acara"
            value={hariTanggal}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHariTanggal(e.target.value)}
            placeholder="Contoh: Senin, 12 Oktober 2026"
            keterangan="Hari dan tanggal pelaksanaan pengundian"
          />

          <div className="md:col-span-2">
            <Field
              label="Tempat Pelaksanaan"
              value={tempat}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTempat(e.target.value)}
              placeholder="Contoh: Aula Serbaguna Pemkab OKU Selatan, Muaradua"
              keterangan="Lokasi fisik terselenggaranya acara"
            />
          </div>

          <div className="md:col-span-2">
            <TextareaField
              label="Dasar Kegiatan"
              value={dasarKegiatan}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDasarKegiatan(e.target.value)}
              rows={3}
              placeholder="Contoh: Keputusan Bupati OKU Selatan Nomor ... tentang Penetapan Hadiah Undian PBB-P2 ..."
            />
          </div>
        </div>

        {/* Bagian Panitia Pelaksana */}
        <div className="mt-8 border-t border-neutral-200 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Daftar Panitia Pelaksana (Maksimal 5)</h3>
              <p className="text-xs text-neutral-500">Nama dan jabatan panitia untuk lembar tanda tangan dokumen</p>
            </div>
            {panitia.length < 5 && (
              <Button
                type="button"
                varian="secondary"
                onClick={handleTambahPanitia}
              >
                Tambah Panitia
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {panitia.map((p, idx) => (
              <div key={`panitia-${idx}`} className="flex items-start gap-3">
                <span className="mt-2.5 w-6 text-center text-xs font-semibold text-neutral-500">
                  {idx + 1}.
                </span>
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label={`Nama Panitia ${idx + 1}`}
                    value={p.nama}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUbahPanitia(idx, 'nama', e.target.value)}
                    placeholder="Nama Lengkap & Gelar"
                  />
                  <Field
                    label={`Jabatan Panitia ${idx + 1}`}
                    value={p.jabatan}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUbahPanitia(idx, 'jabatan', e.target.value)}
                    placeholder="Contoh: Ketua Panitia / Kepala Bapenda"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleHapusPanitia(idx)}
                  className="mt-8 rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 focus:outline-hidden"
                  title="Hapus baris panitia"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Bagian Saksi-Saksi */}
        <div className="mt-8 border-t border-neutral-200 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Daftar Saksi (Maksimal 5)</h3>
              <p className="text-xs text-neutral-500">Nama dan instansi perwakilan saksi yang mengesahkan undian</p>
            </div>
            {saksi.length < 5 && (
              <Button
                type="button"
                varian="secondary"
                onClick={handleTambahSaksi}
              >
                Tambah Saksi
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {saksi.map((s, idx) => (
              <div key={`saksi-${idx}`} className="flex items-start gap-3">
                <span className="mt-2.5 w-6 text-center text-xs font-semibold text-neutral-500">
                  {idx + 1}.
                </span>
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field
                    label={`Nama Saksi ${idx + 1}`}
                    value={s.nama}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUbahSaksi(idx, 'nama', e.target.value)}
                    placeholder="Nama Lengkap & Gelar"
                  />
                  <Field
                    label={`Instansi Saksi ${idx + 1}`}
                    value={s.instansi}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUbahSaksi(idx, 'instansi', e.target.value)}
                    placeholder="Contoh: Notaris / Dinas Sosial / Kepolisian"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleHapusSaksi(idx)}
                  className="mt-8 rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-red-600 focus:outline-hidden"
                  title="Hapus baris saksi"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-end border-t border-neutral-200 pt-5">
          <Button
            type="submit"
            disabled={menyimpan}
            memuat={menyimpan}
            labelMemuat="Menyimpan..."
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </div>
  );
}
