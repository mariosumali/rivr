import type { Card, Position, Rank, Suit } from './types';
import { SUITS } from './types';

/**
 * Preflop range engine.
 *
 * The whole premise of rivr is "mathematically correct" play. That only holds
 * if hero equity is computed against a *realistic* opponent range — not random
 * cards. This module is the single source of truth for those ranges, used by
 * both the scenario generator (to build villain combos) and the Range Trainer
 * (to grade the user's preflop classification).
 *
 * Ranges are 6-max, 100bb, GTO-derived approximations.
 */

/** Ranks ordered high → low — the canonical 13×13 grid axis order. */
export const GRID_RANKS: Rank[] = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

const RANK_INDEX: Record<string, number> = Object.fromEntries(
  GRID_RANKS.map((r, i) => [r, i]),
);

/** A hand class in shorthand: 'AA', 'AKs', 'AKo'. */
export type HandClass = string;
export type RangeTier = 'raise' | 'call' | 'fold';

/** All 169 hand classes in canonical grid (row-major) order. */
export function allHandClasses(): HandClass[] {
  const out: HandClass[] = [];
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      const hi = GRID_RANKS[i];
      const lo = GRID_RANKS[j];
      if (i === j) out.push(`${hi}${hi}`);
      else if (i < j) out.push(`${hi}${lo}s`);
      else out.push(`${lo}${hi}o`);
    }
  }
  return out;
}

/** Number of concrete combos a hand class represents (ignoring dead cards). */
export function comboCount(hc: HandClass): number {
  if (hc.length === 2) return 6; // pair
  return hc.endsWith('s') ? 4 : 12;
}

/** Expand a hand class into concrete card combos, skipping any using a dead card. */
export function expandHandClass(hc: HandClass, dead: Set<Card>): [Card, Card][] {
  const r1 = hc[0] as Rank;
  const r2 = hc[1] as Rank;
  const combos: [Card, Card][] = [];

  if (hc.length === 2) {
    // pair: all distinct suit pairings
    for (let a = 0; a < SUITS.length; a++) {
      for (let b = a + 1; b < SUITS.length; b++) {
        const c1 = `${r1}${SUITS[a]}` as Card;
        const c2 = `${r2}${SUITS[b]}` as Card;
        if (!dead.has(c1) && !dead.has(c2)) combos.push([c1, c2]);
      }
    }
  } else if (hc.endsWith('s')) {
    for (const s of SUITS) {
      const c1 = `${r1}${s}` as Card;
      const c2 = `${r2}${s}` as Card;
      if (!dead.has(c1) && !dead.has(c2)) combos.push([c1, c2]);
    }
  } else {
    for (const s1 of SUITS) {
      for (const s2 of SUITS) {
        if (s1 === s2) continue;
        const c1 = `${r1}${s1}` as Card;
        const c2 = `${r2}${s2}` as Card;
        if (!dead.has(c1) && !dead.has(c2)) combos.push([c1, c2]);
      }
    }
  }
  return combos;
}

/**
 * Parse a compact range token into hand classes.
 * Supports: 'AA', 'TT+', 'AKs', 'A2s+', 'KTo+', 'AKo'.
 */
function parseToken(token: string): HandClass[] {
  const plus = token.endsWith('+');
  const body = plus ? token.slice(0, -1) : token;

  // Pair, e.g. 'TT' or 'TT+'
  if (body.length === 2 && body[0] === body[1]) {
    const idx = RANK_INDEX[body[0]];
    if (!plus) return [body];
    const out: HandClass[] = [];
    for (let i = idx; i >= 0; i--) out.push(`${GRID_RANKS[i]}${GRID_RANKS[i]}`);
    return out;
  }

  // Suited / offsuit, e.g. 'A5s', 'KTo+'
  const hi = body[0];
  const lo = body[1];
  const kind = body[2]; // 's' | 'o'
  const hiIdx = RANK_INDEX[hi];
  const loIdx = RANK_INDEX[lo];
  if (!plus) return [body];

  // Vary the low card upward, keeping it strictly below the high card.
  const out: HandClass[] = [];
  for (let i = loIdx; i > hiIdx; i--) out.push(`${hi}${GRID_RANKS[i]}${kind}`);
  return out;
}

export function parseRange(tokens: string[]): Set<HandClass> {
  const set = new Set<HandClass>();
  for (const t of tokens) for (const hc of parseToken(t)) set.add(hc);
  return set;
}

// ── Open-raise-first-in (RFI) ranges, 6-max 100bb ──────────────────────────

export const RFI_RANGES: Record<string, Set<HandClass>> = {
  UTG: parseRange([
    '22+', 'ATs+', 'KTs+', 'QTs+', 'JTs', 'T9s', '98s', '87s', '76s', '65s',
    'AJo+', 'KQo',
  ]),
  HJ: parseRange([
    '22+', 'A9s+', 'A5s', 'A4s', 'KTs+', 'QTs+', 'J9s+', 'T9s', '98s', '87s',
    '76s', '65s', '54s', 'ATo+', 'KJo+', 'QJo',
  ]),
  CO: parseRange([
    '22+', 'A2s+', 'K9s+', 'Q9s+', 'J9s+', 'T8s+', '97s+', '86s+', '75s+',
    '65s', '54s', 'A9o+', 'KTo+', 'QTo+', 'JTo',
  ]),
  BTN: parseRange([
    '22+', 'A2s+', 'K6s+', 'Q8s+', 'J8s+', 'T7s+', '96s+', '85s+', '75s+',
    '64s+', '54s', '43s', 'A2o+', 'K8o+', 'Q9o+', 'J9o+', 'T9o', '98o', '87o',
  ]),
  SB: parseRange([
    '22+', 'A2s+', 'K7s+', 'Q8s+', 'J8s+', 'T8s+', '97s+', '86s+', '76s',
    '65s', '54s', 'A7o+', 'K9o+', 'QTo+', 'JTo',
  ]),
};

/** 3-bet (re-raise) ranges vs a single open — tighter, polarized value+bluffs. */
export const THREE_BET_RANGES: Record<string, Set<HandClass>> = {
  UTG: parseRange(['QQ+', 'AKs', 'AKo', 'A5s']),
  HJ: parseRange(['JJ+', 'AQs+', 'AKo', 'A5s', 'A4s', 'KJs']),
  CO: parseRange(['TT+', 'AJs+', 'AQo+', 'A5s', 'A4s', 'KQs', 'KJs']),
  BTN: parseRange(['99+', 'ATs+', 'AJo+', 'A5s', 'A4s', 'KJs+', 'QJs', 'JTs']),
  SB: parseRange(['99+', 'ATs+', 'AJo+', 'A5s', 'A4s', 'A3s', 'KJs+', 'QTs+']),
  BB: parseRange(['99+', 'ATs+', 'AJo+', 'A5s', 'A4s', 'KJs+', 'QJs', '76s']),
};

/** BB defense vs a button steal: a wide flat-call range plus a 3-bet mix. */
export const BB_DEFENSE = {
  raise: THREE_BET_RANGES.BB,
  call: parseRange([
    '22+', 'A2s+', 'K2s+', 'Q4s+', 'J6s+', 'T6s+', '95s+', '85s+', '74s+',
    '63s+', '53s+', '43s', 'A2o+', 'K7o+', 'Q8o+', 'J8o+', 'T8o+', '97o+',
    '87o', '76o', '65o',
  ]),
};

/**
 * Classify what a hero in `position` should do with `hc` when first to act
 * (opening decision). BB is treated as a defense-vs-steal drill.
 */
export function classifyOpen(position: Position, hc: HandClass): RangeTier {
  if (position === 'BB') {
    if (BB_DEFENSE.raise.has(hc)) return 'raise';
    if (BB_DEFENSE.call.has(hc)) return 'call';
    return 'fold';
  }
  const rfi = RFI_RANGES[position];
  if (rfi && rfi.has(hc)) return 'raise';
  return 'fold';
}

/** Tier breakdown (combo-weighted %) for a position, for legends/stats. */
export function rangeBreakdown(position: Position): Record<RangeTier, number> {
  const totals: Record<RangeTier, number> = { raise: 0, call: 0, fold: 0 };
  for (const hc of allHandClasses()) {
    totals[classifyOpen(position, hc)] += comboCount(hc);
  }
  const all = 1326;
  return {
    raise: Math.round((totals.raise / all) * 100),
    call: Math.round((totals.call / all) * 100),
    fold: Math.round((totals.fold / all) * 100),
  };
}

/** The hand class label for two concrete cards, e.g. ['Ah','Ks'] → 'AKo'. */
export function handClassOf(c1: Card, c2: Card): HandClass {
  const r1 = c1[0] as Rank;
  const r2 = c2[0] as Rank;
  const s1 = c1[1] as Suit;
  const s2 = c2[1] as Suit;
  if (r1 === r2) return `${r1}${r2}`;
  const hi = RANK_INDEX[r1] < RANK_INDEX[r2] ? r1 : r2;
  const lo = hi === r1 ? r2 : r1;
  return `${hi}${lo}${s1 === s2 ? 's' : 'o'}`;
}

export type VillainAction = 'rfi' | '3bet' | 'continue';

/**
 * Build concrete villain combos for an opponent in `villainPosition` given the
 * action that brought us here, excluding any dead cards (hero + board).
 */
export function villainCombos(
  villainPosition: Position,
  action: VillainAction,
  dead: Set<Card>,
): [Card, Card][] {
  let classes: Set<HandClass>;
  if (action === '3bet') {
    classes = THREE_BET_RANGES[villainPosition] ?? THREE_BET_RANGES.CO;
  } else if (action === 'continue') {
    // Postflop: opponent continues with a range roughly as wide as their open.
    classes = RFI_RANGES[villainPosition] ?? BB_DEFENSE.call;
  } else {
    classes =
      RFI_RANGES[villainPosition] ??
      new Set<HandClass>([...BB_DEFENSE.raise, ...BB_DEFENSE.call]);
  }

  const combos: [Card, Card][] = [];
  for (const hc of classes) combos.push(...expandHandClass(hc, dead));
  return combos;
}
