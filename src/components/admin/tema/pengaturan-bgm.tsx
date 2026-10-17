'use client';

import {
  CheckCircle2,
  Disc3,
  Flame,
  Music,
  Pause,
  Play,
  Radio,
  Sliders,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';

import {
  bacaPengaturanBgm,
  daftarTrackBgm,
  formatDurasiMenitDetik,
  hapusTrackBgm,
  simpanPengaturanBgm,
  simpanTrackBgm,
  type BgmSettings,
  type BgmTrack,
} from '@/client/offline/bgm-store';

export function PengaturanBgm(): ReactElement {
  const [tracks, setTracks] = useState<BgmTrack[]>([]);
  const [settings, setSettings] = useState<BgmSettings | null>(null);
  const [sedangUnggah, setSedangUnggah] = useState(false);
  const [pesanSukses, setPesanSukses] = useState<string | null>(null);
  const [pesanGalat, setPesanGalat] = useState<string | null>(null);

  // Audio preview tester
  const [audioUjiId, setAudioUjiId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const muatData = useCallback(async () => {
    try {
      const [daftar, cfg] = await Promise.all([daftarTrackBgm(), bacaPengaturanBgm()]);
      setTracks(daftar);
      setSettings(cfg);
    } catch {
      setPesanGalat('Gagal memuat daftar audio BGM dari penyimpanan lokal.');
    }
  }, []);

  useEffect(() => {
    void muatData();
  }, [muatData]);

  // Hentikan pemutaran audio saat unmount
  useEffect(() => {
    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current.src = '';
      }
    };
  }, []);

  const tampilkanNotif = (sukses: string): void => {
    setPesanSukses(sukses);
    setTimeout(() => setPesanSukses(null), 3000);
  };

  // Uji putar / jeda berkas audio
  const toggleUjiAudio = (track: BgmTrack): void => {
    if (audioUjiId === track.id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      setAudioUjiId(null);
      return;
    }

    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }

    const url = URL.createObjectURL(track.blob);
    const audio = new Audio(url);
    audio.volume = (settings?.volumeDefault ?? 70) / 100;
    audio.onended = () => setAudioUjiId(null);
    audioPreviewRef.current = audio;

    void audio
      .play()
      .then(() => setAudioUjiId(track.id))
      .catch(() => setPesanGalat('Gagal memutar pratinjau audio.'));
  };

  // Tangani unggah berkas audio (satu atau banyak)
  const tanganiUnggahBerkas = async (
    files: FileList | null,
    tipe: 'standby' | 'tegang' | 'playlist',
  ): Promise<void> => {
    if (!files || files.length === 0) return;
    setSedangUnggah(true);
    setPesanGalat(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file) {
          await simpanTrackBgm(file, file.name, tipe);
        }
      }
      await muatData();
      tampilkanNotif('Berkas audio berhasil disimpan ke penyimpanan lokal.');
    } catch (err) {
      setPesanGalat((err as Error).message);
    } finally {
      setSedangUnggah(false);
    }
  };

  // Hapus track audio
  const tanganiHapus = async (id: string): Promise<void> => {
    if (audioUjiId === id && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setAudioUjiId(null);
    }

    try {
      await hapusTrackBgm(id);
      await muatData();
      tampilkanNotif('Audio berhasil dihapus dari daftar.');
    } catch {
      setPesanGalat('Gagal menghapus audio.');
    }
  };

  // Perbarui pengaturan toggle/slider
  const ubahPengaturan = async (perubahan: Partial<BgmSettings>): Promise<void> => {
    try {
      const baru = await simpanPengaturanBgm(perubahan);
      setSettings(baru);
      tampilkanNotif('Pengaturan BGM berhasil diperbarui.');
    } catch {
      setPesanGalat('Gagal menyimpan pengaturan BGM.');
    }
  };

  const trackStandby = tracks.find((t) => t.id === settings?.standbyTrackId) ?? null;
  const trackTegang = tracks.find((t) => t.id === settings?.tegangTrackId) ?? null;
  const tracksPlaylist = tracks.filter((t) => t.tipe === 'playlist');

  return (
    <section id="audio-bgm" className="rounded-xl border border-neutral-300 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2">
          <Disc3 className="size-5 text-primary-700" />
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              Pengaturan Musik Latar / Audio Undian
            </h3>
            <p className="text-xs text-neutral-500">
              Kelola berkas audio latar, slot musik standby & tegang, serta preferensi pemutaran Layar Undian.
            </p>
          </div>
        </div>

        {sedangUnggah && (
          <span className="text-xs font-semibold text-primary-700 animate-pulse">
            Menyimpan audio...
          </span>
        )}
      </div>

      {pesanSukses && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>{pesanSukses}</span>
        </div>
      )}

      {pesanGalat && (
        <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800">
          {pesanGalat}
        </div>
      )}

      {/* 2 Slot Khusus: Standby & Tegang */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slot 1: Musik Latar Standby */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
              <Radio className="size-4 text-primary-700" />
              1. Musik Latar Standby
            </span>
            <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-semibold text-primary-800">
              Sebelum Undian
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Diputar saat layar undian terbuka dan menunggu operator menekan tombol Mulai.
          </p>

          {trackStandby ? (
            <div className="mt-3 rounded-lg border border-neutral-300 bg-white p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate text-xs font-bold text-neutral-800" title={trackStandby.nama}>
                  {trackStandby.nama}
                </p>
                <p className="font-mono text-[10px] text-neutral-500">
                  Durasi: {formatDurasiMenitDetik(trackStandby.durasiDetik)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleUjiAudio(trackStandby)}
                  title={audioUjiId === trackStandby.id ? 'Hentikan Uji Suara' : 'Uji Putar'}
                  className="flex size-7 items-center justify-center rounded-md border border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  {audioUjiId === trackStandby.id ? (
                    <Pause className="size-3.5 fill-current text-primary-700" />
                  ) : (
                    <Play className="size-3.5 fill-current text-primary-700 ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void tanganiHapus(trackStandby.id)}
                  title="Hapus Musik Standby"
                  className="flex size-7 items-center justify-center rounded-md border border-neutral-300 bg-neutral-50 text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-white p-3 text-center cursor-pointer hover:border-primary-500 transition-colors">
                <Upload className="size-5 text-neutral-400" />
                <span className="mt-1 text-xs font-semibold text-neutral-700">
                  Unggah Musik Standby
                </span>
                <span className="text-[10px] text-neutral-400">MP3, WAV, atau OGG</span>
                <input
                  type="file"
                  accept="audio/mp3,audio/wav,audio/ogg"
                  className="hidden"
                  onChange={(e) => void tanganiUnggahBerkas(e.target.files, 'standby')}
                />
              </label>
            </div>
          )}
        </div>

        {/* Slot 2: Musik Tegang / Drum Roll */}
        <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
              <Flame className="size-4 text-amber-600" />
              2. Musik Tegang / Drum Roll
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Saat Putar Undian
            </span>
          </div>
          <p className="mt-1 text-[11px] text-neutral-500">
            Diputar otomatis saat tombol Mulai / Putar ditekan hingga pemenang muncul.
          </p>

          {trackTegang ? (
            <div className="mt-3 rounded-lg border border-neutral-300 bg-white p-3 flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="truncate text-xs font-bold text-neutral-800" title={trackTegang.nama}>
                  {trackTegang.nama}
                </p>
                <p className="font-mono text-[10px] text-neutral-500">
                  Durasi: {formatDurasiMenitDetik(trackTegang.durasiDetik)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleUjiAudio(trackTegang)}
                  title={audioUjiId === trackTegang.id ? 'Hentikan Uji Suara' : 'Uji Putar'}
                  className="flex size-7 items-center justify-center rounded-md border border-neutral-300 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  {audioUjiId === trackTegang.id ? (
                    <Pause className="size-3.5 fill-current text-primary-700" />
                  ) : (
                    <Play className="size-3.5 fill-current text-primary-700 ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void tanganiHapus(trackTegang.id)}
                  title="Hapus Musik Tegang"
                  className="flex size-7 items-center justify-center rounded-md border border-neutral-300 bg-neutral-50 text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <label className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-white p-3 text-center cursor-pointer hover:border-amber-500 transition-colors">
                <Upload className="size-5 text-neutral-400" />
                <span className="mt-1 text-xs font-semibold text-neutral-700">
                  Unggah Musik Tegang
                </span>
                <span className="text-[10px] text-neutral-400">MP3, WAV, atau OGG</span>
                <input
                  type="file"
                  accept="audio/mp3,audio/wav,audio/ogg"
                  className="hidden"
                  onChange={(e) => void tanganiUnggahBerkas(e.target.files, 'tegang')}
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Playlist Audio Tambahan */}
      <div className="mt-6 border-t border-neutral-200 pt-5">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
              Daftar Lagu Latar / Playlist Tambahan
            </h4>
            <p className="text-[11px] text-neutral-500">
              Dapat mengunggah satu atau beberapa lagu sekaligus untuk diputar bergantian di Layar Undian.
            </p>
          </div>

          <label className="inline-flex items-center gap-1.5 rounded-lg border border-primary-600 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 cursor-pointer hover:bg-primary-100 transition-colors">
            <Upload className="size-3.5" />
            <span>Tambah Lagu</span>
            <input
              type="file"
              multiple
              accept="audio/mp3,audio/wav,audio/ogg"
              className="hidden"
              onChange={(e) => void tanganiUnggahBerkas(e.target.files, 'playlist')}
            />
          </label>
        </div>

        {/* Tabel Adaptif Playlist Lagu */}
        {tracksPlaylist.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-center text-xs text-neutral-400">
            Belum ada playlist lagu tambahan. Klik tombol &ldquo;Tambah Lagu&rdquo; di atas untuk mengunggah berkas audio.
          </div>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100/70 text-neutral-700">
                <tr>
                  <th className="py-2 px-3 font-semibold w-12 text-center">No</th>
                  <th className="py-2 px-3 font-semibold">Nama Berkas</th>
                  <th className="py-2 px-3 font-semibold w-24">Durasi</th>
                  <th className="py-2 px-3 font-semibold w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white">
                {tracksPlaylist.map((track, idx) => (
                  <tr key={track.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-2 px-3 text-center font-mono text-neutral-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-medium text-neutral-800">
                      <div className="flex items-center gap-2">
                        <Music className="size-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate max-w-xs">{track.nama}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-neutral-600">
                      {formatDurasiMenitDetik(track.durasiDetik)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleUjiAudio(track)}
                          title={audioUjiId === track.id ? 'Hentikan' : 'Putar'}
                          className="flex size-7 items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 transition-colors"
                        >
                          {audioUjiId === track.id ? (
                            <Pause className="size-3 fill-current text-primary-700" />
                          ) : (
                            <Play className="size-3 fill-current text-primary-700 ml-0.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void tanganiHapus(track.id)}
                          title="Hapus Lagu"
                          className="flex size-7 items-center justify-center rounded-md border border-neutral-300 bg-white text-danger-600 hover:bg-danger-50 transition-colors"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pengaturan Tambahan: Toggle Autoplay, Loop, dan Slider Volume */}
      <div className="mt-6 border-t border-neutral-200 pt-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
          Preferensi Pemutaran Layar Undian
        </h4>

        <div className="mt-3 space-y-4">
          {/* Toggle Auto-play */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neutral-800">
                Auto-play saat masuk Layar Undian
              </p>
              <p className="text-[11px] text-neutral-500">
                Otomatis memutar musik latar saat layar undian pertama kali dimuat di laptop operator.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings?.autoplay ?? false}
              onChange={(e) => void ubahPengaturan({ autoplay: e.target.checked })}
              className="h-4 w-4 rounded-sm border-neutral-300 text-primary-700 focus:ring-primary-600 cursor-pointer"
            />
          </div>

          {/* Toggle Loop */}
          <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
            <div>
              <p className="text-xs font-semibold text-neutral-800">
                Loop / Ulangi lagu terus-menerus
              </p>
              <p className="text-[11px] text-neutral-500">
                Mengulangi lagu saat durasi selesai agar suasana panggung tidak hening.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings?.loop ?? true}
              onChange={(e) => void ubahPengaturan({ loop: e.target.checked })}
              className="h-4 w-4 rounded-sm border-neutral-300 text-primary-700 focus:ring-primary-600 cursor-pointer"
            />
          </div>

          {/* Slider Volume Default */}
          <div className="border-t border-neutral-200 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                <Sliders className="size-3.5 text-neutral-500" />
                Volume Default Layar Undian (0% – 100%)
              </span>
              <span className="font-mono font-bold text-primary-700">
                {settings?.volumeDefault ?? 70}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings?.volumeDefault ?? 70}
              onChange={(e) => void ubahPengaturan({ volumeDefault: Number(e.target.value) })}
              className="mt-2 w-full accent-primary-700 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
