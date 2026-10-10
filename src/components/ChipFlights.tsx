import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameState } from '../engine/types';
import type { SeatGeom } from '../layout/geometry';
import { chipMoves, type ChipMove } from '../layout/chipMoves';
import { chipColor } from './ChipStack';
import { BET_OFFSET } from './Seat';

const FLIGHT_MS = 520;
const STAGGER_MS = 55;
/** Payouts wait until bets have been swept into the pot. */
const PAYOUT_DELAY_MS = 450;
const FLOAT_MS = 1200;

type Item =
  | { id: number; kind: 'chip'; from: Point; to: Point; delay: number; color: string }
  | { id: number; kind: 'delta'; at: Point; rot: number; delay: number; text: string; up: boolean };

interface Point {
  x: number;
  y: number;
}

interface Props {
  game: GameState;
  /** False after undo or reload, so jumping between states doesn't replay chips. */
  animate: boolean;
  geom: (seat: number) => SeatGeom;
  w: number;
  h: number;
  unit: number;
  fmt: (n: number) => string;
}

/** Chips darting between stacks, bets and the pot, plus "+£x" / "−£x" floating off each stack. */
export function ChipFlights({ game, animate, geom, w, h, unit, fmt }: Props) {
  const prevRef = useRef(game);
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useLayoutEffect(() => {
    const prev = prevRef.current;
    prevRef.current = game;
    if (prev === game || !animate) return;

    const { moves, changes } = chipMoves(prev, game);
    if (moves.length === 0 && changes.length === 0) return;

    const seatOf = (id: string) => geom(game.players.find((p) => p.id === id)!.seat);
    const stackPos = (g: SeatGeom) => ({ x: g.x, y: g.y });
    const betPos = (g: SeatGeom) => ({ x: g.x - g.dx * BET_OFFSET, y: g.y - g.dy * BET_OFFSET });
    const pot = { x: w / 2, y: h / 2 };
    const payoutDelay = moves.some((m) => m.kind === 'collect') ? PAYOUT_DELAY_MS : 0;

    const route = (m: ChipMove) => {
      const g = seatOf(m.playerId);
      if (m.kind === 'bet') return { from: stackPos(g), to: betPos(g), delay: 0 };
      if (m.kind === 'collect') return { from: betPos(g), to: pot, delay: 0 };
      return { from: pot, to: stackPos(g), delay: payoutDelay };
    };

    const added: Item[] = [];
    for (const m of moves) {
      const { from, to, delay } = route(m);
      const units = m.amount / unit;
      const count = units < 2 ? 1 : units < 6 ? 2 : units < 20 ? 3 : 4;
      for (let i = 0; i < count; i++) {
        added.push({ id: nextId.current++, kind: 'chip', from, to, delay: delay + i * STAGGER_MS, color: chipColor(m.amount, unit) });
      }
    }
    for (const c of changes) {
      const g = seatOf(c.playerId);
      added.push({
        id: nextId.current++,
        kind: 'delta',
        at: { x: g.x, y: g.y },
        rot: g.faceRot,
        delay: c.delta > 0 ? payoutDelay + FLIGHT_MS * 0.6 : 0,
        text: `${c.delta > 0 ? '+' : '−'}${fmt(Math.abs(c.delta))}`,
        up: c.delta > 0,
      });
    }

    setItems((cur) => [...cur, ...added]);
    const ids = new Set(added.map((i) => i.id));
    const lastEnd = Math.max(...added.map((i) => i.delay + (i.kind === 'chip' ? FLIGHT_MS : FLOAT_MS)));
    timers.current.push(window.setTimeout(() => setItems((cur) => cur.filter((i) => !ids.has(i.id))), lastEnd + 100));
  }, [game]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {items.map((item) =>
        item.kind === 'chip' ? (
          <span
            key={item.id}
            className="flight"
            style={
              {
                '--fx': `${item.from.x}px`,
                '--fy': `${item.from.y}px`,
                '--tx': `${item.to.x}px`,
                '--ty': `${item.to.y}px`,
                '--chip': item.color,
                animationDelay: `${item.delay}ms`,
                animationDuration: `${FLIGHT_MS}ms`,
              } as CSSProperties
            }
          />
        ) : (
          <span
            key={item.id}
            className={`delta-float ${item.up ? 'up' : 'down'}`}
            style={{ left: item.at.x, top: item.at.y, transform: `translate(-50%, -50%) rotate(${item.rot}deg)` }}
          >
            <span style={{ animationDelay: `${item.delay}ms`, animationDuration: `${FLOAT_MS}ms` }}>{item.text}</span>
          </span>
        ),
      )}
    </>
  );
}
