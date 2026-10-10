import { useState } from 'react';
import { createGame } from '../engine/game';
import type { GameState } from '../engine/types';
import { TableLayout } from './TableLayout';
import { parseAmount } from '../money';

interface Props {
  onStart: (game: GameState) => void;
}

export function SetupScreen({ onStart }: Props) {
  const [maxSeats, setMaxSeats] = useState(8);
  const [currency, setCurrency] = useState('£');
  const [smallBlind, setSmallBlind] = useState('0.10');
  const [bigBlind, setBigBlind] = useState('0.20');
  const [buyIn, setBuyIn] = useState('20');
  const [names, setNames] = useState<Record<number, string>>({});
  const [stacks, setStacks] = useState<Record<number, string>>({});
  const [button, setButton] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unitScale = currency ? 100 : 1;
  const seated = Object.entries(names)
    .map(([seat, name]) => ({ seat: Number(seat), name: name.trim() }))
    .filter((p) => p.name && p.seat < maxSeats);

  function start() {
    try {
      const sb = parseAmount(smallBlind, unitScale);
      const bb = parseAmount(bigBlind, unitScale);
      if (sb <= 0 || bb < sb) throw new Error('Big blind must be at least the small blind');
      if (seated.length < 2) throw new Error('Seat at least two players');
      const players = seated.map((p) => ({
        name: p.name,
        seat: p.seat,
        stack: parseAmount(stacks[p.seat] || buyIn, unitScale),
      }));
      if (players.some((p) => p.stack <= 0)) throw new Error('Every player needs a stack');
      const btn =
        button != null && seated.some((p) => p.seat === button)
          ? button
          : seated[Math.floor(Math.random() * seated.length)].seat;
      onStart(createGame({ maxSeats, smallBlind: sb, bigBlind: bb, currency, unitScale }, players, btn));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="setup">
      <h1>Poker Pot</h1>
      <p className="muted">Tap a seat to add a player where they're sitting. Tap “D” to choose the first dealer.</p>

      <div className="setup-grid">
        <label>
          Seats
          <select value={maxSeats} onChange={(e) => setMaxSeats(Number(e.target.value))}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Currency
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="£">£</option>
            <option value="$">$</option>
            <option value="€">€</option>
            <option value="">Chips</option>
          </select>
        </label>
        <label>
          Small blind
          <input inputMode="decimal" value={smallBlind} onChange={(e) => setSmallBlind(e.target.value)} />
        </label>
        <label>
          Big blind
          <input inputMode="decimal" value={bigBlind} onChange={(e) => setBigBlind(e.target.value)} />
        </label>
        <label>
          Default buy-in
          <input inputMode="decimal" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} />
        </label>
      </div>

      <TableLayout
        maxSeats={maxSeats}
        center={<span className="muted">{seated.length} player{seated.length === 1 ? '' : 's'}</span>}
        renderSeat={(seat) => {
          const name = names[seat]?.trim();
          if (editing === seat) {
            return (
              <div className="seat seat-edit">
                <input
                  autoFocus
                  placeholder="Name"
                  value={names[seat] ?? ''}
                  onChange={(e) => setNames({ ...names, [seat]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                />
                <input
                  inputMode="decimal"
                  placeholder={`Stack (${buyIn})`}
                  value={stacks[seat] ?? ''}
                  onChange={(e) => setStacks({ ...stacks, [seat]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && setEditing(null)}
                />
                <button onClick={() => setEditing(null)}>Done</button>
              </div>
            );
          }
          return (
            <div className={`seat ${name ? '' : 'seat-empty'}`}>
              <button className="seat-main" onClick={() => setEditing(seat)}>
                {name || `Seat ${seat + 1}`}
                {name && <small>{currency}{stacks[seat] || buyIn}</small>}
              </button>
              {name && (
                <button
                  className={`badge badge-d ${button === seat ? 'on' : 'off'}`}
                  onClick={() => setButton(seat)}
                  title="Dealer"
                >
                  D
                </button>
              )}
            </div>
          );
        }}
      />

      {error && <p className="error">{error}</p>}
      <button className="primary big" onClick={start}>
        Start game{button == null && seated.length >= 2 ? ' (random dealer)' : ''}
      </button>
    </div>
  );
}
