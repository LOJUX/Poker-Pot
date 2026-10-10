import type { GameState, Player } from '../engine/types';

/**
 * How chips moved between two consecutive game states, for animation.
 * - `bet`: from a player's stack to the bet in front of them
 * - `collect`: from the bet in front of a player into the pot
 * - `payout`: from the pot back to a player's stack (winnings or a returned bet)
 */
export interface ChipMove {
  kind: 'bet' | 'collect' | 'payout';
  playerId: string;
  amount: number;
}

/** A change to a player's stack, shown as a floating "+£x" / "−£x". */
export interface StackChange {
  playerId: string;
  delta: number;
}

/** Chips shown in front of a player (bets are only drawn during betting rounds). */
function shownBet(state: GameState, p: Player): number {
  const phase = state.hand?.phase;
  return (phase === 'betting' || phase === 'dealNext') && p.inHand ? p.streetCommitted : 0;
}

export function chipMoves(prev: GameState, next: GameState): { moves: ChipMove[]; changes: StackChange[] } {
  const moves: ChipMove[] = [];
  const changes: StackChange[] = [];
  // Payouts and returned bets happen within a hand; a stack growing between hands is a rebuy.
  const inHandEvent =
    !!prev.hand && !!next.hand && prev.hand.number === next.hand.number && prev.hand.phase !== 'complete';

  for (const p of next.players) {
    const q = prev.players.find((x) => x.id === p.id);
    if (!q) continue;

    const before = shownBet(prev, q);
    if (inHandEvent && before > 0 && shownBet(next, p) === 0) {
      moves.push({ kind: 'collect', playerId: p.id, amount: before });
    }

    const delta = p.stack - q.stack;
    if (delta === 0) continue;
    changes.push({ playerId: p.id, delta });
    if (delta < 0) moves.push({ kind: 'bet', playerId: p.id, amount: -delta });
    else if (inHandEvent) moves.push({ kind: 'payout', playerId: p.id, amount: delta });
  }
  return { moves, changes };
}
