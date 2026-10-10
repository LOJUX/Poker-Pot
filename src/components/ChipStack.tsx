import type { Config } from '../engine/types';
import { defaultBuyIn } from '../engine/game';

/** Chip denominations in multiples of the chip unit, smallest first. */
const DENOMS = [1, 5, 25, 100, 500];
const COLORS = [
  { fill: '#ecebe6', stripe: '#8d8a82' },
  { fill: '#d64545', stripe: '#ffffff' },
  { fill: '#2f9a5f', stripe: '#ffffff' },
  { fill: '#262626', stripe: '#dcdcdc' },
  { fill: '#8657d3', stripe: '#ffffff' },
];
const PER_COLUMN = 10;
const MAX_COLUMNS = 6;

/** Value of the smallest chip: a round number about 1% of the default buy-in. */
export function chipUnit(config: Config): number {
  const target = Math.max(1, Math.floor(defaultBuyIn(config) / 100));
  const p = 10 ** Math.floor(Math.log10(target));
  return [5, 2, 1].map((m) => m * p).find((v) => v <= target) ?? 1;
}

/**
 * Break an amount (in chip units) into chips the way a dealer would make change:
 * a few of each smaller colour rather than as few chips as possible.
 */
export function chipBreakdown(units: number): number[] {
  const counts: number[] = [];
  let rem = Math.max(0, Math.floor(units));
  for (let i = 0; i < DENOMS.length - 1; i++) {
    const d = DENOMS[i];
    const next = DENOMS[i + 1];
    let c = Math.floor((rem % next) / d);
    if (c < 3 && rem >= c * d + next) c += next / d;
    counts.push(c);
    rem -= c * d;
  }
  counts.push(Math.floor(rem / DENOMS[DENOMS.length - 1]));
  return counts;
}

interface Props {
  amount: number;
  unit: number;
  size?: 'sm' | 'md';
}

export function ChipStack({ amount, unit, size = 'md' }: Props) {
  const counts = chipBreakdown(amount / unit);
  if (amount > 0 && !counts.some(Boolean)) counts[0] = 1;

  // Largest chips first, split into columns of up to PER_COLUMN.
  const columns: { color: number; n: number }[] = [];
  for (let i = counts.length - 1; i >= 0; i--) {
    for (let left = counts[i]; left > 0; left -= PER_COLUMN) columns.push({ color: i, n: Math.min(PER_COLUMN, left) });
  }
  const shown = columns.slice(0, MAX_COLUMNS);
  if (shown.length === 0) return null;

  const rx = size === 'sm' ? 6 : 8;
  const ry = rx * 0.4;
  const step = size === 'sm' ? 2.4 : 3;
  const colW = rx * 2 + 2;
  const tallest = Math.max(...shown.map((c) => c.n));
  const height = (tallest - 1) * step + ry * 2 + 2;
  const width = shown.length * colW;

  return (
    <svg className="chips-svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {shown.map((col, ci) => {
        const cx = ci * colW + colW / 2;
        const { fill, stripe } = COLORS[col.color];
        return Array.from({ length: col.n }, (_, k) => {
          const cy = height - ry - 1 - k * step;
          const top = k === col.n - 1;
          return (
            <g key={`${ci}-${k}`}>
              <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke="#00000066" strokeWidth={0.6} />
              {top && (
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={rx * 0.68}
                  ry={ry * 0.68}
                  fill="none"
                  stroke={stripe}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
              )}
            </g>
          );
        });
      })}
    </svg>
  );
}
