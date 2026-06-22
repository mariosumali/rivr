import { describe, it, expect } from 'vitest';
import {
  allHandClasses,
  comboCount,
  expandHandClass,
  parseRange,
  classifyOpen,
  rangeBreakdown,
  handClassOf,
  villainCombos,
  RFI_RANGES,
} from '../ranges';
import type { Card } from '../types';

describe('hand class grid', () => {
  it('enumerates exactly 169 classes', () => {
    const all = allHandClasses();
    expect(all.length).toBe(169);
    expect(new Set(all).size).toBe(169);
  });

  it('weights combos correctly (pairs=6, suited=4, offsuit=12 → 1326 total)', () => {
    const total = allHandClasses().reduce((s, hc) => s + comboCount(hc), 0);
    expect(total).toBe(1326);
  });

  it('labels concrete cards into the right class', () => {
    expect(handClassOf('Ah', 'Ks')).toBe('AKo');
    expect(handClassOf('Ah', 'Kh')).toBe('AKs');
    expect(handClassOf('As', 'Ah')).toBe('AA');
    expect(handClassOf('5d', '7d')).toBe('75s');
  });
});

describe('range parsing', () => {
  it('expands the "+" pair notation', () => {
    const r = parseRange(['TT+']);
    expect([...r].sort()).toEqual(['AA', 'JJ', 'KK', 'QQ', 'TT'].sort());
  });

  it('expands suited "+" notation up to one below the high card', () => {
    const r = parseRange(['ATs+']);
    expect([...r].sort()).toEqual(['AJs', 'AKs', 'AQs', 'ATs'].sort());
  });

  it('expands offsuit "+" notation', () => {
    const r = parseRange(['KTo+']);
    expect([...r].sort()).toEqual(['KJo', 'KQo', 'KTo'].sort());
  });
});

describe('combo expansion respects dead cards', () => {
  it('removes blocked combos', () => {
    const all = expandHandClass('AA', new Set<Card>());
    expect(all.length).toBe(6);
    const blocked = expandHandClass('AA', new Set<Card>(['As', 'Ah']));
    // Only the Ad/Ac pairing survives.
    expect(blocked.length).toBe(1);
  });
});

describe('opening classification', () => {
  it('UTG opens premiums, folds trash', () => {
    expect(classifyOpen('UTG', 'AA')).toBe('raise');
    expect(classifyOpen('UTG', '72o')).toBe('fold');
  });

  it('BTN is much wider than UTG', () => {
    const utg = rangeBreakdown('UTG').raise;
    const btn = rangeBreakdown('BTN').raise;
    expect(btn).toBeGreaterThan(utg);
    expect(btn).toBeGreaterThan(35);
    expect(utg).toBeLessThan(25);
  });

  it('BB has a defense range with calls and 3-bets', () => {
    const bd = rangeBreakdown('BB');
    expect(bd.call).toBeGreaterThan(0);
    expect(bd.raise).toBeGreaterThan(0);
  });
});

describe('villain combos', () => {
  it('produces real combos for an opener, never empty', () => {
    const dead = new Set<Card>(['As', 'Kd']);
    const combos = villainCombos('CO', 'rfi', dead);
    expect(combos.length).toBeGreaterThan(50);
    // No combo should use a dead card.
    for (const [a, b] of combos) {
      expect(dead.has(a)).toBe(false);
      expect(dead.has(b)).toBe(false);
    }
  });

  it('3-bet range is tighter than the opening range', () => {
    const dead = new Set<Card>();
    const open = villainCombos('CO', 'rfi', dead).length;
    const threeBet = villainCombos('CO', '3bet', dead).length;
    expect(threeBet).toBeLessThan(open);
  });

  it('every RFI position has a non-trivial range', () => {
    for (const pos of Object.keys(RFI_RANGES)) {
      expect(RFI_RANGES[pos].size).toBeGreaterThan(8);
    }
  });
});
