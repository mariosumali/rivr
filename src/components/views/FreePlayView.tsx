import { useEffect, useMemo, useState } from 'react';
import { PokerTable, type PlayerData } from '../PokerTable';
import {
  ARCHETYPES,
  boardForStreet,
  botStep,
  heroActStep,
  heroOptions,
  newHand,
  type Archetype,
  type FPAction,
  type FreePlayState,
} from '../../lib/freePlay';
import type { CardAnimationState } from '../../engine/types';
import { streetLabel } from './reviewFormat';
import './freeplay.css';

export function FreePlayView() {
  const [archetype, setArchetype] = useState<Archetype | null>(null);
  const [state, setState] = useState<FreePlayState | null>(null);
  const [net, setNet] = useState(0);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [anim, setAnim] = useState<CardAnimationState>('idle');

  const startHand = (arch: Archetype) => {
    setArchetype(arch);
    setState(newHand(arch));
    setAnim('dealing');
  };

  const nextHand = () => {
    if (state) {
      setNet((n) => Math.round((n + (state.heroStack - 100)) * 100) / 100);
      setHandsPlayed((h) => h + 1);
    }
    if (archetype) {
      setState(newHand(archetype));
      setAnim('dealing');
    }
  };

  const act = (action: FPAction, target?: number) => {
    if (!state) return;
    setState(heroActStep(state, action, target));
  };

  // Step the bot with a short delay so the opponent's actions are visible and
  // the hand flows street by street instead of resolving instantly.
  useEffect(() => {
    if (!state || state.handOver || state.toAct !== 'villain') return;
    const id = setTimeout(() => setState((s) => (s ? botStep(s) : s)), 750);
    return () => clearTimeout(id);
  }, [state]);

  // The initial deal animates the hole cards; board reveals animate themselves.
  useEffect(() => {
    if (anim !== 'dealing') return;
    const id = setTimeout(() => setAnim('idle'), 650);
    return () => clearTimeout(id);
  }, [anim]);

  if (!archetype || !state) {
    return <ArchetypeSelect onSelect={startHand} net={net} hands={handsPlayed} />;
  }

  const board = boardForStreet(state.fullBoard, state.street);
  const opts = heroOptions(state);

  const players: PlayerData[] = [
    {
      position: 'BTN',
      stackSize: Math.round(state.heroStack),
      isHero: true,
      isActive: state.toAct === 'hero' && !state.handOver,
      cards: state.heroHole,
      faceDown: false,
      betAmount: state.streetHero || undefined,
    },
    {
      position: 'BB',
      stackSize: Math.round(state.villainStack),
      isActive: state.toAct === 'villain' && !state.handOver,
      cards: state.villainHole,
      faceDown: !state.villainRevealed,
      betAmount: state.streetVillain || undefined,
    },
  ];

  return (
    <div className="fp-shell">
      <div className="fp-hud">
        <span className="piq-pill piq-pill--on">{ARCHETYPES[archetype].tag}</span>
        <span className="piq-pill">{ARCHETYPES[archetype].name}</span>
        <span className="piq-pill">{streetLabel(state.street)}</span>
        <span className="piq-pill piq-pill--ghost">Hand strength {Math.round(state.heroStrength * 100)}%</span>
        <div className="fp-hud__right">
          <span className={`fp-net ${net >= 0 ? 'fp-net--pos' : 'fp-net--neg'}`}>
            {net >= 0 ? '+' : ''}
            {net}bb
          </span>
          <span className="fp-net__lbl">{handsPlayed} hands</span>
          <button type="button" className="piq-skip" onClick={() => setArchetype(null)}>
            Change foe
          </button>
        </div>
      </div>

      <div className="fp-table-wrap">
        <PokerTable players={players} communityCards={board} pot={Math.round(state.pot * 10) / 10} animationState={anim} />
      </div>

      <div className="fp-bottom">
        <div className="fp-log">
          {state.log.slice(-3).map((l, i) => (
            <span key={i} className={`fp-log__item fp-log__item--${l.who}`}>
              {l.text}
            </span>
          ))}
        </div>

        {state.handOver ? (
          <div className="fp-result">
            <span className={`fp-result__txt ${state.winner === 'hero' ? 'fp-result__txt--win' : state.winner === 'villain' ? 'fp-result__txt--lose' : ''}`}>
              {state.finalNote}
            </span>
            <button type="button" className="fp-next" onClick={nextHand}>
              Next hand
            </button>
          </div>
        ) : state.toAct === 'hero' ? (
          <HeroControls opts={opts} state={state} onAct={act} />
        ) : (
          <div className="fp-thinking">{ARCHETYPES[archetype].name} is thinking…</div>
        )}
      </div>
    </div>
  );
}

function HeroControls({
  opts,
  state,
  onAct,
}: {
  opts: ReturnType<typeof heroOptions>;
  state: FreePlayState;
  onAct: (action: FPAction, target?: number) => void;
}) {
  const fractions = useMemo(
    () => [
      { label: '⅓', f: 1 / 3 },
      { label: '½', f: 0.5 },
      { label: '¾', f: 0.75 },
      { label: 'Pot', f: 1 },
    ],
    [],
  );

  const betTarget = (f: number) => {
    const base = opts.canRaise ? state.streetVillain : state.streetHero;
    const t = base + state.pot * f;
    return Math.round(Math.min(t, state.streetHero + state.heroStack) * 100) / 100;
  };
  const allInTarget = Math.round((state.streetHero + state.heroStack) * 100) / 100;
  const sizingVerb = opts.canRaise ? 'raise' : 'bet';

  return (
    <div className="fp-controls">
      <div className="fp-controls__primary">
        {opts.canFold && (
          <button type="button" className="fp-btn fp-btn--fold" onClick={() => onAct('fold')}>
            Fold
          </button>
        )}
        {opts.canCheck && (
          <button type="button" className="fp-btn fp-btn--call" onClick={() => onAct('check')}>
            Check
          </button>
        )}
        {opts.canCall && (
          <button type="button" className="fp-btn fp-btn--call" onClick={() => onAct('call')}>
            Call {Math.round(opts.callAmount * 10) / 10}bb
          </button>
        )}
      </div>
      {(opts.canBet || opts.canRaise) && (
        <div className="fp-controls__sizing">
          <span className="fp-controls__lbl">{opts.canRaise ? 'Raise to' : 'Bet'}</span>
          {fractions.map((fr) => (
            <button
              key={fr.label}
              type="button"
              className="fp-size"
              onClick={() => onAct(sizingVerb, betTarget(fr.f))}
            >
              {fr.label}
            </button>
          ))}
          <button type="button" className="fp-size fp-size--allin" onClick={() => onAct(sizingVerb, allInTarget)}>
            All-in
          </button>
        </div>
      )}
    </div>
  );
}

function ArchetypeSelect({
  onSelect,
  net,
  hands,
}: {
  onSelect: (a: Archetype) => void;
  net: number;
  hands: number;
}) {
  const order: Archetype[] = ['TAG', 'LAG', 'LP', 'Nit'];
  return (
    <div className="fp-select">
      <div className="fp-select__head">
        <h2 className="piq-start__h">Free Play</h2>
        <p className="piq-start__p">
          Play a real heads-up hand to showdown — no training wheels. Pick an opponent archetype and
          exploit how it plays. You're on the button.
        </p>
        {hands > 0 && (
          <p className="fp-select__net">
            Session: <strong className={net >= 0 ? 'fp-net--pos' : 'fp-net--neg'}>{net >= 0 ? '+' : ''}{net}bb</strong> over {hands} hands
          </p>
        )}
      </div>
      <div className="fp-select__grid">
        {order.map((a) => (
          <button key={a} type="button" className="fp-card" onClick={() => onSelect(a)}>
            <span className="fp-card__tag">{ARCHETYPES[a].tag}</span>
            <span className="fp-card__name">{ARCHETYPES[a].name}</span>
            <span className="fp-card__desc">{ARCHETYPES[a].description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
