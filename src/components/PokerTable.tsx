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

// Opponent seat positions live in the TOP portion of the table; the pot + board
// occupy their own block lower-center, so cards never collide.
const OPPONENT_POSITIONS: Record<number, { top: string; left: string }[]> = {
  1: [{ top: '9%', left: '50%' }],
  2: [
    { top: '11%', left: '24%' },
    { top: '11%', left: '76%' },
  ],
  3: [
    { top: '34%', left: '9%' },
    { top: '9%', left: '50%' },
    { top: '34%', left: '91%' },
  ],
  4: [
    { top: '38%', left: '8%' },
    { top: '10%', left: '30%' },
    { top: '10%', left: '70%' },
    { top: '38%', left: '92%' },
  ],
  5: [
    { top: '40%', left: '8%' },
    { top: '11%', left: '25%' },
    { top: '8%', left: '50%' },
    { top: '11%', left: '75%' },
    { top: '40%', left: '92%' },
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
        <div className="poker-table__felt" />

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

        <div className="poker-table__center">
          {pot > 0 && (
            <div className="poker-table__pot">
              <span className="poker-table__pot-amount">Pot {pot}bb</span>
            </div>
          )}
          <div className="poker-table__community">
            <CommunityCards
              cards={communityCards}
              animationState={animationState}
              baseDelay={communityBaseDelay}
            />
          </div>
        </div>
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
