import type { GameState, Player } from './types';

/** Players ordered clockwise starting from the first seat strictly after `seat`. */
export function clockwiseFrom(players: Player[], seat: number, maxSeats: number): Player[] {
  const dist = (p: Player) => (p.seat - seat - 1 + maxSeats) % maxSeats;
  return [...players].sort((a, b) => dist(a) - dist(b));
}

/** Next player clockwise after `seat` that matches `pred`. */
export function nextSeated(
  players: Player[],
  seat: number,
  maxSeats: number,
  pred: (p: Player) => boolean,
): Player | undefined {
  return clockwiseFrom(players, seat, maxSeats).find(pred);
}

/** Players who can be dealt into the next hand. */
export function eligibleForHand(p: Player): boolean {
  return !p.sittingOut && p.stack > 0;
}

/** Still contesting the pot. */
export function isLive(p: Player): boolean {
  return p.inHand && !p.folded;
}

/** Still contesting the pot and has chips behind, so can still bet. */
export function canBet(p: Player): boolean {
  return isLive(p) && p.stack > 0;
}

export function playerById(state: GameState, id: string): Player {
  const p = state.players.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown player ${id}`);
  return p;
}

export function freeSeats(state: GameState): number[] {
  const taken = new Set(state.players.map((p) => p.seat));
  return Array.from({ length: state.config.maxSeats }, (_, i) => i).filter((s) => !taken.has(s));
}
