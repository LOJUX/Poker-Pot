import { useRef, useState } from 'react';
import { createGame, formatAmount } from '../engine/game';
import type { Config, GameState } from '../engine/types';
import { SEAT_INSET, seatGeometry } from '../layout/geometry';
import { useElementSize } from '../hooks';
import { EmptySeat, Seat } from './Seat';
import { chipUnit } from './ChipStack';
import { Modal } from './Modal';
import { checkBlinds, parseAmount, toInput } from '../money';

const MONEY_DEFAULTS = { sb: '0.10', bb: '0.20', buyIn: '20' };
const CHIP_DEFAULTS = { sb: '5', bb: '10', buyIn: '1000' };

/** Settings and seating carried over from a previous game. */
export interface SetupPrefill {
  config: Config;
  players: { name: string; seat: number }[];
}

interface Props {
  onStart: (game: GameState) => void;
  prefill?: SetupPrefill | null;
}

export function SetupScreen({ onStart, prefill }: Props) {
  const pc = prefill?.config;
  const asInput = (n: number) => toInput(n, pc!.unitScale);
  const [maxSeats, setMaxSeats] = useState(pc?.maxSeats ?? 8);
  const [currency, setCurrency] = useState(pc?.currency ?? '£');
  const [smallBlind, setSmallBlind] = useState(pc ? asInput(pc.smallBlind) : MONEY_DEFAULTS.sb);
  const [bigBlind, setBigBlind] = useState(pc ? asInput(pc.bigBlind) : MONEY_DEFAULTS.bb);
  const [buyIn, setBuyIn] = useState(pc ? asInput(pc.defaultBuyIn ?? pc.bigBlind * 100) : MONEY_DEFAULTS.buyIn);
  const [names, setNames] = useState<Record<number, string>>(() =>
    Object.fromEntries((prefill?.players ?? []).map((p) => [p.seat, p.name])),
  );
  const [stacks, setStacks] = useState<Record<number, string>>({});
  const [button, setButton] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useElementSize(ref);

  const unitScale = currency ? 100 : 1;
  const seated = Object.entries(names)
    .map(([seat, name]) => ({ seat: Number(seat), name: name.trim() }))
    .filter((p) => p.name && p.seat < maxSeats);

  // Best-effort config for previewing amounts and chips while fields are being edited.
  const safe = (text: string, fallback: number) => {
    try {
      return parseAmount(text, unitScale);
    } catch {
      return fallback;
    }
  };
  const preview: Config = {
    maxSeats,
    currency,
    unitScale,
    smallBlind: safe(smallBlind, 0),
    bigBlind: safe(bigBlind, 0),
    defaultBuyIn: safe(buyIn, 100 * unitScale),
  };
  const fmt = (n: number) => formatAmount(preview, n);
  const unit = chipUnit(preview);
  const stackOf = (seat: number) => safe(stacks[seat] || buyIn, 0);

  function closeEditor() {
    if (editing != null && !names[editing]?.trim()) removeSeat(editing);
    setEditing(null);
  }

  function removeSeat(seat: number) {
    const { [seat]: _n, ...restNames } = names;
    const { [seat]: _s, ...restStacks } = stacks;
    setNames(restNames);
    setStacks(restStacks);
    if (button === seat) setButton(null);
    setEditing(null);
  }

  /** Switching between money and chips swaps in sensible defaults for any field still on the old default. */
  function changeCurrency(next: string) {
    const [from, to] = next ? [CHIP_DEFAULTS, MONEY_DEFAULTS] : [MONEY_DEFAULTS, CHIP_DEFAULTS];
    if (!currency !== !next) {
      if (smallBlind === from.sb) setSmallBlind(to.sb);
      if (bigBlind === from.bb) setBigBlind(to.bb);
      if (buyIn === from.buyIn) setBuyIn(to.buyIn);
    }
    setCurrency(next);
    setError(null);
  }

  function start() {
    try {
      const sb = parseAmount(smallBlind, unitScale);
      const bb = parseAmount(bigBlind, unitScale);
      checkBlinds(sb, bb);
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
      const defaultBuyIn = parseAmount(buyIn, unitScale);
      onStart(createGame({ maxSeats, smallBlind: sb, bigBlind: bb, currency, unitScale, defaultBuyIn }, players, btn));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="arena" ref={ref}>
      {w > 0 &&
        Array.from({ length: maxSeats }, (_, seat) => {
          const g = seatGeometry(seat, maxSeats, w, h, SEAT_INSET);
          const name = names[seat]?.trim();
          if (!name) {
            return <EmptySeat key={seat} geom={g} onClick={() => setEditing(seat)} label={`Seat ${seat + 1}`} />;
          }
          return (
            <Seat
              key={seat}
              geom={g}
              name={name}
              stack={stackOf(seat)}
              unit={unit}
              fmt={fmt}
              onClick={() => setEditing(seat)}
              tags={button === seat ? <span className="tag tag-d">D</span> : null}
            />
          );
        })}

      <div className="center setup-center">
        <h1>Poker Pot</h1>
        <p className="muted small">Lay the phone in the middle of the table. Tap the + nearest each player to seat them.</p>
        <button className="settings-summary" onClick={() => setShowSettings(true)}>
          {maxSeats} seats · {fmt(preview.smallBlind)}/{fmt(preview.bigBlind)} · {fmt(preview.defaultBuyIn!)} buy-in
          <span className="muted"> ⚙</span>
        </button>
        {error && <p className="error small">{error}</p>}
        <button className="primary big" onClick={start}>
          Start{seated.length >= 2 && button == null ? ' · random dealer' : ''}
        </button>
      </div>

      {editing != null && (
        <Modal title={`Seat ${editing + 1}`} onClose={closeEditor} narrow>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              closeEditor();
            }}
          >
            <label>
              Name
              <input autoFocus value={names[editing] ?? ''} onChange={(e) => setNames({ ...names, [editing]: e.target.value })} />
            </label>
            <label>
              Stack
              <input
                inputMode="decimal"
                placeholder={buyIn}
                value={stacks[editing] ?? ''}
                onChange={(e) => setStacks({ ...stacks, [editing]: e.target.value })}
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={button === editing}
                onChange={(e) => setButton(e.target.checked ? editing : null)}
              />
              Deals first
            </label>
            <div className="row">
              {names[editing] !== undefined && (
                <button type="button" className="danger" onClick={() => removeSeat(editing)}>
                  Remove
                </button>
              )}
              <button className="primary grow" type="submit">
                Done
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showSettings && (
        <Modal title="Game settings" onClose={() => setShowSettings(false)} narrow>
          <div className="form">
            <label>
              Seats around the table
              <select value={maxSeats} onChange={(e) => setMaxSeats(Number(e.target.value))}>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label>
              Playing for
              <select value={currency} onChange={(e) => changeCurrency(e.target.value)}>
                <option value="£">£</option>
                <option value="$">$</option>
                <option value="€">€</option>
                <option value="">Chips</option>
              </select>
            </label>
            <div className="row">
              <label>
                Small blind
                <input inputMode="decimal" value={smallBlind} onChange={(e) => setSmallBlind(e.target.value)} />
              </label>
              <label>
                Big blind
                <input inputMode="decimal" value={bigBlind} onChange={(e) => setBigBlind(e.target.value)} />
              </label>
            </div>
            <label>
              Default buy-in
              <input inputMode="decimal" value={buyIn} onChange={(e) => setBuyIn(e.target.value)} />
            </label>
            <button className="primary big" onClick={() => setShowSettings(false)}>
              Done
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
