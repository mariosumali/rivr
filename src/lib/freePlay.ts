import { buildDeck, type Card } from '../engine/types';
import { equityVsRandom, showdownWinner, handCategoryName } from '../engine/equity';

/**
 * Free Play — a bounded but genuinely playable heads-up hand vs one archetype
 * bot. Hero is the Button (posts SB, acts first preflop, in position postflop);
 * the bot is the Big Blind. Betting is capped to keep the tree shallow and the
 * engine provably terminating, while still feeling like a real hand to showdown.
 */

export type Archetype = 'TAG' | 'LAG' | 'LP' | 'Nit';
export type FPStreet = 'preflop' | 'flop' | 'turn' | 'river';
export type FPAction = 'fold' | 'check' | 'call' | 'bet' | 'raise';

export interface ArchetypeProfile {
  id: Archetype;
  name: string;
  tag: string;
  description: string;
}

export const ARCHETYPES: Record<Archetype, ArchetypeProfile> = {
  TAG: { id: 'TAG', name: 'The Reg', tag: 'TAG', description: 'Tight-aggressive. Value-bets strong, folds to pressure without a hand.' },
  LAG: { id: 'LAG', name: 'The Maniac', tag: 'LAG', description: 'Loose-aggressive. Bets and bluffs relentlessly — punish with patience.' },
  LP: { id: 'LP', name: 'The Station', tag: 'LP', description: 'Loose-passive. Calls everything, rarely raises. Bet your value thin.' },
  Nit: { id: 'Nit', name: 'The Rock', tag: 'Nit', description: 'Tight-passive. Only plays premiums. When it raises, believe it.' },
};

interface BotParams {
  callThreshold: number; // min strength to continue vs a bet
  betFreq: number; // how often it bets when checked to
  bluffRaiseFreq: number; // bluff-raise frequency
  valueRaiseStrength: number; // strength above which it raises for value
}

const PARAMS: Record<Archetype, BotParams> = {
  TAG: { callThreshold: 0.5, betFreq: 0.55, bluffRaiseFreq: 0.08, valueRaiseStrength: 0.82 },
  LAG: { callThreshold: 0.4, betFreq: 0.75, bluffRaiseFreq: 0.28, valueRaiseStrength: 0.78 },
  LP: { callThreshold: 0.3, betFreq: 0.22, bluffRaiseFreq: 0.0, valueRaiseStrength: 0.92 },
  Nit: { callThreshold: 0.6, betFreq: 0.32, bluffRaiseFreq: 0.0, valueRaiseStrength: 0.88 },
};

const START_STACK = 100;
const SB = 0.5;
const BB = 1;
const MAX_RAISES_PER_STREET = 3;
const SAFETY_ACTION_CAP = 60;

export interface LogEntry {
  who: 'hero' | 'villain' | 'dealer';
  text: string;
}

export interface FreePlayState {
  archetype: Archetype;
  heroHole: [Card, Card];
  villainHole: [Card, Card];
  fullBoard: Card[]; // 5 cards, revealed progressively
  street: FPStreet;
  pot: number;
  heroStack: number;
  villainStack: number;
  streetHero: number;
  streetVillain: number;
  actedHero: boolean;
  actedVillain: boolean;
  toAct: 'hero' | 'villain';
  raisesThisStreet: number;
  handOver: boolean;
  showdown: boolean;
  villainRevealed: boolean;
  winner?: 'hero' | 'villain' | 'split';
  heroStrength: number;
  log: LogEntry[];
  actionCount: number;
  finalNote?: string;
}

export function boardForStreet(fullBoard: Card[], street: FPStreet): Card[] {
  if (street === 'preflop') return [];
  if (street === 'flop') return fullBoard.slice(0, 3);
  if (street === 'turn') return fullBoard.slice(0, 4);
  return fullBoard.slice(0, 5);
}

function shuffle<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

export function newHand(archetype: Archetype): FreePlayState {
  const deck = shuffle(buildDeck());
  const heroHole: [Card, Card] = [deck[0], deck[1]];
  const villainHole: [Card, Card] = [deck[2], deck[3]];
  const fullBoard = deck.slice(4, 9);

  const state: FreePlayState = {
    archetype,
    heroHole,
    villainHole,
    fullBoard,
    street: 'preflop',
    pot: SB + BB,
    heroStack: START_STACK - SB,
    villainStack: START_STACK - BB,
    streetHero: SB,
    streetVillain: BB,
    actedHero: false,
    actedVillain: false,
    toAct: 'hero',
    raisesThisStreet: 0,
    handOver: false,
    showdown: false,
    villainRevealed: false,
    heroStrength: equityVsRandom(heroHole, [], 240),
    log: [{ who: 'dealer', text: `New hand vs ${ARCHETYPES[archetype].name} (${archetype}). You're on the button.` }],
    actionCount: 0,
  };

  // Bot may have already acted nothing preflop (hero acts first), so just return.
  return state;
}

export interface HeroOptions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canBet: boolean;
  canRaise: boolean;
  minBetTo: number;
  potForSizing: number;
}

export function heroOptions(state: FreePlayState): HeroOptions {
  if (state.handOver || state.toAct !== 'hero') {
    return {
      canFold: false, canCheck: false, canCall: false, callAmount: 0,
      canBet: false, canRaise: false, minBetTo: 0, potForSizing: state.pot,
    };
  }
  const gap = round2(state.streetVillain - state.streetHero);
  const facingBet = gap > 0;
  const canAct = state.heroStack > 0;
  const underRaiseCap = state.raisesThisStreet < MAX_RAISES_PER_STREET;
  return {
    canFold: facingBet,
    canCheck: !facingBet,
    canCall: facingBet && canAct,
    callAmount: Math.min(gap, state.heroStack),
    canBet: !facingBet && canAct,
    canRaise: facingBet && canAct && underRaiseCap,
    minBetTo: facingBet ? round2(state.streetVillain * 2) : Math.min(round2(BB), state.heroStack),
    potForSizing: state.pot,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Apply hero's action, then run the bot until it's hero's turn again or the hand ends. */
export function heroAct(state: FreePlayState, action: FPAction, betTo?: number): FreePlayState {
  if (state.handOver || state.toAct !== 'hero') return state;
  let next = applyAction(state, 'hero', action, betTo);
  next = runBot(next);
  return next;
}

/** Apply only the hero's action (the bot is then stepped separately, with delay). */
export function heroActStep(state: FreePlayState, action: FPAction, betTo?: number): FreePlayState {
  if (state.handOver || state.toAct !== 'hero') return state;
  return applyAction(state, 'hero', action, betTo);
}

/** Advance exactly one villain action — used to animate the bot's play. */
export function botStep(state: FreePlayState): FreePlayState {
  if (state.handOver || state.toAct !== 'villain') return state;
  return botMove(state);
}

function runBot(state: FreePlayState): FreePlayState {
  let s = state;
  let guard = 0;
  while (!s.handOver && s.toAct === 'villain' && guard < SAFETY_ACTION_CAP) {
    s = botMove(s);
    guard += 1;
  }
  if (guard >= SAFETY_ACTION_CAP && !s.handOver) s = forceShowdown(s);
  return s;
}

function botMove(state: FreePlayState): FreePlayState {
  const board = boardForStreet(state.fullBoard, state.street);
  const strength = equityVsRandom(state.villainHole, board, 200);
  const p = PARAMS[state.archetype];
  const gap = round2(state.streetHero - state.streetVillain); // amount villain must call
  const facingBet = gap > 0;

  if (facingBet) {
    const potOdds = gap / (state.pot + gap);
    const effThreshold = Math.max(p.callThreshold * 0.7, potOdds);
    // Value raise
    if (
      strength >= p.valueRaiseStrength &&
      state.raisesThisStreet < MAX_RAISES_PER_STREET &&
      state.villainStack > gap
    ) {
      const target = sizeBet(state, 'villain', 0.8, state.streetHero);
      return applyAction(state, 'villain', 'raise', target);
    }
    // Occasional bluff-raise
    if (
      Math.random() < p.bluffRaiseFreq &&
      strength < 0.45 &&
      state.raisesThisStreet < MAX_RAISES_PER_STREET &&
      state.villainStack > gap
    ) {
      const target = sizeBet(state, 'villain', 0.7, state.streetHero);
      return applyAction(state, 'villain', 'raise', target);
    }
    if (strength >= effThreshold) return applyAction(state, 'villain', 'call');
    return applyAction(state, 'villain', 'fold');
  }

  // No bet to face: bet or check. Build the bet on top of anything already in
  // this street (e.g. the BB's own blind preflop) so it's never a no-op.
  const betChance = p.betFreq * (0.5 + strength) + (Math.random() < p.bluffRaiseFreq ? 0.2 : 0);
  if (state.villainStack > 0 && Math.random() < Math.min(0.9, betChance)) {
    const frac = strength > 0.7 ? 0.7 : 0.5;
    const target = sizeBet(state, 'villain', frac, state.streetVillain);
    return applyAction(state, 'villain', 'bet', target);
  }
  return applyAction(state, 'villain', 'check');
}

/** Compute a bet/raise "to" target for a pot-fraction, clamped to stack. */
function sizeBet(
  state: FreePlayState,
  who: 'hero' | 'villain',
  potFraction: number,
  baseStreetContrib: number,
): number {
  const stack = who === 'hero' ? state.heroStack : state.villainStack;
  const myStreet = who === 'hero' ? state.streetHero : state.streetVillain;
  const raiseAmount = Math.max(BB, state.pot * potFraction);
  const target = baseStreetContrib + raiseAmount;
  const maxTarget = myStreet + stack;
  return round2(Math.min(target, maxTarget));
}

function applyAction(
  state: FreePlayState,
  who: 'hero' | 'villain',
  action: FPAction,
  betTo?: number,
): FreePlayState {
  const s: FreePlayState = {
    ...state,
    log: [...state.log],
    actionCount: state.actionCount + 1,
  };
  const isHero = who === 'hero';
  const myStreet = () => (isHero ? s.streetHero : s.streetVillain);
  const myStack = () => (isHero ? s.heroStack : s.villainStack);
  const setStreet = (v: number) => (isHero ? (s.streetHero = v) : (s.streetVillain = v));
  const setStack = (v: number) => (isHero ? (s.heroStack = v) : (s.villainStack = v));
  const oppStreet = () => (isHero ? s.streetVillain : s.streetHero);
  const label = isHero ? 'You' : ARCHETYPES[s.archetype].name;

  const commitTo = (target: number) => {
    const clampedTarget = Math.min(target, myStreet() + myStack());
    const add = round2(clampedTarget - myStreet());
    if (add > 0) {
      setStack(round2(myStack() - add));
      s.pot = round2(s.pot + add);
      setStreet(round2(myStreet() + add));
    }
  };

  if (action === 'fold') {
    s.handOver = true;
    s.winner = isHero ? 'villain' : 'hero';
    s.villainRevealed = false;
    s.log.push({ who, text: `${label} folds.` });
    if (isHero) s.villainStack = round2(s.villainStack + s.pot);
    else s.heroStack = round2(s.heroStack + s.pot);
    s.finalNote = isHero ? 'You folded.' : `${label} folded — you take it down.`;
    return s;
  }

  if (action === 'check') {
    if (isHero) s.actedHero = true;
    else s.actedVillain = true;
    s.log.push({ who, text: `${label} checks.` });
  } else if (action === 'call') {
    commitTo(oppStreet());
    if (isHero) s.actedHero = true;
    else s.actedVillain = true;
    s.log.push({ who, text: `${label} calls.` });
  } else if (action === 'bet' || action === 'raise') {
    const target = betTo ?? sizeBet(s, who, 0.6, action === 'raise' ? oppStreet() : 0);
    commitTo(Math.max(target, oppStreet() + (action === 'raise' ? BB : 0)));
    s.raisesThisStreet += 1;
    if (isHero) s.actedHero = true;
    else s.actedVillain = true;
    const verb = action === 'bet' ? 'bets' : 'raises to';
    s.log.push({ who, text: `${label} ${verb} ${myStreet()}bb.` });
  }

  return closeOrAdvance(s);
}

function closeOrAdvance(s: FreePlayState): FreePlayState {
  if (s.handOver) return s;
  const gap = round2(s.streetHero - s.streetVillain);
  const matched = Math.abs(gap) < 0.001;
  const bothActed = s.actedHero && s.actedVillain;
  const allIn = s.heroStack <= 0 || s.villainStack <= 0;

  if (matched && (bothActed || allIn)) {
    // Betting round closes.
    if (allIn && s.street !== 'river') return runoutToShowdown(s);
    if (s.street === 'river') return resolveShowdown(s);
    return advanceStreet(s);
  }

  // Action passes to the other player.
  s.toAct = s.toAct === 'hero' ? 'villain' : 'hero';
  return s;
}

function advanceStreet(s: FreePlayState): FreePlayState {
  const order: FPStreet[] = ['preflop', 'flop', 'turn', 'river'];
  const next = order[order.indexOf(s.street) + 1];
  s.street = next;
  s.streetHero = 0;
  s.streetVillain = 0;
  s.actedHero = false;
  s.actedVillain = false;
  s.raisesThisStreet = 0;
  s.toAct = 'villain'; // OOP (BB) acts first postflop
  const board = boardForStreet(s.fullBoard, next);
  s.heroStrength = equityVsRandom(s.heroHole, board, 240);
  s.log.push({ who: 'dealer', text: `${cap(next)}: ${board.slice(board.length - (next === 'flop' ? 3 : 1)).join(' ')}` });
  return s;
}

function runoutToShowdown(s: FreePlayState): FreePlayState {
  s.street = 'river';
  s.log.push({ who: 'dealer', text: 'All-in — running it out.' });
  return resolveShowdown(s);
}

function forceShowdown(s: FreePlayState): FreePlayState {
  return resolveShowdown({ ...s });
}

function resolveShowdown(s: FreePlayState): FreePlayState {
  const board = s.fullBoard;
  const winner = showdownWinner(s.heroHole, s.villainHole, board);
  s.winner = winner;
  s.handOver = true;
  s.showdown = true;
  s.villainRevealed = true;

  const heroName = handCategoryName([...s.heroHole, ...board]);
  const villName = handCategoryName([...s.villainHole, ...board]);

  if (winner === 'split') {
    const half = round2(s.pot / 2);
    s.heroStack = round2(s.heroStack + half);
    s.villainStack = round2(s.villainStack + (s.pot - half));
    s.finalNote = `Split pot — both ${heroName}.`;
  } else if (winner === 'hero') {
    s.heroStack = round2(s.heroStack + s.pot);
    s.finalNote = `You win with ${heroName} vs ${villName}.`;
  } else {
    s.villainStack = round2(s.villainStack + s.pot);
    s.finalNote = `${ARCHETYPES[s.archetype].name} wins with ${villName} vs your ${heroName}.`;
  }
  return s;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
