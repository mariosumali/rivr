import { AnimatePresence } from 'framer-motion';
import { PokerTable, type PlayerData } from './components/PokerTable';
import { ActionPanel } from './components/ActionPanel';
import { FeedbackPanel } from './components/FeedbackPanel';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { useGameStore } from './store/gameStore';
import type { Position } from './engine/types';
import './styles/global.css';

const OPPONENT_POSITIONS: Position[] = ['CO', 'HJ', 'MP', 'UTG', 'SB', 'BB'];

function App() {
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
  } = useGameStore();

  const buildPlayers = (): PlayerData[] => {
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
    const villains: PlayerData[] = OPPONENT_POSITIONS
      .filter((p) => p !== currentScenario.position)
      .slice(0, villainCount)
      .map((pos) => ({
        position: pos,
        stackSize: Math.round(currentScenario.stackSize * (0.7 + Math.random() * 0.6)),
        isHero: false,
        cards: undefined,
        faceDown: true,
      }));

    return [hero, ...villains];
  };

  const accuracy =
    sessionHistory.length > 0
      ? Math.round(
          (sessionHistory.filter((h) => h.result.correct).length /
            sessionHistory.length) *
            100,
        )
      : 0;

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__left">
          <h1 className="app-header__title">rivr</h1>
          <span className="app-header__subtitle">decision trainer</span>
        </div>
        <div className="app-header__center">
          {sessionHistory.length > 0 && (
            <div className="app-header__stats">
              <span className="app-header__stat">
                Hands: <strong>{sessionHistory.length}</strong>
              </span>
              <span className="app-header__stat">
                Accuracy: <strong>{accuracy}%</strong>
              </span>
            </div>
          )}
        </div>
        <div className="app-header__right">
          <ThemeSwitcher />
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {gamePhase === 'idle' && (
          <div className="app-start">
            <div className="app-start__content">
              <h2 className="app-start__heading">Decision Mode</h2>
              <p className="app-start__desc">
                Practice mathematically correct poker decisions.
                Each hand is a flashcard — choose the optimal action.
              </p>

              <div className="app-start__difficulty">
                <span className="app-start__label">Difficulty</span>
                <div className="app-start__difficulty-btns">
                  {([1, 2, 3] as const).map((d) => (
                    <button
                      key={d}
                      className={`app-start__diff-btn ${difficulty === d ? 'app-start__diff-btn--active' : ''}`}
                      onClick={() => setDifficulty(d)}
                    >
                      {d === 1 ? 'Beginner' : d === 2 ? 'Intermediate' : 'Advanced'}
                    </button>
                  ))}
                </div>
              </div>

              <button className="app-start__play-btn" onClick={loadScenario}>
                Start Training
              </button>
            </div>
          </div>
        )}

        {gamePhase === 'loading' && (
          <div className="app-loading">
            <div className="app-loading__spinner" />
            <span>Dealing…</span>
          </div>
        )}

        {(gamePhase === 'playing' || gamePhase === 'feedback') &&
          currentScenario && (
            <>
              {/* Action history bar */}
              {currentScenario.actionHistory.length > 0 && (
                <div className="app-history-bar">
                  {currentScenario.actionHistory.map((action, i) => (
                    <span key={i} className="app-history-bar__item">
                      {action}
                    </span>
                  ))}
                </div>
              )}

              <PokerTable
                players={buildPlayers()}
                communityCards={currentScenario.communityCards}
                pot={currentScenario.pot}
                animationState={gamePhase === 'playing' ? 'dealing' : 'idle'}
              />
            </>
          )}
      </main>

      {/* Bottom panels */}
      <footer className="app-footer">
        {gamePhase === 'playing' && currentScenario && (
          <ActionPanel
            pot={currentScenario.pot}
            callSize={currentScenario.callSize}
            stackSize={currentScenario.stackSize}
            onAction={submitAction}
          />
        )}

        <AnimatePresence>
          {gamePhase === 'feedback' && adjudicationResult && userAction && (
            <FeedbackPanel
              result={adjudicationResult}
              userAction={userAction}
              userSizing={userSizing}
              onNext={nextHand}
            />
          )}
        </AnimatePresence>
      </footer>

      {error && (
        <div className="app-error">
          <span>{error}</span>
          <button onClick={() => useGameStore.getState().reset()}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

export default App;
