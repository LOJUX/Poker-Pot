import { useState } from 'react';
import type { GameAction, GameState } from '../engine/types';
import { formatAmount } from '../engine/game';

interface Props {
  game: GameState;
  dispatch: (a: GameAction) => void;
}

export function ShowdownPanel({ game, dispatch }: Props) {
  const hand = game.hand!;
  const pots = hand.pots;
  const fmt = (n: number) => formatAmount(game.config, n);
  const name = (id: string) => game.players.find((p) => p.id === id)!.name;
  // Pots with only one eligible player are pre-filled.
  const [winners, setWinners] = useState<string[][]>(() => pots.map((p) => (p.eligible.length === 1 ? [...p.eligible] : [])));

  const contenders = [...new Set(pots.flatMap((p) => p.eligible))];

  function toggle(potIdx: number, id: string) {
    setWinners((w) =>
      w.map((ws, i) => (i !== potIdx ? ws : ws.includes(id) ? ws.filter((x) => x !== id) : [...ws, id])),
    );
  }

  /** "Best hand": wins every pot they're eligible for; leaves the others alone. */
  function bestHand(id: string) {
    setWinners((w) => w.map((ws, i) => (pots[i].eligible.includes(id) ? [id] : ws)));
  }

  const ready = winners.every((w) => w.length > 0);

  return (
    <div className="showdown">
      <div className="panel-title">
        <h2>Who won?</h2>
      </div>
      {hand.allInRunout && <p className="muted">Everyone's all-in: deal the rest of the board, then pick the winners.</p>}

      {pots.length > 1 && (
        <div className="quick">
          <span className="muted">Best hand:</span>
          {contenders.map((id) => (
            <button key={id} onClick={() => bestHand(id)}>
              {name(id)}
            </button>
          ))}
        </div>
      )}

      {pots.map((pot, i) => (
        <div key={i} className="pot-pick">
          <div className="pot-title">
            {pots.length === 1 ? 'Pot' : i === 0 ? 'Main pot' : `Side pot ${i}`} · {fmt(pot.amount)}
            {winners[i].length > 1 && <span className="muted"> · split {winners[i].length} ways</span>}
          </div>
          <div className="picks">
            {pot.eligible.map((id) => (
              <button
                key={id}
                className={winners[i].includes(id) ? 'selected' : ''}
                onClick={() => toggle(i, id)}
                aria-pressed={winners[i].includes(id)}
              >
                {name(id)}
              </button>
            ))}
          </div>
        </div>
      ))}

      <p className="muted small">Tap more than one player to split a pot.</p>
      <button className="primary big" disabled={!ready} onClick={() => dispatch({ type: 'AWARD_POTS', winners })}>
        Pay out
      </button>
    </div>
  );
}
