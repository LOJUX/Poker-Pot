import { describe, expect, it } from 'vitest';
import { checkBlinds, parseAmount } from './money';

describe('parseAmount', () => {
  it('parses money into minor units', () => {
    expect(parseAmount('0.10', 100)).toBe(10);
    expect(parseAmount('£2.50', 100)).toBe(250);
    expect(parseAmount(' 2,5 ', 100)).toBe(250);
    expect(parseAmount('20', 100)).toBe(2000);
  });

  it('parses whole chips', () => {
    expect(parseAmount('25', 1)).toBe(25);
  });

  it('rejects fractional chips instead of rounding them to zero', () => {
    expect(() => parseAmount('0.10', 1)).toThrow(/whole numbers/);
  });

  it('rejects junk and too many decimals', () => {
    expect(() => parseAmount('', 100)).toThrow();
    expect(() => parseAmount('abc', 100)).toThrow();
    expect(() => parseAmount('0.105', 100)).toThrow(/decimal places/);
  });
});

describe('checkBlinds', () => {
  it('gives the right message for each problem', () => {
    expect(() => checkBlinds(0, 20)).toThrow(/Small blind must be more than zero/);
    expect(() => checkBlinds(20, 10)).toThrow(/Big blind must be at least/);
    expect(() => checkBlinds(10, 20)).not.toThrow();
  });
});
