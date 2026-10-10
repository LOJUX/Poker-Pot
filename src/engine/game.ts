import type { Config, GameAction, GameState, HandState, Player, PlayerAction, PotResult, Street } from './types';
import { canBet, clockwiseFrom, eligibleForHand, isLive, nextSeated, playerById } from './table';
import { buildPots, returnUncalledBet, splitPot } from './pots';
import { legalActions } from './betting';

export interface NewPlayer {
  name: string;
  seat: number;
  stack: number;
}

export function createGame(config: Config, players: NewPlayer[], buttonSeat: number): GameState {
  const state: GameState = {
    config,
    players: [],
    buttonSeat,
    moveButton: false,
    hand: null,
    handCount: 0,
    nextPlayerId: 1,
  };
  for (const p of players) addPlayer(state, p);
  return state;
}

export function formatAmount(config: Config, amount: number): string {
  const major = amount / config.unitScale;
  const digits = config.unitScale > 1 && amount % config.unitScale !== 0 ? Math.log10(config.unitScale) : 0;
  return `${config.currency}${major.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function handInProgress(state: GameState): boolean {
  return !!state.hand && state.hand.phase !== 'complete';
}

/** Pure reducer: returns a new state, never mutates the input. Throws on illegal actions. */
export function reduce(prev: GameState, action: GameAction): GameState {
  const state: GameState = structuredClone(prev);
  switch (action.type) {
    case 'START_HAND':
      startHand(state);
      break;
    case 'ACT':
      act(state, action.action);
      break;
    case 'DEAL_NEXT':
      dealNext(state);
      break;
    case 'AWARD_POTS':
      awardPots(state, action.winners);
      break;
    case 'ADD_PLAYER':
      betweenHands(state);
      addPlayer(state, action);
      break;
    case 'REMOVE_PLAYER':
      betweenHands(state);
      state.players = state.players.filter((p) => p.id !== action.playerId);
      break;
    case 'REBUY': {
      betweenHands(state);
      if (action.amount <= 0) throw new Error('Rebuy must be positive');
      const p = playerById(state, action.playerId);
      p.stack += action.amount;
      p.totalBuyIn += action.amount;
      break;
    }
    case 'SET_SITTING_OUT':
      betweenHands(state);
      playerById(state, action.playerId).sittingOut = action.sittingOut;
      break;
    case 'SET_BUTTON':
      betweenHands(state);
      state.buttonSeat = action.seat;
      state.moveButton = false;
      break;
    case 'UPDATE_CONFIG':
      betweenHands(state);
      state.config = { ...state.config, ...action.config };
      break;
  }
  return state;
}

function betweenHands(state: GameState) {
  if (handInProgress(state)) throw new Error('Not allowed during a hand');
}

function addPlayer(state: GameState, np: NewPlayer) {
  if (np.seat < 0 || np.seat >= state.config.maxSeats) throw new Error('Invalid seat');
  if (state.players.some((p) => p.seat === np.seat)) throw new Error('Seat is taken');
  state.players.push({
    id: `p${state.nextPlayerId++}`,
    name: np.name,
    seat: np.seat,
    stack: np.stack,
    totalBuyIn: np.stack,
    sittingOut: false,
    inHand: false,
    folded: false,
    streetCommitted: 0,
    handCommitted: 0,
  });
}

function log(state: GameState, msg: string) {
  state.hand!.log.push(msg);
}

function fmt(state: GameState, n: number) {
  return formatAmount(state.config, n);
}

function commit(p: Player, amount: number) {
  if (amount > p.stack) throw new Error('Not enough chips');
  p.stack -= amount;
  p.streetCommitted += amount;
  p.handCommitted += amount;
}

// ---------------------------------------------------------------------------
// Hand lifecycle

function startHand(state: GameState) {
  betweenHands(state);
  const { maxSeats, smallBlind, bigBlind } = state.config;
  const dealt = state.players.filter(eligibleForHand);
  if (dealt.length < 2) throw new Error('Need at least two players with chips');

  // Move the button.
  const anchor = state.buttonSeat ?? 0;
  let button: Player;
  if (!state.moveButton) {
    button = dealt.find((p) => p.seat === anchor) ?? nextSeated(dealt, anchor, maxSeats, () => true)!;
  } else {
    button = nextSeated(dealt, anchor, maxSeats, () => true)!;
  }
  state.buttonSeat = button.seat;
  state.moveButton = true;

  for (const p of state.players) {
    p.inHand = eligibleForHand(p);
    p.folded = false;
    p.streetCommitted = 0;
    p.handCommitted = 0;
  }

  // Heads-up: the button posts the small blind.
  const sb = dealt.length === 2 ? button : nextSeated(dealt, button.seat, maxSeats, () => true)!;
  const bb = nextSeated(dealt, sb.seat, maxSeats, () => true)!;

  state.handCount += 1;
  const hand: HandState = {
    number: state.handCount,
    street: 'preflop',
    phase: 'betting',
    buttonSeat: button.seat,
    sbSeat: sb.seat,
    bbSeat: bb.seat,
    currentBet: bigBlind,
    lastFullRaise: bigBlind,
    actingId: null,
    needsAction: [],
    actedSinceFullRaise: [],
    pots: [],
    allInRunout: false,
    result: null,
    log: [],
  };
  state.hand = hand;
  log(state, `Hand #${hand.number} — ${button.name} has the button`);

  const sbAmt = Math.min(smallBlind, sb.stack);
  commit(sb, sbAmt);
  log(state, `${sb.name} posts small blind ${fmt(state, sbAmt)}${sb.stack === 0 ? ' (all-in)' : ''}`);
  const bbAmt = Math.min(bigBlind, bb.stack);
  commit(bb, bbAmt);
  log(state, `${bb.name} posts big blind ${fmt(state, bbAmt)}${bb.stack === 0 ? ' (all-in)' : ''}`);

  hand.needsAction = state.players.filter(canBet).map((p) => p.id);
  if (bettingIsClosed(state)) {
    hand.needsAction = [];
    endRound(state);
    return;
  }
  setNextActor(state, bb.seat);
}

/** True when nobody can make a meaningful decision (everyone, or all but one who has matched, is all-in). */
function bettingIsClosed(state: GameState): boolean {
  const bettors = state.players.filter(canBet);
  if (bettors.length === 0) return true;
  if (bettors.length > 1) return false;
  const maxOther = Math.max(0, ...state.players.filter((p) => p.inHand && p.id !== bettors[0].id).map((p) => p.streetCommitted));
  return bettors[0].streetCommitted >= maxOther;
}

function setNextActor(state: GameState, afterSeat: number) {
  const hand = state.hand!;
  const pending = new Set(hand.needsAction);
  const next = nextSeated(state.players, afterSeat, state.config.maxSeats, (p) => pending.has(p.id));
  hand.actingId = next ? next.id : null;
}

function act(state: GameState, action: PlayerAction) {
  const hand = state.hand;
  if (!hand || hand.phase !== 'betting' || !hand.actingId) throw new Error('No one is due to act');
  const legal = legalActions(state)!;
  const p = playerById(state, hand.actingId);

  switch (action.type) {
    case 'fold':
      p.folded = true;
      log(state, `${p.name} folds`);
      break;
    case 'check':
      if (!legal.canCheck) throw new Error('Cannot check facing a bet');
      log(state, `${p.name} checks`);
      break;
    case 'call': {
      if (!legal.canCall) throw new Error('Nothing to call');
      commit(p, legal.callAmount);
      log(state, `${p.name} calls ${fmt(state, legal.callAmount)}${p.stack === 0 ? ' (all-in)' : ''}`);
      break;
    }
    case 'raise': {
      const to = action.to;
      if (!legal.canRaise) throw new Error('Raising is not allowed');
      if (!Number.isInteger(to) || to > legal.maxRaiseTo) throw new Error('Not enough chips');
      if (to < legal.minRaiseTo) throw new Error(`Minimum raise is to ${fmt(state, legal.minRaiseTo)}`);
      const raiseSize = to - hand.currentBet;
      commit(p, to - p.streetCommitted);
      const verb = legal.isBet ? 'bets' : 'raises to';
      log(state, `${p.name} ${verb} ${fmt(state, to)}${p.stack === 0 ? ' (all-in)' : ''}`);
      if (raiseSize >= hand.lastFullRaise) {
        hand.lastFullRaise = raiseSize;
        hand.actedSinceFullRaise = [];
      }
      hand.currentBet = to;
      hand.needsAction = state.players.filter((o) => o.id !== p.id && canBet(o)).map((o) => o.id);
      break;
    }
  }

  hand.needsAction = hand.needsAction.filter((id) => id !== p.id && canBet(playerById(state, id)));
  if (!hand.actedSinceFullRaise.includes(p.id)) hand.actedSinceFullRaise.push(p.id);

  const live = state.players.filter(isLive);
  if (live.length === 1) {
    finishUncontested(state, live[0]);
    return;
  }
  if (hand.needsAction.length > 0) {
    setNextActor(state, p.seat);
  } else {
    endRound(state);
  }
}

const NEXT_STREET: Record<Street, Street | null> = { preflop: 'flop', flop: 'turn', turn: 'river', river: null };

function endRound(state: GameState) {
  const hand = state.hand!;
  hand.actingId = null;
  if (state.players.filter(canBet).length <= 1 && hand.street !== 'river') {
    hand.allInRunout = true;
    log(state, 'Betting is closed — run out the rest of the board');
    goToShowdown(state);
  } else if (hand.street === 'river') {
    goToShowdown(state);
  } else {
    hand.phase = 'dealNext';
  }
}

function dealNext(state: GameState) {
  const hand = state.hand;
  if (!hand || hand.phase !== 'dealNext') throw new Error('Not waiting for the next street');
  const street = NEXT_STREET[hand.street]!;
  hand.street = street;
  hand.phase = 'betting';
  hand.currentBet = 0;
  hand.lastFullRaise = state.config.bigBlind;
  hand.actedSinceFullRaise = [];
  for (const p of state.players) p.streetCommitted = 0;
  log(state, `— ${street[0].toUpperCase()}${street.slice(1)} —`);
  hand.needsAction = state.players.filter(canBet).map((p) => p.id);
  setNextActor(state, hand.buttonSeat);
}

function goToShowdown(state: GameState) {
  const hand = state.hand!;
  const refund = returnUncalledBet(state.players);
  if (refund) log(state, `Uncalled ${fmt(state, refund.amount)} returned to ${playerById(state, refund.playerId).name}`);
  hand.pots = buildPots(state.players);
  hand.phase = 'showdown';
  hand.actingId = null;
  hand.result = { refund, pots: [], uncontested: false };
  // If every pot has only one possible winner there's nothing to ask.
  if (hand.pots.every((pot) => pot.eligible.length === 1)) {
    awardPots(state, hand.pots.map((pot) => pot.eligible));
  }
}

function finishUncontested(state: GameState, winner: Player) {
  const hand = state.hand!;
  hand.actingId = null;
  const refund = returnUncalledBet(state.players);
  if (refund) log(state, `Uncalled ${fmt(state, refund.amount)} returned to ${playerById(state, refund.playerId).name}`);
  const amount = state.players.reduce((s, p) => s + p.handCommitted, 0);
  winner.stack += amount;
  log(state, `${winner.name} wins ${fmt(state, amount)}`);
  hand.result = { refund, uncontested: true, pots: [{ amount, winners: [winner.id], payouts: { [winner.id]: amount } }] };
  clearCommitments(state);
  hand.phase = 'complete';
}

function awardPots(state: GameState, winners: string[][]) {
  const hand = state.hand;
  if (!hand || hand.phase !== 'showdown') throw new Error('Not at showdown');
  if (winners.length !== hand.pots.length) throw new Error('Pick winners for every pot');

  const results: PotResult[] = hand.pots.map((pot, i) => {
    const ws = [...new Set(winners[i])];
    if (ws.length === 0) throw new Error('Every pot needs a winner');
    if (!ws.every((id) => pot.eligible.includes(id))) throw new Error('Winner is not eligible for this pot');
    const payouts = splitPot(pot.amount, ws, state.players, hand.buttonSeat, state.config.maxSeats);
    return { amount: pot.amount, winners: ws, payouts };
  });

  results.forEach((r, i) => {
    const label = hand.pots.length === 1 ? 'the pot' : i === 0 ? 'the main pot' : `side pot ${i}`;
    for (const [id, amt] of Object.entries(r.payouts)) {
      playerById(state, id).stack += amt;
      log(state, `${playerById(state, id).name} wins ${fmt(state, amt)} from ${label}`);
    }
  });

  hand.result = { refund: hand.result?.refund ?? null, uncontested: false, pots: results };
  clearCommitments(state);
  hand.phase = 'complete';
}

function clearCommitments(state: GameState) {
  for (const p of state.players) {
    p.streetCommitted = 0;
    p.handCommitted = 0;
  }
}

/** Seats in clockwise order from the button — handy for the UI. */
export function seatOrder(state: GameState): Player[] {
  return clockwiseFrom(state.players, state.buttonSeat ?? 0, state.config.maxSeats);
}
