import type { SessionHand } from '../store/gameStore';
import type { ActionType } from '../engine/types';

export function computeAccuracyPercent(history: SessionHand[]): number {
  if (history.length === 0) return 0;
  const correct = history.filter((h) => h.result.correct).length;
  return Math.round((correct / history.length) * 100);
}

export function computeStreak(history: SessionHand[]): number {
  let streak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].result.correct) streak += 1;
    else break;
  }
  return streak;
}

function bestEv(ev: Record<ActionType, number>): number {
  const vals = (Object.values(ev) as number[]).filter((v) => typeof v === 'number' && !Number.isNaN(v));
  return vals.length ? Math.max(...vals) : 0;
}

/** Approximate EV left on table vs perfect play (bb). */
export function computeEvLostBb(history: SessionHand[]): number {
  let lost = 0;
  for (const h of history) {
    const ev = h.result.evByAction;
    const maxEv = bestEv(ev);
    const userEv = ev[h.userAction];
    if (typeof userEv === 'number') lost += Math.max(0, maxEv - userEv);
  }
  return Math.round(lost * 10) / 10;
}
