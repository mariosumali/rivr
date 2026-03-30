import { motion } from 'framer-motion';
import type { AdjudicationData, ScenarioData } from '../store/gameStore';
import type { ActionType } from '../engine/types';
import './FeedbackPanel.css';

interface FeedbackPanelProps {
  result: AdjudicationData;
  userAction: ActionType;
  userSizing?: number;
  scenario: ScenarioData;
  onNext: () => void;
  layout?: 'bottom' | 'right';
}

function formatEvBb(ev: number): string {
  const sign = ev >= 0 ? '+' : '';
  return `${sign}${ev.toFixed(1)}`;
}

function actionLabel(a: ActionType): string {
  if (a === 'check') return 'Check';
  return a.charAt(0).toUpperCase() + a.slice(1);
}

export function FeedbackPanel({
  result,
  userAction,
  userSizing,
  scenario,
  onNext,
  layout = 'bottom',
}: FeedbackPanelProps) {
  const canCheck = scenario.callSize === 0;
  const equityPct =
    result.heroEquity != null ? Math.round(result.heroEquity * 100) : null;
  const potReqPct = result.potOdds
    ? Math.round(result.potOdds.required * 100)
    : null;
  const edgePct =
    equityPct != null && potReqPct != null ? equityPct - potReqPct : null;

  const primaryActions: ActionType[] = canCheck
    ? ['fold', 'check', 'raise']
    : ['fold', 'call', 'raise'];

  const subline = (() => {
    if (!result.correct) {
      return `You chose ${actionLabel(userAction)} · optimal: ${actionLabel(result.recommendedAction)}`;
    }
    if (result.recommendedAction === 'raise' && userSizing != null) {
      return `Raise to ${userSizing}bb · optimal range ${result.sizingRange.min.toFixed(0)}–${result.sizingRange.max.toFixed(0)}bb`;
    }
    if (result.recommendedAction === 'call' || result.recommendedAction === 'check') {
      return `${actionLabel(result.recommendedAction)} · ${result.reason.slice(0, 80)}${result.reason.length > 80 ? '…' : ''}`;
    }
    return result.reason.slice(0, 120) + (result.reason.length > 120 ? '…' : '');
  })();

  const inner = (
    <>
      {layout === 'right' && (
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
      )}

      <div className={layout === 'right' ? 'piq-panel-body' : ''}>
        <div className={`feedback-panel__ev-strip ${layout === 'right' ? 'feedback-panel__ev-strip--right' : ''}`}>
          {primaryActions.map((action) => {
            const ev = result.evByAction[action];
            if (ev === undefined) return null;
            const isOptimal = action === result.recommendedAction;
            return (
              <div
                key={action}
                className={`feedback-panel__ev-cell ${isOptimal ? 'feedback-panel__ev-cell--best' : ''}`}
              >
                <div className="feedback-panel__ev-cell-lbl">
                  {isOptimal && <span className="feedback-panel__ev-dot" />}
                  {actionLabel(action)}
                  {isOptimal ? ' — optimal' : ''}
                </div>
                <div className={`feedback-panel__ev-cell-num ${ev < 0 ? 'feedback-panel__ev-cell-num--neg' : 'feedback-panel__ev-cell-num--pos'}`}>
                  {formatEvBb(ev)}
                </div>
                <div className="feedback-panel__ev-cell-unit">bb</div>
              </div>
            );
          })}
        </div>

        <div className="feedback-panel__verdict-block">
          <div className="feedback-panel__verdict-title">
            {result.correct ? 'Correct.' : 'Incorrect.'}
          </div>
          <div className="feedback-panel__verdict-sub">{subline}</div>
        </div>

        <div className="feedback-panel__stats-grid">
          <div className="feedback-panel__stat-cell">
            <div className="feedback-panel__stat-lbl">Your equity</div>
            <div className="feedback-panel__stat-num">
              {equityPct != null ? `${equityPct}%` : '—'}
            </div>
          </div>
          <div className="feedback-panel__stat-cell">
            <div className="feedback-panel__stat-lbl">Pot odds req.</div>
            <div className="feedback-panel__stat-num feedback-panel__stat-num--dim">
              {potReqPct != null ? `${potReqPct}%` : '—'}
            </div>
          </div>
          <div className="feedback-panel__stat-cell">
            <div className="feedback-panel__stat-lbl">Edge</div>
            <div
              className={`feedback-panel__stat-num ${edgePct != null && edgePct > 0 ? 'feedback-panel__stat-num--edge' : ''}`}
            >
              {edgePct != null ? `${edgePct > 0 ? '+' : ''}${edgePct}%` : '—'}
            </div>
          </div>
        </div>

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

        <p className="feedback-panel__expl">{result.reason}</p>

        <div className="feedback-panel__tags">
          {result.conceptTags.map((tag) => (
            <span key={tag} className="feedback-panel__tag feedback-panel__tag--piq">
              {tag}
            </span>
          ))}
        </div>

        <button
          type="button"
          className={`feedback-panel__next-btn ${layout === 'right' ? 'feedback-panel__next-btn--piq' : ''}`}
          onClick={onNext}
        >
          Next hand
        </button>
      </div>
    </>
  );

  if (layout === 'right') {
    return (
      <aside
        className={`feedback-panel feedback-panel--right ${result.correct ? 'feedback-panel--correct' : 'feedback-panel--incorrect'}`}
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
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {inner}
    </motion.div>
  );
}
