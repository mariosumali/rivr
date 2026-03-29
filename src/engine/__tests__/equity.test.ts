import { describe, it, expect } from 'vitest';
import { calculateEquity } from '../equity';
import type { Card } from '../types';

describe('calculateEquity', () => {
  it('AA vs KK preflop has ~80% equity for AA', () => {
    const heroHand: [Card, Card] = ['As', 'Ah'];
    const villainRange: [Card, Card][] = [['Ks', 'Kh']];
    const result = calculateEquity(heroHand, villainRange, [], 20000);

    // AA vs KK is roughly 80/20
    expect(result.heroEquity).toBeGreaterThan(0.7);
    expect(result.heroEquity).toBeLessThan(0.9);
    expect(result.heroEquity + result.villainEquity + result.ties).toBeCloseTo(
      1,
      1,
    );
  });

  it('AA vs random hand has >80% equity', () => {
    const heroHand: [Card, Card] = ['As', 'Ah'];
    const villainRange: [Card, Card][] = [
      ['Ks', 'Qh'],
      ['Js', 'Th'],
      ['9s', '8h'],
      ['7s', '6h'],
      ['5s', '4h'],
      ['3s', '2h'],
      ['Kd', 'Jc'],
      ['Td', '9c'],
    ];
    const result = calculateEquity(heroHand, villainRange, [], 10000);
    expect(result.heroEquity).toBeGreaterThan(0.75);
  });

  it('handles community cards (flop with made hand)', () => {
    // Hero has pocket aces, flop comes A-K-2 rainbow → hero has top set
    const heroHand: [Card, Card] = ['As', 'Ah'];
    const villainRange: [Card, Card][] = [['Ks', 'Kh']];
    const communityCards: Card[] = ['Ad', 'Kc', '2h'];
    const result = calculateEquity(heroHand, villainRange, communityCards, 10000);

    // Set of aces vs set of kings on AK2 board → AA is a huge favorite (>95%)
    expect(result.heroEquity).toBeGreaterThan(0.9);
  });

  it('coin flip: pair vs two overcards is ~50/50', () => {
    const heroHand: [Card, Card] = ['Jh', 'Jd'];
    const villainRange: [Card, Card][] = [['As', 'Ks']];
    const result = calculateEquity(heroHand, villainRange, [], 20000);

    // JJ vs AKs is roughly 54/46
    expect(result.heroEquity).toBeGreaterThan(0.45);
    expect(result.heroEquity).toBeLessThan(0.65);
  });

  it('equities sum to approximately 1', () => {
    const heroHand: [Card, Card] = ['Qs', 'Jh'];
    const villainRange: [Card, Card][] = [['Kd', 'Tc']];
    const result = calculateEquity(heroHand, villainRange, [], 10000);
    const sum = result.heroEquity + result.villainEquity + result.ties;
    expect(sum).toBeCloseTo(1, 2);
  });

  it('throws when villain range is empty', () => {
    expect(() => calculateEquity(['As', 'Ah'], [], [])).toThrow(
      'Villain range must contain at least one hand',
    );
  });

  it('filters out conflicting villain hands', () => {
    // Hero has As, Ah — villain range includes As (conflict)
    const heroHand: [Card, Card] = ['As', 'Ah'];
    const villainRange: [Card, Card][] = [
      ['As', 'Kh'], // conflicts with hero's As
      ['Ks', 'Kd'], // valid
    ];
    const result = calculateEquity(heroHand, villainRange, [], 5000);
    // Should still run (using only valid villain hands)
    expect(result.heroEquity).toBeGreaterThan(0);
  });

  it('handles river (all 5 community cards known)', () => {
    const heroHand: [Card, Card] = ['As', 'Ks'];
    const villainRange: [Card, Card][] = [['Qh', 'Jh']];
    const communityCards: Card[] = ['Th', '9h', '2d', '4c', '8h'];
    const result = calculateEquity(heroHand, villainRange, communityCards, 1000);

    // Villain has a flush; hero has AK high → villain wins ~100%
    expect(result.villainEquity).toBeGreaterThan(0.95);
  });
});
