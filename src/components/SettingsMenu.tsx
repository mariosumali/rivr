import { useEffect, useRef } from 'react';
import type { Settings } from '../store/gameStore';

interface SettingsMenuProps {
  settings: Settings;
  difficulty: 1 | 2 | 3;
  onSettings: (patch: Partial<Settings>) => void;
  onDifficulty: (d: 1 | 2 | 3) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

const TIMER_OPTIONS = [0, 10, 20, 30];

export function SettingsMenu({
  settings,
  difficulty,
  onSettings,
  onDifficulty,
  onClearHistory,
  onClose,
}: SettingsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="piq-settings" ref={ref} role="dialog" aria-label="Settings">
      <div className="piq-settings__group">
        <div className="piq-settings__lbl">Difficulty</div>
        <div className="piq-settings__seg">
          {([1, 2, 3] as const).map((d) => (
            <button
              key={d}
              type="button"
              className={difficulty === d ? 'piq-settings__seg-on' : ''}
              onClick={() => onDifficulty(d)}
            >
              {d === 1 ? 'Beginner' : d === 2 ? 'Inter.' : 'Advanced'}
            </button>
          ))}
        </div>
      </div>

      <div className="piq-settings__group">
        <div className="piq-settings__lbl">Decision timer</div>
        <div className="piq-settings__seg">
          {TIMER_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              className={settings.timerSeconds === t ? 'piq-settings__seg-on' : ''}
              onClick={() => onSettings({ timerSeconds: t })}
            >
              {t === 0 ? 'Off' : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      <label className="piq-settings__row">
        <span>Auto-advance after correct</span>
        <input
          type="checkbox"
          checked={settings.autoAdvance}
          onChange={(e) => onSettings({ autoAdvance: e.target.checked })}
        />
      </label>

      <label className="piq-settings__row">
        <span>Expand reasoning by default</span>
        <input
          type="checkbox"
          checked={settings.expandDetail}
          onChange={(e) => onSettings({ expandDetail: e.target.checked })}
        />
      </label>

      <button
        type="button"
        className="piq-settings__danger"
        onClick={() => {
          if (confirm('Clear all session history and range stats?')) onClearHistory();
        }}
      >
        Clear session history
      </button>
    </div>
  );
}
