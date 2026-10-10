import { useState } from 'react';
import type { GameAction, GameState } from '../engine/types';
import { parseAmount, toInput } from '../money';
import { defaultBuyIn, handInProgress } from '../engine/game';
import { Modal } from './Modal';

interface Props {
  game: GameState;
  seat: number;
  dispatch: (a: GameAction) => void;
  onDone: () => void;
}

/** Seat a new player at any time; mid-hand they're dealt in from the next hand. */
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

  return (
    <Modal title={`Seat ${seat + 1}`} onClose={onDone} narrow>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label>
          Name
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Stack
          <input inputMode="decimal" value={stack} onChange={(e) => setStack(e.target.value)} />
        </label>
        {handInProgress(game) && <p className="muted small">They'll be dealt in from the next hand.</p>}
        {error && <p className="error">{error}</p>}
        <button className="primary big" type="submit">
          Sit down
        </button>
      </form>
    </Modal>
  );
}
