import { useState } from 'react';
import type { GameAction, GameState, LegalActions, Player } from '../engine/types';
import { formatAmount } from '../engine/game';
import { totalPot } from '../engine/betting';
import { parseAmount, toInput } from '../money';

interface Props {
  game: GameState;
  player: Player;
  legal: LegalActions;
  dispatch: (a: GameAction) => void;
}

export function ActionBar({ game, player, legal, dispatch }: Props) {
  const { unitScale } = game.config;
  const fmt = (n: number) => formatAmount(game.config, n);
  const [raiseTo, setRaiseTo] = useState(legal.minRaiseTo);
  const [text, setText] = useState(toInput(legal.minRaiseTo, unitScale));
  const [confirmAllIn, setConfirmAllIn] = useState(false);
  const [raising, setRaising] = useState(false);

  const act = (action: GameAction & { type: 'ACT' }) => dispatch(action);
  const clamp = (n: number) => Math.max(legal.minRaiseTo, Math.min(legal.maxRaiseTo, Math.round(n)));
  const set = (n: number) => {
    const v = clamp(n);
    setRaiseTo(v);
    setText(toInput(v, unitScale));
    setConfirmAllIn(false);
  };

  // Pot-sized raise: call first, then raise by the size of the pot after calling.
  const hand = game.hand!;
  const owed = hand.currentBet - player.streetCommitted;
  const potAfterCall = totalPot(game) + owed;
  const presets = [
    { label: 'Min', to: legal.minRaiseTo },
    { label: '½ pot', to: hand.currentBet + potAfterCall / 2 },
    { label: 'Pot', to: hand.currentBet + potAfterCall },
    { label: 'All-in', to: legal.maxRaiseTo },
  ];

  const isAllIn = raiseTo >= legal.maxRaiseTo;
  const raiseLabel = legal.isBet ? 'Bet' : 'Raise to';

  function submitRaise() {
    if (isAllIn && !confirmAllIn) {
      setConfirmAllIn(true);
      return;
    }
    act({ type: 'ACT', action: { type: 'raise', to: raiseTo } });
  }

  const callIsAllIn = legal.canCall && legal.callAmount >= player.stack;

  return (
    <div className="action-bar">
      <div className="acting-name">
        {player.name} · {fmt(player.stack)}
        {owed > 0 && <span className="muted"> · {fmt(Math.min(owed, player.stack))} to call</span>}
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
              {callIsAllIn ? 'Call all-in' : 'Call'} {fmt(legal.callAmount)}
            </button>
          )}
          {legal.canRaise && (
            <button className="raise" onClick={() => setRaising(true)}>
              {legal.isBet ? 'Bet' : 'Raise'}…
            </button>
          )}
        </div>
      ) : (
        <div className="raise-panel">
          <div className="presets">
            {presets.map((p) => (
              <button key={p.label} onClick={() => set(p.to)} disabled={clamp(p.to) === raiseTo}>
                {p.label}
              </button>
            ))}
          </div>
          {legal.minRaiseTo < legal.maxRaiseTo && (
            <input
              type="range"
              min={legal.minRaiseTo}
              max={legal.maxRaiseTo}
              step={1}
              value={raiseTo}
              onChange={(e) => set(Number(e.target.value))}
            />
          )}
          <div className="raise-row">
            <span>{game.config.currency}</span>
            <input
              inputMode="decimal"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={() => {
                try {
                  set(parseAmount(text, unitScale));
                } catch {
                  set(raiseTo);
                }
              }}
            />
          </div>
          <div className="action-buttons">
            <button onClick={() => setRaising(false)}>Back</button>
            <button className={`raise ${confirmAllIn ? 'confirm' : ''}`} onClick={submitRaise}>
              {confirmAllIn ? `Confirm all-in ${fmt(raiseTo)}` : isAllIn ? `All-in ${fmt(raiseTo)}` : `${raiseLabel} ${fmt(raiseTo)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
