'use client';

import {
  Pause,
  Play,
  SkipForward,
  Square,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import {
  bacaPengaturanBgm,
  daftarTrackBgm,
  formatDurasiMenitDetik,
  type BgmSettings,
  type BgmTrack,
} from '@/client/offline/bgm-store';
import { type FaseUndian } from '@/lib/draw/types';

type FloatingAudioPlayerProps = {
  /** Fase aktif dari engine undian untuk ducking dan perpindahan lagu otomatis */
  faseUndian?: FaseUndian;
};

// Pola spektrum gelombang suara (waveform) sesuai visualisasi nav bar
const WAVEFORM_BARS = [
  { base: 6, max: 14, delay: '0ms' },
  { base: 8, max: 18, delay: '120ms' },
  { base: 5, max: 12, delay: '240ms' },
  { base: 10, max: 24, delay: '60ms' },
  { base: 7, max: 16, delay: '180ms' },
  { base: 12, max: 28, delay: '300ms' },
  { base: 6, max: 14, delay: '90ms' },
  { base: 8, max: 18, delay: '210ms' },
  { base: 5, max: 12, delay: '330ms' },
  { base: 11, max: 26, delay: '150ms' },
  { base: 7, max: 16, delay: '270ms' },
  { base: 10, max: 24, delay: '30ms' },
  { base: 6, max: 14, delay: '180ms' },
  { base: 9, max: 22, delay: '300ms' },
  { base: 11, max: 26, delay: '75ms' },
  { base: 7, max: 16, delay: '225ms' },
  { base: 8, max: 20, delay: '360ms' },
  { base: 6, max: 14, delay: '140ms' },
  { base: 4, max: 10, delay: '260ms' },
  { base: 5, max: 12, delay: '380ms' },
];

export function FloatingAudioPlayer({ faseUndian = 'MENUNGGU' }: FloatingAudioPlayerProps): ReactElement {
  const [daftarLagu, setDaftarLagu] = useState<BgmTrack[]>([]);
  const [pengaturan, setPengaturan] = useState<BgmSettings | null>(null);
  const [indeksAktif, setIndeksAktif] = useState(0);
  const [sedangPutar, setSedangPutar] = useState(false);
  const [waktuBerjalan, setWaktuBerjalan] = useState(0);
  const [totalDurasi, setTotalDurasi] = useState(0);
  const [volume, setVolume] = useState(70);
  const [slotAktif, setSlotAktif] = useState<'standby' | 'tegang' | 'playlist'>('playlist');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlBlobRef = useRef<string | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);

  // Muat daftar lagu dan preferensi dari IndexedDB
  const muatDataAudio = useCallback(async () => {
    try {
      const [tracks, cfg] = await Promise.all([daftarTrackBgm(), bacaPengaturanBgm()]);
      setDaftarLagu(tracks);
      setPengaturan(cfg);
      setVolume(cfg.volumeDefault);

      // Cek slot standby jika ada
      if (cfg.standbyTrackId) {
        const idxStandby = tracks.findIndex((t) => t.id === cfg.standbyTrackId);
        if (idxStandby !== -1) {
          setIndeksAktif(idxStandby);
          setSlotAktif('standby');
        }
      }
    } catch {
      // Abaikan jika IndexedDB belum siap
    }
  }, []);

  useEffect(() => {
    void muatDataAudio();
  }, [muatDataAudio]);

  const laguSekarang = daftarLagu[indeksAktif] ?? null;

  // Pasang sumber audio setiap kali lagu aktif berganti
  useEffect(() => {
    if (urlBlobRef.current) {
      URL.revokeObjectURL(urlBlobRef.current);
      urlBlobRef.current = null;
    }

    if (!laguSekarang) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      return;
    }

    const url = URL.createObjectURL(laguSekarang.blob);
    urlBlobRef.current = url;

    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;
    }

    audio.src = url;
    audio.loop = pengaturan?.loop ?? true;
    audio.volume = volume / 100;

    const onTimeUpdate = (): void => {
      setWaktuBerjalan(audio?.currentTime ?? 0);
    };

    const onLoadedMetadata = (): void => {
      setTotalDurasi(audio?.duration ?? laguSekarang.durasiDetik);
    };

    const onEnded = (): void => {
      if (pengaturan?.loop) {
        if (audio) {
          audio.currentTime = 0;
          void audio.play().catch(() => {});
        }
      } else {
        // Lanjut lagu berikutnya di playlist
        setIndeksAktif((prev) => (prev + 1) % Math.max(1, daftarLagu.length));
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    // Lanjutkan putar jika sebelumnya aktif atau autoplay diaktifkan
    if (sedangPutar) {
      void audio.play().catch(() => {});
    } else if (pengaturan?.autoplay) {
      audio.play().then(() => setSedangPutar(true)).catch(() => {
        // Autoplay terhalang kebijakan peramban memerlukan interaksi pengguna
      });
    }

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [laguSekarang, pengaturan?.loop, pengaturan?.autoplay]);

  // Tangani ducking dan pergantian audio saat fase undian berganti
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !pengaturan) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    if (faseUndian === 'MENGACAK') {
      // Putar Musik Tegang / Drum Roll jika slot tersedia
      if (pengaturan.tegangTrackId) {
        const idxTegang = daftarLagu.findIndex((t) => t.id === pengaturan.tegangTrackId);
        if (idxTegang !== -1 && idxTegang !== indeksAktif) {
          setIndeksAktif(idxTegang);
          setSlotAktif('tegang');
          setTimeout(() => {
            if (audioRef.current) {
              audioRef.current.volume = volume / 100;
              void audioRef.current.play().then(() => setSedangPutar(true)).catch(() => {});
            }
          }, 50);
          return;
        }
      }
    } else if (faseUndian === 'PEMENANG') {
      // Audio ducking: turunkan volume perlahan agar suara pengumuman pemenang jelas
      const volAwal = audio.volume;
      const volTarget = Math.max(0.05, volAwal * 0.15);
      const langkah = (volAwal - volTarget) / 15;
      let hitungan = 0;

      fadeIntervalRef.current = window.setInterval(() => {
        hitungan += 1;
        if (audioRef.current && audioRef.current.volume - langkah > volTarget) {
          audioRef.current.volume -= langkah;
        } else {
          if (audioRef.current) audioRef.current.volume = volTarget;
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        }
        if (hitungan >= 15 && fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
        }
      }, 70);
    } else if (faseUndian === 'MENUNGGU') {
      // Pulihkan volume kembali ke volume normal pengguna
      const volAwal = audio.volume;
      const volTarget = volume / 100;
      if (volAwal < volTarget) {
        const langkah = (volTarget - volAwal) / 10;
        fadeIntervalRef.current = window.setInterval(() => {
          if (audioRef.current && audioRef.current.volume + langkah < volTarget) {
            audioRef.current.volume += langkah;
          } else {
            if (audioRef.current) audioRef.current.volume = volTarget;
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          }
        }, 50);
      }
      // Kembalikan ke slot standby jika sebelumnya slot tegang
      if (slotAktif === 'tegang' && pengaturan.standbyTrackId) {
        const idxStandby = daftarLagu.findIndex((t) => t.id === pengaturan.standbyTrackId);
        if (idxStandby !== -1) {
          setIndeksAktif(idxStandby);
          setSlotAktif('standby');
        }
      }
    }

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, [faseUndian, pengaturan, daftarLagu, indeksAktif, slotAktif, volume]);

  // Kontrol putar / jeda
  const togglePutar = (): void => {
    const audio = audioRef.current;
    if (!audio || !laguSekarang) return;

    if (sedangPutar) {
      audio.pause();
      setSedangPutar(false);
    } else {
      audio.volume = volume / 100;
      void audio.play().then(() => setSedangPutar(true)).catch(() => {});
    }
  };

  // Kontrol berhenti (Stop)
  const aksiBerhenti = (): void => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setSedangPutar(false);
    setWaktuBerjalan(0);
  };

  // Kontrol lagu berikutnya (Next)
  const aksiBerikutnya = (): void => {
    if (daftarLagu.length <= 1) return;
    setIndeksAktif((prev) => (prev + 1) % daftarLagu.length);
  };

  return (
    <div
      aria-label="Pemutar Musik Latar"
      className="flex items-center gap-3 select-none"
    >
      {/* Tombol Play / Pause Utama (Lingkaran sesuai lampiran) */}
      <button
        type="button"
        onClick={togglePutar}
        disabled={!laguSekarang}
        title={
          laguSekarang
            ? `${sedangPutar ? 'Jeda' : 'Putar'} Musik (${laguSekarang.nama})`
            : 'Belum ada lagu latar'
        }
        className="flex size-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800 text-neutral-100 shadow-sm transition-all hover:border-cyan-400/60 hover:bg-neutral-700 hover:text-neutral-0 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        {sedangPutar ? (
          <Pause className="size-4 fill-current" />
        ) : (
          <Play className="size-4 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform Visualizer (Sesuai persis dengan gambar lampiran) */}
      <div
        className="flex items-center gap-[2.5px] h-7 px-1 cursor-pointer"
        onClick={togglePutar}
        title={
          laguSekarang
            ? `${laguSekarang.nama} • ${formatDurasiMenitDetik(Math.floor(waktuBerjalan))} / ${formatDurasiMenitDetik(Math.floor(totalDurasi))}`
            : 'Tidak ada lagu latar'
        }
      >
        {WAVEFORM_BARS.map((bar, i) => (
          <span
            key={i}
            style={{
              height: sedangPutar ? `${bar.max}px` : `${bar.base}px`,
              animationDelay: bar.delay,
              backgroundColor: sedangPutar ? '#2dd4bf' : '#475569',
            }}
            className={`w-[2px] rounded-full transition-all duration-200 ${
              sedangPutar ? 'animate-pulse' : 'opacity-60'
            }`}
          />
        ))}
      </div>

      {/* Tombol Stop */}
      <button
        type="button"
        onClick={aksiBerhenti}
        disabled={!laguSekarang || (!sedangPutar && waktuBerjalan === 0)}
        title="Hentikan Musik (Stop)"
        className="flex size-8 items-center justify-center rounded-lg border border-primary-700 bg-neutral-900 text-primary-200 hover:bg-primary-700 hover:text-neutral-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Square className="size-3.5 fill-current" />
      </button>

      {/* Tombol Next */}
      <button
        type="button"
        onClick={aksiBerikutnya}
        disabled={daftarLagu.length <= 1}
        title="Lagu Berikutnya (Next)"
        className="flex size-8 items-center justify-center rounded-lg border border-primary-700 bg-neutral-900 text-primary-200 hover:bg-primary-700 hover:text-neutral-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <SkipForward className="size-3.5" />
      </button>

      {/* Judul Lagu Ringkas (Truncated jika ada lagu) */}
      {laguSekarang && (
        <span
          title={laguSekarang.nama}
          className="hidden max-w-[130px] truncate text-xs font-medium text-primary-200 xl:inline-block"
        >
          {laguSekarang.nama}
        </span>
      )}
    </div>
  );
}
