import { useState } from 'react';
import type { ActionType } from '../engine/types';
import './ActionPanel.css';

interface ActionPanelProps {
  pot: number;
  callSize: number;
  stackSize: number;
  onAction: (action: ActionType, sizing?: number) => void;
  disabled?: boolean;
}

export function ActionPanel({
  pot,
  callSize,
  stackSize,
  onAction,
  disabled = false,
}: ActionPanelProps) {
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
