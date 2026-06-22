import { useState } from 'react';
import { motion } from 'framer-motion';
import type { AdjudicationData, ScenarioData } from '../store/gameStore';
import type { ActionType } from '../engine/types';
import { streetLabel } from './views/reviewFormat';
import './FeedbackPanel.css';

interface FeedbackPanelProps {
  result: AdjudicationData;
  userAction: ActionType;
  userSizing?: number;
  scenario: ScenarioData;
  onNext: () => void;
  layout?: 'bottom' | 'right';
  defaultExpanded?: boolean;
  isReplay?: boolean;
}

function formatEvBb(ev: number): string {
  const sign = ev >= 0 ? '+' : '';
  return `${sign}${ev.toFixed(1)}`;
}

function actionLabel(a: ActionType): string {
  return a.charAt(0).toUpperCase() + a.slice(1);
}

function villainContext(scenario: ScenarioData): string {
  const v = scenario.villainPosition;
  if (!v) return '';
  if (scenario.villainAction === '3bet') return `Hero ${scenario.position} vs ${v} 3-bet`;
  if (scenario.villainAction === 'continue') {
    return `Hero ${scenario.position} vs ${v} · ${streetLabel(scenario.street)}`;
  }
  return `Hero ${scenario.position} vs ${v} open`;
}

export function FeedbackPanel({
  result,
  userAction,
  userSizing,
  scenario,
  onNext,
  layout = 'right',
  defaultExpanded = false,
  isReplay = false,
}: FeedbackPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const canCheck = scenario.callSize === 0;
  const equityPct = result.heroEquity != null ? Math.round(result.heroEquity * 100) : null;
  const potReqPct = result.potOdds ? Math.round(result.potOdds.required * 100) : null;
  const edgePct = equityPct != null && potReqPct != null ? equityPct - potReqPct : null;

  const legalActions: ActionType[] = canCheck ? ['fold', 'check', 'raise'] : ['fold', 'call', 'raise'];
  // 'check' and 'call' are interchangeable for highlight purposes.
  const norm = (a: ActionType): ActionType => (a === 'check' ? 'call' : a) as ActionType;

  const subline = (() => {
    if (!result.correct) {
      return `You chose ${actionLabel(userAction)} — optimal is ${actionLabel(result.recommendedAction)}.`;
    }
    if (result.recommendedAction === 'raise' && userSizing != null) {
      return `Raise to ${userSizing}bb · GTO range ${result.sizingRange.min.toFixed(0)}–${result.sizingRange.max.toFixed(0)}bb.`;
    }
    return result.reason;
  })();

  const inner = (
    <div className={layout === 'right' ? 'piq-panel-body' : ''}>
      <div className="feedback-panel__context">{villainContext(scenario)}</div>

      <div className="feedback-panel__verdict-block">
        <div className="feedback-panel__verdict-title">
          {result.correct ? 'Correct' : 'Incorrect'}
          {isReplay && <span className="feedback-panel__replay-tag">replay</span>}
        </div>
        <div className="feedback-panel__verdict-sub">{subline}</div>
      </div>

      <div className={`feedback-panel__ev-strip feedback-panel__ev-strip--right`}>
        {legalActions.map((action) => {
          const ev = result.evByAction[action];
          if (ev === undefined) return null;
          const isOptimal = norm(action) === norm(result.recommendedAction);
          const isChosen = norm(action) === norm(userAction);
          return (
            <div
              key={action}
              className={`feedback-panel__ev-cell ${isOptimal ? 'feedback-panel__ev-cell--best' : ''} ${
                isChosen ? 'feedback-panel__ev-cell--chosen' : ''
              }`}
            >
              <div className="feedback-panel__ev-cell-lbl">
                {isOptimal && <span className="feedback-panel__ev-dot" />}
                {actionLabel(action)}
              </div>
              <div
                className={`feedback-panel__ev-cell-num ${
                  ev < 0 ? 'feedback-panel__ev-cell-num--neg' : 'feedback-panel__ev-cell-num--pos'
                }`}
              >
                {formatEvBb(ev)}
              </div>
              <div className="feedback-panel__ev-cell-foot">
                {isChosen ? 'your pick' : isOptimal ? 'optimal' : 'bb'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Equity vs required-to-call bar */}
      {equityPct != null && (
        <div className="feedback-panel__equity">
          <div className="feedback-panel__equity-head">
            <span>Equity {equityPct}%</span>
            {potReqPct != null && <span>needs {potReqPct}% to call</span>}
          </div>
          <div className="feedback-panel__equity-track">
            <div
              className={`feedback-panel__equity-fill ${
                edgePct != null && edgePct < 0 ? 'feedback-panel__equity-fill--short' : ''
              }`}
              style={{ width: `${Math.min(100, equityPct)}%` }}
            />
            {potReqPct != null && (
              <div
                className="feedback-panel__equity-mark"
                style={{ left: `${Math.min(100, potReqPct)}%` }}
                title={`Required: ${potReqPct}%`}
              />
            )}
          </div>
          {edgePct != null && (
            <div
              className={`feedback-panel__equity-edge ${
                edgePct >= 0 ? 'feedback-panel__equity-edge--pos' : 'feedback-panel__equity-edge--neg'
              }`}
            >
              {edgePct >= 0 ? `+${edgePct}% over the line` : `${edgePct}% short of the price`}
            </div>
          )}
        </div>
      )}

      {result.isMixed && result.mixedFrequencies && (
        <div className="feedback-panel__mixed">
          <span className="feedback-panel__mixed-badge">Mixed</span>
          <span className="feedback-panel__mixed-split">
            {result.mixedFrequencies.map((mf) => (
              <span key={mf.action} className="feedback-panel__mixed-freq">
                {actionLabel(mf.action)} {Math.round(mf.frequency * 100)}%
              </span>
            ))}
          </span>
        </div>
      )}

      <div className="feedback-panel__tags">
        {result.conceptTags.map((tag) => (
          <span key={tag} className="feedback-panel__tag feedback-panel__tag--piq">
            {tag}
          </span>
        ))}
      </div>

      <button
        type="button"
        className="feedback-panel__expand-btn"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {expanded ? '− Hide reasoning' : '+ Show reasoning'}
      </button>

      {expanded && (
        <div className="feedback-panel__detail-content">
          <p className="feedback-panel__expl">{result.reason}</p>
          <p className="feedback-panel__expl feedback-panel__expl--dim">
            Pot {scenario.pot}bb · {scenario.callSize > 0 ? `${scenario.callSize}bb to call` : 'no bet to face'} ·
            stack {scenario.stackSize}bb · {scenario.activePlayers}-handed
          </p>
        </div>
      )}

      <button
        type="button"
        className="feedback-panel__next-btn feedback-panel__next-btn--piq"
        onClick={onNext}
      >
        Next hand <span className="feedback-panel__next-key">Space</span>
      </button>
    </div>
  );

  if (layout === 'right') {
    return (
      <aside
        className={`feedback-panel feedback-panel--right ${
          result.correct ? 'feedback-panel--correct' : 'feedback-panel--incorrect'
        }`}
      >
        {inner}
      </aside>
    );
  }

  return (
    <motion.div
      className={`feedback-panel ${result.correct ? 'feedback-panel--correct' : 'feedback-panel--incorrect'}`}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {inner}
    </motion.div>
  );
}
