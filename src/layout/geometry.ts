/**
 * Screen geometry for a phone lying flat in the middle of the table.
 *
 * Seats are spread evenly by angle around the screen centre, starting at the bottom
 * and running clockwise (as seen from above). Each seat sits where its ray from the
 * centre meets the screen edge, so the direction from the centre to a seat is exactly
 * the direction of the player sitting there.
 */

/** Distance from the screen edge to the centre of each seat, in px. */
export const SEAT_INSET = 54;

export type Side = 'bottom' | 'left' | 'top' | 'right';

/** Rotation that turns content to face a player on each side (CSS degrees, clockwise). */
const SIDE_ROT: Record<Side, number> = { bottom: 0, left: 90, top: 180, right: 270 };

export interface SeatGeom {
  /** Seat centre in screen px. */
  x: number;
  y: number;
  /** Unit vector from the screen centre towards the seat. */
  dx: number;
  dy: number;
  /** Direction from the centre in CSS degrees (0 = right, 90 = down). */
  angle: number;
  /** Screen edge the seat is on. */
  side: Side;
  /** Rotation so content reads upright for the player at this seat. */
  faceRot: number;
  /** `faceRot` snapped to the seat's edge (multiple of 90°), for larger panels. */
  sideRot: number;
}

export function seatAngle(seat: number, maxSeats: number): number {
  return 90 + (seat * 360) / maxSeats;
}

export function seatGeometry(seat: number, maxSeats: number, w: number, h: number, inset: number): SeatGeom {
  const angle = seatAngle(seat, maxSeats);
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const hw = Math.max(1, w / 2 - inset);
  const hh = Math.max(1, h / 2 - inset);
  const tx = Math.abs(dx) > 1e-9 ? hw / Math.abs(dx) : Infinity;
  const ty = Math.abs(dy) > 1e-9 ? hh / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  const side: Side = tx < ty ? (dx < 0 ? 'left' : 'right') : dy > 0 ? 'bottom' : 'top';
  return { x: w / 2 + t * dx, y: h / 2 + t * dy, dx, dy, angle, side, faceRot: angle - 90, sideRot: SIDE_ROT[side] };
}

/**
 * Map a screen point into the frame of a full-screen layer rotated by `rot` degrees
 * about the screen centre (see <Facing>). Returns the point and the layer's size.
 */
export function toLayer(x: number, y: number, w: number, h: number, rot: number) {
  const r = (rot * Math.PI) / 180;
  const vx = x - w / 2;
  const vy = y - h / 2;
  const swap = Math.round(rot / 90) % 2 !== 0;
  const lw = swap ? h : w;
  const lh = swap ? w : h;
  return {
    x: lw / 2 + vx * Math.cos(r) + vy * Math.sin(r),
    y: lh / 2 - vx * Math.sin(r) + vy * Math.cos(r),
    w: lw,
    h: lh,
  };
}

/** The smallest angle >= `prev` that points the same way as `target`, so rotation is always clockwise. */
export function clockwiseTarget(prev: number, target: number): number {
  return prev + ((((target - prev) % 360) + 360) % 360);
}
