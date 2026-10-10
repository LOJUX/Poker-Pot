import type { GameState } from '../engine/types';
import { formatAmount } from '../engine/game';

interface Props {
  game: GameState;
  onCancel: () => void;
  onNewGame: (samePlayers: boolean) => void;
}

/** Confirms ending the current game, showing final standings first. */
export function NewGameDialog({ game, onCancel, onNewGame }: Props) {
  const fmt = (n: number) => formatAmount(game.config, n);
  // Chips still in the middle of an unfinished hand are shown as part of each player's stack.
  const standings = game.players
    .map((p) => ({ ...p, total: p.stack + p.handCommitted }))
    .sort((a, b) => b.total - b.totalBuyIn - (a.total - a.totalBuyIn));

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal narrow" onClick={(e) => e.stopPropagation()}>
        <h2>Start a new game?</h2>
        <p className="muted">This ends the current game. Here's where everyone finished:</p>
        <table className="ledger">
          <tbody>
            {standings.map((p) => {
              const net = p.total - p.totalBuyIn;
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{fmt(p.total)}</td>
                  <td className={net > 0 ? 'up' : net < 0 ? 'down' : ''}>
                    {net > 0 ? '+' : net < 0 ? '−' : ''}
                    {fmt(Math.abs(net))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="dialog-buttons">
          <button className="primary" onClick={() => onNewGame(true)}>
            New game, same players
          </button>
          <button onClick={() => onNewGame(false)}>New game, empty table</button>
          <button onClick={onCancel}>Keep playing</button>
        </div>
      </div>
    </div>
  );
}
