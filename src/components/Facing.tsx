import type { ReactNode } from 'react';
import { toLayer, type SeatGeom } from '../layout/geometry';

const EDGE_GAP = 8;
const MAX_PANEL_WIDTH = 380;

interface LayerProps {
  rot: number;
  w: number;
  h: number;
  children: ReactNode;
}

/** A full-screen layer rotated about the screen centre so its bottom edge faces a player. */
export function Facing({ rot, w, h, children }: LayerProps) {
  const swap = Math.round(rot / 90) % 2 !== 0;
  return (
    <div
      className="facing"
      style={{ width: swap ? h : w, height: swap ? w : h, transform: `translate(-50%, -50%) rotate(${rot}deg)` }}
    >
      {children}
    </div>
  );
}

interface PanelProps {
  seat: SeatGeom;
  w: number;
  h: number;
  /** Small buttons pinned to the panel's top corner (undo, menu). */
  tools?: ReactNode;
  children: ReactNode;
}

/** Panel on the screen edge in front of a seat, turned to face that player. */
export function EdgePanel({ seat, w, h, tools, children }: PanelProps) {
  const local = toLayer(seat.x, seat.y, w, h, seat.sideRot);
  const width = Math.min(MAX_PANEL_WIDTH, local.w - 2 * EDGE_GAP);
  const left = Math.max(EDGE_GAP, Math.min(local.w - width - EDGE_GAP, local.x - width / 2));
  return (
    <Facing rot={seat.sideRot} w={w} h={h}>
      <div className="panel edge-panel" style={{ width, left, bottom: EDGE_GAP, maxHeight: local.h - 2 * EDGE_GAP }}>
        {tools && <div className="panel-tools">{tools}</div>}
        {children}
      </div>
    </Facing>
  );
}

/** Panel in the middle of the screen, turned to face the player at `seat`. */
export function CenterPanel({ seat, w, h, tools, children }: PanelProps) {
  const rot = seat.sideRot;
  const swap = Math.round(rot / 90) % 2 !== 0;
  const lw = swap ? h : w;
  const lh = swap ? w : h;
  return (
    <Facing rot={rot} w={w} h={h}>
      <div className="panel center-panel" style={{ width: Math.min(420, lw - 2 * EDGE_GAP), maxHeight: lh - 2 * EDGE_GAP }}>
        {tools && <div className="panel-tools">{tools}</div>}
        {children}
      </div>
    </Facing>
  );
}
