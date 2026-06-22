import { calculateEquity } from './equity';
import type {
  ActionType,
  AdjudicationResult,
  GameState,
  MixedFrequency,
  SizingRange,
} from './types';

const MIXED_STRATEGY_THRESHOLD_BB = 0.5;

export interface AdjudicateOptions {
  iterations?: number;
  /** Beginner mode: never present a spot as mixed (PRD §5.1, level 1). */
  suppressMixed?: boolean;
}

/**
 * Adjudicate a game state: determine the mathematically correct action.
 *
 * Pipeline (PRD Section 4.1):
 * 1. Run equity simulation (hero vs villain range)
 * 2. Calculate pot odds
 * 3. Calculate SPR for commitment thresholds
 * 4. Apply fold equity for raise decisions
 * 5. Produce recommended action + EV breakdown
 * 6. Tag with concept labels
 */
export function adjudicate(
  state: GameState,
  options: AdjudicateOptions | number = {},
): AdjudicationResult {
  const opts: AdjudicateOptions =
    typeof options === 'number' ? { iterations: options } : options;
  const iterations = opts.iterations ?? 10000;

  const { heroHand, communityCards, pot, callSize, stackSize, villainRange } =
    state;

  const equity = calculateEquity(
    heroHand,
    villainRange,
    communityCards,
    iterations,
  );

  const potOdds = callSize > 0 ? callSize / (pot + callSize) : 0;
  const spr = pot > 0 ? stackSize / pot : Infinity;

  const evFold = 0;
  const evCall = computeCallEV(equity.heroEquity, pot, callSize);
  const evRaise = computeRaiseEV(equity.heroEquity, pot, callSize, stackSize, spr);

  const evByAction: Record<ActionType, number> = {
    fold: evFold,
    check: callSize === 0 ? evCall : 0,
    call: evCall,
    raise: evRaise,
  };

  const actions = rankActions(evByAction, callSize);
  const recommendedAction = actions[0].action;

  const isMixed = opts.suppressMixed ? false : checkMixed(actions);
  const mixedFrequencies = isMixed ? computeMixedFrequencies(actions) : undefined;

  const sizingRange = computeSizingRange(pot, callSize, stackSize, spr);
  const conceptTags = tagConcepts(state, equity.heroEquity, potOdds, spr, isMixed);

  return {
    recommendedAction,
    sizingRange,
    evByAction,
    isMixed,
    mixedFrequencies,
    conceptTags,
    heroEquity: equity.heroEquity,
  };
}

function computeCallEV(heroEquity: number, pot: number, callSize: number): number {
  // EV(call) = equity * (pot + callSize) - callSize.
  // The expected chips gained by calling and realizing equity at showdown.
  return heroEquity * (pot + callSize) - callSize;
}

function computeRaiseEV(
  heroEquity: number,
  pot: number,
  callSize: number,
  stackSize: number,
  spr: number,
): number {
  const raiseSize =
    callSize > 0 ? Math.min(callSize * 2.5, stackSize) : Math.min(pot * 0.7, stackSize);
  if (raiseSize <= 0) return 0;

  const foldEquity = estimateFoldEquity(raiseSize, pot, spr);

  // When villain continues, they do so with the *top* of their range — so hero
  // realizes less than raw equity. Approximate the continuing-range equity by
  // removing the folded fraction (hands hero beat ~70% of the time).
  const equityWhenCalled =
    foldEquity >= 1
      ? heroEquity
      : Math.max(0, Math.min(1, (heroEquity - foldEquity * 0.7) / (1 - foldEquity)));

  const evWhenCalled = equityWhenCalled * (pot + raiseSize * 2) - raiseSize;
  // Raising bloats the pot and invites re-raises; a small risk premium keeps the
  // model from preferring thin 3-bets over a clean, lower-variance call.
  const reraiseRisk = 0.12 * raiseSize * (1 - foldEquity);
  return foldEquity * pot + (1 - foldEquity) * evWhenCalled - reraiseRisk;
}

function estimateFoldEquity(raiseSize: number, pot: number, spr: number): number {
  const raiseToPot = pot > 0 ? raiseSize / pot : 0;

  // Larger raises (relative to pot) fold out more of villain's range.
  let foldPct = Math.min(0.45, raiseToPot * 0.18);

  // Low SPR → opponents are pot-committed and fold far less.
  if (spr < 2) foldPct *= 0.25;
  else if (spr < 4) foldPct *= 0.55;
  else if (spr < 8) foldPct *= 0.8;

  return Math.max(0, Math.min(0.75, foldPct));
}

interface RankedAction {
  action: ActionType;
  ev: number;
}

function rankActions(
  evByAction: Record<ActionType, number>,
  callSize: number,
): RankedAction[] {
  const candidates: RankedAction[] = [{ action: 'fold', ev: evByAction.fold }];
  if (callSize === 0) candidates.push({ action: 'check', ev: evByAction.check });
  else candidates.push({ action: 'call', ev: evByAction.call });
  candidates.push({ action: 'raise', ev: evByAction.raise });
  return candidates.sort((a, b) => b.ev - a.ev);
}

function checkMixed(actions: RankedAction[]): boolean {
  if (actions.length < 2) return false;
  // A spot is only "mixed" when both top actions are non-trivially +EV — folding
  // a clearly losing call isn't a mixed strategy, it's just a fold.
  if (actions[0].ev <= 0.1) return false;
  const diff = Math.abs(actions[0].ev - actions[1].ev);
  return diff <= MIXED_STRATEGY_THRESHOLD_BB;
}

function computeMixedFrequencies(actions: RankedAction[]): MixedFrequency[] {
  const top = actions[0];
  const second = actions[1];
  const diff = top.ev - second.ev;
  let topFreq = 0.5 + (diff / (MIXED_STRATEGY_THRESHOLD_BB * 2)) * 0.3;
  topFreq = Math.max(0.35, Math.min(0.65, topFreq));

  return [
    { action: top.action, frequency: Math.round(topFreq * 100) / 100 },
    { action: second.action, frequency: Math.round((1 - topFreq) * 100) / 100 },
  ];
}

function computeSizingRange(
  pot: number,
  callSize: number,
  stackSize: number,
  spr: number,
): SizingRange {
  if (spr <= 1) {
    return { min: stackSize, max: stackSize };
  }

  let optimalRaise: number;
  if (callSize > 0 && pot <= callSize * 3) {
    optimalRaise = callSize * 2.5; // preflop-like
  } else {
    optimalRaise = pot * 0.7; // postflop
  }
  optimalRaise = Math.min(optimalRaise, stackSize);

  const tolerance = 0.15; // PRD §4.3
  return {
    min: Math.max(callSize > 0 ? callSize * 2 : 1, optimalRaise * (1 - tolerance)),
    max: Math.min(stackSize, optimalRaise * (1 + tolerance)),
  };
}

function tagConcepts(
  state: GameState,
  heroEquity: number,
  potOdds: number,
  spr: number,
  isMixed: boolean,
): string[] {
  const tags: string[] = [];

  if (state.callSize > 0) tags.push('Pot Odds');
  tags.push('Equity');
  if (spr < 4) tags.push('SPR');

  if (state.street === 'preflop') {
    if (state.villainAction === '3bet') tags.push('4-Bet / 3-Bet Defense');
    else if (state.position === 'SB' || state.position === 'BB') tags.push('Blind Defense');
    else tags.push('Open / Iso');
  } else if (state.callSize === 0) {
    tags.push('C-Bet');
  } else {
    tags.push('Bet Defense');
  }

  if (state.callSize > 0 && heroEquity >= potOdds - 0.03 && heroEquity <= potOdds + 0.05) {
    tags.push('Marginal Call');
  }
  if (heroEquity > potOdds && state.callSize > 0 && spr > 4) {
    tags.push('Fold Equity');
  }
  if (isMixed) tags.push('Mixed Strategy');

  return tags;
}

/**
 * Check if a user's action is correct, applying sizing tolerance.
 * PRD Section 4.3 tolerance windows.
 */
export function checkUserAction(
  userAction: ActionType,
  userSizing: number | undefined,
  result: AdjudicationResult,
): { correct: boolean; reason: string } {
  if (result.isMixed && result.mixedFrequencies) {
    const acceptedActions = result.mixedFrequencies.map((mf) => mf.action);
    if (!acceptedActions.includes(userAction)) {
      return {
        correct: false,
        reason: `In this mixed spot, GTO plays ${acceptedActions.join(' / ')} — your ${userAction} is the lower-EV option here.`,
      };
    }
  } else if (userAction !== result.recommendedAction) {
    if (
      !(
        (userAction === 'check' && result.recommendedAction === 'call') ||
        (userAction === 'call' && result.recommendedAction === 'check')
      )
    ) {
      return {
        correct: false,
        reason: `The mathematically correct play is to ${result.recommendedAction}.`,
      };
    }
  }

  if (userAction === 'raise' && userSizing !== undefined) {
    const { min, max } = result.sizingRange;
    if (userSizing < min || userSizing > max) {
      return {
        correct: false,
        reason: `Right action, wrong size — the optimal raise is ${min.toFixed(1)}–${max.toFixed(1)}bb.`,
      };
    }
  }

  return { correct: true, reason: 'Correct — this maximizes EV.' };
}
