'use client';

import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Play,
  RotateCcw,
  Square,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import { PengelolaAudio } from '@/client/offline/audio';
import {
  ambilPerangkatId,
  bacaPaketDariDb,
  bacaStateDariDb,
  hapusDataUndianDariDb,
  simpanStateKeDb,
  type PaketTersimpan,
} from '@/client/offline/db';
import { validasiDanMuatPaket } from '@/client/offline/loader';
import { bangunFileHasil, type HasilUndianData } from '@/lib/draw/hasil';
import {
  buatStateAwal,
  lanjutSlotBerikutnya,
  mulaiSlot,
  pilihPemenang,
  simpanPemenangSlot,
} from '@/lib/draw/engine';
import { type PesertaUndian, type StateUndian } from '@/lib/draw/types';
import { formatHashRingkas } from '@/lib/package/hash';
import { SLOT_URUTAN } from '@/lib/package/kontrak';
import { KartuPemenang } from './kartu-pemenang';
import { RingkasanAkhir } from './ringkasan-akhir';

export function LayarUndian(): ReactElement {
  const [paket, setPaket] = useState<PaketTersimpan | null>(null);
  const [state, setState] = useState<StateUndian>(buatStateAwal());
  const [fileHasil, setFileHasil] = useState<HasilUndianData | null>(null);
  const [memuat, setMemproses] = useState(true);
  const [pesanGalat, setPesanGalat] = useState<string | null>(null);
  const [bannerPemulihan, setBannerPemulihan] = useState<string | null>(null);

  // Operator UI states
  const [fullscreen, setFullscreen] = useState(false);
  const [bisu, setBisu] = useState(false);
  const [sembunyikanBilah, setSembunyikanBilah] = useState(false);
  const [perluInteraksiSuara, setPerluInteraksiSuara] = useState(true);

  // Animasi slot machine ticker
  const [sampelNama, setSampelNama] = useState<string>('MENUNGGU UNDIAN');
  const [melambat, setMelambat] = useState(false);

  const audioRef = useRef<PengelolaAudio | null>(null);
  if (audioRef.current === null) {
    audioRef.current = new PengelolaAudio();
  }

  // Muat data dari IndexedDB saat pertama kali dibuka
  useEffect(() => {
    async function muatAwal(): Promise<void> {
      try {
        const paketDb = await bacaPaketDariDb();
        if (paketDb !== null) {
          setPaket(paketDb);

          const stateDb = await bacaStateDariDb();
          if (stateDb !== null) {
            setState(stateDb);
            const selesaiCount = stateDb.slotSelesai.length;
            if (selesaiCount > 0 && selesaiCount < 6) {
              setBannerPemulihan(`Melanjutkan undian. ${selesaiCount.toString()} dari 6 slot sudah diundi.`);
            }

            if (selesaiCount === 6) {
              const perangkatId = await ambilPerangkatId();
              const hasil = await bangunFileHasil({
                periodeId: paketDb.periodeId,
                snapshotHash: paketDb.meta.snapshotHash,
                temaConfigHash: paketDb.meta.temaConfigHash,
                perangkat: { id: perangkatId, userAgent: navigator.userAgent },
                state: stateDb,
              });
              setFileHasil(hasil);
            }
          }
        }
      } catch {
        setPesanGalat('Gagal membaca penyimpanan lokal.');
      } finally {
        setMemproses(false);
      }
    }
    void muatAwal();
  }, []);

  // Update audio saat fase berubah
  useEffect(() => {
    if (paket === null) return;
    if (state.fase === 'MENUNGGU') {
      audioRef.current?.putarFase('MENUNGGU');
    } else if (state.fase === 'MENGACAK') {
      audioRef.current?.putarFase('MENGACAK');
    } else if (state.fase === 'PEMENANG') {
      audioRef.current?.putarFase('PEMENANG');
    } else {
      audioRef.current?.hentikanSemua();
    }
  }, [paket, state.fase]);

  // Efek animasi slot machine rolling ticker
  useEffect(() => {
    if (state.fase !== 'MENGACAK' || paket === null) return;

    const slotAktif = SLOT_URUTAN[state.slotAktifIndex];
    if (slotAktif === undefined) return;

    const pesertaWilayah = paket.snapshot.peserta.filter((p) => p.wilayah === slotAktif.wilayah);
    const sampel = pesertaWilayah.slice(0, 200);

    let idx = 0;
    const interval = setInterval(() => {
      if (sampel.length > 0) {
        const item = sampel[idx % sampel.length];
        if (item) setSampelNama(`${item.nama} • ${item.nopMasked}`);
        idx += 1;
      }
    }, melambat ? 200 : 50);

    return () => {
      clearInterval(interval);
    };
  }, [state.fase, state.slotAktifIndex, paket, melambat]);

  // Handler unggah paket .zip
  async function tanganiUnggahPaket(file: File): Promise<void> {
    setMemproses(true);
    setPesanGalat(null);
    try {
      const buffer = await file.arrayBuffer();
      const hasil = await validasiDanMuatPaket(new Uint8Array(buffer));
      const stateAwal = buatStateAwal();
      await simpanStateKeDb(stateAwal);
      setPaket({
        periodeId: hasil.meta.periode.id,
        meta: hasil.meta,
        snapshot: hasil.snapshot,
        tema: hasil.tema,
        dimuatAt: new Date().toISOString(),
      });
      setState(stateAwal);
    } catch (err) {
      setPesanGalat((err as Error).message);
    } finally {
      setMemproses(false);
    }
  }

  // Tombol Mulai
  const aksiMulai = useCallback(() => {
    if (state.fase !== 'MENUNGGU') return;
    const stateBaru = mulaiSlot(state, new Date().toISOString());
    setState(stateBaru);
    void simpanStateKeDb(stateBaru);
  }, [state]);

  // Tombol Berhenti
  const aksiBerhenti = useCallback(async () => {
    if (state.fase !== 'MENGACAK' || paket === null) return;

    const slotAktif = SLOT_URUTAN[state.slotAktifIndex];
    if (slotAktif === undefined) return;

    const poolWilayah = paket.snapshot.peserta.filter((p) => p.wilayah === slotAktif.wilayah);
    const sudahMenang = new Set(state.slotSelesai.map((s) => s.urut));

    let pemenang: PesertaUndian;
    try {
      pemenang = pilihPemenang(poolWilayah, sudahMenang);
    } catch (err) {
      setPesanGalat((err as Error).message);
      return;
    }

    const diundiAt = new Date().toISOString();
    const stateBaru = simpanPemenangSlot(state, pemenang, diundiAt);

    // Simpan ke IndexedDB TERLEBIH DAHULU sebelum menampilkan kartu pemenang
    try {
      await simpanStateKeDb(stateBaru);
    } catch {
      setPesanGalat('Hasil gagal disimpan. Jangan tutup browser. Hubungi operator cadangan.');
      return;
    }

    // Perlambatan animasi sebelum kartu tampil
    setMelambat(true);
    setTimeout(() => {
      setMelambat(false);
      setState(stateBaru);

      if (stateBaru.slotSelesai.length === 6) {
        void (async () => {
          const perangkatId = await ambilPerangkatId();
          const hasil = await bangunFileHasil({
            periodeId: paket.periodeId,
            snapshotHash: paket.meta.snapshotHash,
            temaConfigHash: paket.meta.temaConfigHash,
            perangkat: { id: perangkatId, userAgent: navigator.userAgent },
            state: stateBaru,
          });
          setFileHasil(hasil);
        })();
      }
    }, 1500);
  }, [state, paket]);

  // Tombol Lanjut Slot Berikutnya
  const aksiLanjut = useCallback(() => {
    if (state.fase !== 'PEMENANG') return;
    const stateBaru = lanjutSlotBerikutnya(state);
    setState(stateBaru);
    void simpanStateKeDb(stateBaru);
  }, [state]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      void document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  // Mute toggle
  const toggleBisu = useCallback(() => {
    const baru = !bisu;
    setBisu(baru);
    audioRef.current?.setBisu(baru);
  }, [bisu]);

  // Pintasan Keyboard (Tiket 16)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (state.fase === 'MENUNGGU') aksiMulai();
        else if (state.fase === 'MENGACAK') void aksiBerhenti();
      } else if (e.code === 'ArrowRight') {
        if (state.fase === 'PEMENANG') aksiLanjut();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleBisu();
      } else if (e.key === 'h' || e.key === 'H') {
        setSembunyikanBilah((prev) => !prev);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [state.fase, aksiMulai, aksiBerhenti, aksiLanjut, toggleFullscreen, toggleBisu]);

  // Unduh file hasil JSON
  function unduhFileHasil(): void {
    if (fileHasil === null || paket === null) return;
    const jsonStr = JSON.stringify(fileHasil, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hasil-undian-${paket.meta.periode.slug}-${fileHasil.hasilHash.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (memuat) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-900 text-neutral-100">
        <p className="text-lg font-semibold">Memuat Layar Undian...</p>
      </div>
    );
  }

  // Tampilan bila paket belum dimuat
  if (paket === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-900 p-6 text-neutral-100">
        <div className="w-full max-w-lg rounded-2xl border border-neutral-700 bg-neutral-800 p-8 shadow-2xl text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary-900/50 text-primary-400">
            <Upload className="size-8" />
          </div>
          <h1 className="mt-4 text-2xl font-black text-neutral-0">Muat Paket Undian</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Pilih file paket undian (.zip) yang diunduh dari Admin untuk memulai undian secara offline.
          </p>

          {pesanGalat && (
            <div className="mt-4 rounded-lg bg-danger-900/40 border border-danger-700 p-3 text-xs text-danger-200">
              {pesanGalat}
            </div>
          )}

          <label className="mt-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-600 bg-neutral-900/50 p-6 cursor-pointer hover:border-primary-500 transition-colors">
            <Upload className="size-8 text-neutral-400" />
            <span className="mt-2 text-sm font-semibold text-neutral-300">Pilih file paket .zip</span>
            <input
              type="file"
              accept=".zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void tanganiUnggahPaket(f);
              }}
            />
          </label>
        </div>
      </div>
    );
  }

  const slotAktif = SLOT_URUTAN[state.slotAktifIndex];
  const pesertaPoolWilayah = paket.snapshot.peserta.filter(
    (p) => slotAktif && p.wilayah === slotAktif.wilayah,
  );
  const hasilTerkini = state.slotSelesai[state.slotSelesai.length - 1];

  return (
    <div
      data-testid="layar-undian"
      className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-neutral-950 text-neutral-0 select-none"
    >
      {/* Autoplay Overlay jika audio tertahan */}
      {perluInteraksiSuara && (
        <div
          onClick={() => {
            setPerluInteraksiSuara(false);
            audioRef.current?.putarFase('MENUNGGU');
          }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm cursor-pointer"
        >
          <div className="rounded-xl border border-neutral-700 bg-neutral-800 p-6 text-center shadow-2xl">
            <Volume2 className="mx-auto size-12 text-primary-400 animate-bounce" />
            <p className="mt-3 text-lg font-bold text-neutral-100">Klik untuk mengaktifkan suara</p>
            <p className="text-xs text-neutral-400">Audio undian memerlukan interaksi pengguna.</p>
          </div>
        </div>
      )}

      {/* Header Layar Acara */}
      <header className="relative z-10 flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/40 px-8 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Image
            src="/brand/logo-okus.png"
            alt="Logo OKU Selatan"
            width={44}
            height={44}
            className="size-11 object-contain drop-shadow"
          />
          <div>
            <h1 className="text-base font-bold tracking-wide text-neutral-100">
              {paket.meta.periode.judul}
            </h1>
            <p className="font-mono text-xs text-primary-400">
              Snapshot: {formatHashRingkas(paket.meta.snapshotHash)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-900/60 border border-success-700/60 px-3 py-1 text-xs font-semibold text-success-300">
            <span className="size-2 rounded-full bg-success-400 animate-pulse" />
            Siap Offline
          </span>
          <button
            type="button"
            onClick={() => {
              audioRef.current?.putarFase('MENUNGGU');
              setTimeout(() => {
                audioRef.current?.putarFase('PEMENANG');
              }, 1000);
            }}
            className="rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:bg-neutral-700"
          >
            Uji Suara
          </button>
        </div>
      </header>

      {/* Banner Pemulihan (Tiket 15) */}
      {bannerPemulihan && (
        <div className="mx-8 mt-4 flex items-center justify-between rounded-lg border border-warning-600/50 bg-warning-950/60 p-3 text-xs text-warning-200">
          <div className="flex items-center gap-2">
            <RotateCcw className="size-4 shrink-0" />
            <span>{bannerPemulihan}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setBannerPemulihan(null);
            }}
            className="text-neutral-400 hover:text-neutral-200"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Konten Utama */}
      <main className="relative flex flex-1 items-center justify-center p-8">
        {state.fase === 'SELESAI' ? (
          <RingkasanAkhir
            periodeJudul={paket.meta.periode.judul}
            periodeSlug={paket.meta.periode.slug}
            state={state}
            fileHasil={fileHasil}
            onUnduhHasil={unduhFileHasil}
          />
        ) : state.fase === 'PEMENANG' && hasilTerkini ? (
          <div className="flex flex-col items-center gap-6">
            <KartuPemenang
              slotKode={hasilTerkini.kode}
              slotLabel={
                SLOT_URUTAN.find((s) => s.kode === hasilTerkini.kode)?.label ?? 'Pemenang'
              }
              pemenang={hasilTerkini.pemenang}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center text-center max-w-2xl">
            {slotAktif && (
              <>
                <div className="rounded-full bg-primary-900/60 border border-primary-600 px-4 py-1 text-xs font-bold uppercase tracking-widest text-primary-300">
                  Slot {slotAktif.urutan} dari 6 • {slotAktif.wilayah === 'W1' ? 'Wilayah 1' : 'Wilayah 2'}
                </div>
                <h2 className="mt-3 text-3xl font-black text-neutral-0 tracking-tight sm:text-4xl">
                  {slotAktif.label}
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  Pool Peserta Lolos: {pesertaPoolWilayah.length.toLocaleString('id-ID')} wajib pajak
                </p>
              </>
            )}

            {/* Kotak Animasi Slot Mesin (Ticker) */}
            <div className="my-10 flex h-28 w-full max-w-xl items-center justify-center overflow-hidden rounded-2xl border-2 border-primary-500 bg-neutral-900/80 p-6 shadow-[0_0_50px_rgba(234,179,8,0.2)] backdrop-blur">
              <p
                className={`font-mono text-xl sm:text-2xl font-black tracking-wider transition-all duration-75 ${
                  state.fase === 'MENGACAK'
                    ? 'text-primary-300 scale-105'
                    : 'text-neutral-500'
                }`}
              >
                {state.fase === 'MENGACAK' ? sampelNama : 'SIAP MENGUNDI'}
              </p>
            </div>

            <p className="text-xs text-neutral-500">
              {state.fase === 'MENGACAK'
                ? 'Tekan tombol Berhenti atau tekan Spasi untuk menentukan pemenang'
                : 'Tekan tombol Mulai atau tekan Spasi untuk memutar undian'}
            </p>
          </div>
        )}
      </main>

      {/* Bilah Kontrol Operator Bawah (Tiket 16) */}
      {!sembunyikanBilah && (
        <footer className="relative z-20 flex items-center justify-between border-t border-neutral-800 bg-neutral-900/90 px-8 py-3 backdrop-blur-md">
          {/* Sisi Kiri: Tombol Operasi Slot */}
          <div className="flex items-center gap-3">
            {state.fase === 'MENUNGGU' && (
              <button
                type="button"
                onClick={aksiMulai}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-bold text-neutral-0 shadow hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                <Play className="size-4 fill-current" />
                Mulai [Spasi]
              </button>
            )}

            {state.fase === 'MENGACAK' && (
              <button
                type="button"
                onClick={() => {
                  void aksiBerhenti();
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-danger-600 px-5 text-sm font-bold text-neutral-0 shadow hover:bg-danger-500 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                <Square className="size-4 fill-current" />
                Berhenti [Spasi]
              </button>
            )}

            {state.fase === 'PEMENANG' && state.slotSelesai.length < 6 && (
              <button
                type="button"
                onClick={aksiLanjut}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-600 px-5 text-sm font-bold text-neutral-0 shadow hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                Slot Berikutnya [→]
                <ArrowRight className="size-4" />
              </button>
            )}

            {state.fase === 'PEMENANG' && state.slotSelesai.length === 6 && (
              <button
                type="button"
                onClick={aksiLanjut}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-success-600 px-5 text-sm font-bold text-neutral-0 shadow hover:bg-success-500 focus:outline-none focus:ring-2 focus:ring-success-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                Lihat Ringkasan Akhir
                <ArrowRight className="size-4" />
              </button>
            )}
          </div>

          {/* Sisi Kanan: Pintasan Utilitas */}
          <div className="flex items-center gap-2 text-neutral-400">
            <button
              type="button"
              onClick={toggleBisu}
              title="Bisukan Audio [M]"
              className="flex size-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 hover:text-neutral-100"
            >
              {bisu ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              title="Layar Penuh [F]"
              className="flex size-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 hover:text-neutral-100"
            >
              {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setSembunyikanBilah(true);
              }}
              title="Sembunyikan Bilah [H]"
              className="flex size-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 hover:text-neutral-100"
            >
              <EyeOff className="size-4" />
            </button>
          </div>
        </footer>
      )}

      {/* Tombol Tampilkan Bilah jika tersembunyi */}
      {sembunyikanBilah && (
        <button
          type="button"
          onClick={() => {
            setSembunyikanBilah(false);
          }}
          title="Tampilkan Bilah Kontrol [H]"
          className="fixed bottom-4 right-4 z-30 flex size-10 items-center justify-center rounded-full bg-neutral-800/80 border border-neutral-700 text-neutral-300 backdrop-blur hover:bg-neutral-700"
        >
          <Eye className="size-5" />
        </button>
      )}
    </div>
  );
}
