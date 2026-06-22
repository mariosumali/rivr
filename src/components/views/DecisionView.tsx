import { useCallback, useEffect, useMemo, useState } from 'react';
import { PokerTable, type PlayerData } from '../PokerTable';
import { ActionPanel } from '../ActionPanel';
import { FeedbackPanel } from '../FeedbackPanel';
import { SettingsMenu } from '../SettingsMenu';
import { streetLabel } from './reviewFormat';
import { useGameStore } from '../../store/gameStore';
import type { ActionType, CardAnimationState, Position } from '../../engine/types';
import { standardRaiseSize } from '../../lib/poker';

const CARD_STAGGER = 0.1;
const OPPONENT_POSITIONS: Position[] = ['CO', 'HJ', 'MP', 'UTG', 'SB', 'BB', 'BTN'];
const STACK_MULT = [0.87, 0.94, 0.91, 0.88, 0.93, 0.9];

const DIFF_LABEL: Record<number, string> = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };

function villainTag(scenario: { villainPosition?: Position; villainAction?: string } | null): string {
  if (!scenario?.villainPosition) return '';
  if (scenario.villainAction === '3bet') return `vs ${scenario.villainPosition} 3-bet`;
  if (scenario.villainAction === 'continue') return `vs ${scenario.villainPosition}`;
  return `vs ${scenario.villainPosition} open`;
}

export function DecisionView() {
  const {
    gamePhase,
    currentScenario,
    scenarioId,
    userAction,
    userSizing,
    adjudicationResult,
    difficulty,
    settings,
    isReplay,
    setDifficulty,
    setSettings,
    clearHistory,
    loadScenario,
    submitAction,
    nextHand,
    skipHand,
  } = useGameStore();

  const [cardAnimState, setCardAnimState] = useState<CardAnimationState>('idle');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Deal animation timing.
  useEffect(() => {
    if (gamePhase === 'playing' && currentScenario) {
      setCardAnimState('dealing');
      const totalPlayers = currentScenario.activePlayers;
      const lastCardDelay = (2 * totalPlayers - 1) * CARD_STAGGER;
      const timer = setTimeout(() => setCardAnimState('idle'), (lastCardDelay + 0.6) * 1000);
      return () => clearTimeout(timer);
    }
    setCardAnimState('idle');
  }, [gamePhase, currentScenario]);

  const handleAction = useCallback(
    (action: ActionType, sizing?: number) => {
      if (gamePhase !== 'playing') return;
      void submitAction(action, sizing);
    },
    [gamePhase, submitAction],
  );

  // Decision timer — auto-folds on expiry.
  useEffect(() => {
    if (gamePhase !== 'playing' || isReplay || !settings.timerSeconds) {
      setTimeLeft(null);
      return;
    }
    setTimeLeft(settings.timerSeconds);
    const start = Date.now();
    const id = setInterval(() => {
      const remaining = settings.timerSeconds - (Date.now() - start) / 1000;
      if (remaining <= 0) {
        clearInterval(id);
        setTimeLeft(0);
        void submitAction('fold');
      } else {
        setTimeLeft(remaining);
      }
    }, 100);
    return () => clearInterval(id);
  }, [gamePhase, isReplay, settings.timerSeconds, currentScenario, submitAction]);

  // Auto-advance after a correct answer.
  useEffect(() => {
    if (gamePhase === 'feedback' && settings.autoAdvance && adjudicationResult?.correct && !isReplay) {
      const id = setTimeout(() => void nextHand(), 1300);
      return () => clearTimeout(id);
    }
  }, [gamePhase, settings.autoAdvance, adjudicationResult, isReplay, nextHand]);

  // Keyboard control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (gamePhase === 'feedback') {
        if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'n') {
          e.preventDefault();
          void nextHand();
        }
        return;
      }
      if (gamePhase !== 'playing' || !currentScenario) return;
      const k = e.key.toLowerCase();
      if (k === 'f') handleAction('fold');
      else if (k === 'c') handleAction(currentScenario.callSize === 0 ? 'check' : 'call');
      else if (k === 'r') {
        const size = standardRaiseSize(currentScenario.pot, currentScenario.callSize, currentScenario.stackSize);
        handleAction('raise', difficulty === 1 ? undefined : size);
      } else if (k === 's' && !isReplay) {
        void skipHand();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gamePhase, currentScenario, difficulty, isReplay, handleAction, nextHand, skipHand]);

  const players = useMemo((): PlayerData[] => {
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
    const aggressor = currentScenario.villainPosition;
    const others = OPPONENT_POSITIONS.filter(
      (p) => p !== currentScenario.position && p !== aggressor,
    );
    const seats = [aggressor, ...others].filter(Boolean).slice(0, villainCount) as Position[];

    const villains: PlayerData[] = seats.map((pos, i) => ({
      position: pos,
      stackSize: Math.round(currentScenario.stackSize * STACK_MULT[i % STACK_MULT.length]),
      isHero: false,
      faceDown: true,
      isActive: pos === aggressor && currentScenario.callSize > 0,
      betAmount: pos === aggressor && currentScenario.callSize > 0 ? currentScenario.callSize : undefined,
    }));

    return [hero, ...villains];
  }, [currentScenario, gamePhase]);

  const timerPct =
    timeLeft != null && settings.timerSeconds ? (timeLeft / settings.timerSeconds) * 100 : 0;

  return (
    <>
      <div className="piq-center">
        {gamePhase === 'idle' && (
          <div className="piq-start">
            <div className="piq-start__card">
              <h2 className="piq-start__h">Decision Mode</h2>
              <p className="piq-start__p">
                Each hand is a flashcard. You're given a real spot against a position-accurate
                opponent range — choose the action that maximizes EV.
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
                      {DIFF_LABEL[d]}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className="piq-start__play" onClick={() => void loadScenario()}>
                Start training
              </button>
              <p className="piq-start__hint">
                <kbd>F</kbd> fold · <kbd>C</kbd> call/check · <kbd>R</kbd> raise · <kbd>Space</kbd> next
              </p>
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
            <div className="piq-table-hud">
              <span className="piq-pill piq-pill--on">{currentScenario.position}</span>
              <span className="piq-pill">{streetLabel(currentScenario.street)}</span>
              <span className="piq-pill">
                {currentScenario.activePlayers}-max · {currentScenario.stackSize}bb
              </span>
              {villainTag(currentScenario) && (
                <span className="piq-pill piq-pill--ghost">{villainTag(currentScenario)}</span>
              )}
              {isReplay && <span className="piq-pill piq-pill--ghost">replay</span>}
              <div className="piq-table-hud__right">
                <div className="piq-settings-anchor">
                  <button
                    type="button"
                    className="piq-hud-more"
                    aria-label="Settings"
                    onClick={() => setSettingsOpen((o) => !o)}
                  >
                    <GearIcon />
                  </button>
                  {settingsOpen && (
                    <SettingsMenu
                      settings={settings}
                      difficulty={difficulty}
                      onSettings={setSettings}
                      onDifficulty={setDifficulty}
                      onClearHistory={() => {
                        clearHistory();
                        setSettingsOpen(false);
                      }}
                      onClose={() => setSettingsOpen(false)}
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="piq-skip"
                  onClick={() => void skipHand()}
                  disabled={gamePhase !== 'playing' || isReplay}
                >
                  Skip
                </button>
              </div>
            </div>

            {timeLeft != null && (
              <div className="piq-timer-bar">
                <div
                  className={`piq-timer-bar__fill ${timerPct < 30 ? 'piq-timer-bar__fill--low' : ''}`}
                  style={{ width: `${timerPct}%` }}
                />
              </div>
            )}

            {currentScenario.actionHistory.length > 0 && (
              <div className="piq-action-log">
                {currentScenario.actionHistory.map((action, i) => (
                  <span key={i} className="piq-action-log__item">
                    {action}
                  </span>
                ))}
              </div>
            )}

            <div className="piq-table-wrap">
              <PokerTable
                players={players}
                communityCards={currentScenario.communityCards}
                pot={currentScenario.pot}
                animationState={cardAnimState}
              />
            </div>

            {gamePhase === 'playing' && (
              <ActionPanel
                key={scenarioId ?? 'replay'}
                variant="pokeriq"
                pot={currentScenario.pot}
                callSize={currentScenario.callSize}
                stackSize={currentScenario.stackSize}
                onAction={handleAction}
                difficulty={difficulty}
              />
            )}
          </>
        )}
      </div>

      <div className="piq-right">
        {gamePhase === 'feedback' && adjudicationResult && userAction && currentScenario ? (
          <FeedbackPanel
            layout="right"
            result={adjudicationResult}
            userAction={userAction}
            userSizing={userSizing}
            scenario={currentScenario}
            defaultExpanded={settings.expandDetail}
            isReplay={isReplay}
            onNext={() => void nextHand()}
          />
        ) : (
          <>
            <div className="piq-panel-tabs" role="tablist">
              <button type="button" className="piq-panel-tabs__on">
                Analysis
              </button>
            </div>
            <div className="piq-panel-body">
              <p className="piq-panel-placeholder">
                {gamePhase === 'playing'
                  ? 'Act on this hand to reveal the EV breakdown, equity vs. the required price, and the concepts in play.'
                  : 'Start a hand to begin. Every spot is graded against a real, position-based opponent range.'}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
