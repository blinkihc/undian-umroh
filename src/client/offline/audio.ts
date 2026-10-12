/**
 * Pengelola audio 3 fase (Menunggu, Mengacak, Pemenang) untuk Layar Undian (API.md §16, Tiket 16).
 * Memakai Web Audio API untuk fallback sintetis yang selalu berfungsi offline tanpa dependensi luar.
 */

import { secureRandomInt } from '@/lib/draw/random';

export class PengelolaAudio {
  private ctx: AudioContext | null = null;
  private bisu = false;
  private faseSekarang: 'MENUNGGU' | 'MENGACAK' | 'PEMENANG' | null = null;
  private intervalPengacak: number | null = null;
  private oscMenunggu: OscillatorNode | null = null;
  private gainMenunggu: GainNode | null = null;

  private inisialisasi(): void {
    if (this.ctx === null && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  setBisu(bisu: boolean): void {
    this.bisu = bisu;
    if (bisu) {
      this.hentikanSemua();
    }
  }

  isBisu(): boolean {
    return this.bisu;
  }

  putarFase(fase: 'MENUNGGU' | 'MENGACAK' | 'PEMENANG'): void {
    if (this.bisu) return;
    this.inisialisasi();
    if (!this.ctx) return;

    this.hentikanSemua();
    this.faseSekarang = fase;

    if (fase === 'MENUNGGU') {
      this.putarSuaraMenunggu();
    } else if (fase === 'MENGACAK') {
      this.putarSuaraMengacak();
    } else {
      this.putarSuaraPemenang();
    }
  }

  private putarSuaraMenunggu(): void {
    if (!this.ctx || this.bisu) return;
    try {
      // Drone/chime lembut loop frekuensi 220 Hz (volume 40%)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.3); // 300ms fade in

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();

      this.oscMenunggu = osc;
      this.gainMenunggu = gain;
    } catch {
      // Abaikan jika browser membatasi
    }
  }

  private putarSuaraMengacak(): void {
    if (!this.ctx || this.bisu) return;
    try {
      // Rhythmic ticker klik cepat (volume 70%)
      this.intervalPengacak = window.setInterval(() => {
        if (!this.ctx || this.bisu) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440 + secureRandomInt(0, 200), this.ctx.currentTime);
        gain.gain.setValueAtTime(0.07, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
      }, 100);
    } catch {
      // Abaikan
    }
  }

  private putarSuaraPemenang(): void {
    if (!this.ctx || this.bisu) return;
    try {
      // Fanfare nada menang C - E - G - C tinggi (volume 90%)
      const nada = [523.25, 659.25, 783.99, 1046.5];
      nada.forEach((freq, idx) => {
        if (!this.ctx) return;
        const mulai = this.ctx.currentTime + idx * 0.15;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, mulai);

        gain.gain.setValueAtTime(0.01, mulai);
        gain.gain.linearRampToValueAtTime(0.09, mulai + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, mulai + 0.8);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(mulai);
        osc.stop(mulai + 0.8);
      });
    } catch {
      // Abaikan
    }
  }

  hentikanSemua(): void {
    if (this.intervalPengacak !== null) {
      clearInterval(this.intervalPengacak);
      this.intervalPengacak = null;
    }
    if (this.oscMenunggu && this.gainMenunggu && this.ctx) {
      try {
        this.gainMenunggu.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.3); // 300ms fade out
        this.oscMenunggu.stop(this.ctx.currentTime + 0.3);
      } catch {
        // Abaikan
      }
      this.oscMenunggu = null;
      this.gainMenunggu = null;
    }
    this.faseSekarang = null;
  }
}
