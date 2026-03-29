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

/**
 * Seat positions around the oval table.
 * Hero is always bottom-center; opponents clockwise from BTN.
 * Positions are percentages of the table container.
 */
const SEAT_POSITIONS: Record<number, { top: string; left: string }[]> = {
  2: [
    { top: '88%', left: '50%' }, // hero (bottom center)
    { top: '5%', left: '50%' },  // villain (top center)
  ],
  3: [
    { top: '88%', left: '50%' },
    { top: '20%', left: '18%' },
    { top: '20%', left: '82%' },
  ],
  4: [
    { top: '88%', left: '50%' },
    { top: '50%', left: '5%' },
    { top: '5%', left: '50%' },
    { top: '50%', left: '95%' },
  ],
  5: [
    { top: '88%', left: '50%' },
    { top: '65%', left: '5%' },
    { top: '15%', left: '18%' },
    { top: '15%', left: '82%' },
    { top: '65%', left: '95%' },
  ],
  6: [
    { top: '88%', left: '50%' },
    { top: '65%', left: '5%' },
    { top: '15%', left: '15%' },
    { top: '5%', left: '50%' },
    { top: '15%', left: '85%' },
    { top: '65%', left: '95%' },
  ],
};

export function PokerTable({
  players,
  communityCards,
  pot,
  animationState = 'idle',
}: PokerTableProps) {
  const count = Math.min(players.length, 6);
  const positions = SEAT_POSITIONS[count] || SEAT_POSITIONS[6];

  return (
    <div className="poker-table-container">
      <div className="poker-table">
        <div className="poker-table__felt">
          {/* Pot display */}
          <div className="poker-table__pot">
            {pot > 0 && (
              <>
                <span className="poker-table__pot-chip" />
                <span className="poker-table__pot-amount">Pot: {pot}bb</span>
              </>
            )}
          </div>

          {/* Community cards */}
          <div className="poker-table__community">
            <CommunityCards cards={communityCards} animationState={animationState} />
          </div>
        </div>

        {/* Player seats */}
        {players.slice(0, count).map((player, i) => (
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
              animationState={animationState}
              dealDelay={i * 0.08}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
