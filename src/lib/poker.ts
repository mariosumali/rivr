import type { ActionType } from '../engine/types';

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Minimum legal raise size (bb) given the current bet to call. */
export function minRaiseSize(callSize: number): number {
  return Math.round((callSize > 0 ? callSize * 2 : 1) * 10) / 10;
}

/**
 * A "standard" GTO-ish raise size used for one-key raises and slider defaults:
 * ~2.5× the call preflop-style, ¾ pot postflop. Kept inside the server's ±15%
 * sizing tolerance so a one-key raise grades as correct.
 */
export function standardRaiseSize(pot: number, callSize: number, stack: number): number {
  const base = callSize > 0 && pot <= callSize * 3 ? callSize * 2.5 : pot * 0.75;
  return Math.round(clamp(base, minRaiseSize(callSize), stack) * 10) / 10;
}

export const ACTION_KEYS: Record<string, ActionType> = {
  f: 'fold',
  c: 'call', // resolves to check when there is no bet
};
