'use client';

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  History,
  ShieldAlert,
  Trophy,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactElement } from 'react';

import {
  type AlasanGugur,
  DAFTAR_ALASAN_GUGUR,
  LABEL_ALASAN_GUGUR,
  type PemenangPeriodeRespons,
  type SlotPemenangRespons,
  type WilayahPemenangRespons,
} from '@/lib/domain/pemenang';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { SelectField } from '@/components/ui/select-field';
import { TextareaField } from '@/components/ui/textarea-field';

const OPSI_ALASAN = DAFTAR_ALASAN_GUGUR.map((a) => ({
  nilai: a,
  label: LABEL_ALASAN_GUGUR[a],
}));

type KelolaPemenangProps = {
  periodeId: string;
  statusPeriode: string;
};

export function KelolaPemenang({
  periodeId,
  statusPeriode: _statusPeriode,
}: KelolaPemenangProps): ReactElement {
  const [dataPemenang, setDataPemenang] = useState<PemenangPeriodeRespons | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [pesanKonflik, setPesanKonflik] = useState<string | null>(null);

  // Slot aktif untuk aksi
  const [slotTerpilih, setSlotTerpilih] = useState<SlotPemenangRespons | null>(null);

  // State Modal Gugur
  const [bukaModalGugur, setBukaModalGugur] = useState(false);
  const [alasanGugur, setAlasanGugur] = useState<AlasanGugur>('TIDAK_DAPAT_DIHUBUNGI');
  const [catatanGugur, setCatatanGugur] = useState('');
  const [memuatGugur, setMemuatGugur] = useState(false);
  const [galatGugur, setGalatGugur] = useState<string | null>(null);

  // State Modal Intip NIK
  const [bukaModalNik, setBukaModalNik] = useState(false);
  const [alasanNik, setAlasanNik] = useState('');
  const [nikTerbuka, setNikTerbuka] = useState<string | null>(null);
  const [memuatNik, setMemuatNik] = useState(false);
  const [galatNik, setGalatNik] = useState<string | null>(null);

  // State Verifikasi
  const [slotSedangVerifikasi, setSlotSedangVerifikasi] = useState<string | null>(null);

  // State Accordion Riwayat per slot
  const [riwayatTerbuka, setRiwayatTerbuka] = useState<Record<string, boolean>>({});

  const muatData = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch(`/api/periode/${periodeId}/pemenang`);
      if (!res.ok) {
        const errorJson = (await res.json()) as { error?: { message?: string } };
        throw new Error(errorJson.error?.message ?? 'Gagal memuat data pemenang.');
      }
      const data = (await res.json()) as PemenangPeriodeRespons;
      setDataPemenang(data);
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setMemuat(false);
    }
  }, [periodeId]);

  useEffect(() => {
    let aktif = true;
    fetch(`/api/periode/${periodeId}/pemenang`)
      .then(async (res) => {
        if (!res.ok) {
          const errorJson = (await res.json()) as { error?: { message?: string } };
          throw new Error(errorJson.error?.message ?? 'Gagal memuat data pemenang.');
        }
        return (await res.json()) as PemenangPeriodeRespons;
      })
      .then((data) => {
        if (aktif) {
          setDataPemenang(data);
          setMemuat(false);
        }
      })
      .catch((err: unknown) => {
        if (aktif) {
          setGalat(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
          setMemuat(false);
        }
      });

    return () => {
      aktif = false;
    };
  }, [periodeId]);

  const toggleRiwayat = (kode: string): void => {
    setRiwayatTerbuka((prev) => ({
      ...prev,
      [kode]: !prev[kode],
    }));
  };

  // Aksi Verifikasi
  const tanganiVerifikasi = async (slot: SlotPemenangRespons): Promise<void> => {
    setSlotSedangVerifikasi(slot.kode);
    setSukses(null);
    setPesanKonflik(null);
    try {
      const res = await fetch(`/api/periode/${periodeId}/pemenang/${slot.kode}/verifikasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: slot.version }),
      });

      if (res.status === 409) {
        setPesanKonflik('Status pemenang telah diubah oleh pengguna lain. Halaman dimuat ulang.');
        await muatData();
        return;
      }

      if (!res.ok) {
        const errJson = (await res.json()) as { error?: { message?: string } };
        throw new Error(errJson.error?.message ?? 'Gagal memverifikasi pemenang.');
      }

      const hasil = (await res.json()) as PemenangPeriodeRespons;
      setDataPemenang(hasil);
      setSukses(`Pemenang pada slot ${slot.kode} berhasil diverifikasi.`);
    } catch (err) {
      setGalat(err instanceof Error ? err.message : 'Gagal memverifikasi.');
    } finally {
      setSlotSedangVerifikasi(null);
    }
  };

  // Buka Modal Gugur
  const bukaGugur = (slot: SlotPemenangRespons): void => {
    setSlotTerpilih(slot);
    setAlasanGugur('TIDAK_DAPAT_DIHUBUNGI');
    setCatatanGugur('');
    setGalatGugur(null);
    setBukaModalGugur(true);
  };

  // Kirim Gugur
  const kirimGugur = async (): Promise<void> => {
    if (slotTerpilih === null) return;
    if (catatanGugur.trim().length < 5) {
      setGalatGugur('Catatan wajib diisi minimal 5 karakter.');
      return;
    }

    setMemuatGugur(true);
    setGalatGugur(null);
    setSukses(null);
    setPesanKonflik(null);

    try {
      const res = await fetch(`/api/periode/${periodeId}/pemenang/${slotTerpilih.kode}/gugur`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: slotTerpilih.version,
          alasan: alasanGugur,
          catatan: catatanGugur.trim(),
        }),
      });

      if (res.status === 409) {
        setBukaModalGugur(false);
        setPesanKonflik('Status pemenang telah diubah oleh pengguna lain. Halaman dimuat ulang.');
        await muatData();
        return;
      }

      if (!res.ok) {
        const errJson = (await res.json()) as { error?: { message?: string } };
        throw new Error(errJson.error?.message ?? 'Gagal menandai gugur.');
      }

      const hasil = (await res.json()) as PemenangPeriodeRespons;
      setDataPemenang(hasil);
      setBukaModalGugur(false);
      setSukses(
        `Kandidat pada slot ${slotTerpilih.kode} telah ditandai gugur. Hadiah dialihkan ke cadangan berikutnya.`,
      );
    } catch (err) {
      setGalatGugur(err instanceof Error ? err.message : 'Terjadi kegagalan.');
    } finally {
      setMemuatGugur(false);
    }
  };

  // Buka Modal Intip NIK
  const bukaNik = (slot: SlotPemenangRespons): void => {
    setSlotTerpilih(slot);
    setAlasanNik('');
    setNikTerbuka(null);
    setGalatNik(null);
    setBukaModalNik(true);
  };

  // Kirim Intip NIK
  const kirimNik = async (): Promise<void> => {
    if (slotTerpilih === null) return;
    if (alasanNik.trim().length < 5) {
      setGalatNik('Alasan wajib diisi minimal 5 karakter.');
      return;
    }

    setMemuatNik(true);
    setGalatNik(null);

    try {
      const res = await fetch(`/api/periode/${periodeId}/pemenang/${slotTerpilih.kode}/nik`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alasan: alasanNik.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json()) as { error?: { message?: string } };
        throw new Error(errJson.error?.message ?? 'Gagal mengambil NIK.');
      }

      const hasil = (await res.json()) as { nik: string };
      setNikTerbuka(hasil.nik || 'NIK tidak tersedia');
    } catch (err) {
      setGalatNik(err instanceof Error ? err.message : 'Gagal memuat NIK.');
    } finally {
      setMemuatNik(false);
    }
  };

  if (memuat) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-neutral-300 bg-neutral-0 p-8">
        <p className="text-base font-medium text-neutral-600">Memuat data pemenang...</p>
      </div>
    );
  }

  const adaSlot = dataPemenang?.wilayah.some((w) => w.slot.length > 0) ?? false;

  return (
    <div className="space-y-6">
      {pesanKonflik !== null && (
        <Alert jenis="peringatan" judul="Pembaruan Data">
          {pesanKonflik}
        </Alert>
      )}

      {galat !== null && (
        <Alert jenis="galat" judul="Gagal">
          {galat}
        </Alert>
      )}

      {sukses !== null && (
        <Alert jenis="info" judul="Berhasil">
          {sukses}
        </Alert>
      )}

      {!adaSlot && (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-0 p-8 text-center">
          <p className="text-base font-semibold text-neutral-800">
            Hasil undian belum diunggah untuk periode ini.
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Silakan unggah file hasil undian pada tab &quot;Unggah Hasil&quot; terlebih dahulu.
          </p>
        </div>
      )}

      {adaSlot && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {dataPemenang?.wilayah.map((w: WilayahPemenangRespons) => {
            const isPerluKeputusan = w.statusWilayah === 'PERLU_KEPUTUSAN';
            const isTerverifikasi = w.statusWilayah === 'TERVERIFIKASI';

            return (
              <div
                key={w.kode}
                className={`flex flex-col rounded-lg border bg-neutral-0 shadow-sm transition-all ${
                  isPerluKeputusan
                    ? 'border-danger-700 bg-danger-50/20'
                    : isTerverifikasi
                      ? 'border-success-700/50'
                      : 'border-neutral-300'
                }`}
              >
                {/* Header Wilayah */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4">
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">
                      {w.kode} — {w.nama}
                    </h2>
                    <p className="text-xs text-neutral-500">3 Slot Kandidat Undian</p>
                  </div>
                  <div>
                    {isPerluKeputusan && (
                      <Chip nada="bahaya" Ikon={AlertCircle}>
                        Perlu Keputusan
                      </Chip>
                    )}
                    {isTerverifikasi && (
                      <Chip nada="sukses" Ikon={CheckCircle2}>
                        Terverifikasi
                      </Chip>
                    )}
                    {!isPerluKeputusan && !isTerverifikasi && (
                      <Chip nada="primer" Ikon={UserCheck}>
                        Ada Penerima
                      </Chip>
                    )}
                  </div>
                </div>

                {/* Banner Perlu Keputusan jika semua gugur */}
                {isPerluKeputusan && (
                  <div className="border-b border-danger-200 bg-danger-100 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="size-5 shrink-0 text-danger-700" />
                      <div>
                        <p className="text-sm font-bold text-danger-700">
                          Perlu keputusan — semua kandidat gugur.
                        </p>
                        <p className="text-xs text-danger-700/90">
                          Tidak ada undi ulang otomatis. Keputusan lanjutan dilakukan di luar sistem
                          dan dicatat manual.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Daftar Slot */}
                <div className="space-y-4 p-6">
                  {w.slot.map((slot) => {
                    const isAktif = slot.penerimaAktif;
                    const isMenang = slot.status === 'MENANG';
                    const isGugur = slot.status === 'GUGUR';
                    const isVerified = slot.status === 'TERVERIFIKASI';
                    const bukaHistory = Boolean(riwayatTerbuka[slot.kode]);

                    return (
                      <div
                        key={slot.kode}
                        className={`rounded-lg border p-4 transition-all ${
                          isAktif
                            ? 'border-primary-700 bg-primary-50/20 ring-1 ring-primary-700'
                            : isGugur
                              ? 'border-neutral-200 bg-neutral-50/60 opacity-80'
                              : 'border-neutral-300 bg-neutral-0'
                        }`}
                      >
                        {/* Header Slot */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-neutral-800">
                              {slot.kode}
                            </span>
                            {isAktif && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary-700 px-2 py-0.5 text-xs font-semibold text-neutral-0">
                                <Trophy className="size-3" />
                                Penerima Hadiah
                              </span>
                            )}
                          </div>
                          <div>
                            {isVerified && (
                              <Chip nada="sukses" Ikon={CheckCircle2}>
                                Terverifikasi
                              </Chip>
                            )}
                            {isMenang && !isVerified && (
                              <Chip nada="primer" Ikon={Trophy}>
                                Menang
                              </Chip>
                            )}
                            {slot.status === 'CADANGAN' && (
                              <Chip nada="netral" Ikon={Clock}>
                                Cadangan
                              </Chip>
                            )}
                            {isGugur && (
                              <Chip nada="bahaya" Ikon={XCircle}>
                                Gugur
                              </Chip>
                            )}
                          </div>
                        </div>

                        {/* Data Peserta */}
                        <div className="mt-3 space-y-2 text-sm text-neutral-700">
                          <div>
                            <p className="text-xs text-neutral-500">Nama Wajib Pajak</p>
                            <p className="text-base font-bold text-neutral-900">
                              {slot.peserta.nama}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-neutral-500">NOP</p>
                              <p className="font-mono text-xs font-semibold text-neutral-800">
                                {slot.peserta.nopFormat}
                              </p>
                            </div>
                            <div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-neutral-500">NIK (Tersamar)</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    bukaNik(slot);
                                  }}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
                                >
                                  <Eye className="size-3" />
                                  Lihat Asli
                                </button>
                              </div>
                              <p className="font-mono text-xs text-neutral-800">
                                {slot.peserta.nikMasked}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <p className="text-xs text-neutral-500">Kecamatan / Kelurahan</p>
                              <p className="text-xs font-medium text-neutral-800">
                                {slot.peserta.kecamatan} / {slot.peserta.kelurahan}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-neutral-500">Alamat WP</p>
                              <p className="truncate text-xs text-neutral-800">
                                {slot.peserta.alamatWp}
                              </p>
                            </div>
                          </div>

                          {/* Data Pelunasan */}
                          {Object.keys(slot.peserta.lunas).length > 0 && (
                            <div className="pt-1">
                              <p className="mb-1 text-xs text-neutral-500">Pelunasan PBB-P2</p>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(slot.peserta.lunas).map(([th, tgl]) => (
                                  <span
                                    key={th}
                                    className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-700"
                                  >
                                    <strong className="text-neutral-900">{th}:</strong> {tgl}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Keterangan Gugur jika berstatus Gugur */}
                          {isGugur && (
                            <div className="mt-2 rounded border border-danger-300 bg-danger-50 p-2 text-xs text-danger-700">
                              <p className="font-semibold">
                                Alasan Gugur:{' '}
                                {slot.alasanGugur
                                  ? ((LABEL_ALASAN_GUGUR as Record<string, string>)[
                                      slot.alasanGugur
                                    ] ?? slot.alasanGugur)
                                  : '-'}
                              </p>
                              {slot.catatan && (
                                <p className="mt-0.5 text-danger-700/90">
                                  Catatan: {slot.catatan}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Bilah Aksi Slot */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              toggleRiwayat(slot.kode);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-900"
                          >
                            <History className="size-3.5" />
                            Riwayat ({slot.riwayat.length})
                            {bukaHistory ? (
                              <ChevronUp className="size-3" />
                            ) : (
                              <ChevronDown className="size-3" />
                            )}
                          </button>

                          <div className="flex items-center gap-2">
                            {isAktif && isMenang && (
                              <Button
                                varian="primary"
                                memuat={slotSedangVerifikasi === slot.kode}
                                labelMemuat="Memverifikasi..."
                                onClick={() => {
                                  void tanganiVerifikasi(slot);
                                }}
                                className="h-8 px-3 text-xs"
                              >
                                Verifikasi
                              </Button>
                            )}

                            {!isGugur && (
                              <Button
                                varian="danger"
                                onClick={() => {
                                  bukaGugur(slot);
                                }}
                                className="h-8 px-3 text-xs"
                              >
                                Tandai Gugur
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Panel Collapse Riwayat Status */}
                        {bukaHistory && (
                          <div className="mt-3 space-y-2 rounded-md bg-neutral-50 p-3 text-xs text-neutral-700">
                            <p className="font-semibold text-neutral-900">
                              Riwayat Perubahan Status:
                            </p>
                            {slot.riwayat.length === 0 ? (
                              <p className="italic text-neutral-500">Belum ada catatan riwayat.</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {slot.riwayat.map((r) => (
                                  <li
                                    key={r.id}
                                    className="border-b border-neutral-200/60 pb-1.5 last:border-0"
                                  >
                                    <div className="flex items-center justify-between text-neutral-500">
                                      <span>Oleh: {r.oleh}</span>
                                      <span>{new Date(r.at).toLocaleString('id-ID')}</span>
                                    </div>
                                    <p className="font-medium text-neutral-800">
                                      {r.dari} &rarr; {r.ke}
                                      {r.alasanGugur && ` (${r.alasanGugur})`}
                                    </p>
                                    {r.catatan && (
                                      <p className="text-neutral-600">&ldquo;{r.catatan}&rdquo;</p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tandai Gugur */}
      {bukaModalGugur && slotTerpilih !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-neutral-300 bg-neutral-0 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-lg font-bold text-neutral-900">
                Tandai Gugur — {slotTerpilih.kode}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setBukaModalGugur(false);
                }}
                className="text-neutral-500 hover:text-neutral-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-sm text-neutral-600">
                Kandidat: <strong className="text-neutral-900">{slotTerpilih.peserta.nama}</strong>
                <br />
                <span className="text-danger-700">
                  Status gugur bersifat permanen dan tidak dapat dibatalkan dari antarmuka.
                </span>
              </p>

              {galatGugur !== null && (
                <Alert jenis="galat" judul="Galat">
                  {galatGugur}
                </Alert>
              )}

              <SelectField
                label="Alasan Gugur"
                value={alasanGugur}
                onChange={(e) => {
                  setAlasanGugur(e.target.value as AlasanGugur);
                }}
                opsi={OPSI_ALASAN}
              />

              <TextareaField
                label="Catatan Verifikasi (5–500 karakter)"
                value={catatanGugur}
                onChange={(e) => {
                  setCatatanGugur(e.target.value);
                }}
                placeholder="Tuliskan catatan rinci mengapa kandidat dinyatakan gugur..."
                rows={3}
              />
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-neutral-200 pt-4">
              <Button
                varian="secondary"
                onClick={() => {
                  setBukaModalGugur(false);
                }}
                disabled={memuatGugur}
              >
                Batal
              </Button>
              <Button
                varian="danger"
                memuat={memuatGugur}
                labelMemuat="Menyimpan..."
                onClick={() => {
                  void kirimGugur();
                }}
              >
                Konfirmasi Gugur
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Intip NIK */}
      {bukaModalNik && slotTerpilih !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-neutral-300 bg-neutral-0 p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-5 text-warning-700" />
                <h3 className="text-lg font-bold text-neutral-900">Lihat NIK Asli</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBukaModalNik(false);
                }}
                className="text-neutral-500 hover:text-neutral-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-sm text-neutral-600">
                Kandidat: <strong className="text-neutral-900">{slotTerpilih.peserta.nama}</strong> (
                {slotTerpilih.kode})
              </p>

              <div className="rounded-md border border-warning-300 bg-warning-50 p-3 text-xs text-warning-700">
                Peringatan: Data NIK bersifat rahasia. Permintaan untuk menampilkan NIK asli wajib
                disertai alasan dan akan dicatat secara permanen di Log Audit.
              </div>

              {galatNik !== null && (
                <Alert jenis="galat" judul="Galat">
                  {galatNik}
                </Alert>
              )}

              {nikTerbuka === null ? (
                <TextareaField
                  label="Alasan Menampilkan NIK (Wajib, min. 5 karakter)"
                  value={alasanNik}
                  onChange={(e) => {
                    setAlasanNik(e.target.value);
                  }}
                  placeholder="Contoh: Verifikasi identitas pemenang di kantor Bapenda..."
                  rows={3}
                />
              ) : (
                <div className="space-y-2 rounded-md border border-neutral-300 bg-neutral-50 p-4 text-center">
                  <p className="text-xs text-neutral-500">Nomor Induk Kependudukan (NIK):</p>
                  <p className="font-mono text-xl font-bold tracking-wider text-neutral-900">
                    {nikTerbuka}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-neutral-200 pt-4">
              <Button
                varian="secondary"
                onClick={() => {
                  setBukaModalNik(false);
                }}
                disabled={memuatNik}
              >
                {nikTerbuka === null ? 'Batal' : 'Tutup'}
              </Button>
              {nikTerbuka === null && (
                <Button
                  varian="primary"
                  memuat={memuatNik}
                  labelMemuat="Mendekripsi..."
                  onClick={() => {
                    void kirimNik();
                  }}
                >
                  Tampilkan NIK
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
