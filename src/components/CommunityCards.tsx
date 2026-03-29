import { Card } from './Card';
import type { Card as CardType, CardAnimationState } from '../engine/types';
import './CommunityCards.css';

interface CommunityCardsProps {
  cards: CardType[];
  animationState?: CardAnimationState;
}

export function CommunityCards({
  cards,
  animationState = 'idle',
}: CommunityCardsProps) {
  // Always render 5 slots; unfilled slots are empty
  const slots = Array.from({ length: 5 }, (_, i) => cards[i] ?? null);

  return (
    <div className="community-cards">
      {slots.map((card, i) => (
        <div key={i} className="community-cards__slot">
          {card ? (
            <Card
              rank={card[0] as any}
              suit={card[1] as any}
              faceDown={false}
              animationState={animationState}
              delay={i * 0.08}
            />
          ) : (
            <div className="community-cards__placeholder" />
          )}
        </div>
      ))}
    </div>
  );
}
