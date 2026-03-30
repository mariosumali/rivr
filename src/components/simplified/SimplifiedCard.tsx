import { motion, type Variants, AnimatePresence } from 'framer-motion';
import type { Rank, Suit } from '../../engine/types';

interface SimplifiedCardProps {
  suit?: Suit;
  rank?: Rank;
  faceDown?: boolean;
  index?: number;
  isHero?: boolean;
  phase?: 'dealing' | 'idle' | 'folding' | 'exiting';
}

const RANK_DISPLAY: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', 'T': '10',
  'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

function getSuitClass(suit: Suit): string {
  if (suit === 'h' || suit === 'd') return 's-card--red-suit';
  return '';
}

function SuitSVG({ suit }: { suit: Suit }) {
  const paths: Record<Suit, React.ReactNode> = {
    h: (
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill="none" stroke="currentColor" strokeWidth="1.2"
      />
    ),
    d: (
      <path
        d="M12 2L4.5 12 12 22l7.5-10z"
        fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
    ),
    c: (
      <path
        d="M12 2a4.5 4.5 0 00-1.5 8.74A4.5 4.5 0 005 14.5a4.5 4.5 0 004.88 4.49L9 22h6l-.88-2.99A4.5 4.5 0 0019 14.5a4.5 4.5 0 00-5.5-4.39 4.49 4.49 0 00.5-2.11A4.5 4.5 0 0012 2z"
        fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
    ),
    s: (
      <path
        d="M12 2C8.5 5.5 3 9 3 13.5a5 5 0 004.88 5L7 22h10l-.88-3.5A5 5 0 0021 13.5C21 9 15.5 5.5 12 2z"
        fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
    ),
  };

  return (
    <svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
      {paths[suit]}
    </svg>
  );
}

const dealVariants: Variants = {
  initial: { y: -300, x: 0, opacity: 0, scale: 0.5, rotateZ: -20 },
  animate: (i: number) => ({
    y: 0, x: 0, opacity: 1, scale: 1, rotateZ: 0,
    transition: {
      type: 'spring', stiffness: 300, damping: 22, mass: 0.8,
      delay: i * 0.12,
    },
  }),
};

const foldVariants: Variants = {
  initial: { y: 0, x: 0, opacity: 1, scale: 1, rotateZ: 0 },
  animate: (i: number) => ({
    y: -400, x: i % 2 === 0 ? -200 : 200, opacity: 0, scale: 0.3, rotateZ: i % 2 === 0 ? -45 : 45,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: i * 0.06 },
  }),
};

const exitVariants: Variants = {
  initial: { y: 0, x: 0, opacity: 1, scale: 1, rotateZ: 0 },
  animate: (i: number) => ({
    y: 300, x: (i - 2) * 80, opacity: 0, scale: 0.4, rotateZ: (i - 2) * 15,
    transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1], delay: i * 0.04 },
  }),
};

export function SimplifiedCard({
  suit,
  rank,
  faceDown = false,
  index = 0,
  isHero = false,
  phase = 'idle',
}: SimplifiedCardProps) {
  const isFaceDown = faceDown || !suit || !rank;

  const variants = phase === 'dealing'
    ? dealVariants
    : phase === 'folding'
      ? foldVariants
      : phase === 'exiting'
        ? exitVariants
        : undefined;

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={`${rank}${suit}${phase}`}
        custom={index}
        variants={variants}
        initial={variants ? 'initial' : undefined}
        animate={variants ? 'animate' : undefined}
        whileHover={isHero && !isFaceDown && phase === 'idle' ? {
          y: -16,
          rotateX: -12,
          rotateZ: index === 0 ? -3 : 3,
          scale: 1.08,
          transition: { type: 'spring', stiffness: 400, damping: 20 },
        } : undefined}
        style={{
          perspective: 800,
          transformStyle: 'preserve-3d',
        }}
      >
        <div className={`s-card__inner ${isFaceDown ? 's-card__inner--back' : ''}`}>
          {!isFaceDown && suit && rank ? (
            <div className={`s-card__face ${getSuitClass(suit)}`}>
              <span className="s-card__rank">{RANK_DISPLAY[rank]}</span>
              <SuitSVG suit={suit} />
            </div>
          ) : (
            <div className="s-card__back" />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
