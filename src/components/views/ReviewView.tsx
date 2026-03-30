import type { SessionHand } from '../../store/gameStore';
import { computeAccuracyPercent, computeStreak, computeEvLostBb } from '../../lib/sessionStats';
import { streetLabel } from './reviewFormat';

interface ReviewViewProps {
  sessionHistory: SessionHand[];
}

const DEMO_CONCEPTS: { name: string; pct: number; flag?: boolean; bar: 'r' | 'w' | 'g' }[] = [
  { name: '3-Bet Sizing', pct: 42, flag: true, bar: 'r' },
  { name: 'Fold Equity', pct: 51, flag: true, bar: 'r' },
  { name: 'Pot Odds', pct: 68, bar: 'g' },
  { name: 'Value Raise', pct: 81, bar: 'w' },
  { name: 'C-Bet', pct: 77, bar: 'g' },
  { name: 'SPR', pct: 70, bar: 'g' },
  { name: 'Draw Equity', pct: 74, bar: 'g' },
];

export function ReviewView({ sessionHistory }: ReviewViewProps) {
  const hands = sessionHistory.length;
  const acc = computeAccuracyPercent(sessionHistory);
  const streak = computeStreak(sessionHistory);
  const evLost = computeEvLostBb(sessionHistory);

  return (
    <div className="piq-review-shell">
      <div className="piq-review-col">
        <div className="piq-review-head">
          <div className="piq-review-title">Concept accuracy</div>
          <div className="piq-review-sub">This session</div>
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
            <div className="piq-ss-num">{streak}</div>
            <div className="piq-ss-lbl">Current streak</div>
          </div>
        </div>
        {DEMO_CONCEPTS.map((c) => (
          <div key={c.name} className="piq-concept-row">
            <span style={{ color: c.flag ? 'var(--piq-danger)' : 'transparent' }}>{c.flag ? '▼' : '·'}</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>{c.name}</span>
            <div className="piq-concept-bar">
              <span
                style={{
                  width: `${c.pct}%`,
                  background:
                    c.bar === 'r'
                      ? 'var(--piq-danger)'
                      : c.bar === 'w'
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-muted)',
                }}
              />
            </div>
            <span
              style={{
                textAlign: 'right',
                color: c.bar === 'r' ? 'var(--piq-danger)' : 'var(--color-text-secondary)',
              }}
            >
              {c.pct}%
            </span>
          </div>
        ))}
      </div>
      <div className="piq-review-col">
        <div className="piq-review-head">
          <div className="piq-review-title">Hand history</div>
          <div className="piq-review-sub">{hands} hands this session</div>
        </div>
        {sessionHistory.length === 0 && (
          <p className="piq-panel-placeholder">Play Decision mode to populate history.</p>
        )}
        {[...sessionHistory].reverse().map((h, i) => (
          <div key={`${h.timestamp}-${i}`} className="piq-replay-row">
            <span style={{ color: h.result.correct ? 'var(--piq-success)' : 'var(--piq-danger)' }}>
              {h.result.correct ? '✓' : '✗'}
            </span>
            <div style={{ flex: 1 }}>
              <div className="piq-replay-hand">
                {h.scenario.heroHand.join(' ')} · {streetLabel(h.scenario.street)} · {h.scenario.position}
              </div>
              <div className="piq-replay-meta">
                {h.userAction}
                {h.userSizing != null ? ` ${h.userSizing}bb` : ''} · {h.scenario.stackSize}bb eff
              </div>
            </div>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>↻</span>
          </div>
        ))}
      </div>
    </div>
  );
}
