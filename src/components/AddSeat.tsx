import { useState } from 'react';
import type { GameAction, GameState } from '../engine/types';
import { parseAmount, toInput } from '../money';
import { defaultBuyIn } from '../engine/game';

interface Props {
  game: GameState;
  seat: number;
  dispatch: (a: GameAction) => void;
  onDone: () => void;
}

/** Inline form shown in an empty seat for adding a player mid-game. */
export function AddSeat({ game, seat, dispatch, onDone }: Props) {
  const { unitScale } = game.config;
  const [name, setName] = useState('');
  const [stack, setStack] = useState(toInput(defaultBuyIn(game.config), unitScale));
  const [error, setError] = useState<string | null>(null);

  function add() {
    try {
      if (!name.trim()) throw new Error('Enter a name');
      const amount = parseAmount(stack, unitScale);
      if (amount <= 0) throw new Error('Stack must be more than zero');
      dispatch({ type: 'ADD_PLAYER', name: name.trim(), seat, stack: amount });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') add();
    if (e.key === 'Escape') onDone();
  };

  return (
    <div className="seat seat-edit">
      <input autoFocus placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
      <input inputMode="decimal" placeholder="Stack" value={stack} onChange={(e) => setStack(e.target.value)} onKeyDown={onKey} />
      {error && <small className="error">{error}</small>}
      <div className="seat-edit-buttons">
        <button onClick={onDone}>Cancel</button>
        <button className="primary" onClick={add}>
          Sit
        </button>
      </div>
    </div>
  );
}
