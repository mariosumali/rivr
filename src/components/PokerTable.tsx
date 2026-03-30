import { CommunityCards } from './CommunityCards';
import { PlayerSeat } from './PlayerSeat';
import type { Card, CardAnimationState, Position } from '../engine/types';
import './PokerTable.css';

export interface PlayerData {
  position: Position;
  stackSize: number;
  betAmount?: number;
  isHero?: boolean;
  isActive?: boolean;
  isFolded?: boolean;
  cards?: [Card, Card];
  faceDown?: boolean;
}

interface PokerTableProps {
  players: PlayerData[];
  communityCards: Card[];
  pot: number;
  animationState?: CardAnimationState;
}

const OPPONENT_POSITIONS: Record<number, { top: string; left: string }[]> = {
  1: [
    { top: '8%', left: '50%' },
  ],
  2: [
    { top: '14%', left: '25%' },
    { top: '14%', left: '75%' },
  ],
  3: [
    { top: '48%', left: '5%' },
    { top: '8%', left: '50%' },
    { top: '48%', left: '95%' },
  ],
  4: [
    { top: '55%', left: '5%' },
    { top: '14%', left: '25%' },
    { top: '14%', left: '75%' },
    { top: '55%', left: '95%' },
  ],
  5: [
    { top: '55%', left: '5%' },
    { top: '14%', left: '16%' },
    { top: '8%', left: '50%' },
    { top: '14%', left: '84%' },
    { top: '55%', left: '95%' },
  ],
};

const CARD_STAGGER = 0.1;

export function PokerTable({
  players,
  communityCards,
  pot,
  animationState = 'idle',
}: PokerTableProps) {
  const hero = players.find((p) => p.isHero);
  const opponents = players.filter((p) => !p.isHero);
  const oppCount = Math.min(opponents.length, 5);
  const positions = OPPONENT_POSITIONS[oppCount] || OPPONENT_POSITIONS[5];
  const totalPlayers = players.length;

  const communityBaseDelay =
    animationState === 'dealing' ? 2 * totalPlayers * CARD_STAGGER : 0;

  return (
    <div className="poker-table-container">
      <div className="poker-table">
        <div className="poker-table__felt">
          <div className="poker-table__pot">
            {pot > 0 && (
              <span className="poker-table__pot-amount">pot {pot}bb</span>
            )}
          </div>
          <div className="poker-table__community">
            <CommunityCards
              cards={communityCards}
              animationState={animationState}
              baseDelay={communityBaseDelay}
            />
          </div>
        </div>

        {opponents.slice(0, oppCount).map((player, i) => {
          const dealOrder = i + 1;
          return (
            <div
              key={player.position}
              className="poker-table__seat"
              style={{
                top: positions[i].top,
                left: positions[i].left,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <PlayerSeat
                {...player}
                playerIndex={i + 1}
                animationState={animationState}
                dealDelay={dealOrder * CARD_STAGGER}
                dealDelay2={(totalPlayers + dealOrder) * CARD_STAGGER}
              />
            </div>
          );
        })}
      </div>

      {hero && (
        <div className="poker-table__hero-section">
          <PlayerSeat
            {...hero}
            playerIndex={0}
            animationState={animationState}
            dealDelay={0}
            dealDelay2={totalPlayers * CARD_STAGGER}
          />
        </div>
      )}
    </div>
  );
}
