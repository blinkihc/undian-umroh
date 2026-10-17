import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FloatingAudioPlayer } from '@/components/undian/floating-audio-player';
import { type BgmTrack } from '@/client/offline/bgm-store';

const mockTracks: BgmTrack[] = [
  {
    id: 'track-1',
    nama: 'Instrumental Baitullah.mp3',
    durasiDetik: 180,
    ukuranBytes: 1024000,
    tipe: 'playlist',
    blob: new Blob(['audio-content'], { type: 'audio/mp3' }),
    diunggahAt: '2026-10-17T00:00:00Z',
  },
];

let tracksResponse: BgmTrack[] = [];

// Mock IndexedDB bgm-store untuk pengujian komponen UI
vi.mock('@/client/offline/bgm-store', () => ({
  bacaPengaturanBgm: vi.fn().mockResolvedValue({
    key: 'bgm_config',
    autoplay: false,
    loop: true,
    volumeDefault: 70,
    standbyTrackId: null,
    tegangTrackId: null,
  }),
  daftarTrackBgm: vi.fn(async () => tracksResponse),
  formatDurasiMenitDetik: (detik: number) => `${Math.floor(detik / 60)}:${(detik % 60).toString().padStart(2, '0')}`,
}));

describe('FloatingAudioPlayer (Inline Nav Bar Player)', () => {
  beforeEach(() => {
    tracksResponse = [];
    vi.clearAllMocks();
  });

  it('merender pemutar musik satu baris di navbar dengan tombol play/pause, stop, dan next', async () => {
    render(<FloatingAudioPlayer faseUndian="MENUNGGU" />);

    const container = screen.getByLabelText(/pemutar musik latar/i);
    expect(container).toBeInTheDocument();

    const tombolPutar = screen.getByTitle(/belum ada lagu latar/i);
    expect(tombolPutar).toBeInTheDocument();
    expect(tombolPutar).toBeDisabled();

    const tombolStop = screen.getByTitle(/hentikan musik \(stop\)/i);
    expect(tombolStop).toBeInTheDocument();
    expect(tombolStop).toBeDisabled();

    const tombolNext = screen.getByTitle(/lagu berikutnya \(next\)/i);
    expect(tombolNext).toBeInTheDocument();
    expect(tombolNext).toBeDisabled();
  });

  it('mengaktifkan kontrol play saat lagu latar tersedia di playlist', async () => {
    tracksResponse = mockTracks;

    render(<FloatingAudioPlayer faseUndian="MENUNGGU" />);

    const tombolPutar = await screen.findByTitle(/putar musik \(Instrumental Baitullah\.mp3\)/i);
    expect(tombolPutar).toBeInTheDocument();
    expect(tombolPutar).not.toBeDisabled();

    expect(screen.getByText('Instrumental Baitullah.mp3')).toBeInTheDocument();
  });
});
