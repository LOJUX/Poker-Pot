import type { GameState, LegalActions, Player } from './types';
import { canBet, playerById } from './table';

export function actingPlayer(state: GameState): Player | null {
  const id = state.hand?.actingId;
  return id ? playerById(state, id) : null;
}

export function legalActions(state: GameState): LegalActions | null {
  const hand = state.hand;
  const p = actingPlayer(state);
  if (!hand || !p || hand.phase !== 'betting') return null;

  const owed = Math.max(0, hand.currentBet - p.streetCommitted);
  const maxRaiseTo = p.streetCommitted + p.stack;
  const opponentCanBet = state.players.some((o) => o.id !== p.id && canBet(o));
  // An all-in for less than a full raise doesn't re-open betting for players who already acted.
  const reopened = !hand.actedSinceFullRaise.includes(p.id);
  const canRaise = opponentCanBet && reopened && maxRaiseTo > hand.currentBet;

  return {
    canFold: true,
    canCheck: owed === 0,
    canCall: owed > 0,
    callAmount: Math.min(owed, p.stack),
    canRaise,
    minRaiseTo: Math.min(hand.currentBet + hand.lastFullRaise, maxRaiseTo),
    maxRaiseTo,
    isBet: hand.currentBet === 0,
  };
}

/** Total of all chips committed this hand (what's "in the middle"). */
export function totalPot(state: GameState): number {
  return state.players.reduce((s, p) => s + p.handCommitted, 0);
}
