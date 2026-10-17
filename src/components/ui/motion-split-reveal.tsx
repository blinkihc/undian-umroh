'use client';

import { motion } from 'motion/react';
import { type ReactElement } from 'react';

type MotionSplitRevealProps = {
  teks: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  delay?: number;
  stagger?: number;
  align?: 'left' | 'center' | 'right';
};

export function MotionSplitReveal({
  teks,
  className = '',
  as: Component = 'span',
  delay = 0.1,
  stagger = 0.045,
  align = 'left',
}: MotionSplitRevealProps): ReactElement {
  const kataArray = teks.split(' ');

  const justifyClass =
    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: stagger,
        delayChildren: delay,
      },
    },
  };

  const kataVariants = {
    hidden: {
      y: '105%',
      opacity: 0,
      filter: 'blur(4px)',
    },
    visible: {
      y: '0%',
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        type: 'spring' as const,
        damping: 18,
        stiffness: 140,
        mass: 0.8,
      },
    },
  };

  return (
    <Component className={className} aria-label={teks}>
      <motion.span
        className={`inline-flex flex-wrap ${justifyClass} gap-x-[0.28em] gap-y-1 w-full`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        aria-hidden="true"
      >
        {kataArray.map((kata, i) => (
          <span key={`${kata}-${i}`} className="inline-block overflow-hidden pb-1 -mb-1">
            <motion.span
              className="inline-block will-change-transform"
              variants={kataVariants}
            >
              {kata}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Component>
  );
}
