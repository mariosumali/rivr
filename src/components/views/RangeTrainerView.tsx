import { useCallback, useMemo, useState } from 'react';
import { Card } from '../Card';
import { useGameStore } from '../../store/gameStore';
import type { Card as CardType, Position, Rank, Suit } from '../../engine/types';
import {
  allHandClasses,
  classifyOpen,
  comboCount,
  handClassOf,
  rangeBreakdown,
  type HandClass,
  type RangeTier,
} from '../../engine/ranges';

const POSITIONS: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
const SUITS: Suit[] = ['h', 'd', 'c', 's'];
const HAND_CLASSES = allHandClasses();

function tierClass(t: RangeTier): string {
  if (t === 'raise') return 'piq-rg--raise';
  if (t === 'call') return 'piq-rg--call';
  return 'piq-rg--fold';
}

/** Deal a concrete two-card hand for a hand class, weighted by combo count. */
function dealWeightedHand(): { hc: HandClass; cards: [CardType, CardType] } {
  const total = HAND_CLASSES.reduce((s, hc) => s + comboCount(hc), 0);
  let r = Math.random() * total;
  let hc = HAND_CLASSES[0];
  for (const c of HAND_CLASSES) {
    r -= comboCount(c);
    if (r <= 0) {
      hc = c;
      break;
    }
  }
  return { hc, cards: concreteCards(hc) };
}

function concreteCards(hc: HandClass): [CardType, CardType] {
  const r1 = hc[0] as Rank;
  const r2 = hc[1] as Rank;
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  if (hc.length === 2) {
    const [s1, s2] = shuffle(SUITS).slice(0, 2);
    return [`${r1}${s1}` as CardType, `${r2}${s2}` as CardType];
  }
  if (hc.endsWith('s')) {
    const s = pick(SUITS);
    return [`${r1}${s}` as CardType, `${r2}${s}` as CardType];
  }
  const s1 = pick(SUITS);
  let s2 = pick(SUITS);
  while (s2 === s1) s2 = pick(SUITS);
  return [`${r1}${s1}` as CardType, `${r2}${s2}` as CardType];
}

function shuffle<T>(arr: T[]): T[] {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

const TIER_VERB: Record<RangeTier, string> = { raise: 'Raise', call: 'Call', fold: 'Fold' };

export function RangeTrainerView() {
  const rangeStats = useGameStore((s) => s.rangeStats);
  const recordRangeAnswer = useGameStore((s) => s.recordRangeAnswer);

  const [pos, setPos] = useState<Position>('BTN');
  const [hand, setHand] = useState(() => dealWeightedHand());
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: RangeTier } | null>(null);

  const handClass = hand.hc;
  const correctTier = useMemo(
    () => classifyOpen(pos, handClassOf(hand.cards[0], hand.cards[1])),
    [pos, hand],
  );
  const breakdown = useMemo(() => rangeBreakdown(pos), [pos]);

  const handleAction = useCallback(
    (action: RangeTier) => {
      if (feedback) return;
      const correct = action === correctTier;
      setFeedback({ correct, answer: correctTier });
      recordRangeAnswer(pos, correct);
      setTimeout(() => {
        setFeedback(null);
        setHand(dealWeightedHand());
      }, 1100);
    },
    [feedback, correctTier, pos, recordRangeAnswer],
  );

  const drillLabel = pos === 'BB' ? 'BB defense vs BTN steal' : 'Opening range (RFI)';

  return (
    <div className="piq-range-shell">
      <div className="piq-range-center">
        <div className="piq-range-hud">
          <span className="piq-range-title">{drillLabel}</span>
          <span className="piq-range-meta">100bb · 6-max</span>
          <div className="piq-pos-tabs">
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                className={pos === p ? 'piq-pos-tabs__on' : ''}
                onClick={() => {
                  setPos(p);
                  setFeedback(null);
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="piq-range-grid" aria-label={`${pos} range matrix`}>
          {HAND_CLASSES.map((hc) => {
            const tier = classifyOpen(pos, hc);
            const isCurrent = hc === handClass;
            return (
              <div
                key={hc}
                className={`piq-rg ${tierClass(tier)}${isCurrent ? ' piq-rg--highlight' : ''}`}
              >
                {hc.length === 2 ? hc : hc.slice(0, 2) + (hc.endsWith('s') ? 's' : '')}
              </div>
            );
          })}
        </div>

        <div className="piq-range-legend">
          <div className="piq-leg">
            <span className="piq-leg__sw" style={{ background: 'rgba(184,50,40,0.35)' }} />
            {pos === 'BB' ? '3-Bet' : 'Raise'} · {breakdown.raise}%
          </div>
          {breakdown.call > 0 && (
            <div className="piq-leg">
              <span className="piq-leg__sw" style={{ background: 'rgba(74,126,160,0.3)' }} />
              Call · {breakdown.call}%
            </div>
          )}
          <div className="piq-leg">
            <span
              className="piq-leg__sw"
              style={{ background: 'var(--piq-ink-2)', border: '1px solid var(--piq-line)' }}
            />
            Fold · {breakdown.fold}%
          </div>
        </div>
      </div>

      <div className="piq-range-right">
        <div className="piq-sidebar__lbl">Your hand · {pos}</div>
        <div className="piq-rt-hand">
          <Card rank={hand.cards[0][0] as Rank} suit={hand.cards[0][1] as Suit} size="md" />
          <Card rank={hand.cards[1][0] as Rank} suit={hand.cards[1][1] as Suit} size="md" />
        </div>
        <div className="piq-range-meta piq-rt-handlabel">
          {handClass} · {drillLabel}
        </div>

        {feedback ? (
          <div className={`piq-rt-feedback ${feedback.correct ? 'piq-rt-feedback--ok' : 'piq-rt-feedback--no'}`}>
            {feedback.correct
              ? `Correct — ${TIER_VERB[feedback.answer]}`
              : `Incorrect — GTO ${TIER_VERB[feedback.answer].toLowerCase()}s here`}
          </div>
        ) : (
          <div className="piq-rt-actions">
            <button type="button" className="piq-rt-act" onClick={() => handleAction('fold')}>
              Fold
            </button>
            <button type="button" className="piq-rt-act" onClick={() => handleAction('call')}>
              {pos === 'BB' ? 'Call' : 'Limp'}
            </button>
            <button type="button" className="piq-rt-act" onClick={() => handleAction('raise')}>
              {pos === 'BB' ? '3-Bet' : 'Raise'}
            </button>
          </div>
        )}

        <div className="piq-sidebar__lbl piq-rt-statlbl">Accuracy by position</div>
        {POSITIONS.map((p) => {
          const stat = rangeStats[p];
          const total = stat?.total ?? 0;
          const pct = total ? Math.round((stat!.correct / total) * 100) : 0;
          const bad = total >= 5 && pct < 60;
          return (
            <div key={p} className="piq-rt-statrow">
              <span className="piq-rt-statrow__pos">{p}</span>
              <div className="piq-rt-statrow__track">
                <div
                  className={`piq-rt-statrow__fill ${bad ? 'piq-rt-statrow__fill--bad' : ''}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`piq-rt-statrow__pct ${bad ? 'piq-rt-statrow__pct--bad' : ''}`}>
                {total ? `${pct}%` : '—'}
              </span>
              <span className="piq-rt-statrow__n">{total ? `${total}` : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
