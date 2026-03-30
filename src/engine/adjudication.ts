import { calculateEquity } from './equity';
import type {
  ActionType,
  AdjudicationResult,
  GameState,
  MixedFrequency,
  SizingRange,
} from './types';

const MIXED_STRATEGY_THRESHOLD_BB = 0.5;

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
  iterations: number = 10000,
): AdjudicationResult {
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
  const evRaise = computeRaiseEV(
    equity.heroEquity,
    pot,
    callSize,
    stackSize,
    spr,
  );

  const evByAction: Record<ActionType, number> = {
    fold: evFold,
    check: callSize === 0 ? evCall : 0,
    call: evCall,
    raise: evRaise,
  };

  const actions = rankActions(evByAction, callSize);
  const recommendedAction = actions[0].action;

  const isMixed = checkMixed(actions);
  const mixedFrequencies = isMixed
    ? computeMixedFrequencies(actions)
    : undefined;

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

function computeCallEV(
  heroEquity: number,
  pot: number,
  callSize: number,
): number {
  // EV(call) = equity * (pot + callSize) - callSize
  // This is the expected profit/loss from calling
  return heroEquity * (pot + callSize) - callSize;
}

function computeRaiseEV(
  heroEquity: number,
  pot: number,
  callSize: number,
  stackSize: number,
  spr: number,
): number {
  // Standard raise size: 2.5x the call size for preflop, ~70% pot postflop
  const raiseSize = callSize > 0 ? Math.min(callSize * 2.5, stackSize) : pot * 0.7;
  if (raiseSize <= 0) return 0;

  // Estimate fold equity based on SPR and raise size
  const foldEquity = estimateFoldEquity(raiseSize, pot, spr);

  // EV(raise) = fold% * pot + (1 - fold%) * (equity * (pot + raiseSize + callSize) - raiseSize)
  const evWhenCalled =
    heroEquity * (pot + raiseSize * 2) - raiseSize;

  return foldEquity * pot + (1 - foldEquity) * evWhenCalled;
}

function estimateFoldEquity(
  raiseSize: number,
  pot: number,
  spr: number,
): number {
  // Larger raises relative to pot generate more fold equity
  const raiseToPot = pot > 0 ? raiseSize / pot : 0;

  // Base fold equity from raise sizing (larger = more folds)
  let foldPct = Math.min(0.6, raiseToPot * 0.25);

  // Low SPR reduces fold equity (opponents are committed)
  if (spr < 2) foldPct *= 0.3;
  else if (spr < 4) foldPct *= 0.6;
  else if (spr < 8) foldPct *= 0.85;

  return Math.max(0, Math.min(0.8, foldPct));
}

interface RankedAction {
  action: ActionType;
  ev: number;
}

function rankActions(
  evByAction: Record<ActionType, number>,
  callSize: number,
): RankedAction[] {
  const candidates: RankedAction[] = [];

  candidates.push({ action: 'fold', ev: evByAction.fold });

  if (callSize === 0) {
    candidates.push({ action: 'check', ev: evByAction.check });
  } else {
    candidates.push({ action: 'call', ev: evByAction.call });
  }

  candidates.push({ action: 'raise', ev: evByAction.raise });

  return candidates.sort((a, b) => b.ev - a.ev);
}

function checkMixed(actions: RankedAction[]): boolean {
  if (actions.length < 2) return false;
  const diff = Math.abs(actions[0].ev - actions[1].ev);
  return diff <= MIXED_STRATEGY_THRESHOLD_BB;
}

function computeMixedFrequencies(
  actions: RankedAction[],
): MixedFrequency[] {
  // When two actions are close in EV, assign frequencies proportional to EV advantage
  const top = actions[0];
  const second = actions[1];
  const totalEv = Math.abs(top.ev) + Math.abs(second.ev);

  let topFreq: number;
  if (totalEv === 0) {
    topFreq = 0.5;
  } else {
    // Small EV difference → closer to 50/50. Larger → skew toward better action.
    const diff = top.ev - second.ev;
    topFreq = 0.5 + (diff / (MIXED_STRATEGY_THRESHOLD_BB * 2)) * 0.3;
    topFreq = Math.max(0.35, Math.min(0.65, topFreq));
  }

  return [
    { action: top.action, frequency: Math.round(topFreq * 100) / 100 },
    {
      action: second.action,
      frequency: Math.round((1 - topFreq) * 100) / 100,
    },
  ];
}

function computeSizingRange(
  pot: number,
  callSize: number,
  stackSize: number,
  spr: number,
): SizingRange {
  if (spr <= 1) {
    // Low SPR → all-in is the correct raise size
    return { min: stackSize, max: stackSize };
  }

  // Standard raise sizing: 60-80% of pot postflop, 2.5-3x preflop
  let optimalRaise: number;
  if (callSize > 0 && pot <= callSize * 3) {
    // Preflop-like sizing
    optimalRaise = callSize * 2.5;
  } else {
    // Postflop sizing
    optimalRaise = pot * 0.7;
  }

  optimalRaise = Math.min(optimalRaise, stackSize);

  // Tolerance: ±15% per PRD Section 4.3
  const tolerance = 0.15;
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

  if (state.callSize > 0) {
    tags.push('Pot Odds');
  }

  tags.push('Equity');

  if (spr < 4) {
    tags.push('SPR');
  }

  if (state.street === 'preflop') {
    if (state.callSize > 0 && state.activePlayers <= 2) {
      tags.push('3-Bet');
    }
  } else {
    if (state.callSize === 0) {
      tags.push('C-Bet');
    }
  }

  if (heroEquity < potOdds && state.callSize > 0) {
    tags.push('Fold Equity');
  }

  if (isMixed) {
    tags.push('Mixed Strategy');
  }

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
  // Check if action matches
  if (result.isMixed && result.mixedFrequencies) {
    const acceptedActions = result.mixedFrequencies.map((mf) => mf.action);
    if (!acceptedActions.includes(userAction)) {
      return {
        correct: false,
        reason: `Incorrect action. In this mixed spot, acceptable actions are: ${acceptedActions.join(', ')}`,
      };
    }
  } else if (userAction !== result.recommendedAction) {
    // Allow check/call equivalence when callSize is 0
    if (
      !(
        (userAction === 'check' && result.recommendedAction === 'call') ||
        (userAction === 'call' && result.recommendedAction === 'check')
      )
    ) {
      return {
        correct: false,
        reason: `Incorrect action. The correct play is ${result.recommendedAction}.`,
      };
    }
  }

  // Check sizing if the user raised
  if (userAction === 'raise' && userSizing !== undefined) {
    const { min, max } = result.sizingRange;
    if (userSizing < min || userSizing > max) {
      return {
        correct: false,
        reason: `Correct action but incorrect sizing. Optimal raise is between ${min.toFixed(1)} and ${max.toFixed(1)}.`,
      };
    }
  }

  return { correct: true, reason: 'Correct!' };
}
