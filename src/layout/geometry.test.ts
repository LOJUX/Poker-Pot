import { describe, expect, it } from 'vitest';
import { clockwiseTarget, seatGeometry, toLayer } from './geometry';

describe('seatGeometry', () => {
  const W = 400;
  const H = 800;

  it('puts seat 0 at the bottom and runs clockwise: bottom, left, top, right', () => {
    const sides = [0, 1, 2, 3].map((s) => seatGeometry(s, 4, W, H, 50).side);
    expect(sides).toEqual(['bottom', 'left', 'top', 'right']);
    const bottom = seatGeometry(0, 4, W, H, 50);
    expect(bottom.x).toBeCloseTo(200);
    expect(bottom.y).toBeCloseTo(750);
    expect(bottom.faceRot).toBeCloseTo(0);
    expect(seatGeometry(1, 4, W, H, 50).sideRot).toBe(90);
    expect(seatGeometry(2, 4, W, H, 50).faceRot).toBeCloseTo(180);
  });

  it('keeps each seat on the ray at its angle, so the arrow points straight at it', () => {
    for (let s = 0; s < 9; s++) {
      const g = seatGeometry(s, 9, W, H, 50);
      const len = Math.hypot(g.x - W / 2, g.y - H / 2);
      expect((g.x - W / 2) / len).toBeCloseTo(g.dx);
      expect((g.y - H / 2) / len).toBeCloseTo(g.dy);
      expect(g.x).toBeGreaterThanOrEqual(49.9);
      expect(g.x).toBeLessThanOrEqual(W - 49.9);
      expect(g.y).toBeGreaterThanOrEqual(49.9);
      expect(g.y).toBeLessThanOrEqual(H - 49.9);
    }
  });
});

describe('toLayer', () => {
  it('maps a left-edge point to the bottom of a layer rotated 90°', () => {
    const p = toLayer(50, 400, 400, 800, 90);
    expect(p.w).toBe(800);
    expect(p.h).toBe(400);
    expect(p.x).toBeCloseTo(400);
    expect(p.y).toBeCloseTo(350);
  });

  it('maps a top point near the right to the bottom-left of a layer rotated 180°', () => {
    const p = toLayer(350, 10, 400, 800, 180);
    expect(p.x).toBeCloseTo(50);
    expect(p.y).toBeCloseTo(790);
  });
});

describe('clockwiseTarget', () => {
  it('always turns clockwise', () => {
    expect(clockwiseTarget(90, 180)).toBe(180);
    expect(clockwiseTarget(180, 90)).toBe(450);
    expect(clockwiseTarget(350, 10)).toBe(370);
    expect(clockwiseTarget(720, 90)).toBe(810);
    expect(clockwiseTarget(90, 90)).toBe(90);
  });
});
