import type { SessionHand } from '../../store/gameStore';
import {
  computeAccuracyPercent,
  computeStreak,
  computeBestStreak,
  computeEvLostBb,
  computeConceptAccuracy,
  accuracyBy,
} from '../../lib/sessionStats';
import { streetLabel } from './reviewFormat';

interface ReviewViewProps {
  sessionHistory: SessionHand[];
  onReplay: (hand: SessionHand) => void;
}

function barColor(pct: number): string {
  if (pct >= 70) return 'var(--piq-success)';
  if (pct >= 50) return 'var(--color-text-secondary)';
  return 'var(--piq-danger)';
}

export function ReviewView({ sessionHistory, onReplay }: ReviewViewProps) {
  const hands = sessionHistory.length;
  const acc = computeAccuracyPercent(sessionHistory);
  const streak = computeStreak(sessionHistory);
  const best = computeBestStreak(sessionHistory);
  const evLost = computeEvLostBb(sessionHistory);
  const concepts = computeConceptAccuracy(sessionHistory);
  const byStreet = accuracyBy(sessionHistory, (h) => streetLabel(h.scenario.street));
  const byPosition = accuracyBy(sessionHistory, (h) => h.scenario.position);

  return (
    <div className="piq-review-shell">
      <div className="piq-review-col">
        <div className="piq-review-head">
          <div className="piq-review-title">Session performance</div>
          <div className="piq-review-sub">Persisted locally · {hands} hands</div>
        </div>

        <div className="piq-session-grid">
          <div className="piq-ss-cell">
            <div className="piq-ss-num">{hands}</div>
            <div className="piq-ss-lbl">Hands played</div>
          </div>
          <div className="piq-ss-cell">
            <div className={`piq-ss-num ${hands ? 'piq-ss-num--g' : ''}`}>{hands ? `${acc}%` : '—'}</div>
            <div className="piq-ss-lbl">Overall accuracy</div>
          </div>
          <div className="piq-ss-cell">
            <div className={`piq-ss-num ${evLost > 0 ? 'piq-ss-num--r' : ''}`}>
              {hands ? `−${evLost}bb` : '—'}
            </div>
            <div className="piq-ss-lbl">EV lost to errors</div>
          </div>
          <div className="piq-ss-cell">
            <div className="piq-ss-num">
              {streak}
              <span className="piq-ss-num__sub"> / {best}</span>
            </div>
            <div className="piq-ss-lbl">Streak / best</div>
          </div>
        </div>

        {hands === 0 ? (
          <p className="piq-panel-placeholder">
            Play Decision mode to build your performance breakdown. Concept, street, and position
            accuracy are computed from your actual answers.
          </p>
        ) : (
          <>
            <div className="piq-review-subhead">Accuracy by concept</div>
            {concepts.map((c) => (
              <div key={c.name} className="piq-concept-row">
                <span style={{ color: c.pct < 50 && c.total >= 3 ? 'var(--piq-danger)' : 'transparent' }}>
                  ▼
                </span>
                <span style={{ color: 'var(--color-text-secondary)' }}>{c.name}</span>
                <div className="piq-concept-bar">
                  <span style={{ width: `${c.pct}%`, background: barColor(c.pct) }} />
                </div>
                <span style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                  {c.pct}%<span className="piq-concept-n"> ·{c.total}</span>
                </span>
              </div>
            ))}

            <div className="piq-review-split">
              <div>
                <div className="piq-review-subhead">By street</div>
                {byStreet.map((s) => (
                  <MiniStat key={s.key} label={s.key} pct={s.pct} n={s.total} />
                ))}
              </div>
              <div>
                <div className="piq-review-subhead">By position</div>
                {byPosition.map((s) => (
                  <MiniStat key={s.key} label={s.key} pct={s.pct} n={s.total} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="piq-review-col">
        <div className="piq-review-head">
          <div className="piq-review-title">Hand history</div>
          <div className="piq-review-sub">{hands} hands · click ↻ to replay a spot</div>
        </div>
        {hands === 0 && <p className="piq-panel-placeholder">No hands yet this session.</p>}
        {[...sessionHistory].reverse().map((h, i) => (
          <button
            key={`${h.timestamp}-${i}`}
            type="button"
            className="piq-replay-row"
            onClick={() => onReplay(h)}
            title="Replay this hand in Decision mode"
          >
            <span style={{ color: h.result.correct ? 'var(--piq-success)' : 'var(--piq-danger)' }}>
              {h.result.correct ? '✓' : '✗'}
            </span>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div className="piq-replay-hand">
                {h.scenario.heroHand.join(' ')} · {streetLabel(h.scenario.street)} · {h.scenario.position}
              </div>
              <div className="piq-replay-meta">
                {h.userAction}
                {h.userSizing != null ? ` ${h.userSizing}bb` : ''} · optimal {h.result.recommendedAction} ·{' '}
                {h.scenario.stackSize}bb eff
              </div>
            </div>
            <span className="piq-replay-icon">↻</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, pct, n }: { label: string; pct: number; n: number }) {
  return (
    <div className="piq-ministat">
      <span className="piq-ministat__lbl">{label}</span>
      <div className="piq-ministat__track">
        <div className="piq-ministat__fill" style={{ width: `${pct}%`, background: barColor(pct) }} />
      </div>
      <span className="piq-ministat__pct">
        {pct}%<span className="piq-concept-n"> ·{n}</span>
      </span>
    </div>
  );
}
