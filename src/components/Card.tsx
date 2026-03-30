import { motion, type Variants } from 'framer-motion';
import type { Rank, Suit, CardAnimationState } from '../engine/types';
import './Card.css';

export type { CardAnimationState };

interface CardProps {
  suit?: Suit;
  rank?: Rank;
  faceDown?: boolean;
  animationState?: CardAnimationState;
  delay?: number;
  style?: React.CSSProperties;
  size?: 'sm' | 'md' | 'lg';
  index?: number;
  isHero?: boolean;
}

const RANK_DISPLAY: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', 'T': '10',
  'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

function SuitIcon({ suit, className }: { suit: Suit; className?: string }) {
  const paths: Record<Suit, string> = {
    h: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    d: 'M12 2L4.5 12 12 22l7.5-10z',
    c: 'M12 2a4.5 4.5 0 00-1.5 8.74A4.5 4.5 0 005 14.5a4.5 4.5 0 004.88 4.49L9 22h6l-.88-2.99A4.5 4.5 0 0019 14.5a4.5 4.5 0 00-5.5-4.39 4.49 4.49 0 00.5-2.11A4.5 4.5 0 0012 2z',
    s: 'M12 2C8.5 5.5 3 9 3 13.5a5 5 0 004.88 5L7 22h10l-.88-3.5A5 5 0 0021 13.5C21 9 15.5 5.5 12 2z',
  };

  return (
    <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
      <path
        d={paths[suit]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getSuitColorClass(suit: Suit): string {
  if (suit === 'h') return 'card-suit--heart';
  if (suit === 'd') return 'card-suit--diamond';
  return 'card-suit--dark';
}

const dealVariants: Variants = {
  initial: { y: -250, opacity: 0, scale: 0.5, rotateZ: -15 },
  animate: {
    y: 0, opacity: 1, scale: 1, rotateZ: 0,
    transition: { type: 'spring', stiffness: 300, damping: 22, mass: 0.8 },
  },
};

const foldVariants: Variants = {
  initial: { y: 0, x: 0, opacity: 1, scale: 1, rotateZ: 0 },
  animate: {
    y: -300, x: -150, opacity: 0, scale: 0.3, rotateZ: -35,
    transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
  },
};

const idleVariants: Variants = {
  initial: {},
  animate: {},
};

export function Card({
  suit,
  rank,
  faceDown = false,
  animationState = 'idle',
  delay = 0,
  style,
  size = 'md',
  index,
  isHero = false,
}: CardProps) {
  const isFaceDown = faceDown || !suit || !rank;

  const variants =
    animationState === 'dealing'
      ? dealVariants
      : animationState === 'folding'
        ? foldVariants
        : idleVariants;

  return (
    <motion.div
      className={`card-perspective card-perspective--${size}`}
      variants={variants}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      whileHover={isHero && !isFaceDown && animationState === 'idle' ? {
        y: -16,
        rotateX: -12,
        rotateZ: index === 0 ? -3 : 3,
        scale: 1.08,
        transition: { type: 'spring', stiffness: 400, damping: 20 },
      } : undefined}
      style={{ ...style, perspective: 800, transformStyle: 'preserve-3d' as const }}
    >
      <div
        className={`card-inner ${animationState === 'flipping' ? 'card-inner--flipping' : ''} ${isFaceDown ? 'card-inner--facedown' : ''}`}
        style={{ animationDelay: `${delay}s` }}
      >
        <div className="card-face card-face--front">
          {suit && rank && (
            <div className={`card-content ${getSuitColorClass(suit)}`}>
              <span className="card-rank">{RANK_DISPLAY[rank]}</span>
              <SuitIcon suit={suit} className="card-suit-svg" />
            </div>
          )}
        </div>
        <div className="card-face card-face--back">
          <div className="card-back-pattern" />
        </div>
      </div>
    </motion.div>
  );
}
