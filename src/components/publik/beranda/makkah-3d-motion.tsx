'use client';

import { motion } from 'motion/react';
import { type ReactElement } from 'react';

export function Makkah3DMotion(): ReactElement {
  return (
    <div className="relative flex flex-col items-center justify-center py-4 w-full select-none [perspective:1000px]">
      {/* Efek Lingkaran Pendar Cahaya Lembut di Belakang Ka'bah */}
      <div
        className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr from-amber-400/20 via-emerald-400/15 to-transparent blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Kontainer 3D Shuttle Spin */}
      <motion.div
        className="relative z-10 w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[460px] aspect-square flex items-center justify-center will-change-transform cursor-pointer"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: [-8, 8, -8],
          rotateY: [-12, 12, -12],
          rotateZ: [-1.5, 1.5, -1.5],
        }}
        transition={{
          opacity: { duration: 0.8, ease: 'easeOut' },
          scale: { duration: 0.8, ease: 'easeOut' },
          y: {
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          rotateY: {
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          },
          rotateZ: {
            duration: 7,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
        whileHover={{
          scale: 1.04,
          transition: { duration: 0.3, ease: 'easeOut' },
        }}
        whileTap={{ scale: 0.98 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <img
          src="/brand/3D-Makkah.png"
          alt="Visual 3D Ka'bah dan Masjidil Haram Makkah"
          className="w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.65)] pointer-events-none"
          loading="eager"
        />
      </motion.div>

      {/* Bayangan Lantai Dinamis yang Menyesuaikan Ketinggian Melayang */}
      <motion.div
        className="w-48 sm:w-64 h-5 rounded-[100%] bg-black/50 blur-md pointer-events-none mt-[-10px]"
        animate={{
          scale: [0.92, 1.06, 0.92],
          opacity: [0.35, 0.6, 0.35],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        aria-hidden="true"
      />
    </div>
  );
}
