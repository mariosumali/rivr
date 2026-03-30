import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { SimplifiedCard } from './SimplifiedCard';
import { hydrateThemeFromStorage } from '../../theme/themeController';
import type { ActionType, Position } from '../../engine/types';
import { computeAccuracyPercent, computeStreak } from '../../lib/sessionStats';
import './simplified.css';

function RivrLogo() {
  return (
    <svg
      className="s-logo-svg"
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

const OPP_POSITIONS: Position[] = ['CO', 'HJ', 'MP', 'UTG', 'SB', 'BB'];
const SEAT_POS: Record<number, { top: string; left: string }[]> = {
  1: [{ top: '10%', left: '50%' }],
  2: [{ top: '15%', left: '22%' }, { top: '15%', left: '78%' }],
  3: [{ top: '50%', left: '6%' }, { top: '10%', left: '50%' }, { top: '50%', left: '94%' }],
  4: [
    { top: '50%', left: '6%' }, { top: '12%', left: '26%' },
    { top: '12%', left: '74%' }, { top: '50%', left: '94%' },
  ],
  5: [
    { top: '55%', left: '6%' }, { top: '15%', left: '18%' },
    { top: '10%', left: '50%' }, { top: '15%', left: '82%' },
    { top: '55%', left: '94%' },
  ],
};

type Phase = 'dealing' | 'idle' | 'folding' | 'exiting';

export function SimplifiedView() {
  const {
    gamePhase, currentScenario, adjudicationResult, userAction,
    sessionHistory, loadScenario, submitAction, nextHand,
  } = useGameStore();

  const [cardPhase, setCardPhase] = useState<Phase>('idle');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => { hydrateThemeFromStorage(); }, []);

  useEffect(() => {
    if (gamePhase === 'playing' && currentScenario) {
      setCardPhase('dealing');
      setShowFeedback(false);
      const t = setTimeout(() => setCardPhase('idle'), 700);
      return () => clearTimeout(t);
    }
  }, [gamePhase, currentScenario]);

  useEffect(() => {
    if (gamePhase === 'feedback' && adjudicationResult) {
      const t = setTimeout(() => setShowFeedback(true), 500);
      return () => clearTimeout(t);
    }
  }, [gamePhase, adjudicationResult]);

  const handleAction = useCallback(async (action: ActionType) => {
    if (gamePhase !== 'playing') return;

    if (action === 'fold') {
      setCardPhase('folding');
    } else {
      setCardPhase('exiting');
    }

    await new Promise((r) => setTimeout(r, 400));
    await submitAction(action);
  }, [gamePhase, submitAction]);

  const handleNext = useCallback(async () => {
    setShowFeedback(false);
    setCardPhase('exiting');
    await new Promise((r) => setTimeout(r, 350));
    await nextHand();
  }, [nextHand]);

  const opponents = useMemo(() => {
    if (!currentScenario) return [];
    const count = currentScenario.activePlayers - 1;
    return OPP_POSITIONS
      .filter((p) => p !== currentScenario.position)
      .slice(0, count);
  }, [currentScenario]);

  const seatPositions = SEAT_POS[opponents.length] || SEAT_POS[5];

  const accuracy = computeAccuracyPercent(sessionHistory);
  const streak = computeStreak(sessionHistory);

  const availableActions: ActionType[] = useMemo(() => {
    if (!currentScenario) return ['fold', 'check', 'raise'];
    return currentScenario.callSize > 0
      ? ['fold', 'call', 'raise']
      : ['fold', 'check', 'raise'];
  }, [currentScenario]);

  return (
    <div className="s-root">
      {/* Top strip */}
      <div className="s-top">
        <a href="/" className="s-top__brand" aria-label="RIVR">
          <RivrLogo />
          <span>RIVR</span>
        </a>
        <div className="s-top__stats">
          {sessionHistory.length > 0 && (
            <>
              <span><span className="s-top__stat-val">{streak}</span> streak</span>
              <span><span className="s-top__stat-val">{accuracy}%</span> accuracy</span>
            </>
          )}
        </div>
      </div>

      {/* Idle state */}
      {gamePhase === 'idle' && (
        <div className="s-idle">
          <div className="s-idle__title">Simplified Mode</div>
          <button
            type="button"
            className="s-idle__start"
            onClick={() => void loadScenario()}
          >
            Deal
          </button>
        </div>
      )}

      {/* Loading */}
      {gamePhase === 'loading' && (
        <div className="s-loading">Dealing…</div>
      )}

      {/* Playing / feedback */}
      {(gamePhase === 'playing' || gamePhase === 'feedback') && currentScenario && (
        <>
          <div className="s-table-area">
            <div className="s-table">
              <div className="s-table__bezel" />
              <div className="s-table__bezel-inner" />

              {/* Pot */}
              <div className="s-pot">{currentScenario.pot} bb</div>

              {/* Community cards */}
              <div className="s-community">
                {Array.from({ length: 5 }, (_, i) => {
                  const card = currentScenario.communityCards[i];
                  return card ? (
                    <div key={i} className="s-card--sm">
                      <SimplifiedCard
                        rank={card[0] as any}
                        suit={card[1] as any}
                        index={i + 2}
                        phase={cardPhase}
                      />
                    </div>
                  ) : (
                    <div key={i} className="s-community__slot" />
                  );
                })}
              </div>

              {/* Opponents */}
              {opponents.map((pos, i) => (
                <div
                  key={pos}
                  className="s-seat"
                  style={{
                    top: seatPositions[i]?.top ?? '10%',
                    left: seatPositions[i]?.left ?? '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <span className="s-seat__label">{pos}</span>
                  <div className="s-seat__cards">
                    <div className="s-card--sm">
                      <SimplifiedCard faceDown index={i * 2} phase={cardPhase} />
                    </div>
                    <div className="s-card--sm">
                      <SimplifiedCard faceDown index={i * 2 + 1} phase={cardPhase} />
                    </div>
                  </div>
                </div>
              ))}

            </div>

            {/* Hero hand — below the table */}
            <div className="s-hero">
              <SimplifiedCard
                rank={currentScenario.heroHand[0][0] as any}
                suit={currentScenario.heroHand[0][1] as any}
                index={0}
                isHero
                phase={cardPhase}
              />
              <SimplifiedCard
                rank={currentScenario.heroHand[1][0] as any}
                suit={currentScenario.heroHand[1][1] as any}
                index={1}
                isHero
                phase={cardPhase}
              />
            </div>

            {/* Feedback overlay */}
            <AnimatePresence>
              {showFeedback && adjudicationResult && (
                <motion.div
                  className="s-feedback"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className={`s-feedback__verdict ${adjudicationResult.correct ? 's-feedback__verdict--correct' : 's-feedback__verdict--incorrect'}`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                  >
                    {adjudicationResult.correct ? 'Correct' : 'Incorrect'}
                  </motion.div>
                  <motion.div
                    className="s-feedback__detail"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    Optimal: {adjudicationResult.recommendedAction}
                    {userAction && userAction !== adjudicationResult.recommendedAction && (
                      <> · You chose: {userAction}</>
                    )}
                  </motion.div>
                  <motion.button
                    type="button"
                    className="s-feedback__next"
                    onClick={() => void handleNext()}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                  >
                    Next hand
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          {gamePhase === 'playing' && (
            <div className="s-actions">
              {availableActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  className="s-action-btn"
                  onClick={() => void handleAction(action)}
                >
                  <span className="s-action-btn__label">Action</span>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* During feedback, show a simple bar to proceed */}
          {gamePhase === 'feedback' && !showFeedback && (
            <div className="s-actions">
              <button type="button" className="s-action-btn" disabled>
                <span className="s-action-btn__label">&nbsp;</span>
                …
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
