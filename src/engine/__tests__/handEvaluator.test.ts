import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands, findWinners } from '../handEvaluator';
import type { Card } from '../types';

describe('evaluateHand', () => {
  it('identifies a royal flush', () => {
    const cards: Card[] = ['Ah', 'Kh', 'Qh', 'Jh', 'Th'];
    const result = evaluateHand(cards);
    expect(result.name).toBe('Straight Flush');
    expect(result.rank).toBeGreaterThanOrEqual(8);
  });

  it('identifies four of a kind', () => {
    const cards: Card[] = ['As', 'Ah', 'Ad', 'Ac', 'Kh'];
    const result = evaluateHand(cards);
    expect(result.name).toBe('Four of a Kind');
  });

  it('identifies a full house', () => {
    const cards: Card[] = ['Ks', 'Kh', 'Kd', '3c', '3h'];
    const result = evaluateHand(cards);
    expect(result.name).toBe('Full House');
  });

  it('identifies a flush', () => {
    const cards: Card[] = ['Ah', '9h', '7h', '4h', '2h'];
    const result = evaluateHand(cards);
    expect(result.name).toBe('Flush');
  });

  it('identifies a straight', () => {
    const cards: Card[] = ['9h', '8d', '7c', '6s', '5h'];
    const result = evaluateHand(cards);
    expect(result.name).toBe('Straight');
  });

  it('identifies three of a kind', () => {
    const cards: Card[] = ['Qs', 'Qh', 'Qd', '7c', '2h'];
    const result = evaluateHand(cards);
    expect(result.name).toBe('Three of a Kind');
  });

  it('identifies two pair', () => {
    const cards: Card[] = ['Ks', 'Kh', '9d', '9c', '2h'];
    const result = evaluateHand(cards);
    expect(result.name).toBe('Two Pair');
  });

  it('identifies one pair', () => {
    const cards: Card[] = ['Js', 'Jh', '8d', '5c', '2h'];
    const result = evaluateHand(cards);
    expect(result.name).toBe('Pair');
  });

  it('identifies high card', () => {
    const cards: Card[] = ['Ah', 'Kd', '9c', '7s', '2h'];
    const result = evaluateHand(cards);
    expect(result.name).toBe('High Card');
  });

  it('evaluates 7-card hands (picks best 5)', () => {
    const cards: Card[] = ['Ah', 'Kh', 'Qh', 'Jh', 'Th', '3c', '2d'];
    const result = evaluateHand(cards);
    expect(result.name).toBe('Straight Flush');
  });

  it('throws on fewer than 5 cards', () => {
    expect(() => evaluateHand(['Ah', 'Kh', 'Qh', 'Jh'] as Card[])).toThrow();
  });
});

describe('compareHands', () => {
  it('flush beats straight', () => {
    const flush: Card[] = ['Ah', '9h', '7h', '4h', '2h'];
    const straight: Card[] = ['9h', '8d', '7c', '6s', '5h'];
    expect(compareHands(flush, straight)).toBe(1);
  });

  it('higher pair beats lower pair', () => {
    const aces: Card[] = ['As', 'Ah', '9d', '7c', '2h'];
    const kings: Card[] = ['Ks', 'Kh', '9c', '7s', '2d'];
    expect(compareHands(aces, kings)).toBe(1);
  });

  it('identical hands tie', () => {
    const handA: Card[] = ['As', 'Kd', '9c', '7h', '2s'];
    const handB: Card[] = ['Ah', 'Kc', '9h', '7d', '2c'];
    expect(compareHands(handA, handB)).toBe(0);
  });
});

describe('findWinners', () => {
  it('finds the winning player', () => {
    const hands: [Card, Card][] = [
      ['As', 'Ah'],
      ['Ks', 'Kh'],
    ];
    const board: Card[] = ['Qd', 'Jc', '7h', '3s', '2d'];
    const winners = findWinners(hands, board);
    expect(winners).toEqual([0]);
  });

  it('detects a tie', () => {
    const hands: [Card, Card][] = [
      ['2s', '3s'],
      ['2h', '3h'],
    ];
    // Board makes the best hand for both players (board plays)
    const board: Card[] = ['Ah', 'Kd', 'Qc', 'Jh', 'Td'];
    const winners = findWinners(hands, board);
    expect(winners).toEqual([0, 1]);
  });

  it('throws with fewer than 3 community cards', () => {
    expect(() =>
      findWinners([['As', 'Ah']], ['Kd', 'Qc'] as Card[]),
    ).toThrow();
  });
});
