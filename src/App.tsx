import { useEffect, useMemo, useState } from 'react';
import { PokerTable, type PlayerData } from './components/PokerTable';
import { ActionPanel } from './components/ActionPanel';
import { FeedbackPanel } from './components/FeedbackPanel';
import { TopBar } from './components/shell/TopBar';
import { Sidebar } from './components/shell/Sidebar';
import type { AppMode } from './components/shell/types';
import { RangeTrainerView } from './components/views/RangeTrainerView';
import { ReviewView } from './components/views/ReviewView';
import { ThemesView } from './components/views/ThemesView';
import { streetLabel } from './components/views/reviewFormat';
import { useGameStore } from './store/gameStore';
import type { Position } from './engine/types';
import {
  computeAccuracyPercent,
  computeStreak,
} from './lib/sessionStats';
import { hydrateThemeFromStorage } from './theme/themeController';
import './styles/global.css';

const OPPONENT_POSITIONS: Position[] = ['CO', 'HJ', 'MP', 'UTG', 'SB', 'BB'];

const STACK_MULT = [0.87, 0.94, 0.91, 0.88, 0.93, 0.9];

function ThemeHydration() {
  useEffect(() => {
    hydrateThemeFromStorage();
  }, []);
  return null;
}

function App() {
  const [mode, setMode] = useState<AppMode>('decision');
  const {
    gamePhase,
    currentScenario,
    userAction,
    userSizing,
    adjudicationResult,
    sessionHistory,
    difficulty,
    error,
    setDifficulty,
    loadScenario,
    submitAction,
    nextHand,
    skipHand,
  } = useGameStore();

  const trainingMode = mode === 'decision' || mode === 'freeplay';

  const buildPlayers = useMemo((): PlayerData[] => {
    if (!currentScenario) return [];

    const hero: PlayerData = {
      position: currentScenario.position,
      stackSize: currentScenario.stackSize,
      isHero: true,
      isActive: gamePhase === 'playing',
      cards: currentScenario.heroHand,
      faceDown: false,
    };

    const villainCount = currentScenario.activePlayers - 1;
    const villains: PlayerData[] = OPPONENT_POSITIONS.filter(
      (p) => p !== currentScenario.position,
    )
      .slice(0, villainCount)
      .map((pos, i) => ({
        position: pos,
        stackSize: Math.round(
          currentScenario.stackSize * STACK_MULT[i % STACK_MULT.length],
        ),
        isHero: false,
        cards: undefined,
        faceDown: true,
        isFolded: false,
      }));

    return [hero, ...villains];
  }, [currentScenario, gamePhase]);

  const accuracyPct = computeAccuracyPercent(sessionHistory);
  const streak = computeStreak(sessionHistory);

  const handleStart = () => {
    void loadScenario();
  };

  return (
    <div className="piq-app">
      <ThemeHydration />
      <div className="piq-frame">
        <TopBar
          mode={mode}
          onModeChange={setMode}
          streak={streak}
          accuracyPct={accuracyPct}
        />

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

            {mode === 'review' && (
              <div className="piq-span-main">
                <ReviewView sessionHistory={sessionHistory} />
              </div>
            )}

            {mode === 'ranges' && (
              <div className="piq-span-main">
                <RangeTrainerView />
              </div>
            )}

            {trainingMode && (
              <>
                <div className="piq-center">
                  {mode === 'freeplay' && (
                    <div
                      style={{
                        padding: '8px 20px',
                        fontFamily: 'var(--piq-mono)',
                        fontSize: 10,
                        color: 'var(--color-text-muted)',
                        borderBottom: '1px solid var(--piq-line)',
                      }}
                    >
                      Free Play — same engine as Decision; stats count toward your session.
                    </div>
                  )}

                  {gamePhase === 'idle' && (
                    <div className="piq-start">
                      <div className="piq-start__card">
                        <h2 className="piq-start__h">Decision Mode</h2>
                        <p className="piq-start__p">
                          Practice mathematically correct poker decisions. Each hand is a flashcard — choose
                          the optimal action.
                        </p>
                        <div className="piq-start__diff">
                          <div className="piq-start__diff-lbl">Difficulty</div>
                          <div className="piq-start__diff-btns">
                            {([1, 2, 3] as const).map((d) => (
                              <button
                                key={d}
                                type="button"
                                className={difficulty === d ? 'piq-on' : ''}
                                onClick={() => setDifficulty(d)}
                              >
                                {d === 1 ? 'Beginner' : d === 2 ? 'Intermediate' : 'Advanced'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button type="button" className="piq-start__play" onClick={handleStart}>
                          Start training
                        </button>
                      </div>
                    </div>
                  )}

                  {gamePhase === 'loading' && (
                    <div className="piq-loading">
                      <div className="piq-loading__spin" />
                      <span>Dealing…</span>
                    </div>
                  )}

                  {(gamePhase === 'playing' || gamePhase === 'feedback') && currentScenario && (
                    <>
                      {currentScenario.actionHistory.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            padding: '10px 20px',
                            borderBottom: '1px solid var(--piq-line)',
                            fontFamily: 'var(--piq-mono)',
                            fontSize: 10,
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          {currentScenario.actionHistory.map((action, i) => (
                            <span key={i}>{action}</span>
                          ))}
                        </div>
                      )}

                      <div className="piq-table-hud">
                        <span className="piq-pill piq-pill--on">{currentScenario.position}</span>
                        <span className="piq-pill">{streetLabel(currentScenario.street)}</span>
                        <span className="piq-pill">
                          {currentScenario.activePlayers}-max · {currentScenario.stackSize}bb
                        </span>
                        <div className="piq-table-hud__right">
                          <button type="button" className="piq-hud-more" aria-label="More options">
                            …
                          </button>
                          <button
                            type="button"
                            className="piq-skip"
                            onClick={() => void skipHand()}
                            disabled={gamePhase !== 'playing'}
                          >
                            Skip
                          </button>
                        </div>
                      </div>

                      <div className="piq-table-wrap">
                        <PokerTable
                          players={buildPlayers}
                          communityCards={currentScenario.communityCards}
                          pot={currentScenario.pot}
                          animationState={gamePhase === 'playing' ? 'dealing' : 'idle'}
                        />
                      </div>

                    </>
                  )}
                </div>

                <div className="piq-right">
                  {gamePhase === 'feedback' &&
                  adjudicationResult &&
                  userAction &&
                  currentScenario ? (
                    <FeedbackPanel
                      layout="right"
                      result={adjudicationResult}
                      userAction={userAction}
                      userSizing={userSizing}
                      scenario={currentScenario}
                      onNext={() => void nextHand()}
                    />
                  ) : (
                    <>
                      <div className="piq-panel-tabs" role="tablist">
                        <button type="button" className="piq-panel-tabs__on">
                          Analysis
                        </button>
                        <button type="button" className="piq-panel-tabs__ghost" disabled>
                          History
                        </button>
                        <button type="button" className="piq-panel-tabs__ghost" disabled>
                          Ranges
                        </button>
                      </div>
                      <div className="piq-panel-body">
                        <p className="piq-panel-placeholder">
                          Act on the current hand to see EV breakdown, pot odds, and concept tags here.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {trainingMode && gamePhase === 'playing' && currentScenario && (
          <ActionPanel
            variant="pokeriq"
            pot={currentScenario.pot}
            callSize={currentScenario.callSize}
            stackSize={currentScenario.stackSize}
            onAction={submitAction}
          />
        )}
      </div>

      {error && (
        <div className="app-error">
          <span>{error}</span>
          <button type="button" onClick={() => useGameStore.getState().reset()}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
