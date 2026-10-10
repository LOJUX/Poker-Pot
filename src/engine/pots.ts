import type { Player, Pot } from './types';
import { clockwiseFrom } from './table';

/**
 * The portion of the largest contribution that nobody matched goes back to its owner.
 * Mutates `players`; returns the refund, if any.
 */
export function returnUncalledBet(players: Player[]): { playerId: string; amount: number } | null {
  const inHand = players.filter((p) => p.inHand);
  if (inHand.length === 0) return null;
  const sorted = [...inHand].sort((a, b) => b.handCommitted - a.handCommitted);
  const top = sorted[0];
  const second = sorted[1]?.handCommitted ?? 0;
  const excess = top.handCommitted - second;
  if (excess <= 0) return null;
  top.handCommitted -= excess;
  top.streetCommitted = Math.max(0, top.streetCommitted - excess);
  top.stack += excess;
  return { playerId: top.id, amount: excess };
}

/**
 * Split everything committed this hand into a main pot and side pots.
 * Folded players' chips go into the pots but they are not eligible to win.
 * Returned main pot first, then side pots in increasing all-in level.
 */
export function buildPots(players: Player[]): Pot[] {
  const contributors = players.filter((p) => p.inHand && p.handCommitted > 0);
  const live = players.filter((p) => p.inHand && !p.folded);
  const levels = [...new Set(live.map((p) => p.handCommitted))].filter((l) => l > 0).sort((a, b) => a - b);

  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const p of contributors) {
      amount += Math.max(0, Math.min(p.handCommitted, level) - prev);
    }
    const eligible = live.filter((p) => p.handCommitted >= level).map((p) => p.id);
    if (amount > 0) {
      const last = pots[pots.length - 1];
      if (last && sameSet(last.eligible, eligible)) last.amount += amount;
      else pots.push({ amount, eligible });
    }
    prev = level;
  }

  // Any dead money above the highest live level (shouldn't normally happen) goes to the last pot.
  const leftover = contributors.reduce((s, p) => s + Math.max(0, p.handCommitted - prev), 0);
  if (leftover > 0) {
    if (pots.length) pots[pots.length - 1].amount += leftover;
    else pots.push({ amount: leftover, eligible: live.map((p) => p.id) });
  }
  return pots;
}

/**
 * Split `amount` between winners. Odd chips go one at a time to winners
 * in seat order starting from the first seat left of the button.
 */
export function splitPot(
  amount: number,
  winnerIds: string[],
  players: Player[],
  buttonSeat: number,
  maxSeats: number,
): Record<string, number> {
  if (winnerIds.length === 0) throw new Error('A pot needs at least one winner');
  const share = Math.floor(amount / winnerIds.length);
  let remainder = amount - share * winnerIds.length;
  const winners = new Set(winnerIds);
  const ordered = clockwiseFrom(players, buttonSeat, maxSeats).filter((p) => winners.has(p.id));
  const payouts: Record<string, number> = {};
  for (const p of ordered) {
    payouts[p.id] = share + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
  }
  return payouts;
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}
