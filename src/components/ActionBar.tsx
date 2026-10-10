import { useState } from 'react';
import type { GameAction, GameState, LegalActions, Player } from '../engine/types';
import { formatAmount } from '../engine/game';
import { totalPot } from '../engine/betting';
import { ChipStack } from './ChipStack';

interface Props {
  game: GameState;
  player: Player;
  legal: LegalActions;
  unit: number;
  dispatch: (a: GameAction) => void;
}

export function ActionBar({ game, player, legal, unit, dispatch }: Props) {
  const fmt = (n: number) => formatAmount(game.config, n);
  const [raising, setRaising] = useState(false);
  const [raiseTo, setRaiseTo] = useState(legal.minRaiseTo);
  const [confirmAllIn, setConfirmAllIn] = useState(false);

  const act = (action: GameAction & { type: 'ACT' }) => dispatch(action);
  const clamp = (n: number) => Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.round(n)));
  const set = (n: number) => {
    setRaiseTo(clamp(n));
    setConfirmAllIn(false);
  };

  const hand = game.hand!;
  const owed = Math.max(0, hand.currentBet - player.streetCommitted);
  // Pot-sized raise: call first, then raise by the size of the pot after calling.
  const potAfterCall = totalPot(game) + owed;
  const presets = [
    { label: 'Min', to: legal.minRaiseTo },
    { label: '½ pot', to: hand.currentBet + potAfterCall / 2 },
    { label: 'Pot', to: hand.currentBet + potAfterCall },
    { label: 'All-in', to: legal.maxRaiseTo },
  ];
  const step = game.config.bigBlind;
  const isAllIn = raiseTo >= legal.maxRaiseTo;
  const callIsAllIn = legal.canCall && legal.callAmount >= player.stack;

  function submitRaise() {
    if (isAllIn && !confirmAllIn) {
      setConfirmAllIn(true);
      return;
    }
    act({ type: 'ACT', action: { type: 'raise', to: raiseTo } });
  }

  return (
    <div className="action-bar">
      <div className="panel-head">
        <strong>{player.name}</strong>
        <ChipStack amount={player.stack} unit={unit} size="sm" />
        <span>{fmt(player.stack)}</span>
        {owed > 0 && <span className="muted">· {fmt(Math.min(owed, player.stack))} to call</span>}
      </div>

      {!raising ? (
        <div className="action-buttons">
          <button className="fold" onClick={() => act({ type: 'ACT', action: { type: 'fold' } })}>
            Fold
          </button>
          {legal.canCheck && (
            <button className="check" onClick={() => act({ type: 'ACT', action: { type: 'check' } })}>
              Check
            </button>
          )}
          {legal.canCall && (
            <button className="call" onClick={() => act({ type: 'ACT', action: { type: 'call' } })}>
              {callIsAllIn ? 'All-in' : 'Call'} {fmt(legal.callAmount)}
            </button>
          )}
          {legal.canRaise && (
            <button className="raise" onClick={() => setRaising(true)}>
              {legal.isBet ? 'Bet' : 'Raise'}
            </button>
          )}
        </div>
      ) : (
        <div className="raise-panel">
          <div className="presets">
            {presets.map((p) => (
              <button key={p.label} onClick={() => set(p.to)} className={clamp(p.to) === raiseTo ? 'selected' : ''}>
                {p.label}
              </button>
            ))}
          </div>
          {legal.minRaiseTo < legal.maxRaiseTo && (
            <div className="slider-row">
              <button className="icon" onClick={() => set(raiseTo - step)} aria-label="Less">
                −
              </button>
              <input
                type="range"
                min={legal.minRaiseTo}
                max={legal.maxRaiseTo}
                step={1}
                value={raiseTo}
                onChange={(e) => set(Number(e.target.value))}
                aria-label="Amount"
              />
              <button className="icon" onClick={() => set(raiseTo + step)} aria-label="More">
                +
              </button>
            </div>
          )}
          <div className="action-buttons">
            <button className="back" onClick={() => setRaising(false)}>
              Back
            </button>
            <button className={`raise ${confirmAllIn ? 'confirm' : ''}`} onClick={submitRaise}>
              {confirmAllIn
                ? `Confirm all-in ${fmt(raiseTo)}`
                : isAllIn
                  ? `All-in ${fmt(raiseTo)}`
                  : `${legal.isBet ? 'Bet' : 'Raise to'} ${fmt(raiseTo)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
