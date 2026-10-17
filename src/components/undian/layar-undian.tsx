'use client';

import {
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
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import { PengelolaAudio } from '@/client/offline/audio';
import { ambilAudioKustomFase } from '@/client/offline/custom-audio-store';
import {
  ambilPerangkatId,
  bacaPaketDariDb,
  bacaStateDariDb,
  resetStateUndianDb,
  simpanPaketKeDb,
  simpanStateKeDb,
  type PaketTersimpan,
} from '@/client/offline/db';
import { validasiDanMuatPaket } from '@/client/offline/loader';
import { bangunFileHasil, type HasilUndianData } from '@/lib/draw/hasil';
import {
  batalkanPemenangSlot,
  batalkanPutaran,
  buatStateAwal,
  lanjutSlotBerikutnya,
  mulaiSlot,
  pilihPemenang,
  simpanPemenangSlot,
} from '@/lib/draw/engine';
import { type PesertaUndian, type StateUndian } from '@/lib/draw/types';
import { formatHashRingkas } from '@/lib/package/hash';
import { SLOT_URUTAN } from '@/lib/package/kontrak';
import { TEMA_DEFAULT } from '@/lib/package/theme';

import { AnimasiUndian, type PesertaAnimasi } from './animasi-undian';
import { ConfettiCanvas } from './confetti-canvas';
import { FloatingAudioPlayer } from './floating-audio-player';
import { KartuPemenang } from './kartu-pemenang';
import { RingkasanAkhir } from './ringkasan-akhir';

export function LayarUndian(): ReactElement {
  const searchParams = useSearchParams();
  const periodeIdParam = searchParams.get('periodeId');

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

  // Animasi undian state
  const [sampelNama, setSampelNama] = useState<string>('MENUNGGU UNDIAN');
  const [pesertaAcak, setPesertaAcak] = useState<PesertaAnimasi>({
    nama: 'SIAP MENGUNDI',
    nopMasked: '16.09.000.xxx.xxx-0000.0',
  });
  const [melambat, setMelambat] = useState(false);

  const wadahRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<PengelolaAudio | null>(null);
  if (audioRef.current === null) {
    audioRef.current = new PengelolaAudio();
  }

  // Sinkronisasi status fullscreen browser
  useEffect(() => {
    function onFullscreenChange(): void {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  // Muat data dari IndexedDB saat pertama kali dibuka
  useEffect(() => {
    async function muatAwal(): Promise<void> {
      try {
        const paketDb = await bacaPaketDariDb();

        if (periodeIdParam) {
          if (paketDb !== null && paketDb.periodeId === periodeIdParam) {
            setPaket(paketDb);
            const stateDb = await bacaStateDariDb();
            if (stateDb !== null) {
              setState(stateDb);
              const selesaiCount = stateDb.slotSelesai.length;
              if (selesaiCount > 0 && selesaiCount < SLOT_URUTAN.length) {
                setBannerPemulihan(
                  `Melanjutkan undian. ${selesaiCount.toString()} dari ${SLOT_URUTAN.length.toString()} slot sudah diundi.`,
                );
              }

              if (selesaiCount === SLOT_URUTAN.length) {
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

            // Sinkronisasi pembaruan tema dari server jika online agar perubahan di Admin langsung aktif
            try {
              const res = await fetch(`/api/periode/${periodeIdParam}/paket`);
              if (res.ok) {
                const blob = await res.blob();
                const buffer = new Uint8Array(await blob.arrayBuffer());
                const hasilValidasi = await validasiDanMuatPaket(buffer);
                const paketTerkini: PaketTersimpan = {
                  periodeId: periodeIdParam,
                  meta: hasilValidasi.meta,
                  snapshot: hasilValidasi.snapshot,
                  tema: hasilValidasi.tema,
                  dimuatAt: new Date().toISOString(),
                };
                await simpanPaketKeDb(paketTerkini);
                setPaket(paketTerkini);
              }
            } catch {
              // Jika offline, pertahankan data lokal yang sudah dimuat
            }
          } else {
            try {
              const res = await fetch(`/api/periode/${periodeIdParam}/paket`);
              if (res.ok) {
                const blob = await res.blob();
                const buffer = new Uint8Array(await blob.arrayBuffer());
                const hasilValidasi = await validasiDanMuatPaket(buffer);
                const paketBaru: PaketTersimpan = {
                  periodeId: periodeIdParam,
                  meta: hasilValidasi.meta,
                  snapshot: hasilValidasi.snapshot,
                  tema: hasilValidasi.tema,
                  dimuatAt: new Date().toISOString(),
                };
                await simpanPaketKeDb(paketBaru);
                const stateAwal = buatStateAwal();
                await simpanStateKeDb(stateAwal);
                setPaket(paketBaru);
                setState(stateAwal);
                setFileHasil(null);
                setBannerPemulihan(null);
                return;
              }
            } catch {
              // Pengabaian kegagalan jaringan saat offline
            }
            if (paketDb !== null) {
              setPaket(paketDb);
            }
          }
        } else if (paketDb !== null) {
          setPaket(paketDb);

          const stateDb = await bacaStateDariDb();
          if (stateDb !== null) {
            setState(stateDb);
            const selesaiCount = stateDb.slotSelesai.length;
            if (selesaiCount > 0 && selesaiCount < SLOT_URUTAN.length) {
              setBannerPemulihan(
                `Melanjutkan undian. ${selesaiCount.toString()} dari ${SLOT_URUTAN.length.toString()} slot sudah diundi.`,
              );
            }

            if (selesaiCount === SLOT_URUTAN.length) {
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
  }, [periodeIdParam]);

  // Konfigurasi tema aktif dengan fallback ke default bawaan paket
  const temaAktif = paket?.tema ?? TEMA_DEFAULT;

  // Update audio saat fase berubah
  useEffect(() => {
    if (paket === null) return;
    if (state.fase === 'MENUNGGU') {
      const audioCfg = temaAktif.audio.menunggu;
      const urlAudio = audioCfg.asetId ? `/api/aset/${audioCfg.asetId}` : null;
      audioRef.current?.putarFase('MENUNGGU', {
        urlAudio,
        volumePersen: audioCfg.volumePersen,
        loop: audioCfg.loop,
        preset: audioCfg.preset,
      });
    } else if (state.fase === 'MENGACAK') {
      const audioCfg = temaAktif.audio.mengacak;
      void (async () => {
        let urlAudio = audioCfg.asetId ? `/api/aset/${audioCfg.asetId}` : null;
        if (audioCfg.preset === 'kustom' && !urlAudio) {
          const kustom = await ambilAudioKustomFase('mengacak');
          if (kustom) urlAudio = kustom.url;
        }
        audioRef.current?.putarFase('MENGACAK', {
          urlAudio,
          volumePersen: audioCfg.volumePersen,
          loop: audioCfg.loop,
          preset: audioCfg.preset,
        });
      })();
    } else if (state.fase === 'PEMENANG') {
      const audioCfg = temaAktif.audio.pemenang;
      void (async () => {
        let urlAudio = audioCfg.asetId ? `/api/aset/${audioCfg.asetId}` : null;
        if (audioCfg.preset === 'kustom' && !urlAudio) {
          const kustom = await ambilAudioKustomFase('pemenang');
          if (kustom) urlAudio = kustom.url;
        }
        audioRef.current?.putarFase('PEMENANG', {
          urlAudio,
          volumePersen: audioCfg.volumePersen,
          loop: audioCfg.loop,
          preset: audioCfg.preset,
        });
      })();
    } else {
      audioRef.current?.hentikanSemua();
    }
  }, [paket, state.fase, temaAktif]);

  // Efek animasi slot machine rolling ticker berdasarkan kecepatan tema
  useEffect(() => {
    if (state.fase !== 'MENGACAK' || paket === null) return;

    const slotAktif = SLOT_URUTAN[state.slotAktifIndex];
    if (slotAktif === undefined) return;

    const pesertaWilayah = paket.snapshot.peserta.filter((p) => p.wilayah === slotAktif.wilayah);

    // Kelompokkan peserta per kecamatan agar animasi berganti-ganti kecamatan di setiap frame
    const perKecamatan = new Map<string, typeof pesertaWilayah>();
    for (const p of pesertaWilayah) {
      const list = perKecamatan.get(p.kecamatan);
      if (list) {
        list.push(p);
      } else {
        perKecamatan.set(p.kecamatan, [p]);
      }
    }

    const daftarKecamatan = Array.from(perKecamatan.keys());
    const sampel: typeof pesertaWilayah = [];
    const maksSampel = Math.min(pesertaWilayah.length, 300);

    if (daftarKecamatan.length > 0) {
      const pointerPerKec = new Map<string, number>();
      for (let i = 0; i < maksSampel; i++) {
        const namaKec = daftarKecamatan[i % daftarKecamatan.length]!;
        const pool = perKecamatan.get(namaKec);
        if (pool && pool.length > 0) {
          const ptr = (pointerPerKec.get(namaKec) ?? 0) + 1;
          pointerPerKec.set(namaKec, ptr);
          const p = pool[(ptr * 37) % pool.length];
          if (p) sampel.push(p);
        }
      }
    } else {
      sampel.push(...pesertaWilayah.slice(0, 200));
    }

    const kecepatan = temaAktif.animasi.kecepatan;
    const intervalCepat = kecepatan === 'cepat' ? 35 : kecepatan === 'lambat' ? 90 : 55;

    let idx = 0;
    const interval = setInterval(() => {
      if (sampel.length > 0) {
        const item = sampel[idx % sampel.length];
        if (item) {
          setSampelNama(`${item.nama} • ${item.nopMasked}`);
          setPesertaAcak({
            nama: item.nama,
            nopMasked: item.nopMasked,
            wilayah: item.wilayah,
            kecamatan: item.kecamatan,
          });
        }
        idx += 1;
      }
    }, melambat ? 200 : intervalCepat);

    return () => {
      clearInterval(interval);
    };
  }, [state.fase, state.slotAktifIndex, paket, melambat, temaAktif.animasi.kecepatan]);

  // Handler unggah paket .zip
  async function tanganiUnggahPaket(file: File): Promise<void> {
    setMemproses(true);
    setPesanGalat(null);
    try {
      const buffer = await file.arrayBuffer();
      const hasil = await validasiDanMuatPaket(new Uint8Array(buffer));
      const paketBaru: PaketTersimpan = {
        periodeId: hasil.meta.periode.id,
        meta: hasil.meta,
        snapshot: hasil.snapshot,
        tema: hasil.tema,
        dimuatAt: new Date().toISOString(),
      };
      await simpanPaketKeDb(paketBaru);
      const stateAwal = buatStateAwal();
      await simpanStateKeDb(stateAwal);
      setPaket(paketBaru);
      setState(stateAwal);
      setFileHasil(null);
      setBannerPemulihan(null);
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

  // Tombol Reset / Ulangi Undian
  const aksiResetUndian = useCallback(async () => {
    const yakin = window.confirm(
      'Batalkan hasil undian dan mulai ulang dari awal?\n\nPaket data peserta tetap tersimpan sehingga tidak perlu mengunduh atau mengunggah paket lagi.',
    );
    if (!yakin) return;

    try {
      await resetStateUndianDb();
      setState(buatStateAwal());
      setFileHasil(null);
      setBannerPemulihan(null);
    } catch {
      setPesanGalat('Gagal mereset state undian.');
    }
  }, []);

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

    // Pemenang langsung ditampilkan seketika saat tombol berhenti diklik tanpa jeda
    setMelambat(false);
    setState(stateBaru);

    if (stateBaru.slotSelesai.length === SLOT_URUTAN.length) {
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
  }, [state, paket]);


  // Efek auto-stop fase mengacak jika dikonfigurasi pada tema
  useEffect(() => {
    if (state.fase !== 'MENGACAK' || !temaAktif.animasi.autoStop) return;
    const durasiMs = Math.max(3, temaAktif.animasi.durasiDetik) * 1000;
    const timer = setTimeout(() => {
      void aksiBerhenti();
    }, durasiMs);
    return () => clearTimeout(timer);
  }, [state.fase, temaAktif.animasi.autoStop, temaAktif.animasi.durasiDetik, aksiBerhenti]);

  // Tombol Lanjut Slot Berikutnya
  const aksiLanjut = useCallback(() => {
    if (state.fase !== 'PEMENANG') return;
    const stateBaru = lanjutSlotBerikutnya(state);
    setState(stateBaru);
    void simpanStateKeDb(stateBaru);
  }, [state]);

  // Tombol Batal Putaran saat fase MENGACAK karena salah pencet
  const aksiBatalPutaran = useCallback(async () => {
    if (state.fase !== 'MENGACAK') return;
    setMelambat(false);
    audioRef.current?.hentikanSemua();
    const stateBaru = batalkanPutaran(state);
    setState(stateBaru);
    await simpanStateKeDb(stateBaru);
  }, [state]);

  // Tombol Batal Pemenang Slot saat fase PEMENANG
  const aksiBatalPemenangSlot = useCallback(async () => {
    if (state.fase !== 'PEMENANG') return;
    const yakin = window.confirm(
      'Batalkan pemenang untuk slot ini dan undi ulang?\n\nPemenang yang baru terpilih akan dibatalkan dan slot ini akan dikembalikan ke status siap diundi.',
    );
    if (!yakin) return;

    audioRef.current?.hentikanSemua();
    const stateBaru = batalkanPemenangSlot(state);
    setState(stateBaru);
    setFileHasil(null);
    await simpanStateKeDb(stateBaru);
  }, [state]);

  // Fullscreen toggle pada wadah layar undian
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (wadahRef.current?.requestFullscreen) {
        void wadahRef.current.requestFullscreen();
      } else {
        void document.documentElement.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        void document.exitFullscreen();
      }
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
      } else if (e.key === '.' || e.code === 'Period' || e.code === 'NumpadDecimal') {
        if (state.fase === 'MENGACAK') {
          e.preventDefault();
          void aksiBatalPutaran();
        } else if (state.fase === 'PEMENANG') {
          e.preventDefault();
          void aksiBatalPemenangSlot();
        }
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
  }, [state.fase, aksiMulai, aksiBerhenti, aksiBatalPutaran, aksiBatalPemenangSlot, aksiLanjut, toggleFullscreen, toggleBisu]);

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
  const hasilTerkini = state.slotSelesai[state.slotSelesai.length - 1];

  return (
    <div
      ref={wadahRef}
      data-testid="layar-undian"
      style={{
        backgroundColor: '#062a55',
        backgroundImage: temaAktif.tampilan.latarAsetId
          ? `linear-gradient(rgba(6, 42, 85, ${temaAktif.tampilan.overlayGelapPersen / 100}), rgba(6, 42, 85, ${temaAktif.tampilan.overlayGelapPersen / 100})), url(/api/aset/${temaAktif.tampilan.latarAsetId})`
          : 'linear-gradient(180deg, #062a55 0%, #0a3a73 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      className="relative flex min-h-screen flex-col justify-between overflow-hidden bg-primary-900 text-neutral-0 select-none"
    >
      {/* Efek Confetti Perayaan Pemenang */}
      <ConfettiCanvas aktif={state.fase === 'PEMENANG' && temaAktif.tampilan.confetti} />

      {/* Autoplay Overlay jika audio tertahan */}
      {perluInteraksiSuara && (
        <div
          onClick={() => {
            setPerluInteraksiSuara(false);
            audioRef.current?.putarFase('MENUNGGU');
          }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-neutral-900/80 backdrop-blur-sm cursor-pointer"
        >
          <div className="rounded-xl border border-primary-700 bg-neutral-900 p-6 text-center shadow-2xl">
            <Volume2 className="mx-auto size-12 text-accent-400 animate-bounce" />
            <p className="mt-3 text-lg font-bold text-neutral-0">Klik untuk mengaktifkan suara</p>
            <p className="text-xs text-primary-100">Audio undian memerlukan interaksi pengguna.</p>
          </div>
        </div>
      )}

      {/* Header Layar Acara */}
      <header className="relative z-10 flex items-center justify-between border-b border-primary-700/80 bg-primary-900/80 px-8 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Image
            src="/brand/logo-okus.png"
            alt="Logo OKU Selatan"
            width={44}
            height={44}
            className="size-11 object-contain drop-shadow"
          />
          <div>
            <h1 className="text-base font-bold tracking-wide text-neutral-0">
              {paket.meta.periode.judul}
            </h1>
            <p className="font-mono text-xs text-accent-400">
              Snapshot: {formatHashRingkas(paket.meta.snapshotHash)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-700/60 border border-primary-500/60 px-3 py-1 text-xs font-semibold text-primary-100">
            <span className="size-2 rounded-full bg-secondary-600 animate-pulse" />
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
            className="rounded border border-primary-700 bg-primary-900 px-2.5 py-1 text-xs font-medium text-primary-100 hover:bg-primary-700"
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
      <main className="relative flex flex-1 items-center justify-center p-4 sm:p-6">
        {state.fase === 'SELESAI' ? (
          <RingkasanAkhir
            periodeJudul={paket.meta.periode.judul}
            periodeSlug={paket.meta.periode.slug}
            state={state}
            fileHasil={fileHasil}
            onUnduhHasil={unduhFileHasil}
            onResetUndian={aksiResetUndian}
          />
        ) : state.fase === 'PEMENANG' && hasilTerkini ? (
          <div className="flex w-full max-w-4xl flex-col items-center">
            <KartuPemenang
              slotKode={hasilTerkini.kode}
              slotLabel={
                hasilTerkini.kode.includes('W1')
                  ? 'Pemenang Zona 1'
                  : 'Pemenang Zona 2'
              }
              pemenang={hasilTerkini.pemenang}
              ucapanPemenang={temaAktif.teks.ucapanPemenang}
              warnaAksen={temaAktif.tampilan.warnaAksen}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center text-center max-w-2xl">
            {/* Ornamen Islami */}
            {temaAktif.tampilan.ornamenIslami && (
              <div className="mb-2 text-sm tracking-widest text-accent-400">✦ ۞ ✦</div>
            )}

            {/* Judul di Atas Tema Undian yang Diatur di Pengaturan Tema */}
            <h1 className="mb-1 text-2xl font-black uppercase tracking-wider text-accent-400 drop-shadow-md sm:text-3xl lg:text-4xl">
              {temaAktif.teks.judulAtas || 'GEBYAR UNDIAN UMROH PBB-P2'}
            </h1>

            {/* Subjudul Acara */}
            {temaAktif.teks.subjudul && (
              <p className="mb-2 text-xs font-semibold tracking-wide text-primary-200">
                {temaAktif.teks.subjudul}
              </p>
            )}

            {slotAktif && (
              <h2 className="my-2 text-2xl font-black text-neutral-0 tracking-tight sm:text-3xl">
                {slotAktif.wilayah === 'W1' ? 'Zona 1' : 'Zona 2'}
              </h2>
            )}

            {/* Animasi Sesuai Preset Tema (Slot Mesin, Roda Nama, Kartu Berputar, Ticker NOP) */}
            <AnimasiUndian
              preset={temaAktif.animasi.preset}
              fase={state.fase}
              peserta={pesertaAcak}
              warnaAksen={temaAktif.tampilan.warnaAksen}
              melambat={melambat}
            />

            <p className="text-xs font-medium text-primary-100">
              {state.fase === 'MENGACAK'
                ? 'Tekan tombol Berhenti [Spasi] untuk menentukan pemenang • Tekan Batal [.] jika salah putar'
                : 'Tekan tombol Mulai atau tekan Spasi untuk memutar undian'}
            </p>
          </div>
        )}
      </main>

      {/* Bilah Kontrol Operator Bawah (Tiket 16) */}
      {!sembunyikanBilah && (
        <footer className="relative z-20 flex items-center justify-between border-t border-primary-700/80 bg-neutral-900/95 px-8 py-3 backdrop-blur-md">
          {/* Sisi Kiri: Tombol Operasi Slot */}
          <div className="flex items-center gap-3">
            {state.fase === 'MENUNGGU' && (
              <button
                type="button"
                onClick={aksiMulai}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-neutral-0 shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                <Play className="size-4 fill-current" />
                Mulai [Spasi]
              </button>
            )}

            {state.fase === 'MENGACAK' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    void aksiBerhenti();
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-danger-700 px-5 text-sm font-bold text-neutral-0 shadow-sm hover:bg-danger-700/90 focus:outline-none focus:ring-2 focus:ring-danger-700 focus:ring-offset-2 focus:ring-offset-neutral-900"
                >
                  <Square className="size-4 fill-current" />
                  Berhenti [Spasi]
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void aksiBatalPutaran();
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-neutral-600 bg-neutral-800 px-4 text-sm font-bold text-neutral-200 shadow-sm hover:bg-neutral-700 hover:text-neutral-0 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
                  title="Batalkan putaran jika salah pencet [Tombol Titik .]"
                >
                  <X className="size-4" />
                  Batal Putaran [.]
                </button>
              </>
            )}

            {state.fase === 'PEMENANG' && state.slotSelesai.length < SLOT_URUTAN.length && (
              <button
                type="button"
                onClick={aksiLanjut}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-neutral-0 shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                Slot Berikutnya [→]
                <ArrowRight className="size-4" />
              </button>
            )}

            {state.fase === 'PEMENANG' && state.slotSelesai.length === SLOT_URUTAN.length && (
              <button
                type="button"
                onClick={aksiLanjut}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-secondary-600 px-5 text-sm font-bold text-neutral-0 shadow-sm hover:bg-secondary-600/90 focus:outline-none focus:ring-2 focus:ring-secondary-600 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                Lihat Ringkasan Akhir
                <ArrowRight className="size-4" />
              </button>
            )}

            {state.fase === 'PEMENANG' && (
              <button
                type="button"
                onClick={() => {
                  void aksiBatalPemenangSlot();
                }}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-warning-600 bg-neutral-900 px-4 text-sm font-bold text-warning-400 shadow-sm hover:bg-warning-950/60 focus:outline-none focus:ring-2 focus:ring-warning-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
                title="Batalkan pemenang slot ini dan undi ulang [Tombol Titik .]"
              >
                <RotateCcw className="size-4" />
                Batal Pemenang Slot Ini [.]
              </button>
            )}

            {state.slotSelesai.length > 0 && state.fase !== 'PEMENANG' && (
              <button
                type="button"
                onClick={aksiResetUndian}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-danger-700 bg-neutral-900 px-4 text-sm font-bold text-danger-300 shadow-sm hover:bg-danger-950/60 focus:outline-none focus:ring-2 focus:ring-danger-700 focus:ring-offset-2 focus:ring-offset-neutral-900"
              >
                <RotateCcw className="size-4" />
                Ulangi Undian
              </button>
            )}
          </div>

          {/* Sisi Kanan: Pemutar Musik Nav Bar & Pintasan Utilitas */}
          <div className="flex items-center gap-3">
            <FloatingAudioPlayer faseUndian={state.fase} />

            <div className="h-6 w-px bg-primary-700/60" />

            <div className="flex items-center gap-2 text-primary-100">
              <button
                type="button"
                onClick={toggleBisu}
                title="Bisukan Audio [M]"
                className="flex size-9 items-center justify-center rounded-lg border border-primary-700 bg-neutral-900 hover:text-neutral-0 hover:bg-primary-700"
              >
                {bisu ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <button
                type="button"
                onClick={toggleFullscreen}
                title="Layar Penuh [F]"
                className="flex size-9 items-center justify-center rounded-lg border border-primary-700 bg-neutral-900 hover:text-neutral-0 hover:bg-primary-700"
              >
                {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSembunyikanBilah(true);
                }}
                title="Sembunyikan Bilah [H]"
                className="flex size-9 items-center justify-center rounded-lg border border-primary-700 bg-neutral-900 hover:text-neutral-0 hover:bg-primary-700"
              >
                <EyeOff className="size-4" />
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Tombol Tampilkan Bilah jika tersembunyi (Kiri Bawah) */}
      {sembunyikanBilah && (
        <button
          type="button"
          onClick={() => {
            setSembunyikanBilah(false);
          }}
          title="Tampilkan Bilah Kontrol [H]"
          className="fixed bottom-4 left-4 z-30 flex size-10 items-center justify-center rounded-full bg-neutral-800/80 border border-neutral-700 text-neutral-300 backdrop-blur hover:bg-neutral-700"
        >
          <Eye className="size-5" />
        </button>
      )}
    </div>
  );
}
