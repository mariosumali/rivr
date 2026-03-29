import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AdjudicationData } from '../store/gameStore';
import type { ActionType } from '../engine/types';
import './FeedbackPanel.css';

interface FeedbackPanelProps {
  result: AdjudicationData;
  userAction: ActionType;
  userSizing?: number;
  onNext: () => void;
}

function formatEV(ev: number): string {
  const sign = ev >= 0 ? '+' : '';
  return `${sign}${ev.toFixed(2)}bb`;
}

export function FeedbackPanel({
  result,
  userAction,
  onNext,
}: FeedbackPanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className={`feedback-panel ${result.correct ? 'feedback-panel--correct' : 'feedback-panel--incorrect'}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Verdict */}
      <div className="feedback-panel__verdict">
        <span className="feedback-panel__verdict-icon">
          {result.correct ? '✓' : '✗'}
        </span>
        <span className="feedback-panel__verdict-text">
          {result.correct ? 'Correct' : 'Incorrect'}
        </span>
        {!result.correct && (
          <span className="feedback-panel__optimal">
            Optimal: <strong>{result.recommendedAction}</strong>
          </span>
        )}
      </div>

      {/* Mixed strategy badge */}
      {result.isMixed && result.mixedFrequencies && (
        <div className="feedback-panel__mixed">
          <span className="feedback-panel__mixed-badge">Mixed Strategy</span>
          <span className="feedback-panel__mixed-split">
            {result.mixedFrequencies.map((mf) => (
              <span key={mf.action} className="feedback-panel__mixed-freq">
                {mf.action} {Math.round(mf.frequency * 100)}%
              </span>
            ))}
          </span>
        </div>
      )}

      {/* EV breakdown */}
      <div className="feedback-panel__ev">
        <span className="feedback-panel__section-label">EV by Action</span>
        <div className="feedback-panel__ev-grid">
          {(['fold', 'call', 'check', 'raise'] as ActionType[]).map((action) => {
            const ev = result.evByAction[action];
            if (ev === undefined) return null;
            const isChosen = action === userAction;
            const isOptimal = action === result.recommendedAction;
            return (
              <div
                key={action}
                className={`feedback-panel__ev-item ${isChosen ? 'feedback-panel__ev-item--chosen' : ''} ${isOptimal ? 'feedback-panel__ev-item--optimal' : ''}`}
              >
                <span className="feedback-panel__ev-action">{action}</span>
                <span className="feedback-panel__ev-value">{formatEV(ev)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pot odds */}
      {result.potOdds && (
        <div className="feedback-panel__pot-odds">
          <span className="feedback-panel__section-label">Pot Odds</span>
          <span className="feedback-panel__pot-odds-value">
            Need {(result.potOdds.required * 100).toFixed(1)}% equity to call
          </span>
        </div>
      )}

      {/* Concept tags */}
      <div className="feedback-panel__tags">
        {result.conceptTags.map((tag) => (
          <span key={tag} className="feedback-panel__tag">
            {tag}
          </span>
        ))}
      </div>

      {/* Expandable detail */}
      <button
        className="feedback-panel__expand-btn"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="feedback-panel__detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="feedback-panel__detail-content">
              <p className="feedback-panel__reason">{result.reason}</p>
              {result.sizingRange && (
                <p className="feedback-panel__sizing">
                  Optimal raise size: {result.sizingRange.min.toFixed(1)} –{' '}
                  {result.sizingRange.max.toFixed(1)}bb
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next hand */}
      <button className="feedback-panel__next-btn" onClick={onNext}>
        Next Hand →
      </button>
    </motion.div>
  );
}
