export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

/**
 * Card string format: rank + suit, e.g. "Ah" = Ace of hearts, "Ts" = Ten of spades.
 * This matches pokersolver's expected format.
 */
export type Card = `${Rank}${Suit}`;

export type Position = 'BTN' | 'CO' | 'HJ' | 'MP' | 'UTG' | 'SB' | 'BB';
export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionType = 'fold' | 'check' | 'call' | 'raise';

export interface EquityResult {
  heroEquity: number;
  villainEquity: number;
  ties: number;
}

export interface GameState {
  heroHand: [Card, Card];
  communityCards: Card[];
  pot: number;
  callSize: number;
  stackSize: number;
  villainRange: [Card, Card][];
  position: Position;
  activePlayers: number;
  street: Street;
}

export interface SizingRange {
  min: number;
  max: number;
}

export interface MixedFrequency {
  action: ActionType;
  frequency: number;
}

export interface AdjudicationResult {
  recommendedAction: ActionType;
  sizingRange: SizingRange;
  evByAction: Record<ActionType, number>;
  isMixed: boolean;
  mixedFrequencies?: MixedFrequency[];
  conceptTags: string[];
}

export interface EquityWorkerRequest {
  heroHand: [Card, Card];
  villainRange: [Card, Card][];
  communityCards: Card[];
  iterations: number;
}

export type EquityWorkerResponse =
  | { type: 'result'; data: EquityResult }
  | { type: 'error'; message: string };

export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS: Suit[] = ['h', 'd', 'c', 's'];

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push(`${r}${s}` as Card);
    }
  }
  return deck;
}
