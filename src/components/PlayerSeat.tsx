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
  playerIndex?: number;
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
  playerIndex = 0,
}: PlayerSeatProps) {
  return (
    <div
      className={`player-seat ${isHero ? 'player-seat--hero' : ''} ${isActive ? 'player-seat--active' : ''} ${isFolded ? 'player-seat--folded' : ''}`}
    >
      {/* Avatar + info (opponents) */}
      {!isHero && (
        <div className="player-seat__avatar-row">
          <div className={`player-seat__avatar ${isActive ? 'player-seat__avatar--active' : ''}`}>
            <span className="player-seat__avatar-label">P{playerIndex + 1}</span>
          </div>
          <div className="player-seat__meta">
            <span className="player-seat__position">{position}</span>
            <span className="player-seat__stack">{stackSize}bb</span>
          </div>
        </div>
      )}

      {/* Bet amount (opponents) */}
      {!isHero && betAmount != null && betAmount > 0 && (
        <div className="player-seat__bet-pill">{betAmount}bb</div>
      )}

      {/* Folded label */}
      {isFolded && !isHero && (
        <span className="player-seat__folded-label">folded</span>
      )}

      {/* Cards */}
      {!isFolded && (
        <div className="player-seat__cards">
          {cards ? (
            <>
              <Card
                suit={faceDown ? undefined : (cards[0][1] as any)}
                rank={faceDown ? undefined : (cards[0][0] as any)}
                faceDown={faceDown}
                animationState={animationState}
                delay={dealDelay}
                size={isHero ? 'md' : 'sm'}
                index={0}
                isHero={isHero}
              />
              <Card
                suit={faceDown ? undefined : (cards[1][1] as any)}
                rank={faceDown ? undefined : (cards[1][0] as any)}
                faceDown={faceDown}
                animationState={animationState}
                delay={dealDelay + 0.08}
                size={isHero ? 'md' : 'sm'}
                index={1}
                isHero={isHero}
              />
            </>
          ) : (
            <div className="player-seat__empty-cards" />
          )}
        </div>
      )}

      {/* Hero info strip */}
      {isHero && (
        <div className="player-seat__hero-strip">
          <span className="player-seat__hero-you">YOU · {stackSize}bb</span>
          {betAmount != null && betAmount > 0 && (
            <span className="player-seat__hero-bet">{betAmount}bb</span>
          )}
        </div>
      )}
    </div>
  );
}
