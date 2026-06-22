import { useMemo, useState } from 'react';
import type { ActionType } from '../engine/types';
import './ActionPanel.css';

interface ActionPanelProps {
  pot: number;
  callSize: number;
  stackSize: number;
  onAction: (action: ActionType, sizing?: number) => void;
  disabled?: boolean;
  variant?: 'default' | 'pokeriq';
  difficulty?: 1 | 2 | 3;
}

export function ActionPanel({
  pot,
  callSize,
  stackSize,
  onAction,
  disabled = false,
  variant = 'default',
  difficulty = 1,
}: ActionPanelProps) {
  if (variant === 'pokeriq') {
    return (
      <PokeriqActionPanel
        pot={pot}
        callSize={callSize}
        stackSize={stackSize}
        onAction={onAction}
        disabled={disabled}
        difficulty={difficulty}
      />
    );
  }

  return (
    <DefaultActionPanel
      pot={pot}
      callSize={callSize}
      stackSize={stackSize}
      onAction={onAction}
      disabled={disabled}
    />
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function PokeriqActionPanel({
  pot,
  callSize,
  stackSize,
  onAction,
  disabled,
  difficulty = 1,
}: Omit<ActionPanelProps, 'variant'>) {
  const canCheck = callSize === 0;
  const minRaise = Math.round((callSize > 0 ? callSize * 2 : 1) * 10) / 10;
  const noSizing = difficulty === 1;

  // Default the slider to a standard size: ~2.5x the call preflop, ¾ pot otherwise.
  const defaultRaise = useMemo(() => {
    const base = callSize > 0 && pot <= callSize * 3 ? callSize * 2.5 : pot * 0.75;
    return Math.round(clamp(base, minRaise, stackSize) * 10) / 10;
  }, [callSize, pot, minRaise, stackSize]);

  // Local tray state resets per spot via a `key` on the parent (see DecisionView),
  // so initial values from the current spot are always correct.
  const [trayOpen, setTrayOpen] = useState(false);
  const [raiseValue, setRaiseValue] = useState(defaultRaise);

  const commitRaise = (size: number) => {
    onAction('raise', Math.round(clamp(size, minRaise, stackSize) * 10) / 10);
  };

  const handleRaiseClick = () => {
    if (noSizing) {
      commitRaise(defaultRaise);
    } else {
      setTrayOpen((o) => !o);
    }
  };

  const presets: { label: string; value: number }[] = [
    { label: '½ pot', value: pot * 0.5 },
    { label: '¾ pot', value: pot * 0.75 },
    { label: 'Pot', value: pot },
    { label: 'All-in', value: stackSize },
  ];

  return (
    <div className="action-panel action-panel--pokeriq">
      <div className="action-panel__pokeriq-row1">
        <button
          type="button"
          className="action-panel__piq-cell action-panel__piq-cell--fold"
          onClick={() => onAction('fold')}
          disabled={disabled}
        >
          <span className="action-panel__piq-lbl">
            Fold <span className="action-panel__piq-key">F</span>
          </span>
          <span className="action-panel__piq-val">Fold</span>
        </button>
        {canCheck ? (
          <button
            type="button"
            className="action-panel__piq-cell"
            onClick={() => onAction('check')}
            disabled={disabled}
          >
            <span className="action-panel__piq-lbl">
              Check <span className="action-panel__piq-key">C</span>
            </span>
            <span className="action-panel__piq-val action-panel__piq-val--bright">Check</span>
          </button>
        ) : (
          <button
            type="button"
            className="action-panel__piq-cell"
            onClick={() => onAction('call')}
            disabled={disabled}
          >
            <span className="action-panel__piq-lbl">
              Call · {callSize}bb <span className="action-panel__piq-key">C</span>
            </span>
            <span className="action-panel__piq-val action-panel__piq-val--bright">Call</span>
          </button>
        )}
        <button
          type="button"
          className={`action-panel__piq-cell ${trayOpen ? 'action-panel__piq-cell--armed' : ''}`}
          onClick={handleRaiseClick}
          disabled={disabled}
        >
          <span className="action-panel__piq-lbl">
            {canCheck ? 'Bet' : 'Raise'} <span className="action-panel__piq-key">R</span>
          </span>
          <span className="action-panel__piq-val action-panel__piq-val--bright">
            {noSizing ? (canCheck ? 'Bet' : 'Raise') : trayOpen ? 'Choose size…' : canCheck ? 'Bet' : 'Raise'}
          </span>
        </button>
      </div>

      {!noSizing && trayOpen && (
        <div className="action-panel__sizing-tray">
          <div className="action-panel__sizing-head">
            <span className="action-panel__piq-sizing-lbl">Raise to</span>
            <span className="action-panel__sizing-amt">{raiseValue}bb</span>
            <span className="action-panel__sizing-pct">
              {pot > 0 ? `${Math.round((raiseValue / pot) * 100)}% pot` : ''}
            </span>
          </div>
          <input
            type="range"
            className="action-panel__piq-slider"
            min={minRaise}
            max={stackSize}
            step={0.5}
            value={raiseValue}
            onChange={(e) => setRaiseValue(parseFloat(e.target.value))}
            disabled={disabled}
            aria-label="Raise size in bb"
          />
          <div className="action-panel__piq-chips">
            {presets.map((p) => {
              const v = Math.round(clamp(p.value, minRaise, stackSize) * 10) / 10;
              const on = Math.abs(v - raiseValue) < 0.05;
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`action-panel__piq-chip ${on ? 'action-panel__piq-chip--on' : ''}`}
                  onClick={() => setRaiseValue(v)}
                  disabled={disabled}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              className="action-panel__piq-confirm"
              onClick={() => commitRaise(raiseValue)}
              disabled={disabled}
            >
              Raise to {raiseValue}bb
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DefaultActionPanel({
  pot,
  callSize,
  stackSize,
  onAction,
  disabled,
}: Omit<ActionPanelProps, 'variant'>) {
  const [raiseSize, setRaiseSize] = useState<string>('');
  const [showRaiseInput, setShowRaiseInput] = useState(false);

  const canCheck = callSize === 0;
  const minRaise = callSize > 0 ? callSize * 2 : 1;

  const handleRaise = () => {
    const size = parseFloat(raiseSize);
    if (!isNaN(size) && size >= minRaise && size <= stackSize) {
      onAction('raise', size);
      setShowRaiseInput(false);
      setRaiseSize('');
    }
  };

  const handleQuickRaise = (multiplier: number) => {
    const size = Math.min(Math.round(pot * multiplier * 10) / 10, stackSize);
    onAction('raise', size);
    setShowRaiseInput(false);
    setRaiseSize('');
  };

  const handleAllIn = () => {
    onAction('raise', stackSize);
    setShowRaiseInput(false);
  };

  return (
    <div className="action-panel">
      <div className="action-panel__info">
        <span className="action-panel__info-item">
          Pot: <strong>{pot}bb</strong>
        </span>
        {callSize > 0 && (
          <span className="action-panel__info-item">
            To call: <strong>{callSize}bb</strong>
          </span>
        )}
        <span className="action-panel__info-item">
          Stack: <strong>{stackSize}bb</strong>
        </span>
      </div>

      <div className="action-panel__buttons">
        <button
          className="action-panel__btn action-panel__btn--fold"
          onClick={() => onAction('fold')}
          disabled={disabled}
        >
          Fold
        </button>

        {canCheck ? (
          <button
            className="action-panel__btn action-panel__btn--check"
            onClick={() => onAction('check')}
            disabled={disabled}
          >
            Check
          </button>
        ) : (
          <button
            className="action-panel__btn action-panel__btn--call"
            onClick={() => onAction('call')}
            disabled={disabled}
          >
            Call {callSize}bb
          </button>
        )}

        <button
          className="action-panel__btn action-panel__btn--raise"
          onClick={() => setShowRaiseInput(!showRaiseInput)}
          disabled={disabled}
        >
          Raise
        </button>
      </div>

      {showRaiseInput && (
        <div className="action-panel__raise-controls">
          <div className="action-panel__quick-sizes">
            <button
              className="action-panel__quick-btn"
              onClick={() => handleQuickRaise(0.5)}
              disabled={disabled}
            >
              ½ pot
            </button>
            <button
              className="action-panel__quick-btn"
              onClick={() => handleQuickRaise(0.75)}
              disabled={disabled}
            >
              ¾ pot
            </button>
            <button
              className="action-panel__quick-btn"
              onClick={() => handleQuickRaise(1)}
              disabled={disabled}
            >
              Pot
            </button>
            <button
              className="action-panel__quick-btn action-panel__quick-btn--allin"
              onClick={handleAllIn}
              disabled={disabled}
            >
              All-in
            </button>
          </div>

          <div className="action-panel__custom-size">
            <input
              type="number"
              className="action-panel__size-input"
              placeholder={`${minRaise}–${stackSize}`}
              value={raiseSize}
              onChange={(e) => setRaiseSize(e.target.value)}
              min={minRaise}
              max={stackSize}
              step={0.5}
              onKeyDown={(e) => e.key === 'Enter' && handleRaise()}
            />
            <button
              className="action-panel__btn action-panel__btn--confirm"
              onClick={handleRaise}
              disabled={disabled || !raiseSize}
            >
              Raise to {raiseSize || '…'}bb
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
