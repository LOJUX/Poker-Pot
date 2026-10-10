import { describe, expect, it } from 'vitest';
import { chipBreakdown, chipUnit } from './ChipStack';

const DENOMS = [1, 5, 25, 100, 500];
const value = (counts: number[]) => counts.reduce((s, c, i) => s + c * DENOMS[i], 0);

describe('chipBreakdown', () => {
  it('adds up exactly and spreads across colours', () => {
    for (const units of [0, 1, 7, 33, 100, 250, 1000, 12345]) {
      expect(value(chipBreakdown(units))).toBe(units);
    }
    expect(chipBreakdown(100)).toEqual([5, 4, 3, 0, 0]);
  });
});

describe('chipUnit', () => {
  const base = { maxSeats: 8, smallBlind: 10, bigBlind: 20, currency: '£', unitScale: 100 };
  it('picks a round chip value near 1% of the buy-in', () => {
    expect(chipUnit({ ...base, defaultBuyIn: 2000 })).toBe(20);
    expect(chipUnit({ ...base, defaultBuyIn: 5000 })).toBe(50);
    expect(chipUnit({ ...base, defaultBuyIn: 1000, unitScale: 1, currency: '' })).toBe(10);
    expect(chipUnit({ ...base, defaultBuyIn: 30 })).toBe(1);
  });
});
