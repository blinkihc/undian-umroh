'use client';

import {
  Camera,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Trash2,
  X,
} from 'lucide-react';
import { useRef, useState, type ChangeEvent, type ReactElement } from 'react';

import { type SlotPemenangRespons } from '@/lib/domain/pemenang';
import { Button } from '@/components/ui/button';

type DokumentasiSimbolisAdminProps = {
  periodeId: string;
  slot: SlotPemenangRespons;
  onBerhasil: () => void;
  onError: (pesan: string) => void;
  onSukses: (pesan: string) => void;
};

export function DokumentasiSimbolisAdmin({
  periodeId,
  slot,
  onBerhasil,
  onError,
  onSukses,
}: DokumentasiSimbolisAdminProps): ReactElement {
  const [sedangUnggah, setSedangUnggah] = useState(false);
  const [idFotoHapus, setIdFotoHapus] = useState<string | null>(null);
  const [catatan, setCatatan] = useState(slot.diserahkanCatatan ?? '');
  const tanggalAwal = slot.diserahkanAt ? slot.diserahkanAt.slice(0, 10) : '';
  const [tanggalPenyerahan, setTanggalPenyerahan] = useState(tanggalAwal);
  const [sedangSimpanCatatan, setSedangSimpanCatatan] = useState(false);
  const [fotoPratinjau, setFotoPratinjau] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fotos = slot.fotoDokumentasi ?? [];
  const sisaSlot = 3 - fotos.length;

  const tanganiPilihBerkas = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      onError('Format berkas harus berupa JPG, PNG, atau WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onError('Ukuran berkas maksimal 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSedangUnggah(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (catatan.trim().length > 0) {
        formData.append('catatan', catatan.trim());
      }

      const res = await fetch(`/api/periode/${periodeId}/pemenang/${slot.kode}/foto`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = (await res.json()) as { error?: { message?: string } };
        throw new Error(errJson.error?.message ?? 'Gagal mengunggah foto dokumentasi.');
      }

      onSukses(`Foto bukti penyerahan simbolis untuk slot ${slot.kode} berhasil diunggah.`);
      onBerhasil();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setSedangUnggah(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const tanganiHapusFoto = async (fotoId: string): Promise<void> => {
    const konfirmasi = window.confirm(
      'Hapus foto dokumentasi penyerahan simbolis ini dari sistem?',
    );
    if (!konfirmasi) return;

    setIdFotoHapus(fotoId);
    try {
      const res = await fetch(`/api/periode/${periodeId}/pemenang/${slot.kode}/foto/${fotoId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = (await res.json()) as { error?: { message?: string } };
        throw new Error(errJson.error?.message ?? 'Gagal menghapus foto dokumentasi.');
      }

      onSukses(`Foto dokumentasi berhasil dihapus.`);
      onBerhasil();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menghapus foto.');
    } finally {
      setIdFotoHapus(null);
    }
  };

  const tanganiSimpanCatatan = async (): Promise<void> => {
    setSedangSimpanCatatan(true);
    try {
      const res = await fetch(`/api/periode/${periodeId}/pemenang/${slot.kode}/foto`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          catatan,
          diserahkanAt: tanggalPenyerahan.trim() ? tanggalPenyerahan.trim() : null,
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json()) as { error?: { message?: string } };
        throw new Error(errJson.error?.message ?? 'Gagal memperbarui catatan penyerahan.');
      }

      onSukses('Catatan dan tanggal penyerahan simbolis berhasil disimpan.');
      onBerhasil();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem.');
    } finally {
      setSedangSimpanCatatan(false);
    }
  };

  return (
    <div className="border-neutral-200 mt-4 rounded-lg border bg-neutral-50/70 p-3.5">
      <div className="border-neutral-200 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-emerald-700" />
          <h4 className="text-xs font-bold text-neutral-900">Bukti Penyerahan Simbolis</h4>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            fotos.length > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'
          }`}
        >
          {fotos.length > 0 ? `${fotos.length.toString()}/3 Foto Tersimpan` : 'Belum Ada Foto'}
        </span>
      </div>

      {/* Galeri Foto Thumbnail */}
      <div className="mt-3">
        {fotos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {fotos.map((fotoId, idx) => (
              <div
                key={`${fotoId}-${idx.toString()}`}
                className="group border-neutral-200 relative aspect-4/3 w-full overflow-hidden rounded-md border bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/aset/${fotoId}`}
                  alt={`Bukti penyerahan simbolis ${slot.kode} foto ${(idx + 1).toString()}`}
                  className="h-full w-full object-cover"
                />

                {/* Overlay Aksi */}
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-neutral-900/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setFotoPratinjau(fotoId);
                    }}
                    className="text-neutral-800 flex size-7 items-center justify-center rounded-md bg-white/90 transition-colors hover:bg-white"
                    title="Pratinjau Penuh"
                  >
                    <Maximize2 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idFotoHapus === fotoId}
                    onClick={() => {
                      void tanganiHapusFoto(fotoId);
                    }}
                    className="bg-rose-600/90 hover:bg-rose-700 flex size-7 items-center justify-center rounded-md text-white transition-colors disabled:opacity-50"
                    title="Hapus Foto"
                  >
                    {idFotoHapus === fotoId ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-neutral-500 flex items-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white p-3 text-xs">
            <ImageIcon className="text-neutral-400 size-4 shrink-0" />
            <span>Belum ada foto dokumentasi penyerahan simbolis. Unggah hingga 3 foto bukti.</span>
          </div>
        )}
      </div>

      {/* Tombol Unggah Foto */}
      {sisaSlot > 0 && (
        <div className="mt-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              void tanganiPilihBerkas(e);
            }}
          />
          <Button
            type="button"
            varian="secondary"
            memuat={sedangUnggah}
            labelMemuat="Mengunggah Foto..."
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-full text-xs font-semibold"
          >
            {`Unggah Foto Bukti (${sisaSlot.toString()} slot tersisa)`}
          </Button>
          <p className="text-neutral-500 mt-1 text-[11px]">
            Format: JPG, PNG, atau WebP. Maksimal 5 MB per foto.
          </p>
        </div>
      )}

      {/* Form Catatan & Tanggal Penyerahan Simbolis */}
      <div className="border-neutral-200/80 mt-3 border-t pt-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-2">
            <label
              htmlFor={`catatan-simbolis-${slot.kode}`}
              className="text-neutral-700 block text-[11px] font-semibold"
            >
              Catatan Penyerahan Simbolis
            </label>
            <input
              id={`catatan-simbolis-${slot.kode}`}
              type="text"
              value={catatan}
              onChange={(e) => {
                setCatatan(e.target.value);
              }}
              placeholder="Misal: Diserahkan secara simbolis oleh Bupati OKU Selatan pada 17 Agustus 2026"
              className="placeholder:text-neutral-400 mt-1 h-8 w-full rounded-md border border-neutral-300 bg-white px-2.5 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label
              htmlFor={`tanggal-simbolis-${slot.kode}`}
              className="text-neutral-700 block text-[11px] font-semibold"
            >
              Tanggal Penyerahan
            </label>
            <input
              id={`tanggal-simbolis-${slot.kode}`}
              type="date"
              value={tanggalPenyerahan}
              onChange={(e) => {
                setTanggalPenyerahan(e.target.value);
              }}
              className="mt-1 h-8 w-full rounded-md border border-neutral-300 bg-white px-2.5 text-xs text-neutral-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          {slot.diserahkanAt ? (
            <p className="text-neutral-500 text-[11px]">
              Tercatat diserahkan pada:{' '}
              <span className="text-neutral-700 font-medium">{slot.diserahkanAt}</span>
            </p>
          ) : (
            <span className="text-neutral-400 text-[11px]">Tanggal belum disetel</span>
          )}

          <Button
            type="button"
            varian="primary"
            memuat={sedangSimpanCatatan}
            labelMemuat="Menyimpan..."
            disabled={
              catatan === (slot.diserahkanCatatan ?? '') &&
              tanggalPenyerahan === tanggalAwal
            }
            onClick={() => {
              void tanganiSimpanCatatan();
            }}
            className="h-8 shrink-0 px-3 text-xs"
          >
            Simpan
          </Button>
        </div>
      </div>

      {/* Modal Lightbox Pratinjau Foto Penuh */}
      {fotoPratinjau !== null && (
        <div
          className="bg-neutral-950/80 fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setFotoPratinjau(null);
          }}
        >
          <div
            className="shadow-2xl relative max-h-[90vh] max-w-3xl overflow-hidden rounded-lg bg-neutral-900 p-2"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              onClick={() => {
                setFotoPratinjau(null);
              }}
              className="bg-neutral-800/80 hover:bg-neutral-700 absolute top-4 right-4 z-10 flex size-8 items-center justify-center rounded-full text-white"
              title="Tutup Pratinjau"
            >
              <X className="size-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/aset/${fotoPratinjau}`}
              alt={`Dokumentasi penuh ${slot.kode}`}
              className="rounded max-h-[82vh] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
