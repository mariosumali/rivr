import { useState } from 'react';
import type { ActionType } from '../engine/types';
import './ActionPanel.css';

interface ActionPanelProps {
  pot: number;
  callSize: number;
  stackSize: number;
  onAction: (action: ActionType, sizing?: number) => void;
  disabled?: boolean;
  variant?: 'default' | 'pokeriq';
}

export function ActionPanel({
  pot,
  callSize,
  stackSize,
  onAction,
  disabled = false,
  variant = 'default',
}: ActionPanelProps) {
  if (variant === 'pokeriq') {
    return (
      <PokeriqActionPanel
        pot={pot}
        callSize={callSize}
        stackSize={stackSize}
        onAction={onAction}
        disabled={disabled}
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

function PokeriqActionPanel({
  pot,
  callSize,
  stackSize,
  onAction,
  disabled,
}: Omit<ActionPanelProps, 'variant'>) {
  const [raiseSize, setRaiseSize] = useState('');
  const [preset, setPreset] = useState<'half' | 'threeQuarter' | 'pot' | null>(null);

  const canCheck = callSize === 0;
  const minRaise = callSize > 0 ? callSize * 2 : 1;

  const handleQuickRaise = (multiplier: number, key: typeof preset) => {
    const size = Math.min(Math.round(pot * multiplier * 10) / 10, stackSize);
    setPreset(key);
    onAction('raise', size);
    setRaiseSize('');
  };

  const handleAllIn = () => {
    setPreset(null);
    onAction('raise', stackSize);
    setRaiseSize('');
  };

  const handleCustomRaise = () => {
    const size = parseFloat(raiseSize);
    if (!Number.isNaN(size) && size >= minRaise && size <= stackSize) {
      setPreset(null);
      onAction('raise', size);
      setRaiseSize('');
    }
  };

  return (
    <div className="action-panel action-panel--pokeriq">
      <div className="action-panel__pokeriq-row1">
        <button
          type="button"
          className="action-panel__piq-cell"
          onClick={() => onAction('fold')}
          disabled={disabled}
        >
          <span className="action-panel__piq-lbl">Action</span>
          <span className="action-panel__piq-val">Fold</span>
        </button>
        {canCheck ? (
          <button
            type="button"
            className="action-panel__piq-cell"
            onClick={() => onAction('check')}
            disabled={disabled}
          >
            <span className="action-panel__piq-lbl">Action</span>
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
              Action <span className="action-panel__piq-lbl-dim">· {callSize}bb</span>
            </span>
            <span className="action-panel__piq-val action-panel__piq-val--bright">Call</span>
          </button>
        )}
        <button type="button" className="action-panel__piq-cell" disabled={disabled}>
          <span className="action-panel__piq-lbl">Action</span>
          <span className="action-panel__piq-val action-panel__piq-val--bright">Raise</span>
        </button>
      </div>
      <div className="action-panel__pokeriq-row2">
        <span className="action-panel__piq-sizing-lbl">Sizing</span>
        <div className="action-panel__piq-chips">
          <button
            type="button"
            className={`action-panel__piq-chip ${preset === 'half' ? 'action-panel__piq-chip--on' : ''}`}
            onClick={() => handleQuickRaise(0.5, 'half')}
            disabled={disabled}
          >
            ½ pot
          </button>
          <button
            type="button"
            className={`action-panel__piq-chip ${preset === 'threeQuarter' ? 'action-panel__piq-chip--on' : ''}`}
            onClick={() => handleQuickRaise(0.75, 'threeQuarter')}
            disabled={disabled}
          >
            ¾ pot
          </button>
          <button
            type="button"
            className={`action-panel__piq-chip ${preset === 'pot' ? 'action-panel__piq-chip--on' : ''}`}
            onClick={() => handleQuickRaise(1, 'pot')}
            disabled={disabled}
          >
            Pot
          </button>
          <button type="button" className="action-panel__piq-chip" onClick={handleAllIn} disabled={disabled}>
            All-in
          </button>
          <input
            type="number"
            className="action-panel__piq-input"
            placeholder={`${minRaise}–${stackSize}`}
            value={raiseSize}
            onChange={(e) => setRaiseSize(e.target.value)}
            min={minRaise}
            max={stackSize}
            step={0.5}
            disabled={disabled}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomRaise()}
            aria-label="Raise size in bb"
          />
        </div>
      </div>
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
