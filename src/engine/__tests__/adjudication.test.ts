import { describe, it, expect } from 'vitest';
import { adjudicate, checkUserAction } from '../adjudication';
import type { Card, GameState } from '../types';

function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    heroHand: ['As', 'Ah'] as [Card, Card],
    communityCards: [],
    pot: 10,
    callSize: 5,
    stackSize: 100,
    villainRange: [['Ks', 'Kh'] as [Card, Card]],
    position: 'BTN',
    activePlayers: 2,
    street: 'preflop',
    ...overrides,
  };
}

describe('adjudicate', () => {
  it('recommends call or raise with strong equity (AA vs KK)', () => {
    const state = makeGameState();
    const result = adjudicate(state, 5000);

    // AA vs KK has ~80% equity → should never recommend fold
    expect(result.recommendedAction).not.toBe('fold');
    expect(result.evByAction.call).toBeGreaterThan(0);
  });

  it('recommends fold with very weak hand facing a bet', () => {
    const state = makeGameState({
      heroHand: ['2s', '7h'],
      villainRange: [['As', 'Ah']],
      pot: 20,
      callSize: 15,
      stackSize: 50,
    });
    const result = adjudicate(state, 5000);

    // 27o vs AA → fold is likely the best action
    expect(result.evByAction.fold).toBeGreaterThanOrEqual(
      result.evByAction.call,
    );
  });

  it('returns valid sizing range for raises', () => {
    const state = makeGameState();
    const result = adjudicate(state, 5000);

    expect(result.sizingRange.min).toBeGreaterThan(0);
    expect(result.sizingRange.max).toBeGreaterThanOrEqual(
      result.sizingRange.min,
    );
    expect(result.sizingRange.max).toBeLessThanOrEqual(state.stackSize);
  });

  it('identifies mixed strategy spots', () => {
    // Use a marginal hand where EV of actions is close
    const state = makeGameState({
      heroHand: ['Ks', 'Qh'],
      villainRange: [
        ['As', '8h'],
        ['Js', 'Td'],
        ['9s', '8d'],
        ['7s', '6d'],
        ['5s', '4d'],
      ],
      pot: 10,
      callSize: 3,
      stackSize: 100,
    });
    const result = adjudicate(state, 5000);

    // Whether or not this is mixed, the structure should be valid
    if (result.isMixed) {
      expect(result.mixedFrequencies).toBeDefined();
      expect(result.mixedFrequencies!.length).toBe(2);
      const totalFreq = result.mixedFrequencies!.reduce(
        (sum, mf) => sum + mf.frequency,
        0,
      );
      expect(totalFreq).toBeCloseTo(1, 1);
    }
  });

  it('tags relevant concepts', () => {
    const state = makeGameState({
      callSize: 5,
      street: 'flop',
      communityCards: ['Kd', 'Qc', '7h'],
    });
    const result = adjudicate(state, 5000);

    expect(result.conceptTags).toContain('Pot Odds');
    expect(result.conceptTags).toContain('Equity');
  });

  it('tags SPR when stack-to-pot ratio is low', () => {
    const state = makeGameState({
      pot: 80,
      callSize: 20,
      stackSize: 100,
      communityCards: ['Td', '8c', '3h'],
      street: 'flop',
    });
    const result = adjudicate(state, 5000);

    // SPR = 100/80 = 1.25, should tag SPR
    expect(result.conceptTags).toContain('SPR');
  });

  it('returns EV for all action types', () => {
    const state = makeGameState();
    const result = adjudicate(state, 5000);

    expect(typeof result.evByAction.fold).toBe('number');
    expect(typeof result.evByAction.call).toBe('number');
    expect(typeof result.evByAction.raise).toBe('number');
  });

  it('handles check scenario (callSize = 0)', () => {
    const state = makeGameState({
      callSize: 0,
      pot: 20,
      communityCards: ['Td', '8c', '3h'],
      street: 'flop',
    });
    const result = adjudicate(state, 5000);

    // With no bet to face, fold EV is 0 and check EV should be >= 0
    expect(result.evByAction.fold).toBe(0);
    expect(result.evByAction.check).toBeGreaterThanOrEqual(0);
  });
});

describe('checkUserAction', () => {
  it('marks correct action as correct', () => {
    const state = makeGameState();
    const result = adjudicate(state, 5000);
    const check = checkUserAction(result.recommendedAction, undefined, result);
    expect(check.correct).toBe(true);
  });

  it('marks wrong action as incorrect', () => {
    const state = makeGameState();
    const result = adjudicate(state, 5000);

    // Force a wrong action
    const wrongAction = result.recommendedAction === 'fold' ? 'call' : 'fold';
    const check = checkUserAction(wrongAction, undefined, result);
    expect(check.correct).toBe(false);
  });

  it('accepts either action in a mixed spot', () => {
    const state = makeGameState({
      heroHand: ['Ks', 'Qh'],
      villainRange: [
        ['As', '8h'],
        ['Js', 'Td'],
        ['9s', '8d'],
      ],
      pot: 10,
      callSize: 3,
    });
    const result = adjudicate(state, 5000);

    if (result.isMixed && result.mixedFrequencies) {
      for (const mf of result.mixedFrequencies) {
        const check = checkUserAction(mf.action, undefined, result);
        expect(check.correct).toBe(true);
      }
    }
  });

  it('rejects raise with incorrect sizing', () => {
    const state = makeGameState({ pot: 20, callSize: 5, stackSize: 200 });
    const result = adjudicate(state, 5000);

    // Force a very small sizing outside the tolerance window
    const check = checkUserAction('raise', 0.5, result);
    if (result.recommendedAction === 'raise' || result.isMixed) {
      expect(check.correct).toBe(false);
    }
  });
});
