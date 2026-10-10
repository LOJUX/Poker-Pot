import type { ReactNode } from 'react';
import type { SeatGeom } from '../layout/geometry';
import { ChipStack } from './ChipStack';

interface Props {
  geom: SeatGeom;
  name: string;
  stack: number;
  unit: number;
  fmt: (n: number) => string;
  tags?: ReactNode;
  status?: string | null;
  className?: string;
  onClick?: () => void;
}

/** A player's name, chip stack and total, placed at their seat and turned to face them. */
export function Seat({ geom, name, stack, unit, fmt, tags, status, className = '', onClick }: Props) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      className={`seat ${className}`}
      style={{ left: geom.x, top: geom.y, transform: `translate(-50%, -50%) rotate(${geom.faceRot}deg)` }}
      onClick={onClick}
    >
      {tags && <span className="seat-tags">{tags}</span>}
      <span className="seat-name">{name}</span>
      <span className="seat-stack">
        <ChipStack amount={stack} unit={unit} size="sm" />
        <span className="amount">{fmt(stack)}</span>
      </span>
      {status && <span className="seat-status">{status}</span>}
    </Tag>
  );
}

/** Faint "+" for an empty seat. */
export function EmptySeat({ geom, onClick, label }: { geom: SeatGeom; onClick: () => void; label: string }) {
  return (
    <button
      className="seat-add"
      style={{ left: geom.x, top: geom.y, transform: 'translate(-50%, -50%)' }}
      onClick={onClick}
      aria-label={label}
    >
      +
    </button>
  );
}

/** How far in front of a seat (towards the centre) its bet is drawn, in px. */
export const BET_OFFSET = 56;

/** Chips a player has put in this betting round, just in front of their seat. */
export function BetMarker({ geom, amount, unit, fmt }: { geom: SeatGeom; amount: number; unit: number; fmt: (n: number) => string }) {
  return (
    <div
      className="bet"
      style={{
        left: geom.x - geom.dx * BET_OFFSET,
        top: geom.y - geom.dy * BET_OFFSET,
        transform: `translate(-50%, -50%) rotate(${geom.faceRot}deg)`,
      }}
    >
      <ChipStack amount={amount} unit={unit} size="sm" />
      <span>{fmt(amount)}</span>
    </div>
  );
}
