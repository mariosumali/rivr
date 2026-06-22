import {
  buildDeck,
  type Card,
  type GameState,
  type Position,
  type Street,
  type VillainAction,
} from '../src/engine/types';
import { villainCombos } from '../src/engine/ranges';

const POSITIONS_6MAX: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const POSITIONS_9MAX: Position[] = ['UTG', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

/** Earlier-position seats that could have open-raised into the hero. */
const ORDER_6MAX: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

interface GenerateOptions {
  difficulty: 1 | 2 | 3;
  street?: Street;
  position?: Position;
  tableSize?: 6 | 9;
}

interface Scenario extends GameState {
  actionHistory: string[];
  difficulty: number;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Position that acts before `pos` (could have opened into hero). */
function earlierThan(pos: Position): Position[] {
  const idx = ORDER_6MAX.indexOf(pos);
  return ORDER_6MAX.slice(0, Math.max(0, idx));
}

/** Position that acts after `pos` (could 3-bet hero's open). */
function laterThan(pos: Position): Position[] {
  const idx = ORDER_6MAX.indexOf(pos);
  return ORDER_6MAX.slice(idx + 1);
}

/**
 * PRD Section 5.1 — Adaptive Difficulty Table.
 * Level 1 (Beginner): preflop only, deep stacks (100bb+), heads-up, clear EV.
 * Level 2 (Intermediate): post-flop introduced, 3–4 players, moderate SPR.
 * Level 3 (Advanced): full streets, multi-way, complex textures, mixed spots.
 *
 * Crucially, the villain range is now derived from a real opening/3-bet/
 * continuing range for a specific seat — never random cards — so the equity
 * (and therefore the "correct" answer) is mathematically meaningful.
 */
export function generateScenario(options: GenerateOptions): Scenario {
  const { difficulty, tableSize = 6 } = options;
  const positions = tableSize === 6 ? POSITIONS_6MAX : POSITIONS_9MAX;

  const deck = shuffle(buildDeck());
  let idx = 0;
  const deal = (n: number): Card[] => {
    const cards = deck.slice(idx, idx + n);
    idx += n;
    return cards;
  };

  const heroHand = deal(2) as [Card, Card];

  // Pick a street appropriate to difficulty.
  let street: Street;
  if (options.street) {
    street = options.street;
  } else if (difficulty === 1) {
    street = 'preflop';
  } else if (difficulty === 2) {
    street = pick<Street>(['preflop', 'flop', 'turn']);
  } else {
    street = pick<Street>(['preflop', 'flop', 'turn', 'river']);
  }

  // Hero position: when defending preflop hero needs someone to act before
  // them, so bias toward later seats on the preflop-defense path.
  let position: Position;
  if (options.position) {
    position = options.position;
  } else if (street === 'preflop') {
    position = pick(['CO', 'BTN', 'SB', 'BB'] as Position[]);
  } else {
    position = pick(positions);
  }

  const stackSize =
    difficulty === 1 ? randInt(100, 200) : difficulty === 2 ? randInt(60, 150) : randInt(25, 200);

  const activePlayers =
    difficulty === 1 ? 2 : difficulty === 2 ? randInt(2, 4) : randInt(2, 6);

  const actionHistory: string[] = [];
  let villainPosition: Position;
  let villainAction: VillainAction;
  let communityCards: Card[] = [];
  let pot: number;
  let callSize: number;

  if (street === 'preflop') {
    // Either hero faces an open (defend) or hero opened and faces a 3-bet.
    const earlier = earlierThan(position);
    const later = laterThan(position).filter((p) => p !== 'BB' || position === 'SB');
    const canFaceOpen = earlier.length > 0;
    const canFace3Bet = later.length > 0 && difficulty >= 2;

    const facing3bet = canFace3Bet && !canFaceOpen ? true : canFace3Bet && Math.random() < 0.4;

    if (facing3bet && canFace3Bet) {
      villainPosition = pick(later);
      villainAction = '3bet';
      const open = 2.5;
      const threeBet = villainPosition === 'BB' || villainPosition === 'SB' ? 11 : 8;
      pot = Math.round((1.5 + open + threeBet) * 10) / 10;
      callSize = Math.round((threeBet - open) * 10) / 10;
      actionHistory.push(`Hero opens ${open}bb`, `${villainPosition} 3-bets to ${threeBet}bb`);
    } else {
      villainPosition = canFaceOpen ? pick(earlier) : 'BTN';
      villainAction = 'rfi';
      const open = difficulty === 3 ? pick([2.2, 2.5, 3]) : 2.5;
      pot = Math.round((1.5 + open) * 10) / 10;
      // Hero in the blinds already has money in; outside the blinds calls the full open.
      callSize = position === 'BB' ? Math.round((open - 1) * 10) / 10 : open;
      actionHistory.push(`${villainPosition} opens ${open}bb`);
    }
  } else {
    // Postflop: a single villain (the preflop aggressor) continues.
    const candidates = positions.filter((p) => p !== position);
    villainPosition = pick(candidates);
    villainAction = 'continue';

    const boardSize = street === 'flop' ? 3 : street === 'turn' ? 4 : 5;
    communityCards = deal(boardSize);

    const basePot =
      street === 'flop' ? randInt(8, 28) : street === 'turn' ? randInt(20, 60) : randInt(35, 110);
    pot = basePot;

    // Villain either bets (hero faces a decision) or checks to hero.
    const villainBets = Math.random() < 0.6;
    callSize = villainBets ? Math.round(basePot * pick([0.33, 0.5, 0.66, 0.75]) * 10) / 10 : 0;

    const aggressorLine = `Preflop: ${villainPosition} raises, Hero calls`;
    actionHistory.push(aggressorLine);
    if (street === 'turn') actionHistory.push('Flop: checked through');
    if (street === 'river') actionHistory.push('Flop: bet-call', 'Turn: checked through');
    if (callSize > 0) {
      const label = street === 'flop' ? 'c-bets' : 'bets';
      actionHistory.push(`${capitalize(street)}: ${villainPosition} ${label} ${callSize}bb`);
    } else {
      actionHistory.push(`${capitalize(street)}: ${villainPosition} checks`);
    }
  }

  const dead = new Set<Card>([...heroHand, ...communityCards]);
  let range = villainCombos(villainPosition, villainAction, dead);
  if (range.length === 0) {
    // Defensive fallback — should not happen with real ranges, but never crash.
    range = villainCombos('BTN', 'rfi', dead);
  }

  return {
    heroHand,
    communityCards,
    pot,
    callSize,
    stackSize,
    villainRange: range,
    position,
    activePlayers,
    street,
    villainPosition,
    villainAction,
    actionHistory,
    difficulty,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
