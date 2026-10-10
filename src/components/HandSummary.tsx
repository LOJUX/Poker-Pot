import type { GameState } from '../engine/types';
import { formatAmount } from '../engine/game';

export function HandSummary({ game }: { game: GameState }) {
  const result = game.hand?.result;
  if (!result) return null;
  const fmt = (n: number) => formatAmount(game.config, n);
  const name = (id: string) => game.players.find((p) => p.id === id)?.name ?? '?';

  const totals: Record<string, number> = {};
  for (const pot of result.pots) {
    for (const [id, amt] of Object.entries(pot.payouts)) totals[id] = (totals[id] ?? 0) + amt;
  }

  return (
    <div className="summary">
      {Object.entries(totals).map(([id, amt]) => (
        <div key={id} className="winner">
          🏆 {name(id)} wins {fmt(amt)}
        </div>
      ))}
      {result.pots.length > 1 && (
        <ul className="muted">
          {result.pots.map((pot, i) => (
            <li key={i}>
              {i === 0 ? 'Main pot' : `Side pot ${i}`} {fmt(pot.amount)} → {pot.winners.map(name).join(' & ')}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
