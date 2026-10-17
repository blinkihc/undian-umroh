import { describe, expect, it, vi, beforeEach } from 'vitest';

import { PengelolaAudio } from '@/client/offline/audio';

describe('PengelolaAudio', () => {
  let audio: PengelolaAudio;

  beforeEach(() => {
    audio = new PengelolaAudio();
  });

  it('menginisialisasi dengan status bisu false', () => {
    expect(audio.isBisu()).toBe(false);
  });

  it('mengatur mode bisu dan menghentikan pemutaran', () => {
    audio.setBisu(true);
    expect(audio.isBisu()).toBe(true);

    // Memutar fase saat bisu tidak menyebabkan galat
    expect(() => {
      audio.putarFase('MENGACAK', { preset: 'snare-drumroll' });
    }).not.toThrow();
  });

  it('mendukung seluruh preset fase mengacak tanpa melempar galat', () => {
    const presets = [
      'bawaan',
      'snare-drumroll',
      'arcade-8bit',
      'roulette',
      'rising-suspense',
      'mute',
    ];

    presets.forEach((preset) => {
      expect(() => {
        audio.putarFase('MENGACAK', { preset, volumePersen: 70 });
        audio.hentikanSemua();
      }).not.toThrow();
    });
  });

  it('mendukung seluruh preset fase pemenang tanpa melempar galat', () => {
    const presets = [
      'bawaan',
      'royal-brass',
      'arcade-levelup',
      'jackpot-bells',
      'gentle-chime',
      'mute',
    ];

    presets.forEach((preset) => {
      expect(() => {
        audio.putarFase('PEMENANG', { preset, volumePersen: 90 });
        audio.hentikanSemua();
      }).not.toThrow();
    });
  });

  it('menghentikan semua suara dan interval saat hentikanSemua dipanggil', () => {
    audio.putarFase('MENGACAK', { preset: 'snare-drumroll' });
    expect(() => audio.hentikanSemua()).not.toThrow();
  });
});
