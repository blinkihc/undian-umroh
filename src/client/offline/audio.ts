/**
 * Pengelola audio 3 fase (Menunggu, Mengacak, Pemenang) untuk Layar Undian (API.md §16).
 * Memakai Web Audio API untuk sintesis prosedural offline tanpa dependensi eksternal.
 */

import { secureRandomInt } from '@/lib/draw/random';

export type ProfilSintetis = 'bawaan' | 'ceria' | 'formal';

export type PresetMengacak =
  | 'bawaan'
  | 'snare-drumroll'
  | 'arcade-8bit'
  | 'roulette'
  | 'rising-suspense'
  | 'mute'
  | 'kustom';

export type PresetPemenang =
  | 'bawaan'
  | 'royal-brass'
  | 'arcade-levelup'
  | 'jackpot-bells'
  | 'gentle-chime'
  | 'mute'
  | 'kustom';

export class PengelolaAudio {
  private ctx: AudioContext | null = null;
  private bisu = false;
  private faseSekarang: 'MENUNGGU' | 'MENGACAK' | 'PEMENANG' | null = null;
  private intervalPengacak: number | null = null;
  private oscMenunggu: OscillatorNode | null = null;
  private gainMenunggu: GainNode | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private profil: ProfilSintetis = 'bawaan';
  private nodeAktifList: (AudioNode | { stop?: (when?: number) => void; disconnect: () => void })[] = [];
  private noiseBuffer: AudioBuffer | null = null;

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

  setProfilSintetis(profil: ProfilSintetis): void {
    this.profil = profil;
  }

  putarFase(
    fase: 'MENUNGGU' | 'MENGACAK' | 'PEMENANG',
    opsi?: {
      urlAudio?: string | null;
      volumePersen?: number;
      loop?: boolean;
      preset?: string;
    },
  ): void {
    if (this.bisu) return;
    this.hentikanSemua();

    if (opsi?.preset === 'mute') {
      this.faseSekarang = fase;
      return;
    }

    this.faseSekarang = fase;

    // Jika ada berkas audio kustom (MP3/WAV/OGG atau Object URL)
    if (opsi?.urlAudio && typeof window !== 'undefined') {
      try {
        const volume = Math.max(0, Math.min(1, (opsi.volumePersen ?? 80) / 100));
        const audio = new Audio(opsi.urlAudio);
        audio.volume = volume;
        audio.loop =
          opsi.loop !== undefined ? opsi.loop : fase === 'MENUNGGU' || fase === 'MENGACAK';
        void audio.play().catch(() => {
          this.putarSintetis(fase, opsi?.volumePersen, opsi?.preset);
        });
        this.audioElement = audio;
        return;
      } catch {
        // Fallback ke sintetis jika pembuatan elemen audio gagal
      }
    }

    this.putarSintetis(fase, opsi?.volumePersen, opsi?.preset);
  }

  private putarSintetis(
    fase: 'MENUNGGU' | 'MENGACAK' | 'PEMENANG',
    volumePersen = 80,
    preset = 'bawaan',
  ): void {
    this.inisialisasi();
    if (!this.ctx) return;

    if (fase === 'MENUNGGU') {
      this.putarSuaraMenunggu(volumePersen);
    } else if (fase === 'MENGACAK') {
      this.putarSuaraMengacak(volumePersen, preset as PresetMengacak);
    } else {
      this.putarSuaraPemenang(volumePersen, preset as PresetPemenang);
    }
  }

  private putarSuaraMenunggu(volumePersen = 40): void {
    if (!this.ctx || this.bisu) return;
    try {
      const baseFreq = this.profil === 'formal' ? 110 : this.profil === 'ceria' ? 330 : 220;
      const targetGain = Math.max(0.005, Math.min(0.1, (volumePersen / 100) * 0.08));

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = this.profil === 'formal' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.005, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(targetGain, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();

      this.oscMenunggu = osc;
      this.gainMenunggu = gain;
    } catch {
      // Abaikan jika browser membatasi audio context
    }
  }

  private ambilNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (this.noiseBuffer) return this.noiseBuffer;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleRate; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private putarSuaraMengacak(volumePersen = 70, preset: PresetMengacak = 'bawaan'): void {
    if (!this.ctx || this.bisu || preset === 'mute') return;

    const masterGain = Math.max(0.005, Math.min(0.2, (volumePersen / 100) * 0.12));

    try {
      if (preset === 'snare-drumroll') {
        const noiseBuf = this.ambilNoiseBuffer();
        if (!noiseBuf) return;

        this.intervalPengacak = window.setInterval(() => {
          if (!this.ctx || this.bisu) return;
          const src = this.ctx.createBufferSource();
          src.buffer = noiseBuf;

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1000 + secureRandomInt(-80, 80), this.ctx.currentTime);
          filter.Q.setValueAtTime(3.0, this.ctx.currentTime);

          const gain = this.ctx.createGain();
          gain.gain.setValueAtTime(masterGain * 1.4, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.028);

          src.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);

          src.start();
          src.stop(this.ctx.currentTime + 0.03);
        }, 45);
      } else if (preset === 'arcade-8bit') {
        const nadaPentatonik = [523.25, 587.33, 659.25, 783.99, 880.0];
        let idx = 0;

        this.intervalPengacak = window.setInterval(() => {
          if (!this.ctx || this.bisu) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'square';
          const freq = nadaPentatonik[idx % nadaPentatonik.length]!;
          idx += 1;
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

          gain.gain.setValueAtTime(masterGain * 0.65, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start();
          osc.stop(this.ctx.currentTime + 0.055);
        }, 65);
      } else if (preset === 'roulette') {
        this.intervalPengacak = window.setInterval(() => {
          if (!this.ctx || this.bisu) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(620, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.038);

          gain.gain.setValueAtTime(masterGain * 1.2, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start();
          osc.stop(this.ctx.currentTime + 0.042);
        }, 55);
      } else if (preset === 'rising-suspense') {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, this.ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(3200, this.ctx.currentTime + 7.0);
        filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.005, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(masterGain * 0.9, this.ctx.currentTime + 0.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        this.nodeAktifList.push(osc, gain);
      } else {
        // Preset bawaan (Klik Ticker Cepat)
        const baseFreq = this.profil === 'formal' ? 220 : this.profil === 'ceria' ? 550 : 440;
        const intervalMs = this.profil === 'formal' ? 120 : this.profil === 'ceria' ? 70 : 85;

        this.intervalPengacak = window.setInterval(() => {
          if (!this.ctx || this.bisu) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = this.profil === 'formal' ? 'sawtooth' : 'triangle';
          osc.frequency.setValueAtTime(baseFreq + secureRandomInt(0, 180), this.ctx.currentTime);
          gain.gain.setValueAtTime(masterGain, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.045);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.045);
        }, intervalMs);
      }
    } catch {
      // Abaikan jika browser membatasi audio context
    }
  }

  private putarSuaraPemenang(volumePersen = 90, preset: PresetPemenang = 'bawaan'): void {
    if (!this.ctx || this.bisu || preset === 'mute') return;

    const masterGain = Math.max(0.01, Math.min(0.25, (volumePersen / 100) * 0.15));

    try {
      if (preset === 'royal-brass') {
        const chordLangkah = [
          { nada: [261.63, 329.63, 392.0], dur: 0.35 },
          { nada: [349.23, 440.0, 523.25], dur: 0.35 },
          { nada: [392.0, 493.88, 587.33], dur: 0.45 },
          { nada: [523.25, 659.25, 783.99, 1046.5], dur: 1.8 },
        ];

        let waktuMulai = this.ctx.currentTime;
        chordLangkah.forEach((langkah) => {
          if (!this.ctx) return;
          langkah.nada.forEach((freq) => {
            if (!this.ctx) return;
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2200, waktuMulai);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.01, waktuMulai);
            gain.gain.linearRampToValueAtTime(masterGain * 0.4, waktuMulai + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, waktuMulai + langkah.dur);

            [-5, 5].forEach((detuneVal) => {
              if (!this.ctx) return;
              const osc = this.ctx.createOscillator();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(freq, waktuMulai);
              osc.detune.setValueAtTime(detuneVal, waktuMulai);
              osc.connect(filter);
              osc.start(waktuMulai);
              osc.stop(waktuMulai + langkah.dur);
              this.nodeAktifList.push(osc);
            });

            filter.connect(gain);
            gain.connect(this.ctx.destination);
            this.nodeAktifList.push(filter, gain);
          });
          waktuMulai += langkah.dur * 0.85;
        });
      } else if (preset === 'arcade-levelup') {
        const nadaLevelUp = [
          { f: 392.0, t: 0.0, d: 0.08 },
          { f: 523.25, t: 0.08, d: 0.08 },
          { f: 659.25, t: 0.16, d: 0.08 },
          { f: 783.99, t: 0.24, d: 0.08 },
          { f: 659.25, t: 0.32, d: 0.08 },
          { f: 783.99, t: 0.4, d: 0.7 },
        ];

        const t0 = this.ctx.currentTime;
        nadaLevelUp.forEach((item) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(item.f, t0 + item.t);

          gain.gain.setValueAtTime(masterGain * 0.6, t0 + item.t);
          gain.gain.exponentialRampToValueAtTime(0.001, t0 + item.t + item.d);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t0 + item.t);
          osc.stop(t0 + item.t + item.d + 0.01);
          this.nodeAktifList.push(osc, gain);
        });
      } else if (preset === 'jackpot-bells') {
        const loncengFrekuensi = [1318.51, 1567.98, 2093.0, 2637.02, 2093.0, 2637.02, 3135.96];
        const t0 = this.ctx.currentTime;

        loncengFrekuensi.forEach((freq, idx) => {
          if (!this.ctx) return;
          const waktu = t0 + idx * 0.09;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, waktu);

          gain.gain.setValueAtTime(masterGain * 0.7, waktu);
          gain.gain.exponentialRampToValueAtTime(0.001, waktu + 0.85);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(waktu);
          osc.stop(waktu + 0.9);
          this.nodeAktifList.push(osc, gain);
        });
      } else if (preset === 'gentle-chime') {
        const nadaCmaj9 = [261.63, 329.63, 392.0, 493.88, 587.33];
        const t0 = this.ctx.currentTime;

        nadaCmaj9.forEach((freq) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t0);

          gain.gain.setValueAtTime(0.001, t0);
          gain.gain.linearRampToValueAtTime(masterGain * 0.35, t0 + 0.35);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.5);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(t0);
          osc.stop(t0 + 2.55);
          this.nodeAktifList.push(osc, gain);
        });
      } else {
        // Preset bawaan (C-E-G-C)
        const nada =
          this.profil === 'formal'
            ? [349.23, 440.0, 523.25, 698.46, 880.0]
            : this.profil === 'ceria'
              ? [523.25, 659.25, 783.99, 880.0, 1046.5]
              : [523.25, 659.25, 783.99, 1046.5];

        nada.forEach((freq, idx) => {
          if (!this.ctx) return;
          const mulai = this.ctx.currentTime + idx * 0.14;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = this.profil === 'formal' ? 'sawtooth' : 'sine';
          osc.frequency.setValueAtTime(freq, mulai);

          gain.gain.setValueAtTime(0.01, mulai);
          gain.gain.linearRampToValueAtTime(masterGain * 0.8, mulai + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, mulai + 0.85);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(mulai);
          osc.stop(mulai + 0.85);
          this.nodeAktifList.push(osc, gain);
        });
      }
    } catch {
      // Abaikan jika browser membatasi audio context
    }
  }

  hentikanSemua(): void {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {
        // Abaikan
      }
      this.audioElement = null;
    }
    if (this.intervalPengacak !== null) {
      clearInterval(this.intervalPengacak);
      this.intervalPengacak = null;
    }
    if (this.oscMenunggu && this.gainMenunggu && this.ctx) {
      try {
        this.gainMenunggu.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        this.oscMenunggu.stop(this.ctx.currentTime + 0.2);
      } catch {
        // Abaikan
      }
      this.oscMenunggu = null;
      this.gainMenunggu = null;
    }

    this.nodeAktifList.forEach((node) => {
      try {
        if ('stop' in node && typeof node.stop === 'function') {
          node.stop();
        }
        node.disconnect();
      } catch {
        // Abaikan
      }
    });
    this.nodeAktifList = [];

    this.faseSekarang = null;
  }
}
