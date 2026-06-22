import type { AppMode } from './types';
import type { SessionHand } from '../../store/gameStore';
import {
  computeAccuracyPercent,
  computeStreak,
  computeEvLostBb,
  computeWeakSpots,
} from '../../lib/sessionStats';

interface SidebarProps {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
  sessionHistory: SessionHand[];
  difficulty: 1 | 2 | 3;
}

const DIFF_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Beginner',
  2: 'Intermediate',
  3: 'Advanced',
};

export function Sidebar({ mode, onModeChange, sessionHistory, difficulty }: SidebarProps) {
  const hands = sessionHistory.length;
  const acc = computeAccuracyPercent(sessionHistory);
  const streak = computeStreak(sessionHistory);
  const evLost = computeEvLostBb(sessionHistory);
  const weakSpots = computeWeakSpots(sessionHistory);

  return (
    <aside className="piq-sidebar">
      <div className="piq-sidebar__section">
        <div className="piq-sidebar__lbl">Session</div>
        <div className="piq-stat-grid">
          <div className="piq-stat-box">
            <div className="piq-stat-box__num">{hands}</div>
            <div className="piq-stat-box__lbl">Hands</div>
          </div>
          <div className="piq-stat-box">
            <div className={`piq-stat-box__num ${hands ? 'piq-stat-box__num--g' : ''}`}>
              {hands ? `${acc}%` : '—'}
            </div>
            <div className="piq-stat-box__lbl">Acc.</div>
          </div>
          <div className="piq-stat-box">
            <div className={`piq-stat-box__num ${evLost > 0 ? 'piq-stat-box__num--r' : ''}`}>
              {hands ? `−${evLost}` : '—'}
            </div>
            <div className="piq-stat-box__lbl">EV lost</div>
          </div>
          <div className="piq-stat-box">
            <div className="piq-stat-box__num">{streak}</div>
            <div className="piq-stat-box__lbl">Streak</div>
          </div>
        </div>
      </div>

      <div className="piq-sidebar__section">
        <div className="piq-sidebar__lbl">Mode</div>
        <button
          type="button"
          className={`piq-mode-item ${mode === 'decision' ? 'piq-mode-item--on' : ''}`}
          onClick={() => onModeChange('decision')}
        >
          <IconDecision />
          Decision
        </button>
        <button
          type="button"
          className={`piq-mode-item ${mode === 'ranges' ? 'piq-mode-item--on' : ''}`}
          onClick={() => onModeChange('ranges')}
        >
          <IconGrid />
          Ranges
        </button>
        <button
          type="button"
          className={`piq-mode-item ${mode === 'freeplay' ? 'piq-mode-item--on' : ''}`}
          onClick={() => onModeChange('freeplay')}
        >
          <IconCircle />
          Free Play
        </button>
        <button
          type="button"
          className={`piq-mode-item ${mode === 'review' ? 'piq-mode-item--on' : ''}`}
          onClick={() => onModeChange('review')}
        >
          <IconChart />
          Review
        </button>
      </div>

      <div className="piq-sidebar__section">
        <div className="piq-sidebar__lbl">Difficulty</div>
        <div style={{ padding: '0 8px' }}>
          <div className="piq-diff-row">
            <span style={{ color: 'var(--color-text-secondary)' }}>{DIFF_LABEL[difficulty]}</span>
            <span style={{ color: 'var(--color-text-muted)' }}>Lvl {difficulty}</span>
          </div>
          <div className="piq-diff-track">
            <div className="piq-diff-fill" style={{ width: `${(difficulty / 3) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="piq-sidebar__section piq-sidebar__section--weak">
        <div className="piq-sidebar__lbl">Weak spots</div>
        {weakSpots.length === 0 ? (
          <p className="piq-weak-empty">
            {hands < 3 ? 'Play a few hands to surface weak concepts.' : 'No weak concepts — nice.'}
          </p>
        ) : (
          weakSpots.map((w) => (
            <div key={w.name} className="piq-weak-row">
              <span style={{ color: 'var(--piq-danger)' }}>▼</span>
              <span>{w.name}</span>
              <span>{w.pct}%</span>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function IconDecision() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1" />
      <line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x="7.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x="1" y="7.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1" />
      <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function IconCircle() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1" />
      <polyline points="4,7 7,4 10,7" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden>
      <polyline
        points="1,10 4,6 7,8 10,3 13,5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
