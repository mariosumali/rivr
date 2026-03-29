import { Card } from './Card';
import type { Card as CardType, Position, CardAnimationState } from '../engine/types';
import './PlayerSeat.css';

interface PlayerSeatProps {
  position: Position;
  stackSize: number;
  betAmount?: number;
  isHero?: boolean;
  isActive?: boolean;
  isFolded?: boolean;
  cards?: [CardType, CardType];
  faceDown?: boolean;
  animationState?: CardAnimationState;
  dealDelay?: number;
}

export function PlayerSeat({
  position,
  stackSize,
  betAmount,
  isHero = false,
  isActive = false,
  isFolded = false,
  cards,
  faceDown = true,
  animationState = 'idle',
  dealDelay = 0,
}: PlayerSeatProps) {
  return (
    <div
      className={`player-seat ${isHero ? 'player-seat--hero' : ''} ${isActive ? 'player-seat--active' : ''} ${isFolded ? 'player-seat--folded' : ''}`}
    >
      <div className="player-seat__info">
        <span className="player-seat__position">{position}</span>
        <span className="player-seat__stack">{stackSize}bb</span>
      </div>

      <div className="player-seat__cards">
        {cards ? (
          <>
            <Card
              suit={faceDown ? undefined : (cards[0][1] as any)}
              rank={faceDown ? undefined : (cards[0][0] as any)}
              faceDown={faceDown}
              animationState={animationState}
              delay={dealDelay}
            />
            <Card
              suit={faceDown ? undefined : (cards[1][1] as any)}
              rank={faceDown ? undefined : (cards[1][0] as any)}
              faceDown={faceDown}
              animationState={animationState}
              delay={dealDelay + 0.08}
            />
          </>
        ) : (
          <div className="player-seat__empty-cards" />
        )}
      </div>

      {betAmount != null && betAmount > 0 && (
        <div className="player-seat__bet">
          <span className="player-seat__chip" />
          <span className="player-seat__bet-amount">{betAmount}bb</span>
        </div>
      )}
    </div>
  );
}
