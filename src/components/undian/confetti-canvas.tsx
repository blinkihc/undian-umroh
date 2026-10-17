'use client';

import { useEffect, useRef, type ReactElement } from 'react';

type ConfettiCanvasProps = {
  aktif: boolean;
};

type Partikel = {
  x: number;
  y: number;
  lebar: number;
  tinggi: number;
  kecepatanX: number;
  kecepatanY: number;
  rotasi: number;
  kecepatanRotasi: number;
  kemiringan: number;
  kecepatanMiring: number;
  warna: string;
  bentuk: 'kotak' | 'lingkaran';
  gravitasi: number;
  gesekan: number;
  transparansi: number;
};

const WARNA_CONFETTI = [
  '#F59E0B', // Emas Royal
  '#FBBF24', // Amber Terang
  '#10B981', // Hijau Zamrud
  '#34D399', // Mint Terang
  '#38BDF8', // Biru Langit
  '#6366F1', // Indigo Lembut
  '#F43F5E', // Mawar Meriah
  '#FFFFFF', // Putih Bersih
];

export function ConfettiCanvas({ aktif }: ConfettiCanvasProps): ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!aktif) return;

    const kanvas = canvasRef.current;
    if (!kanvas) return;

    const ctx = kanvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lebar = (kanvas.width = window.innerWidth);
    let tinggi = (kanvas.height = window.innerHeight);

    function onResize(): void {
      if (!kanvas) return;
      lebar = kanvas.width = window.innerWidth;
      tinggi = kanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', onResize);

    const kurangiGerakan =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const partikelList: Partikel[] = [];
    const jumlahPartikel = kurangiGerakan ? 25 : 120;

    function buatPartikel(dariKiri = true, dariKanan = true): Partikel {
      const sisiKiri = dariKiri && (!dariKanan || Math.random() > 0.5);
      const xAwal = sisiKiri
        ? Math.random() * (lebar * 0.25)
        : lebar - Math.random() * (lebar * 0.25);
      const yAwal = Math.random() * (tinggi * 0.35);

      const sudut = sisiKiri
        ? (Math.random() * 50 + 10) * (Math.PI / 180)
        : (Math.random() * 50 + 120) * (Math.PI / 180);

      const laju = Math.random() * 8 + 6;

      return {
        x: xAwal,
        y: yAwal,
        lebar: Math.random() * 9 + 6,
        tinggi: Math.random() * 5 + 4,
        kecepatanX: Math.cos(sudut) * laju,
        kecepatanY: -Math.sin(sudut) * laju - Math.random() * 4,
        rotasi: Math.random() * 360,
        kecepatanRotasi: (Math.random() - 0.5) * 6,
        kemiringan: Math.random() * 10,
        kecepatanMiring: Math.random() * 0.1 + 0.05,
        warna: WARNA_CONFETTI[Math.floor(Math.random() * WARNA_CONFETTI.length)]!,
        bentuk: Math.random() > 0.4 ? 'kotak' : 'lingkaran',
        gravitasi: 0.18 + Math.random() * 0.08,
        gesekan: 0.985,
        transparansi: 1,
      };
    }

    // Inisialisasi ledakan pertama
    for (let i = 0; i < jumlahPartikel; i++) {
      partikelList.push(buatPartikel());
    }

    const waktuMulai = performance.now();

    function render(waktuSekarang: number): void {
      if (!ctx || !kanvas) return;
      ctx.clearRect(0, 0, lebar, tinggi);

      const deltaDetik = (waktuSekarang - waktuMulai) / 1000;

      // Terus semprot partikel baru selama 6 detik pertama
      if (deltaDetik < 6 && partikelList.length < jumlahPartikel * 1.5) {
        if (Math.random() < 0.35) {
          partikelList.push(buatPartikel());
        }
      }

      for (let i = partikelList.length - 1; i >= 0; i--) {
        const p = partikelList[i]!;

        p.kecepatanX *= p.gesekan;
        p.kecepatanY += p.gravitasi;
        p.x += p.kecepatanX;
        p.y += p.kecepatanY;
        p.rotasi += p.kecepatanRotasi;
        p.kemiringan += p.kecepatanMiring;

        // Hilang perlahan jika melewati batas bawah layar
        if (p.y > tinggi - 20) {
          p.transparansi -= 0.02;
        }

        if (p.transparansi <= 0 || p.y > tinggi + 50) {
          if (deltaDetik < 5) {
            // Daur ulang partikel
            partikelList[i] = buatPartikel();
          } else {
            partikelList.splice(i, 1);
          }
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.transparansi);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotasi * Math.PI) / 180);
        ctx.fillStyle = p.warna;

        const skalaX = Math.cos(p.kemiringan);
        ctx.scale(skalaX, 1);

        if (p.bentuk === 'lingkaran') {
          ctx.beginPath();
          ctx.arc(0, 0, p.lebar / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.lebar / 2, -p.tinggi / 2, p.lebar, p.tinggi);
        }

        ctx.restore();
      }

      if (partikelList.length > 0) {
        animId = requestAnimationFrame(render);
      }
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [aktif]);

  if (!aktif) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="confetti-canvas"
      className="pointer-events-none fixed inset-0 z-40 h-full w-full select-none"
    />
  );
}
