import { motion, type Variants } from 'framer-motion';
import type { Rank, Suit } from '../engine/types';
import './Card.css';

export type CardAnimationState = 'idle' | 'dealing' | 'flipping' | 'folding';

interface CardProps {
  suit?: Suit;
  rank?: Rank;
  faceDown?: boolean;
  animationState?: CardAnimationState;
  delay?: number;
  style?: React.CSSProperties;
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  h: '♥',
  d: '♦',
  c: '♣',
  s: '♠',
};

const RANK_DISPLAY: Record<Rank, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', 'T': '10',
  'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

function getSuitColorClass(suit: Suit): string {
  if (suit === 'h') return 'card-suit--heart';
  if (suit === 'd') return 'card-suit--diamond';
  return 'card-suit--dark';
}

const dealVariants: Variants = {
  initial: { x: 0, y: -60, opacity: 0, scale: 0.8 },
  animate: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const foldVariants: Variants = {
  initial: { x: 0, y: 0, opacity: 1 },
  animate: {
    x: -80,
    y: -30,
    opacity: 0,
    transition: { duration: 0.24, ease: 'easeIn' },
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
      className="card-perspective"
      variants={variants}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      whileHover={
        animationState === 'idle' && !isFaceDown
          ? { scale: 1.04, y: -4, transition: { duration: 0.12, ease: 'easeOut' } }
          : undefined
      }
      style={style}
    >
      <div
        className={`card-inner ${animationState === 'flipping' ? 'card-inner--flipping' : ''} ${isFaceDown ? 'card-inner--facedown' : ''}`}
        style={{ animationDelay: `${delay}s` }}
      >
        {/* Front face */}
        <div className="card-face card-face--front">
          {suit && rank && (
            <>
              <div className={`card-corner card-corner--top ${getSuitColorClass(suit)}`}>
                <span className="card-rank">{RANK_DISPLAY[rank]}</span>
                <span className="card-suit-symbol">{SUIT_SYMBOLS[suit]}</span>
              </div>
              <div className={`card-center ${getSuitColorClass(suit)}`}>
                <span className="card-center-symbol">{SUIT_SYMBOLS[suit]}</span>
              </div>
              <div className={`card-corner card-corner--bottom ${getSuitColorClass(suit)}`}>
                <span className="card-rank">{RANK_DISPLAY[rank]}</span>
                <span className="card-suit-symbol">{SUIT_SYMBOLS[suit]}</span>
              </div>
            </>
          )}
        </div>

        {/* Back face */}
        <div className="card-face card-face--back">
          <div className="card-back-pattern" />
        </div>
      </div>
    </motion.div>
  );
}
