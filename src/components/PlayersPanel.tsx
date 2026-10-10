import { useState } from 'react';
import type { GameAction, GameState } from '../engine/types';
import { defaultBuyIn, formatAmount } from '../engine/game';
import { freeSeats } from '../engine/table';
import { checkBlinds, parseAmount, toInput } from '../money';

interface Props {
  game: GameState;
  dispatch: (a: GameAction) => void;
  onClose: () => void;
}

export function PlayersPanel({ game, dispatch, onClose }: Props) {
  const { config } = game;
  const fmt = (n: number) => formatAmount(config, n);
  const [rebuy, setRebuy] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState('');
  const [newSeat, setNewSeat] = useState<number | ''>(freeSeats(game)[0] ?? '');
  const [newStack, setNewStack] = useState(toInput(defaultBuyIn(config), config.unitScale));
  const [sb, setSb] = useState(toInput(config.smallBlind, config.unitScale));
  const [bb, setBb] = useState(toInput(config.bigBlind, config.unitScale));
  const [error, setError] = useState<string | null>(null);

  const safely = (fn: () => void) => {
    try {
      setError(null);
      fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const players = [...game.players].sort((a, b) => a.seat - b.seat);
  // The chosen seat may have just been filled; fall back to the first free one.
  const free = freeSeats(game);
  const seatChoice: number | null = newSeat !== '' && free.includes(newSeat) ? newSeat : free.length ? free[0] : null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Players</h2>
          <button onClick={onClose}>Close</button>
        </div>

        <table className="ledger">
          <thead>
            <tr>
              <th>Seat</th>
              <th>Player</th>
              <th>Stack</th>
              <th>+/−</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {players.map((p) => {
              const net = p.stack - p.totalBuyIn;
              return (
                <tr key={p.id} className={p.sittingOut ? 'muted' : ''}>
                  <td>{p.seat + 1}</td>
                  <td>{p.name}</td>
                  <td>{fmt(p.stack)}</td>
                  <td className={net > 0 ? 'up' : net < 0 ? 'down' : ''}>
                    {net > 0 ? '+' : net < 0 ? '−' : ''}
                    {fmt(Math.abs(net))}
                  </td>
                  <td className="row-actions">
                    <input
                      inputMode="decimal"
                      placeholder="Add"
                      value={rebuy[p.id] ?? ''}
                      onChange={(e) => setRebuy({ ...rebuy, [p.id]: e.target.value })}
                    />
                    <button
                      onClick={() =>
                        safely(() => {
                          dispatch({ type: 'REBUY', playerId: p.id, amount: parseAmount(rebuy[p.id] ?? '', config.unitScale) });
                          setRebuy({ ...rebuy, [p.id]: '' });
                        })
                      }
                    >
                      Rebuy
                    </button>
                    <button onClick={() => dispatch({ type: 'SET_SITTING_OUT', playerId: p.id, sittingOut: !p.sittingOut })}>
                      {p.sittingOut ? 'Sit in' : 'Sit out'}
                    </button>
                    <button onClick={() => dispatch({ type: 'SET_BUTTON', seat: p.seat })} title="Give this player the button next hand">
                      D
                    </button>
                    <button className="danger" onClick={() => dispatch({ type: 'REMOVE_PLAYER', playerId: p.id })}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <h3>Add player</h3>
        <div className="inline-form">
          <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <select value={seatChoice ?? ''} onChange={(e) => setNewSeat(Number(e.target.value))}>
            {freeSeats(game).map((s) => (
              <option key={s} value={s}>
                Seat {s + 1}
              </option>
            ))}
          </select>
          <input inputMode="decimal" placeholder="Stack" value={newStack} onChange={(e) => setNewStack(e.target.value)} />
          <button
            disabled={!newName.trim() || seatChoice === null}
            onClick={() =>
              safely(() => {
                dispatch({
                  type: 'ADD_PLAYER',
                  name: newName.trim(),
                  seat: Number(seatChoice),
                  stack: parseAmount(newStack, config.unitScale),
                });
                setNewName('');
              })
            }
          >
            Add
          </button>
        </div>

        <h3>Blinds</h3>
        <div className="inline-form">
          <input inputMode="decimal" value={sb} onChange={(e) => setSb(e.target.value)} />
          <span>/</span>
          <input inputMode="decimal" value={bb} onChange={(e) => setBb(e.target.value)} />
          <button
            onClick={() =>
              safely(() => {
                const smallBlind = parseAmount(sb, config.unitScale);
                const bigBlind = parseAmount(bb, config.unitScale);
                checkBlinds(smallBlind, bigBlind);
                dispatch({ type: 'UPDATE_CONFIG', config: { smallBlind, bigBlind } });
              })
            }
          >
            Update
          </button>
        </div>

        {error && <p className="error">{error}</p>}

      </div>
    </div>
  );
}
