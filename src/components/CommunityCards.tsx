import { motion } from 'framer-motion';
import { Card } from './Card';
import type { Card as CardType, CardAnimationState, Rank, Suit } from '../engine/types';
import './CommunityCards.css';

interface CommunityCardsProps {
  cards: CardType[];
  animationState?: CardAnimationState;
  baseDelay?: number;
}

export function CommunityCards({ cards, baseDelay = 0 }: CommunityCardsProps) {
  // Only render as many slots as the street needs (3, 4, or 5); preflop shows
  // a single faint marker so the board area never looks like face-down cards.
  const slotCount = cards.length === 0 ? 0 : Math.max(3, cards.length);
  const slots = Array.from({ length: slotCount }, (_, i) => cards[i] ?? null);

  if (slotCount === 0) {
    return <div className="community-cards community-cards--empty">pre-flop</div>;
  }

  return (
    <div className="community-cards">
      {slots.map((card, i) => (
        <div key={i} className="community-cards__slot">
          {card ? (
            <motion.div
              key={card}
              initial={{ opacity: 0, rotateY: -90, y: -8 }}
              animate={{ opacity: 1, rotateY: 0, y: 0 }}
              transition={{ duration: 0.34, ease: 'easeOut', delay: baseDelay + i * 0.06 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <Card rank={card[0] as Rank} suit={card[1] as Suit} faceDown={false} size="sm" />
            </motion.div>
          ) : (
            <div className="community-cards__placeholder" />
          )}
        </div>
      ))}
    </div>
  );
}
