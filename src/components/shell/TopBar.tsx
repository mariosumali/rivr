import type { AppMode } from './types';

const MODES: { id: AppMode; label: string }[] = [
  { id: 'decision', label: 'Decision' },
  { id: 'ranges', label: 'Ranges' },
  { id: 'freeplay', label: 'Free Play' },
  { id: 'review', label: 'Review' },
];

function RivrLogo() {
  return (
    <svg
      className="piq-logo-svg"
      viewBox="0 0 28 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M2 14C5 8 8 12 11 8C14 4 17 10 20 6C23 2 25 7 26 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 18C5 12 8 16 11 12C14 8 17 14 20 10C23 6 25 11 26 9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
    </svg>
  );
}

interface TopBarProps {
  mode: AppMode;
  onModeChange: (m: AppMode) => void;
  streak: number;
  accuracyPct: number;
}

export function TopBar({ mode, onModeChange, streak, accuracyPct }: TopBarProps) {
  return (
    <header className="piq-topbar">
      <div className="piq-brand" aria-label="RIVR">
        <RivrLogo />
        <span className="piq-wordmark">RIVR</span>
      </div>
      <nav className="piq-nav-pill" aria-label="Primary">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={mode === id ? 'piq-nav-pill__on' : ''}
            onClick={() => onModeChange(id)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={mode === 'themes' ? 'piq-nav-pill__on' : ''}
          onClick={() => onModeChange('themes')}
        >
          Themes
        </button>
      </nav>
      <div className="piq-topbar__right">
        <div className="piq-stat">
          <span className="piq-stat__val">{streak}</span>
          <span className="piq-stat__lbl">streak</span>
        </div>
        <div className="piq-divider-v" />
        <div className="piq-stat">
          <span className="piq-stat__val">{accuracyPct}%</span>
          <span className="piq-stat__lbl">accuracy</span>
        </div>
      </div>
    </header>
  );
}
