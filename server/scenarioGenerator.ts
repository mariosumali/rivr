import {
  buildDeck,
  type Card,
  type GameState,
  type Position,
  type Street,
} from '../src/engine/types';

const POSITIONS_6MAX: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const POSITIONS_9MAX: Position[] = ['UTG', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

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

/**
 * Generate preflop opening ranges per position (simplified).
 * Returns an array of hand combos that a villain might hold.
 */
function generateVillainRange(
  position: Position,
  deck: Card[],
  heroHand: [Card, Card],
  communityCards: Card[],
  count: number,
): [Card, Card][] {
  const dead = new Set<Card>([...heroHand, ...communityCards]);
  const available = deck.filter((c) => !dead.has(c));
  const range: [Card, Card][] = [];

  const shuffled = shuffle(available);
  for (let i = 0; i + 1 < shuffled.length && range.length < count; i += 2) {
    range.push([shuffled[i], shuffled[i + 1]]);
  }

  return range;
}

/**
 * PRD Section 5.1 — Adaptive Difficulty Table
 *
 * Level 1 (Beginner): Preflop only, deep stacks (100bb+), heads-up, clear-cut EV
 * Level 2 (Intermediate): Post-flop, 3-4 players, moderate SPR, standard boards
 * Level 3 (Advanced): Full streets, multi-way, complex textures, mixed spots
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
  const position = options.position || pick(positions);

  let street: Street;
  let activePlayers: number;
  let stackDepthBB: number;
  let communityCards: Card[];
  let pot: number;
  let callSize: number;
  const actionHistory: string[] = [];

  switch (difficulty) {
    case 1: {
      street = 'preflop';
      activePlayers = 2;
      stackDepthBB = randInt(100, 200);
      communityCards = [];
      pot = 3; // SB + BB + open
      callSize = pick([2, 3, 0]); // facing a raise, 3-bet, or no raise
      if (callSize > 0) {
        actionHistory.push('Villain raises');
      }
      break;
    }
    case 2: {
      const streetOptions: Street[] = options.street
        ? [options.street]
        : ['preflop', 'flop', 'turn'];
      street = pick(streetOptions);
      activePlayers = randInt(2, 4);
      stackDepthBB = randInt(60, 150);

      if (street === 'preflop') {
        communityCards = [];
        pot = randInt(4, 12);
        callSize = randInt(2, 6);
        actionHistory.push('Villain raises');
      } else if (street === 'flop') {
        communityCards = deal(3);
        pot = randInt(8, 25);
        callSize = pick([0, randInt(3, 12)]);
        actionHistory.push('Preflop: Villain calls');
        if (callSize > 0) actionHistory.push('Flop: Villain bets');
      } else {
        communityCards = deal(4);
        pot = randInt(15, 40);
        callSize = pick([0, randInt(5, 20)]);
        actionHistory.push('Preflop: Villain calls');
        actionHistory.push('Flop: Check-check');
        if (callSize > 0) actionHistory.push('Turn: Villain bets');
      }
      break;
    }
    case 3:
    default: {
      const streetOptions: Street[] = options.street
        ? [options.street]
        : ['preflop', 'flop', 'turn', 'river'];
      street = pick(streetOptions);
      activePlayers = randInt(2, 6);
      stackDepthBB = randInt(20, 200);

      if (street === 'preflop') {
        communityCards = [];
        pot = randInt(6, 20);
        callSize = randInt(3, 15);
        actionHistory.push('Villain 3-bets');
      } else if (street === 'flop') {
        communityCards = deal(3);
        pot = randInt(12, 50);
        callSize = pick([0, randInt(4, 25)]);
        actionHistory.push('Preflop: Villain raises, Hero calls');
        if (callSize > 0) actionHistory.push('Flop: Villain c-bets');
      } else if (street === 'turn') {
        communityCards = deal(4);
        pot = randInt(20, 80);
        callSize = pick([0, randInt(8, 40)]);
        actionHistory.push('Preflop: Villain raises, Hero calls');
        actionHistory.push('Flop: Check-check');
        if (callSize > 0) actionHistory.push('Turn: Villain bets');
      } else {
        communityCards = deal(5);
        pot = randInt(30, 120);
        callSize = pick([0, randInt(10, 60)]);
        actionHistory.push('Preflop: Villain raises, Hero calls');
        actionHistory.push('Flop: Villain bets, Hero calls');
        actionHistory.push('Turn: Check-check');
        if (callSize > 0) actionHistory.push('River: Villain bets');
      }
      break;
    }
  }

  const villainRange = generateVillainRange(
    position,
    buildDeck(),
    heroHand,
    communityCards,
    Math.max(20, activePlayers * 15),
  );

  return {
    heroHand,
    communityCards,
    pot,
    callSize,
    stackSize: stackDepthBB,
    villainRange,
    position,
    activePlayers,
    street,
    actionHistory,
    difficulty,
  };
}
