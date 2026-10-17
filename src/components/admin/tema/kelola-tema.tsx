'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Music,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Save,
  Sliders,
  Sparkles,
  Square,
  Type,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import { PengelolaAudio } from '@/client/offline/audio';
import {
  ambilAudioKustomFase,
  simpanAudioKustomFase,
} from '@/client/offline/custom-audio-store';
import { AnimasiUndian, type PesertaAnimasi } from '@/components/undian/animasi-undian';
import { type ThemeConfig, TEMA_DEFAULT } from '@/lib/package/theme';
import { PengaturanBgm } from './pengaturan-bgm';

type AsetItem = {
  id: string;
  nama: string;
  jenis: 'AUDIO' | 'GAMBAR';
  fase: 'MENUNGGU' | 'MENGACAK' | 'PEMENANG' | null;
  sha256: string;
  mime: string;
};

type TemaItem = {
  id: string;
  nama: string;
  config: ThemeConfig;
  bawaan: boolean;
};

export function KelolaTemaAdmin(): ReactElement {
  const [daftarTema, setDaftarTema] = useState<TemaItem[]>([]);
  const [temaAktif, setTemaAktif] = useState<TemaItem | null>(null);
  const [daftarAset, setDaftarAset] = useState<AsetItem[]>([]);
  const [config, setConfig] = useState<ThemeConfig>(TEMA_DEFAULT);
  const [namaTema, setNamaTema] = useState('Slot Mesin Bawaan');

  const [memuat, setMemuat] = useState(true);
  const [menyimpan, setMenyimpan] = useState(false);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);
  const [pesanGalat, setPesanGalat] = useState<string | null>(null);
  const [dialogReset, setDialogReset] = useState(false);
  const [peringatanPaket, setPeringatanPaket] = useState<string | null>(null);

  // Modal Unggah Aset Kustom
  const [bukaModalUnggah, setBukaModalUnggah] = useState(false);
  const [jenisUnggah, setJenisUnggah] = useState<'GAMBAR' | 'AUDIO'>('GAMBAR');
  const [faseUnggah, setFaseUnggah] = useState<'MENUNGGU' | 'MENGACAK' | 'PEMENANG'>('MENGACAK');
  const [berkasUnggah, setBerkasUnggah] = useState<File | null>(null);
  const [namaAsetUnggah, setNamaAsetUnggah] = useState('');
  const [deskripsiAsetUnggah, setDeskripsiAsetUnggah] = useState('');
  const [sedangUnggah, setSedangUnggah] = useState(false);
  const [pesanGalatUnggah, setPesanGalatUnggah] = useState<string | null>(null);

  // Status pratinjau animasi 16:9
  const [sedangPratinjau, setSedangPratinjau] = useState(false);
  const [fasePratinjau, setFasePratinjau] = useState<'MENUNGGU' | 'MENGACAK' | 'PEMENANG'>('MENUNGGU');
  const [pesertaSampel, setPesertaSampel] = useState<PesertaAnimasi>({
    nama: 'Drs. H. SYAIFUL ANWAR',
    nopMasked: '16.09.030.xxx.xxx-0001.0',
    wilayah: 'W1',
    kecamatan: 'MUARADUA',
  });

  // Status audio pratinjau per fase
  const [audioDiputar, setAudioDiputar] = useState<'menunggu' | 'mengacak' | 'pemenang' | null>(null);
  const [audioKustomMengacak, setAudioKustomMengacak] = useState<{ nama: string; url: string } | null>(null);
  const [audioKustomPemenang, setAudioKustomPemenang] = useState<{ nama: string; url: string } | null>(null);
  const pengelolaAudioRef = useRef<PengelolaAudio | null>(null);

  if (pengelolaAudioRef.current === null && typeof window !== 'undefined') {
    pengelolaAudioRef.current = new PengelolaAudio();
  }

  // Muat berkas audio kustom dari IndexedDB jika ada
  useEffect(() => {
    void (async () => {
      const kMengacak = await ambilAudioKustomFase('mengacak');
      if (kMengacak) setAudioKustomMengacak({ nama: kMengacak.nama, url: kMengacak.url });
      const kPemenang = await ambilAudioKustomFase('pemenang');
      if (kPemenang) setAudioKustomPemenang({ nama: kPemenang.nama, url: kPemenang.url });
    })();
  }, []);

  const tanganiUnggahKustomMengacak = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await simpanAudioKustomFase('mengacak', file);
    setAudioKustomMengacak(res);
    setConfig((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        mengacak: { ...prev.audio.mengacak, preset: 'kustom', asetId: null },
      },
    }));
  };

  const tanganiUnggahKustomPemenang = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await simpanAudioKustomFase('pemenang', file);
    setAudioKustomPemenang(res);
    setConfig((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        pemenang: { ...prev.audio.pemenang, preset: 'kustom', asetId: null },
      },
    }));
  };

  // Muat data tema dan pustaka aset
  const muatData = useCallback(async () => {
    setMemuat(true);
    setPesanGalat(null);
    try {
      const [resTema, resAset] = await Promise.all([
        fetch('/api/tema'),
        fetch('/api/aset'),
      ]);

      if (resTema.ok) {
        const dataTema = await resTema.json();
        const items = dataTema.items as TemaItem[];
        setDaftarTema(items);
        if (items.length > 0) {
          const aktif = items[0] ?? null;
          setTemaAktif(aktif);
          if (aktif) {
            setNamaTema(aktif.nama);
            setConfig(aktif.config);
          }
        }
      }

      if (resAset.ok) {
        const dataAset = await resAset.json();
        setDaftarAset(dataAset.items as AsetItem[]);
      }
    } catch {
      setPesanGalat('Gagal memuat data tema dan pustaka aset.');
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muatData();
  }, [muatData]);

  // Handler putar/berhenti audio pratinjau per fase
  const togglePutarAudio = async (fase: 'menunggu' | 'mengacak' | 'pemenang') => {
    if (audioDiputar === fase) {
      pengelolaAudioRef.current?.hentikanSemua();
      setAudioDiputar(null);
    } else {
      pengelolaAudioRef.current?.hentikanSemua();
      setAudioDiputar(fase);
      const audioCfg = config.audio[fase];
      let urlAudio = audioCfg.asetId ? `/api/aset/${audioCfg.asetId}` : null;
      if (audioCfg.preset === 'kustom' && !urlAudio) {
        if (fase === 'mengacak') {
          if (audioKustomMengacak) urlAudio = audioKustomMengacak.url;
          else {
            const kustom = await ambilAudioKustomFase('mengacak');
            if (kustom) urlAudio = kustom.url;
          }
        } else if (fase === 'pemenang') {
          if (audioKustomPemenang) urlAudio = audioKustomPemenang.url;
          else {
            const kustom = await ambilAudioKustomFase('pemenang');
            if (kustom) urlAudio = kustom.url;
          }
        }
      }
      const volumePersen = audioCfg.volumePersen;

      if (fase === 'menunggu') pengelolaAudioRef.current?.putarFase('MENUNGGU', { urlAudio, volumePersen, preset: audioCfg.preset });
      else if (fase === 'mengacak') pengelolaAudioRef.current?.putarFase('MENGACAK', { urlAudio, volumePersen, preset: audioCfg.preset });
      else pengelolaAudioRef.current?.putarFase('PEMENANG', { urlAudio, volumePersen, preset: audioCfg.preset });
    }
  };

  // Jalankan simulasi pratinjau animasi 16:9
  const jalankanPratinjau = () => {
    if (sedangPratinjau) return;
    setSedangPratinjau(true);
    setFasePratinjau('MENGACAK');

    // Putar audio fase mengacak
    const audioMengacak = config.audio.mengacak;
    let urlAudioMengacak = audioMengacak.asetId ? `/api/aset/${audioMengacak.asetId}` : null;
    if (audioMengacak.preset === 'kustom' && !urlAudioMengacak && audioKustomMengacak) {
      urlAudioMengacak = audioKustomMengacak.url;
    }
    pengelolaAudioRef.current?.putarFase('MENGACAK', {
      urlAudio: urlAudioMengacak,
      volumePersen: audioMengacak.volumePersen,
      preset: audioMengacak.preset,
    });

    const sampel: PesertaAnimasi[] = [
      { nama: 'BUDI SANTOSO', nopMasked: '16.09.010.xxx.xxx-0012.0', wilayah: 'W1', kecamatan: 'MUARADUA' },
      { nama: 'SITI AISYAH', nopMasked: '16.09.020.xxx.xxx-0045.0', wilayah: 'W2', kecamatan: 'BANDING AGUNG' },
      { nama: 'H. M. YUSUF', nopMasked: '16.09.030.xxx.xxx-0089.0', wilayah: 'W1', kecamatan: 'SIMPANG' },
      { nama: 'NURUL HIDAYATI', nopMasked: '16.09.040.xxx.xxx-0034.0', wilayah: 'W2', kecamatan: 'BUAY PEMACA' },
      { nama: 'Drs. H. SYAIFUL ANWAR', nopMasked: '16.09.030.xxx.xxx-0001.0', wilayah: 'W1', kecamatan: 'MUARADUA' },
    ];

    let i = 0;
    const interval = setInterval(() => {
      const item = sampel[i % sampel.length]!;
      setPesertaSampel(item);
      i++;
    }, config.animasi.kecepatan === 'cepat' ? 40 : config.animasi.kecepatan === 'lambat' ? 100 : 65);

    // Hitung waktu selesai simulasi
    const durasiTotalMs = Math.min(6000, config.animasi.durasiDetik * 1000);
    setTimeout(() => {
      clearInterval(interval);
      setFasePratinjau('PEMENANG');
      setPesertaSampel({
        nama: 'Drs. H. SYAIFUL ANWAR',
        nopMasked: '16.09.030.xxx.xxx-0001.0',
        wilayah: 'W1',
        kecamatan: 'MUARADUA',
      });

      // Putar audio kemenangan
      const audioPemenang = config.audio.pemenang;
      let urlAudioPemenang = audioPemenang.asetId ? `/api/aset/${audioPemenang.asetId}` : null;
      if (audioPemenang.preset === 'kustom' && !urlAudioPemenang && audioKustomPemenang) {
        urlAudioPemenang = audioKustomPemenang.url;
      }
      pengelolaAudioRef.current?.putarFase('PEMENANG', {
        urlAudio: urlAudioPemenang,
        volumePersen: audioPemenang.volumePersen,
        preset: audioPemenang.preset,
      });

      setTimeout(() => {
        setSedangPratinjau(false);
        setFasePratinjau('MENUNGGU');
        pengelolaAudioRef.current?.hentikanSemua();
      }, 3500);
    }, durasiTotalMs);
  };

  // Handler Unggah Aset Kustom
  const handleUnggahAset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!berkasUnggah) {
      setPesanGalatUnggah('Silakan pilih berkas file yang akan diunggah.');
      return;
    }
    setSedangUnggah(true);
    setPesanGalatUnggah(null);
    try {
      const formData = new FormData();
      formData.append('file', berkasUnggah);
      formData.append('nama', namaAsetUnggah.trim() || berkasUnggah.name);
      formData.append('deskripsi', deskripsiAsetUnggah.trim());
      formData.append('jenis', jenisUnggah);
      if (jenisUnggah === 'AUDIO') {
        formData.append('fase', faseUnggah);
      }

      const res = await fetch('/api/aset', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message ?? 'Gagal mengunggah aset.');
      }

      const asetBaru = (await res.json()) as AsetItem;
      setPesanSukses(`Aset "${asetBaru.nama}" berhasil diunggah.`);
      setBukaModalUnggah(false);
      setBerkasUnggah(null);
      setNamaAsetUnggah('');
      setDeskripsiAsetUnggah('');

      // Otomatis pasangkan aset yang baru diunggah ke konfigurasi tema aktif
      if (jenisUnggah === 'GAMBAR') {
        setConfig((prev) => ({
          ...prev,
          tampilan: { ...prev.tampilan, latarAsetId: asetBaru.id },
        }));
      } else {
        const keyFase = faseUnggah.toLowerCase() as 'menunggu' | 'mengacak' | 'pemenang';
        setConfig((prev) => ({
          ...prev,
          audio: {
            ...prev.audio,
            [keyFase]: { ...prev.audio[keyFase], asetId: asetBaru.id },
          },
        }));
      }

      await muatData();
    } catch (err) {
      setPesanGalatUnggah(err instanceof Error ? err.message : 'Gagal mengunggah berkas.');
    } finally {
      setSedangUnggah(false);
    }
  };

  // Handler Simpan Tema
  const handleSimpan = async () => {
    setMenyimpan(true);
    setPesanSukses(null);
    setPesanGalat(null);
    setPeringatanPaket(null);

    try {
      const url = temaAktif ? `/api/tema/${temaAktif.id}` : '/api/tema';
      const method = temaAktif ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: namaTema,
          config,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message ?? 'Gagal menyimpan tema.');
      }

      const hasil = await res.json();
      setPesanSukses('Konfigurasi tema berhasil disimpan.');
      if (hasil.peringatan) {
        setPeringatanPaket(hasil.peringatan);
      }
      await muatData();
    } catch (err) {
      setPesanGalat(err instanceof Error ? err.message : 'Gagal menyimpan tema.');
    } finally {
      setMenyimpan(false);
    }
  };

  // Handler Kembalikan Default
  const handleKembalikanDefault = async () => {
    setDialogReset(false);
    setMenyimpan(true);
    setPesanSukses(null);
    setPesanGalat(null);

    try {
      if (temaAktif) {
        const res = await fetch(`/api/tema/${temaAktif.id}/default`, {
          method: 'POST',
        });
        if (!res.ok) {
          throw new Error('Gagal mereset ke default.');
        }
      }
      setConfig(TEMA_DEFAULT);
      setPesanSukses('Konfigurasi tema telah dikembalikan ke pengaturan default bawaan.');
      await muatData();
    } catch (err) {
      setPesanGalat(err instanceof Error ? err.message : 'Gagal mereset tema.');
    } finally {
      setMenyimpan(false);
    }
  };

  const pilihPresetAnimasi = (preset: 'slot-mesin' | 'roda-nama' | 'kartu-berputar' | 'ticker-nop') => {
    setConfig((prev) => ({
      ...prev,
      animasi: { ...prev.animasi, preset },
    }));

    // Jika tema aktif merupakan tema bawaan, alihkan ke tema bawaan preset yang sesuai jika tersedia
    const temaSesuai = daftarTema.find(
      (t) => (t.config as ThemeConfig)?.animasi?.preset === preset && t.bawaan,
    );
    if (temaSesuai && temaAktif?.bawaan && temaSesuai.id !== temaAktif.id) {
      setTemaAktif(temaSesuai);
      setNamaTema(temaSesuai.nama);
      setConfig(temaSesuai.config);
    }
  };

  if (memuat) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary-700" />
        <span className="ml-3 text-sm font-medium text-neutral-600">Memuat konfigurasi tema...</span>
      </div>
    );
  }

  const asetGambar = daftarAset.filter((a) => a.jenis === 'GAMBAR');
  const asetAudio = daftarAset.filter((a) => a.jenis === 'AUDIO');

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 md:text-2xl">
              Tema Undian
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
              Tema aktif: {namaTema}
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-600 md:text-sm">
            Atur durasi, kecepatan, ornamen visual, dan audio Layar Undian dengan pratinjau langsung 16:9.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBukaModalUnggah(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50"
          >
            <Upload className="h-3.5 w-3.5 text-neutral-500" />
            Unggah Aset
          </button>
          <button
            type="button"
            onClick={() => setDialogReset(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50"
          >
            <RotateCcw className="h-3.5 w-3.5 text-neutral-500" />
            Kembalikan Default
          </button>
          <button
            type="button"
            onClick={handleSimpan}
            disabled={menyimpan}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-primary-800 disabled:opacity-60"
          >
            {menyimpan ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Simpan Tema
          </button>
        </div>
      </div>

      {/* Pemilih Tema untuk Disesuaikan */}
      {daftarTema.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-primary-700 shrink-0" />
            <div>
              <p className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
                Pilih Preset / Tema untuk Diedit:
              </p>
              <p className="text-[11px] text-neutral-500">
                Pilih tema bawaan atau kustom yang ingin Anda sesuaikan dan simpan konfigurasinya.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={temaAktif?.id ?? ''}
              onChange={(e) => {
                const t = daftarTema.find((item) => item.id === e.target.value);
                if (t) {
                  setTemaAktif(t);
                  setNamaTema(t.nama);
                  setConfig(t.config);
                  setPesanSukses(null);
                  setPesanGalat(null);
                }
              }}
              className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-2xs focus:border-primary-600 focus:outline-none"
            >
              {daftarTema.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama} {t.bawaan ? '(Bawaan)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Pesan Sukses / Peringatan */}
      {pesanSukses && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{pesanSukses}</span>
        </div>
      )}

      {peringatanPaket && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{peringatanPaket}</span>
        </div>
      )}

      {pesanGalat && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{pesanGalat}</span>
        </div>
      )}

      {/* Grid Utama: Pengaturan di Kiri, Pratinjau 16:9 di Kanan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Formulir Pengaturan */}
        <div className="space-y-6 lg:col-span-5">
          {/* Bagian Preset Animasi */}
          <div className="rounded-xl border border-neutral-300 bg-white p-5 shadow-xs">
            <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Sliders className="h-4 w-4 text-primary-700" />
              Preset Animasi
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {/* Preset 1: Slot Mesin */}
              <button
                type="button"
                onClick={() => pilihPresetAnimasi('slot-mesin')}
                className={`rounded-lg p-3 text-left transition-all ${
                  config.animasi.preset === 'slot-mesin'
                    ? 'border-2 border-primary-600 bg-primary-50/60 text-primary-900 shadow-xs'
                    : 'border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold">Slot Mesin</p>
                  {config.animasi.preset === 'slot-mesin' && (
                    <span className="rounded-full bg-primary-200/80 px-1.5 py-0.5 text-[9px] font-bold text-primary-800">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">Putaran vertikal ticker drumroll</p>
              </button>

              {/* Preset 2: Roda Nama */}
              <button
                type="button"
                onClick={() => pilihPresetAnimasi('roda-nama')}
                className={`rounded-lg p-3 text-left transition-all ${
                  config.animasi.preset === 'roda-nama'
                    ? 'border-2 border-primary-600 bg-primary-50/60 text-primary-900 shadow-xs'
                    : 'border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold">Roda Nama</p>
                  {config.animasi.preset === 'roda-nama' && (
                    <span className="rounded-full bg-primary-200/80 px-1.5 py-0.5 text-[9px] font-bold text-primary-800">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">Putaran silinder roda vertikal</p>
              </button>

              {/* Preset 3: Kartu Berputar */}
              <button
                type="button"
                onClick={() => pilihPresetAnimasi('kartu-berputar')}
                className={`rounded-lg p-3 text-left transition-all ${
                  config.animasi.preset === 'kartu-berputar'
                    ? 'border-2 border-primary-600 bg-primary-50/60 text-primary-900 shadow-xs'
                    : 'border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold">Kartu Berputar</p>
                  {config.animasi.preset === 'kartu-berputar' && (
                    <span className="rounded-full bg-primary-200/80 px-1.5 py-0.5 text-[9px] font-bold text-primary-800">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">Efek 3D flip kartu berputar</p>
              </button>

              {/* Preset 4: Ticker NOP */}
              <button
                type="button"
                onClick={() => pilihPresetAnimasi('ticker-nop')}
                className={`rounded-lg p-3 text-left transition-all ${
                  config.animasi.preset === 'ticker-nop'
                    ? 'border-2 border-primary-600 bg-primary-50/60 text-primary-900 shadow-xs'
                    : 'border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold">Ticker NOP</p>
                  {config.animasi.preset === 'ticker-nop' && (
                    <span className="rounded-full bg-primary-200/80 px-1.5 py-0.5 text-[9px] font-bold text-primary-800">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-neutral-500">Pengacakan cipher digit NOP</p>
              </button>
            </div>

            {/* Slider Durasi Mengacak */}
            <div className="mt-4 border-t border-neutral-200 pt-4">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="durasi" className="font-semibold text-neutral-800">
                  Durasi Mengacak (3 – 30 detik)
                </label>
                <span className="font-mono font-bold text-primary-700">
                  {config.animasi.durasiDetik} detik
                </span>
              </div>
              <input
                id="durasi"
                type="range"
                min="3"
                max="30"
                value={config.animasi.durasiDetik}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    animasi: { ...prev.animasi, durasiDetik: Number(e.target.value) },
                  }))
                }
                className="mt-2 w-full accent-primary-700"
              />
            </div>

            {/* Kecepatan Mengacak */}
            <div className="mt-4">
              <label className="block text-xs font-semibold text-neutral-800">
                Kecepatan Animasi
              </label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(['lambat', 'sedang', 'cepat'] as const).map((kec) => (
                  <button
                    key={kec}
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        animasi: { ...prev.animasi, kecepatan: kec },
                      }))
                    }
                    className={`rounded-md border py-1.5 text-xs font-semibold capitalize ${
                      config.animasi.kecepatan === kec
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    {kec}
                  </button>
                ))}
              </div>
            </div>

            {/* Berhenti Otomatis Toggle */}
            <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-xs">
              <div>
                <p className="font-semibold text-neutral-800">Berhenti Otomatis (Auto-Stop)</p>
                <p className="text-[11px] text-neutral-500">
                  Otomatis berhenti setelah durasi mengacak habis tanpa tekan tombol.
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.animasi.autoStop}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    animasi: { ...prev.animasi, autoStop: e.target.checked },
                  }))
                }
                className="h-4 w-4 rounded-sm border-neutral-300 text-primary-700 focus:ring-primary-600"
              />
            </div>
          </div>

          {/* Bagian Visual & Ornamen */}
          <div className="rounded-xl border border-neutral-300 bg-white p-5 shadow-xs">
            <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Palette className="h-4 w-4 text-primary-700" />
              Tampilan & Visual
            </h3>

            {/* Saklar Confetti & Ornamen Islami */}
            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-neutral-800">Ornamen Islami</p>
                  <p className="text-[11px] text-neutral-500">Bintang segi delapan & kaligrafi resmi Bapenda</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.tampilan.ornamenIslami}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      tampilan: { ...prev.tampilan, ornamenIslami: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded-sm border-neutral-300 text-primary-700 focus:ring-primary-600"
                />
              </div>

              <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
                <div>
                  <p className="font-semibold text-neutral-800">Efek Confetti Pemenang</p>
                  <p className="text-[11px] text-neutral-500">Hujan kertas perayaan saat kartu pemenang muncul</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.tampilan.confetti}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      tampilan: { ...prev.tampilan, confetti: e.target.checked },
                    }))
                  }
                  className="h-4 w-4 rounded-sm border-neutral-300 text-primary-700 focus:ring-primary-600"
                />
              </div>

              {/* Pilihan Gambar Latar */}
              <div className="border-t border-neutral-200 pt-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="latar" className="block font-semibold text-neutral-800">
                    Gambar Latar Belakang
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setJenisUnggah('GAMBAR');
                      setBukaModalUnggah(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-800"
                  >
                    <Plus className="h-3 w-3" /> Unggah Latar Baru
                  </button>
                </div>
                <select
                  id="latar"
                  value={config.tampilan.latarAsetId ?? ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      tampilan: {
                        ...prev.tampilan,
                        latarAsetId: e.target.value === '' ? null : e.target.value,
                      },
                    }))
                  }
                  className="mt-1.5 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-primary-600 focus:outline-hidden"
                >
                  <option value="">Latar Default Resmi OKU Selatan</option>
                  {asetGambar.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nama}
                    </option>
                  ))}
                </select>

                {/* Slider Overlay Gelap Latar */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-800">
                    <span>Kepekatan Lapisan Gelap Latar</span>
                    <span className="font-mono">{config.tampilan.overlayGelapPersen}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="90"
                    value={config.tampilan.overlayGelapPersen}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        tampilan: {
                          ...prev.tampilan,
                          overlayGelapPersen: Number(e.target.value),
                        },
                      }))
                    }
                    className="h-1.5 w-full cursor-pointer accent-primary-600"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Menjaga keterbacaan teks dan angka pengundian di atas gambar latar belakang.
                  </p>
                </div>
              </div>

              {/* Warna Aksen */}
              <div className="border-t border-neutral-200 pt-3">
                <label className="block font-semibold text-neutral-800">Warna Aksen</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(['kuning', 'hijau', 'biru-muda'] as const).map((warna) => (
                    <button
                      key={warna}
                      type="button"
                      onClick={() =>
                        setConfig((prev) => ({
                          ...prev,
                          tampilan: { ...prev.tampilan, warnaAksen: warna },
                        }))
                      }
                      className={`rounded-md border py-1.5 text-xs font-semibold capitalize ${
                        config.tampilan.warnaAksen === warna
                          ? 'border-primary-600 bg-primary-600 text-white'
                          : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {warna}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bagian Audio per Fase */}
          <div className="rounded-xl border border-neutral-300 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                <Music className="h-4 w-4 text-primary-700" />
                Efek Suara (Audio per Fase)
              </h3>
              <button
                type="button"
                onClick={() => {
                  setJenisUnggah('AUDIO');
                  setBukaModalUnggah(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-800"
              >
                <Plus className="h-3 w-3" /> Unggah Audio Baru
              </button>
            </div>

            <div className="mt-3 space-y-4 text-xs">
              {/* 1. Menunggu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-800">Fase Menunggu (Loop)</span>
                  <button
                    type="button"
                    onClick={() => togglePutarAudio('menunggu')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-800"
                  >
                    {audioDiputar === 'menunggu' ? (
                      <>
                        <Square className="h-3 w-3 fill-primary-700" /> Berhenti
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 fill-primary-700" /> Putar
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={config.audio.menunggu.asetId ?? ''}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        audio: {
                          ...prev.audio,
                          menunggu: {
                            ...prev.audio.menunggu,
                            asetId: e.target.value === '' ? null : e.target.value,
                          },
                        },
                      }))
                    }
                    className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800"
                  >
                    <option value="">Sintetis Bawaan (Web Audio - Drone Tenang)</option>
                    {asetAudio.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nama}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Volume2 className="h-3.5 w-3.5 shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.audio.menunggu.volumePersen}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          audio: {
                            ...prev.audio,
                            menunggu: {
                              ...prev.audio.menunggu,
                              volumePersen: Number(e.target.value),
                            },
                          },
                        }))
                      }
                      className="h-1.5 w-16 cursor-pointer accent-primary-600"
                    />
                    <span className="w-8 font-mono text-[10px]">{config.audio.menunggu.volumePersen}%</span>
                  </div>
                </div>
              </div>

              {/* 2. Mengacak */}
              <div className="space-y-1.5 border-t border-neutral-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-800">Fase Mengacak (Drumroll / Ticker)</span>
                  <button
                    type="button"
                    onClick={() => togglePutarAudio('mengacak')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-800"
                  >
                    {audioDiputar === 'mengacak' ? (
                      <>
                        <Square className="h-3 w-3 fill-primary-700" /> Berhenti
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 fill-primary-700" /> Putar
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={config.audio.mengacak.asetId ? config.audio.mengacak.asetId : (config.audio.mengacak.preset ?? 'bawaan')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('aset_') || asetAudio.some((a) => a.id === val)) {
                        setConfig((prev) => ({
                          ...prev,
                          audio: {
                            ...prev.audio,
                            mengacak: { ...prev.audio.mengacak, asetId: val, preset: 'kustom' },
                          },
                        }));
                      } else {
                        setConfig((prev) => ({
                          ...prev,
                          audio: {
                            ...prev.audio,
                            mengacak: { ...prev.audio.mengacak, preset: val, asetId: null },
                          },
                        }));
                      }
                    }}
                    className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800"
                  >
                    <option value="bawaan">1. Sintetis Bawaan (Web Audio - Klik Ticker Cepat)</option>
                    <option value="snare-drumroll">2. Sintetis - Snare Drumroll Tegang</option>
                    <option value="arcade-8bit">3. Sintetis - Arcade 8-Bit Cepat</option>
                    <option value="roulette">4. Sintetis - Roda Roulette Kasino</option>
                    <option value="rising-suspense">5. Sintetis - Sci-Fi Nada Naik (Rising Suspense)</option>
                    <option value="mute">6. Tanpa Suara (Mute)</option>
                    <option value="kustom">7. Kustom (Upload File Audio MP3/WAV)</option>
                    {asetAudio.filter((a) => a.fase === 'MENGACAK' || !a.fase).length > 0 && (
                      <optgroup label="Aset Audio Server">
                        {asetAudio
                          .filter((a) => a.fase === 'MENGACAK' || !a.fase)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nama}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Volume2 className="h-3.5 w-3.5 shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.audio.mengacak.volumePersen}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          audio: {
                            ...prev.audio,
                            mengacak: {
                              ...prev.audio.mengacak,
                              volumePersen: Number(e.target.value),
                            },
                          },
                        }))
                      }
                      className="h-1.5 w-16 cursor-pointer accent-primary-600"
                    />
                    <span className="w-8 font-mono text-[10px]">{config.audio.mengacak.volumePersen}%</span>
                  </div>
                </div>

                {/* Input Berkas Audio Kustom Mengacak */}
                {config.audio.mengacak.preset === 'kustom' && !config.audio.mengacak.asetId && (
                  <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-neutral-700">Berkas Audio Kustom (IndexedDB):</span>
                      {audioKustomMengacak ? (
                        <span className="truncate max-w-[200px] font-mono text-[11px] font-bold text-primary-700">
                          {audioKustomMengacak.nama}
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">Belum ada file dipilih</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="audio/mp3,audio/wav,audio/ogg"
                      onChange={tanganiUnggahKustomMengacak}
                      className="mt-1.5 block w-full text-xs text-neutral-600 file:mr-2 file:rounded-md file:border-0 file:bg-primary-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
                    />
                  </div>
                )}
              </div>

              {/* 3. Pemenang */}
              <div className="space-y-1.5 border-t border-neutral-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-800">Fase Pemenang (Fanfare Kemenangan)</span>
                  <button
                    type="button"
                    onClick={() => togglePutarAudio('pemenang')}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-700 hover:text-primary-800"
                  >
                    {audioDiputar === 'pemenang' ? (
                      <>
                        <Square className="h-3 w-3 fill-primary-700" /> Berhenti
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 fill-primary-700" /> Putar
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select
                    value={config.audio.pemenang.asetId ? config.audio.pemenang.asetId : (config.audio.pemenang.preset ?? 'bawaan')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('aset_') || asetAudio.some((a) => a.id === val)) {
                        setConfig((prev) => ({
                          ...prev,
                          audio: {
                            ...prev.audio,
                            pemenang: { ...prev.audio.pemenang, asetId: val, preset: 'kustom' },
                          },
                        }));
                      } else {
                        setConfig((prev) => ({
                          ...prev,
                          audio: {
                            ...prev.audio,
                            pemenang: { ...prev.audio.pemenang, preset: val, asetId: null },
                          },
                        }));
                      }
                    }}
                    className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800"
                  >
                    <option value="bawaan">1. Sintetis Bawaan (Web Audio - Fanfare Megah C-E-G-C)</option>
                    <option value="royal-brass">2. Sintetis - Terompet Kerajaan (Royal Brass)</option>
                    <option value="arcade-levelup">3. Sintetis - Arcade 8-Bit Level Up</option>
                    <option value="jackpot-bells">4. Sintetis - Jackpot Lonceng Emas</option>
                    <option value="gentle-chime">5. Sintetis - Chime Harmoni Lembut</option>
                    <option value="mute">6. Tanpa Suara (Mute)</option>
                    <option value="kustom">7. Kustom (Upload File Audio MP3/WAV)</option>
                    {asetAudio.filter((a) => a.fase === 'PEMENANG' || !a.fase).length > 0 && (
                      <optgroup label="Aset Audio Server">
                        {asetAudio
                          .filter((a) => a.fase === 'PEMENANG' || !a.fase)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.nama}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Volume2 className="h-3.5 w-3.5 shrink-0" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={config.audio.pemenang.volumePersen}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          audio: {
                            ...prev.audio,
                            pemenang: {
                              ...prev.audio.pemenang,
                              volumePersen: Number(e.target.value),
                            },
                          },
                        }))
                      }
                      className="h-1.5 w-16 cursor-pointer accent-primary-600"
                    />
                    <span className="w-8 font-mono text-[10px]">{config.audio.pemenang.volumePersen}%</span>
                  </div>
                </div>

                {/* Input Berkas Audio Kustom Pemenang */}
                {config.audio.pemenang.preset === 'kustom' && !config.audio.pemenang.asetId && (
                  <div className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-neutral-700">Berkas Audio Kustom (IndexedDB):</span>
                      {audioKustomPemenang ? (
                        <span className="truncate max-w-[200px] font-mono text-[11px] font-bold text-primary-700">
                          {audioKustomPemenang.nama}
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">Belum ada file dipilih</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="audio/mp3,audio/wav,audio/ogg"
                      onChange={tanganiUnggahKustomPemenang}
                      className="mt-1.5 block w-full text-xs text-neutral-600 file:mr-2 file:rounded-md file:border-0 file:bg-primary-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bagian Teks & Judul Tema Undian */}
          <div className="rounded-xl border border-neutral-300 bg-white p-5 shadow-xs">
            <h3 className="flex items-center gap-2 text-sm font-bold text-neutral-900">
              <Type className="h-4 w-4 text-primary-700" />
              Teks & Judul Tema Undian
            </h3>
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <label htmlFor="judul-atas" className="block font-semibold text-neutral-800">
                  Judul di Atas Tema Undian
                </label>
                <input
                  id="judul-atas"
                  type="text"
                  value={config.teks.judulAtas ?? ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      teks: { ...prev.teks, judulAtas: e.target.value },
                    }))
                  }
                  placeholder="Contoh: GEBYAR UNDIAN UMROH PBB-P2"
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-primary-600 focus:outline-hidden"
                />
                <p className="mt-1 text-[11px] text-neutral-500">
                  Teks judul utama yang tampil di atas animasi pada Layar Undian acara.
                </p>
              </div>

              <div>
                <label htmlFor="ucapan-pemenang" className="block font-semibold text-neutral-800">
                  Ucapan Pemenang
                </label>
                <input
                  id="ucapan-pemenang"
                  type="text"
                  value={config.teks.ucapanPemenang}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      teks: { ...prev.teks, ucapanPemenang: e.target.value },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-primary-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="subjudul-acara" className="block font-semibold text-neutral-800">
                  Subjudul Acara
                </label>
                <input
                  id="subjudul-acara"
                  type="text"
                  value={config.teks.subjudul ?? ''}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      teks: { ...prev.teks, subjudul: e.target.value || null },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-800 focus:border-primary-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Pratinjau 16:9 Langsung */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-neutral-300 bg-neutral-0 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Pratinjau Langsung Layar Undian</h3>
                <p className="text-xs text-neutral-600">Rasio 16:9 standar proyektor acara (DESIGN_SYSTEM §16)</p>
              </div>

              <button
                type="button"
                onClick={jalankanPratinjau}
                disabled={sedangPratinjau}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary-700 px-3.5 py-1.5 text-xs font-semibold text-neutral-0 shadow-xs hover:bg-primary-hover disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" />
                {sedangPratinjau ? 'Sedang Diputar...' : 'Putar Pratinjau'}
              </button>
            </div>

            {/* Canvas Pratinjau 16:9 (Panggung Proyektor Resmi) */}
            <div
              style={{
                backgroundColor: '#062a55',
                backgroundImage: config.tampilan.latarAsetId
                  ? `linear-gradient(rgba(6, 42, 85, ${config.tampilan.overlayGelapPersen / 100}), rgba(6, 42, 85, ${config.tampilan.overlayGelapPersen / 100})), url(/api/aset/${config.tampilan.latarAsetId})`
                  : 'linear-gradient(180deg, #062a55 0%, #0a3a73 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              className="relative mt-4 aspect-video w-full overflow-hidden rounded-xl border-2 border-primary-700 bg-primary-900 p-6 text-neutral-0 shadow-md flex flex-col justify-between"
            >
              {/* Header Canvas Pratinjau */}
              <div className="flex items-center justify-between text-xs text-primary-100">
                <span className="font-black tracking-wider text-accent-400">BAPENDA OKU SELATAN</span>
                <span className="rounded-full bg-primary-700 border border-primary-500/50 px-2.5 py-0.5 text-[10px] font-semibold text-primary-100">
                  Fase: {fasePratinjau}
                </span>
              </div>

              {/* Konten Tengah: Animasi Sesuai Preset / Kartu Pemenang */}
              <div className="my-auto text-center">
                {config.tampilan.ornamenIslami && (
                  <div className="mb-2 text-xs tracking-widest text-accent-400">
                    ✦ ۞ ✦
                  </div>
                )}

                {/* Judul di Atas Tema Undian */}
                <h2 className="mb-2 text-base font-black uppercase tracking-wider text-accent-400 drop-shadow-sm">
                  {config.teks.judulAtas || 'GEBYAR UNDIAN UMROH PBB-P2'}
                </h2>

                {fasePratinjau === 'PEMENANG' ? (
                  <div className="animate-in fade-in zoom-in duration-300 rounded-xl border-2 border-accent-400 bg-neutral-0 p-5 shadow-lg text-neutral-900 max-w-md mx-auto">
                    <div className="rounded-md bg-secondary-600 px-3 py-1 text-center font-bold text-neutral-0 text-xs tracking-wide">
                      SELAMAT — {config.teks.ucapanPemenang}
                    </div>
                    <h2 className="mt-2 text-lg font-black text-neutral-900 md:text-xl">
                      Drs. H. SYAIFUL ANWAR
                    </h2>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-neutral-600">
                      NOP: 16.09.030.xxx.xxx-0001.0
                    </p>
                    <span className="mt-2 inline-block rounded-full bg-primary-100 border border-primary-500 px-2.5 py-0.5 text-[10px] font-bold text-primary-900">
                      PEMENANG UTAMA (WILAYAH 1)
                    </span>
                  </div>
                ) : (
                  <AnimasiUndian
                    preset={config.animasi.preset}
                    fase={fasePratinjau}
                    peserta={pesertaSampel}
                    warnaAksen={config.tampilan.warnaAksen}
                  />
                )}

                {config.teks.subjudul && (
                  <p className="mt-2 text-[11px] font-medium text-primary-100">
                    {config.teks.subjudul}
                  </p>
                )}
              </div>

              {/* Footer Canvas */}
              <div className="flex items-center justify-between text-[10px] text-primary-100 border-t border-primary-700/60 pt-2">
                <span>Preset: <strong className="text-neutral-0">{config.animasi.preset}</strong></span>
                <span>Aksen: <strong className="text-accent-400">{config.tampilan.warnaAksen}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bagian Pengaturan Musik Latar BGM Terintegrasi */}
      <div className="mt-8">
        <PengaturanBgm />
      </div>

      {/* Modal Unggah Aset Kustom */}
      {bukaModalUnggah && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-neutral-300 bg-neutral-0 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-300 pb-3">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary-700" />
                <h3 className="text-base font-bold text-neutral-900">Unggah Aset Tema Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setBukaModalUnggah(false)}
                className="rounded-lg p-1 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {pesanGalatUnggah && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-danger-100 bg-danger-100 p-3 text-xs text-danger-700">
                <AlertTriangle className="h-4 w-4 shrink-0 text-danger-700" />
                <span>{pesanGalatUnggah}</span>
              </div>
            )}

            <form onSubmit={handleUnggahAset} className="mt-4 space-y-4 text-xs">
              {/* Pilihan Jenis Aset */}
              <div>
                <label className="block font-semibold text-neutral-900">Jenis Aset</label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setJenisUnggah('GAMBAR')}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 font-semibold transition-all ${
                      jenisUnggah === 'GAMBAR'
                        ? 'border-primary-700 bg-primary-100 text-primary-900'
                        : 'border-neutral-300 bg-neutral-0 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <ImageIcon className="h-4 w-4" />
                    Gambar Latar (.png, .jpg, .webp)
                  </button>
                  <button
                    type="button"
                    onClick={() => setJenisUnggah('AUDIO')}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 font-semibold transition-all ${
                      jenisUnggah === 'AUDIO'
                        ? 'border-primary-700 bg-primary-100 text-primary-900'
                        : 'border-neutral-300 bg-neutral-0 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Music className="h-4 w-4" />
                    Efek Audio (.mp3, .wav, .ogg)
                  </button>
                </div>
              </div>

              {/* Jika Audio: Pilihan Fase */}
              {jenisUnggah === 'AUDIO' && (
                <div>
                  <label className="block font-semibold text-neutral-900">Fase Audio</label>
                  <select
                    value={faseUnggah}
                    onChange={(e) => setFaseUnggah(e.target.value as 'MENUNGGU' | 'MENGACAK' | 'PEMENANG')}
                    className="mt-1.5 w-full rounded-md border border-neutral-300 bg-neutral-0 px-3 py-2 text-xs text-neutral-900 focus:border-primary-700 focus:outline-hidden"
                  >
                    <option value="MENUNGGU">Fase Menunggu (Musik latar tenang loop)</option>
                    <option value="MENGACAK">Fase Mengacak (Drumroll / Ticker putaran)</option>
                    <option value="PEMENANG">Fase Pemenang (Fanfare kemenangan)</option>
                  </select>
                </div>
              )}

              {/* Berkas File */}
              <div>
                <label className="block font-semibold text-neutral-900">Pilih Berkas File</label>
                <input
                  type="file"
                  accept={
                    jenisUnggah === 'GAMBAR'
                      ? 'image/png,image/jpeg,image/webp'
                      : 'audio/mpeg,audio/wav,audio/ogg'
                  }
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setBerkasUnggah(f);
                    if (f && !namaAsetUnggah) {
                      setNamaAsetUnggah(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  className="mt-1.5 w-full rounded-md border border-neutral-300 bg-neutral-0 p-2 text-xs text-neutral-900 file:mr-3 file:rounded-md file:border-0 file:bg-primary-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
                />
                <p className="mt-1 text-[11px] text-neutral-600">
                  {jenisUnggah === 'GAMBAR'
                    ? 'Disarankan rasio 16:9 (1920x1080) maksimal 5 MB.'
                    : 'Format audio MP3/WAV/OGG maksimal 10 MB.'}
                </p>
              </div>

              {/* Nama Aset */}
              <div>
                <label className="block font-semibold text-neutral-900">Nama Tampilan Aset</label>
                <input
                  type="text"
                  value={namaAsetUnggah}
                  onChange={(e) => setNamaAsetUnggah(e.target.value)}
                  placeholder="Contoh: Latar Panggung Utama 2026 / Suara Gong Adat"
                  className="mt-1.5 w-full rounded-md border border-neutral-300 bg-neutral-0 px-3 py-2 text-xs text-neutral-900 focus:border-primary-700 focus:outline-hidden"
                />
              </div>

              {/* Deskripsi (Opsional) */}
              <div>
                <label className="block font-semibold text-neutral-900">Deskripsi / Keterangan (Opsional)</label>
                <input
                  type="text"
                  value={deskripsiAsetUnggah}
                  onChange={(e) => setDeskripsiAsetUnggah(e.target.value)}
                  placeholder="Keterangan singkat berkas..."
                  className="mt-1.5 w-full rounded-md border border-neutral-300 bg-neutral-0 px-3 py-2 text-xs text-neutral-900 focus:border-primary-700 focus:outline-hidden"
                />
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-2 border-t border-neutral-300 pt-3">
                <button
                  type="button"
                  onClick={() => setBukaModalUnggah(false)}
                  className="rounded-md border border-neutral-300 bg-neutral-0 px-4 py-2 font-semibold text-neutral-900 hover:bg-neutral-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={sedangUnggah || !berkasUnggah}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary-700 px-5 py-2 font-semibold text-neutral-0 hover:bg-primary-hover disabled:opacity-50"
                >
                  {sedangUnggah ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Mengunggah...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" /> Unggah Sekarang
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Reset Default */}
      {dialogReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 p-4">
          <div className="w-full max-w-md rounded-xl bg-neutral-0 p-6 shadow-xl border border-neutral-300">
            <h3 className="text-base font-bold text-neutral-900">Kembalikan ke Tema Default?</h3>
            <p className="mt-2 text-xs text-neutral-600">
              Konfigurasi tema ini akan dikembalikan ke tema bawaan resmi sistem. Berkas aset Anda di pustaka tetap aman dan tidak akan dihapus.
            </p>
            <div className="mt-5 flex justify-end gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDialogReset(false)}
                className="rounded-md border border-neutral-300 bg-neutral-0 px-3.5 py-2 text-neutral-900 hover:bg-neutral-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleKembalikanDefault}
                className="rounded-md bg-danger-700 px-4 py-2 text-neutral-0 hover:bg-danger-700/90"
              >
                Ya, Kembalikan Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
