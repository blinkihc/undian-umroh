'use client';

import { animate, stagger } from 'animejs';
import { ChevronDown, MessageSquare, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { WA_HELPDESK } from '@/config/brand';

const DAFTAR_FAQ = [
  {
    tanya: 'Bagaimana bila tahun lalu sempat terlambat bayar?',
    jawab:
      'Tetap berhak ikut undian asalkan seluruh kewajiban PBB-P2 tahun 2022–2025 telah berstatus lunas, dan tagihan tahun 2026 dilunasi sebelum tanggal batas jatuh tempo.',
  },
  {
    tanya: 'Mengapa sebagian identitas saya disensor tanda bintang (*)?',
    jawab:
      'Penyensoran ini merupakan bentuk kepatuhan terhadap Undang-Undang Perlindungan Data Pribadi (UU PDP No. 27/2022). Data lengkap tersimpan aman dan terenkripsi pada basis data internal Bapenda.',
  },
  {
    tanya: 'Dapatkah hadiah Umroh dialihkan kepada keluarga?',
    jawab:
      'Bisa dialihkan khusus untuk keluarga inti dalam satu Kartu Keluarga (suami/istri, anak kandung, orang tua) melalui prosedur administrasi resmi di Bapenda Kabupaten OKU Selatan.',
  },
];

function FaqItem({
  faq,
  index,
  isOpen,
  onToggle,
}: {
  faq: (typeof DAFTAR_FAQ)[number];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}): ReactElement {
  const contentRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Hindari animasi saat mount pertama jika tertutup
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (!isOpen && contentRef.current) {
        contentRef.current.style.height = '0px';
        contentRef.current.style.opacity = '0';
        return;
      }
    }

    if (!contentRef.current) return;

    if (isOpen) {
      const scrollHeight = contentRef.current.scrollHeight;
      // Animasi membuka dengan Anime.js
      animate(contentRef.current, {
        height: [`0px`, `${scrollHeight}px`],
        opacity: [0, 1],
        duration: 380,
        ease: 'outQuart',
      });
      if (chevronRef.current) {
        animate(chevronRef.current, {
          rotate: 180,
          duration: 300,
          ease: 'outCubic',
        });
      }
    } else {
      // Animasi menutup dengan Anime.js
      const currentHeight = contentRef.current.offsetHeight;
      animate(contentRef.current, {
        height: [`${currentHeight}px`, '0px'],
        opacity: [1, 0],
        duration: 300,
        ease: 'inOutQuad',
      });
      if (chevronRef.current) {
        animate(chevronRef.current, {
          rotate: 0,
          duration: 300,
          ease: 'outCubic',
        });
      }
    }
  }, [isOpen]);

  return (
    <div
      className={`faq-card rounded-2xl border transition-all duration-300 overflow-hidden shadow-md backdrop-blur-md ${
        isOpen
          ? 'border-emerald-400/50 bg-slate-900/85 ring-1 ring-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
          : 'border-white/15 bg-slate-900/60 hover:border-emerald-400/40 hover:bg-slate-900/75'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-heading font-bold text-sm sm:text-base text-white cursor-pointer select-none"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-2.5">
          <span
            className={`size-2 rounded-full transition-colors ${
              isOpen ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-white/30'
            }`}
          />
          {faq.tanya}
        </span>
        <ChevronDown
          ref={chevronRef}
          className="w-4 h-4 text-emerald-400 shrink-0 transform-gpu"
        />
      </button>

      {/* Kontainer Jawaban Teranimasi Anime.js */}
      <div
        ref={contentRef}
        style={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="px-5 pb-5 pt-2 text-xs sm:text-sm text-slate-200 leading-relaxed border-t border-white/10">
          <p className="bg-emerald-950/40 p-3.5 rounded-xl border border-emerald-500/20 text-slate-200">
            {faq.jawab}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqAccordion(): ReactElement {
  const [bukaIndeks, setBukaIndeks] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Stagger masuk kartu FAQ dengan Anime.js
    animate('.faq-card', {
      opacity: [0, 1],
      translateY: [20, 0],
      delay: stagger(100),
      duration: 600,
      ease: 'outCubic',
    });
  }, []);

  const toggleAccordion = (idx: number) => {
    setBukaIndeks(bukaIndeks === idx ? null : idx);
  };

  const tautanWa = `https://wa.me/${WA_HELPDESK}?text=${encodeURIComponent(
    'Halo Bapenda OKU Selatan, saya ingin berkonsultasi mengenai status kepesertaan NOP Undian Umroh.',
  )}`;

  return (
    <section
      ref={containerRef}
      className="max-w-3xl mx-auto space-y-6 scroll-mt-24 text-white"
      id="faq"
      aria-labelledby="judul-faq"
    >
      <div className="text-center space-y-1.5">
        <span className="font-mono text-xs text-emerald-400 font-bold uppercase tracking-widest block drop-shadow-sm">
          INFORMASI &amp; JAWABAN RESMI
        </span>
        <h3
          id="judul-faq"
          className="font-heading font-extrabold text-2xl sm:text-3xl text-white drop-shadow-md"
        >
          Pertanyaan Umum (FAQ)
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
          Penjelasan seputar kepesertaan, transparansi data, dan ketentuan hadiah undian umroh.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        {DAFTAR_FAQ.map((faq, idx) => (
          <FaqItem
            key={faq.tanya}
            faq={faq}
            index={idx}
            isOpen={bukaIndeks === idx}
            onToggle={() => toggleAccordion(idx)}
          />
        ))}
      </div>

      {/* Helpdesk WhatsApp Dinamis dari Pengaturan */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-slate-900/85 via-[#07301c]/85 to-slate-900/85 border border-emerald-500/30 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left mt-8 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-400 font-mono text-xs font-bold">
            <Sparkles className="size-3.5" />
            <span>KONSULTASI LANGSUNG</span>
          </div>
          <h4 className="font-heading font-bold text-sm sm:text-base text-white">
            Butuh klarifikasi terkait data NOP Anda?
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            Layanan helpdesk Bapenda OKU Selatan siap membantu pemeriksaan riwayat pembayaran.
          </p>
        </div>

        <a
          href={tautanWa}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#ffffff' }}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 !text-white font-heading font-bold text-xs tracking-wider uppercase flex items-center gap-2 transition-all shadow-lg shadow-emerald-950/60 shrink-0 cursor-pointer active:scale-95 border border-emerald-400/40"
        >
          <MessageSquare className="w-4 h-4 text-white" style={{ color: '#ffffff' }} />
          <span style={{ color: '#ffffff' }}>WhatsApp Helpdesk</span>
        </a>
      </div>
    </section>
  );
}
