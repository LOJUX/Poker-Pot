import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** Position of a seat as % of the table box. Seat 0 is at the bottom, numbering runs clockwise. */
export function seatPosition(seat: number, maxSeats: number) {
  const theta = Math.PI / 2 + (seat / maxSeats) * 2 * Math.PI;
  return { x: 50 + 44 * Math.cos(theta), y: 50 + 42 * Math.sin(theta) };
}

interface Props {
  maxSeats: number;
  renderSeat: (seat: number) => ReactNode;
  /** Seat the turn arrow points at, if any. */
  arrowSeat?: number | null;
  center?: ReactNode;
}

export function TableLayout({ maxSeats, renderSeat, arrowSeat, center }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1, h: 1 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  let arrowAngle: number | null = null;
  if (arrowSeat != null) {
    const { x, y } = seatPosition(arrowSeat, maxSeats);
    arrowAngle = (Math.atan2(((y - 50) / 100) * size.h, ((x - 50) / 100) * size.w) * 180) / Math.PI;
  }

  return (
    <div className="table-wrap" ref={ref}>
      <div className="felt" />
      {arrowAngle != null && (
        <div className="turn-arrow" style={{ transform: `translate(-50%, -50%) rotate(${arrowAngle}deg)` }}>
          <svg viewBox="0 0 100 20" aria-hidden="true">
            <path d="M0 7 H72 V0 L100 10 L72 20 V13 H0 Z" />
          </svg>
        </div>
      )}
      <div className="table-center">{center}</div>
      {Array.from({ length: maxSeats }, (_, seat) => {
        const { x, y } = seatPosition(seat, maxSeats);
        return (
          <div key={seat} className="seat-slot" style={{ left: `${x}%`, top: `${y}%` }}>
            {renderSeat(seat)}
          </div>
        );
      })}
    </div>
  );
}
