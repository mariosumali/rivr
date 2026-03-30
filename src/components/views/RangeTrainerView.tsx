import { useState } from 'react';
import { BTN_OPENING_RANGE, type RangeTier } from '../../data/btnOpeningRange';

const POSITIONS = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;

function tierClass(t: RangeTier): string {
  if (t === 'raise') return 'piq-rg--raise';
  if (t === 'call') return 'piq-rg--call';
  return 'piq-rg--fold';
}

export function RangeTrainerView() {
  const [pos, setPos] = useState<(typeof POSITIONS)[number]>('BTN');

  return (
    <div className="piq-range-shell">
      <div className="piq-range-center">
        <div className="piq-range-hud">
          <span className="piq-range-title">Opening Ranges</span>
          <span className="piq-range-meta">100bb · 6-max</span>
          <div className="piq-pos-tabs">
            {POSITIONS.map((p) => (
              <button
                key={p}
                type="button"
                className={pos === p ? 'piq-pos-tabs__on' : ''}
                onClick={() => setPos(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="piq-range-grid" aria-label="Opening range matrix">
          {pos === 'BTN'
            ? BTN_OPENING_RANGE.map((cell) => (
                <div key={cell.label} className={`piq-rg ${tierClass(cell.tier)}`}>
                  {cell.label}
                </div>
              ))
            : Array.from({ length: 169 }, (_, i) => (
                <div key={i} className="piq-rg piq-rg--fold">
                  —
                </div>
              ))}
        </div>
        {pos === 'BTN' && (
          <div className="piq-range-legend">
            <div className="piq-leg">
              <span className="piq-leg__sw" style={{ background: 'rgba(184,50,40,0.35)' }} />
              Raise · 44%
            </div>
            <div className="piq-leg">
              <span className="piq-leg__sw" style={{ background: 'rgba(74,126,160,0.3)' }} />
              Call · 8%
            </div>
            <div className="piq-leg">
              <span
                className="piq-leg__sw"
                style={{ background: 'var(--piq-ink-2)', border: '1px solid var(--piq-line)' }}
              />
              Fold · 48%
            </div>
          </div>
        )}
        {pos !== 'BTN' && (
          <p className="piq-panel-placeholder" style={{ marginTop: 12 }}>
            Range charts for {pos} ship in a later build. BTN is fully interactive.
          </p>
        )}
      </div>
      <div className="piq-range-right">
        <div className="piq-sidebar__lbl">Your hand · {pos}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', padding: '8px 0' }}>
          <MiniCard rank="Q" suit="♥" color="#b83228" />
          <MiniCard rank="J" suit="♦" color="#4a7ea0" />
        </div>
        <div className="piq-range-meta" style={{ textAlign: 'center' }}>
          QJo · vs no prior action
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
          <button type="button" className="piq-skip" style={{ padding: '14px 8px', textAlign: 'center' }}>
            Fold
          </button>
          <button type="button" className="piq-skip" style={{ padding: '14px 8px', textAlign: 'center' }}>
            Call
          </button>
          <button type="button" className="piq-skip" style={{ padding: '14px 8px', textAlign: 'center' }}>
            Raise
          </button>
        </div>
        <div className="piq-sidebar__lbl" style={{ marginTop: 20 }}>
          Position accuracy
        </div>
        <AccRow label="BTN" pct={82} bad={false} />
        <AccRow label="CO" pct={74} bad={false} />
        <AccRow label="HJ" pct={61} bad={false} />
        <AccRow label="UTG" pct={48} bad />
        <AccRow label="SB" pct={55} bad />
        <AccRow label="BB" pct={69} bad={false} />
      </div>
    </div>
  );
}

function MiniCard({ rank, suit, color }: { rank: string; suit: string; color: string }) {
  return (
    <div
      style={{
        width: 52,
        height: 72,
        borderRadius: 8,
        border: '1px solid var(--piq-line-hi)',
        background: 'var(--piq-ink-2)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        fontWeight: 600,
        color,
      }}
    >
      {rank}
      <span style={{ fontSize: 22, lineHeight: 1 }}>{suit}</span>
    </div>
  );
}

function AccRow({ label, pct, bad }: { label: string; pct: number; bad: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontFamily: 'var(--piq-mono)', fontSize: 10, width: 32, color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 3, background: 'var(--piq-line-hi)', borderRadius: 2 }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 2,
            background: bad ? 'var(--piq-danger)' : 'var(--color-text-primary)',
          }}
        />
      </div>
      <span
        style={{
          fontFamily: 'var(--piq-mono)',
          fontSize: 10,
          width: 32,
          textAlign: 'right',
          color: bad ? 'var(--piq-danger)' : 'var(--color-text-secondary)',
        }}
      >
        {pct}%
      </span>
      {bad && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--piq-danger)' }} />
      )}
    </div>
  );
}
