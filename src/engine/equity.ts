import type { Card, EquityResult } from './types';
import { buildDeck } from './types';

// Inline hand evaluation for the Web Worker context (no pokersolver dependency).
// Uses a fast numeric scoring approach: each hand gets a 32-bit score where
// higher = better. This avoids importing pokersolver into the worker.

const RANK_ORDER = '23456789TJQKA';

function cardRank(card: Card): number {
  return RANK_ORDER.indexOf(card[0]);
}

function cardSuit(card: Card): string {
  return card[1];
}

/**
 * Score a 5-card hand as a comparable integer.
 * Format: category (4 bits) << 20 | kickers (5 x 4 bits)
 */
function score5(cards: Card[]): number {
  const ranks = cards.map(cardRank).sort((a, b) => b - a);
  const suits = cards.map(cardSuit);
  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight
  let isStraight = false;
  let straightHigh = ranks[0];
  if (
    ranks[0] - ranks[4] === 4 &&
    new Set(ranks).size === 5
  ) {
    isStraight = true;
  }
  // Wheel: A-2-3-4-5
  if (
    ranks[0] === 12 &&
    ranks[1] === 3 &&
    ranks[2] === 2 &&
    ranks[3] === 1 &&
    ranks[4] === 0
  ) {
    isStraight = true;
    straightHigh = 3; // 5-high straight
  }

  // Count rank frequencies
  const freq = new Map<number, number>();
  for (const r of ranks) {
    freq.set(r, (freq.get(r) || 0) + 1);
  }
  const groups = [...freq.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );
  const pattern = groups.map((g) => g[1]).join('');

  let category: number;
  let kickers: number[];

  if (isStraight && isFlush) {
    category = 8; // Straight flush
    kickers = [straightHigh];
  } else if (pattern === '41') {
    category = 7; // Four of a kind
    kickers = groups.map((g) => g[0]);
  } else if (pattern === '32') {
    category = 6; // Full house
    kickers = groups.map((g) => g[0]);
  } else if (isFlush) {
    category = 5;
    kickers = ranks;
  } else if (isStraight) {
    category = 4;
    kickers = [straightHigh];
  } else if (pattern === '311') {
    category = 3; // Three of a kind
    kickers = groups.map((g) => g[0]);
  } else if (pattern === '221') {
    category = 2; // Two pair
    kickers = groups.map((g) => g[0]);
  } else if (pattern === '2111') {
    category = 1; // One pair
    kickers = groups.map((g) => g[0]);
  } else {
    category = 0; // High card
    kickers = ranks;
  }

  let score = category << 20;
  for (let i = 0; i < kickers.length && i < 5; i++) {
    score |= kickers[i] << (4 * (4 - i));
  }
  return score;
}

/**
 * Find the best 5-card hand from 5-7 cards.
 */
function bestHandScore(cards: Card[]): number {
  if (cards.length === 5) return score5(cards);

  let best = 0;
  const combos = combinations(cards, 5);
  for (const combo of combos) {
    const s = score5(combo);
    if (s > best) best = s;
  }
  return best;
}

function combinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  const combo: T[] = [];

  function recurse(start: number) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      recurse(i + 1);
      combo.pop();
    }
  }

  recurse(0);
  return result;
}

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Run a Monte Carlo equity simulation.
 *
 * @param heroHand - Hero's two hole cards
 * @param villainRange - Array of possible villain hands (each is 2 cards)
 * @param communityCards - Known community cards (0-5)
 * @param iterations - Number of simulations (default 10000)
 */
export function calculateEquity(
  heroHand: [Card, Card],
  villainRange: [Card, Card][],
  communityCards: Card[] = [],
  iterations: number = 10000,
): EquityResult {
  if (villainRange.length === 0) {
    throw new Error('Villain range must contain at least one hand');
  }

  const deadCards = new Set<Card>([...heroHand, ...communityCards]);

  // Filter out villain hands that conflict with known cards
  const validVillainHands = villainRange.filter(
    (hand) => !deadCards.has(hand[0]) && !deadCards.has(hand[1]),
  );

  if (validVillainHands.length === 0) {
    throw new Error('No valid villain hands after removing dead cards');
  }

  const cardsToRunOut = 5 - communityCards.length;
  let heroWins = 0;
  let villainWins = 0;
  let ties = 0;

  for (let i = 0; i < iterations; i++) {
    // Pick a random villain hand
    const villainHand =
      validVillainHands[Math.floor(Math.random() * validVillainHands.length)];

    // Build remaining deck
    const usedCards = new Set<Card>([
      ...heroHand,
      ...communityCards,
      ...villainHand,
    ]);
    const remainingDeck = buildDeck().filter((c) => !usedCards.has(c));

    // Deal the remaining community cards
    shuffleArray(remainingDeck);
    const runout = remainingDeck.slice(0, cardsToRunOut);
    const board = [...communityCards, ...runout];

    // Evaluate
    const heroScore = bestHandScore([...heroHand, ...board]);
    const villainScore = bestHandScore([...villainHand, ...board]);

    if (heroScore > villainScore) heroWins++;
    else if (villainScore > heroScore) villainWins++;
    else ties++;
  }

  return {
    heroEquity: heroWins / iterations,
    villainEquity: villainWins / iterations,
    ties: ties / iterations,
  };
}

/**
 * Estimate a hand's strength as equity vs a single uniformly random hand.
 * Client-safe (no pokersolver) — used by the Free Play bot and hero gauge.
 */
export function equityVsRandom(
  hole: [Card, Card],
  board: Card[] = [],
  iterations: number = 300,
): number {
  const dead = new Set<Card>([...hole, ...board]);
  const need = 5 - board.length;
  let score = 0;
  for (let i = 0; i < iterations; i++) {
    const deck = buildDeck().filter((c) => !dead.has(c));
    shuffleArray(deck);
    const villain = [deck[0], deck[1]];
    const runout = deck.slice(2, 2 + need);
    const full = [...board, ...runout];
    const hs = bestHandScore([...hole, ...full]);
    const vs = bestHandScore([...villain, ...full]);
    if (hs > vs) score += 1;
    else if (hs === vs) score += 0.5;
  }
  return score / iterations;
}

/** Decide a showdown between two made hands on a complete (5-card) board. */
export function showdownWinner(
  heroHole: [Card, Card],
  villainHole: [Card, Card],
  board: Card[],
): 'hero' | 'villain' | 'split' {
  const hs = bestHandScore([...heroHole, ...board]);
  const vs = bestHandScore([...villainHole, ...board]);
  if (hs > vs) return 'hero';
  if (vs > hs) return 'villain';
  return 'split';
}

/** Human-readable category name for a 5–7 card hand (client-safe). */
export function handCategoryName(cards: Card[]): string {
  const score = bestHandScore(cards);
  const category = score >> 20;
  return HAND_CATEGORY_NAMES[category] ?? 'High Card';
}

const HAND_CATEGORY_NAMES: Record<number, string> = {
  0: 'High Card',
  1: 'Pair',
  2: 'Two Pair',
  3: 'Three of a Kind',
  4: 'Straight',
  5: 'Flush',
  6: 'Full House',
  7: 'Four of a Kind',
  8: 'Straight Flush',
};
