import { describe, expect, it } from 'vitest';
import { splitPot } from './pots';
import type { Player } from './types';

const player = (id: string, seat: number): Player => ({
  id,
  name: id,
  seat,
  stack: 0,
  totalBuyIn: 0,
  sittingOut: false,
  inHand: true,
  folded: false,
  streetCommitted: 0,
  handCommitted: 0,
});

describe('splitPot', () => {
  const players = [player('a', 0), player('b', 3), player('c', 6)];

  it('splits evenly', () => {
    expect(splitPot(90, ['a', 'b', 'c'], players, 0, 9)).toEqual({ a: 30, b: 30, c: 30 });
  });

  it('gives odd chips clockwise from the button', () => {
    // Button at seat 3: first left is c (6), then a (0), then b (3).
    expect(splitPot(92, ['a', 'b', 'c'], players, 3, 9)).toEqual({ c: 31, a: 31, b: 30 });
    expect(splitPot(11, ['a', 'b'], players, 3, 9)).toEqual({ a: 6, b: 5 });
  });

  it('requires a winner', () => {
    expect(() => splitPot(10, [], players, 0, 9)).toThrow();
  });
});
