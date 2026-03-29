import type { Card } from './types';

// pokersolver uses CJS exports; import the Hand class
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Hand } = require('pokersolver') as {
  Hand: {
    solve(cards: string[], game?: string): PokersolverHand;
    winners(hands: PokersolverHand[]): PokersolverHand[];
  };
};

interface PokersolverHand {
  rank: number;
  name: string;
  descr: string;
  cards: { value: string; suit: string }[];
  loseTo(other: PokersolverHand): boolean | PokersolverHand;
}

export interface HandEvaluation {
  rank: number;
  name: string;
  description: string;
}

/**
 * Evaluate a 5-7 card hand and return a numeric strength score.
 * Higher rank = stronger hand. The rank value comes from pokersolver's
 * internal ranking (1 = high card up to 9 = straight flush).
 *
 * For finer comparison between hands of the same category, use compareHands.
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`Hand must be 5-7 cards, got ${cards.length}`);
  }
  const solved = Hand.solve(cards);
  return {
    rank: solved.rank,
    name: solved.name,
    description: solved.descr,
  };
}

/**
 * Compare two hands. Returns:
 *  1 if handA wins
 * -1 if handB wins
 *  0 if tie
 */
export function compareHands(handA: Card[], handB: Card[]): 1 | -1 | 0 {
  const solvedA = Hand.solve(handA);
  const solvedB = Hand.solve(handB);

  const winners = Hand.winners([solvedA, solvedB]);

  if (winners.length === 2) return 0;
  if (winners[0] === solvedA) return 1;
  return -1;
}

/**
 * Given multiple players' hole cards and community cards,
 * determine the winner(s). Returns indices of winning players.
 */
export function findWinners(
  playerHands: [Card, Card][],
  communityCards: Card[],
): number[] {
  if (communityCards.length < 3) {
    throw new Error('Need at least 3 community cards for evaluation');
  }

  const solved = playerHands.map((hand) =>
    Hand.solve([...hand, ...communityCards]),
  );

  const winners = Hand.winners(solved);
  return solved
    .map((s, i) => (winners.includes(s) ? i : -1))
    .filter((i) => i !== -1);
}
