import { useEffect, useState } from 'react';
import { TopBar } from './components/shell/TopBar';
import { Sidebar } from './components/shell/Sidebar';
import type { AppMode } from './components/shell/types';
import { DecisionView } from './components/views/DecisionView';
import { FreePlayView } from './components/views/FreePlayView';
import { RangeTrainerView } from './components/views/RangeTrainerView';
import { ReviewView } from './components/views/ReviewView';
import { ThemesView } from './components/views/ThemesView';
import { useGameStore, type SessionHand } from './store/gameStore';
import { computeAccuracyPercent, computeStreak } from './lib/sessionStats';
import { hydrateThemeFromStorage } from './theme/themeController';
import './styles/global.css';

function App() {
  const [mode, setMode] = useState<AppMode>('decision');
  const {
    sessionHistory,
    difficulty,
    error,
    reset,
    replayHand,
  } = useGameStore();

  useEffect(() => {
    hydrateThemeFromStorage();
  }, []);

  const accuracyPct = computeAccuracyPercent(sessionHistory);
  const streak = computeStreak(sessionHistory);

  const handleReplay = (hand: SessionHand) => {
    replayHand(hand);
    setMode('decision');
  };

  return (
    <div className="piq-app">
      <div className="piq-frame">
        <TopBar mode={mode} onModeChange={setMode} streak={streak} accuracyPct={accuracyPct} />

        {mode === 'themes' ? (
          <ThemesView />
        ) : (
          <div className={`piq-body piq-body--${mode}`}>
            <Sidebar
              mode={mode}
              onModeChange={setMode}
              sessionHistory={sessionHistory}
              difficulty={difficulty}
            />

            {mode === 'decision' && <DecisionView />}
            {mode === 'freeplay' && (
              <div className="piq-span-main">
                <FreePlayView />
              </div>
            )}
            {mode === 'ranges' && (
              <div className="piq-span-main">
                <RangeTrainerView />
              </div>
            )}
            {mode === 'review' && (
              <div className="piq-span-main">
                <ReviewView sessionHistory={sessionHistory} onReplay={handleReplay} />
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="app-error">
          <span>{error}</span>
          <button type="button" onClick={() => reset()}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
