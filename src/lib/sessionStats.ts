import type { SessionHand } from '../store/gameStore';

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

export function computeBestStreak(history: SessionHand[]): number {
  let best = 0;
  let cur = 0;
  for (const h of history) {
    if (h.result.correct) {
      cur += 1;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return best;
}

/**
 * EV left on the table vs perfect play (bb), measured as the EV gap between the
 * recommended action and the action the user actually chose.
 */
export function computeEvLostBb(history: SessionHand[]): number {
  let lost = 0;
  for (const h of history) {
    const ev = h.result.evByAction;
    const best = ev[h.result.recommendedAction];
    const chosen = ev[h.userAction];
    if (typeof best === 'number' && typeof chosen === 'number') {
      lost += Math.max(0, best - chosen);
    }
  }
  return Math.round(lost * 10) / 10;
}

export interface ConceptAccuracy {
  name: string;
  total: number;
  correct: number;
  pct: number;
}

/** Per-concept accuracy derived from the concept tags on each played hand. */
export function computeConceptAccuracy(history: SessionHand[]): ConceptAccuracy[] {
  const map = new Map<string, { total: number; correct: number }>();
  for (const h of history) {
    for (const tag of h.result.conceptTags) {
      const e = map.get(tag) ?? { total: 0, correct: 0 };
      e.total += 1;
      if (h.result.correct) e.correct += 1;
      map.set(tag, e);
    }
  }
  return [...map.entries()]
    .map(([name, { total, correct }]) => ({
      name,
      total,
      correct,
      pct: total ? Math.round((correct / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/** Concepts the user is weakest at (min sample size, below threshold). */
export function computeWeakSpots(
  history: SessionHand[],
  { minSamples = 3, threshold = 60 } = {},
): ConceptAccuracy[] {
  return computeConceptAccuracy(history)
    .filter((c) => c.total >= minSamples && c.pct < threshold)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 4);
}

/** Accuracy grouped by an arbitrary key extractor (street, position, etc.). */
export function accuracyBy(
  history: SessionHand[],
  keyOf: (h: SessionHand) => string,
): { key: string; total: number; correct: number; pct: number }[] {
  const map = new Map<string, { total: number; correct: number }>();
  for (const h of history) {
    const k = keyOf(h);
    const e = map.get(k) ?? { total: 0, correct: 0 };
    e.total += 1;
    if (h.result.correct) e.correct += 1;
    map.set(k, e);
  }
  return [...map.entries()].map(([key, { total, correct }]) => ({
    key,
    total,
    correct,
    pct: total ? Math.round((correct / total) * 100) : 0,
  }));
}
