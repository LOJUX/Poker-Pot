/** All chip amounts are integers in the smallest unit (e.g. pence/cents). */

export type Street = 'preflop' | 'flop' | 'turn' | 'river';

export interface Config {
  maxSeats: number;
  smallBlind: number;
  bigBlind: number;
  /** Symbol shown before amounts, e.g. "£". Empty for plain chips. */
  currency: string;
  /** Number of minor units per major unit (100 for money, 1 for chips). */
  unitScale: number;
  /** Suggested stack for new players, in minor units. Missing in games saved by older versions. */
  defaultBuyIn?: number;
}

export interface Player {
  id: string;
  name: string;
  seat: number;
  stack: number;
  /** Total amount bought in across the session (for cash-out ledger). */
  totalBuyIn: number;
  sittingOut: boolean;

  // Per-hand state
  inHand: boolean;
  folded: boolean;
  streetCommitted: number;
  handCommitted: number;
}

export interface Pot {
  amount: number;
  eligible: string[];
}

export interface PotResult {
  amount: number;
  winners: string[];
  /** playerId -> amount won from this pot */
  payouts: Record<string, number>;
}

export interface HandResult {
  /** Uncalled bet returned before pots were built. */
  refund: { playerId: string; amount: number } | null;
  pots: PotResult[];
  /** True if the hand ended because everyone else folded. */
  uncontested: boolean;
}

export type HandPhase =
  /** Waiting for `actingId` to act. */
  | 'betting'
  /** Betting round finished; waiting for the dealer to deal the next street. */
  | 'dealNext'
  /** Waiting for the winners of each pot to be entered. */
  | 'showdown'
  /** Chips have been paid out. */
  | 'complete';

export interface HandState {
  number: number;
  street: Street;
  phase: HandPhase;
  buttonSeat: number;
  sbSeat: number;
  bbSeat: number;
  currentBet: number;
  /** Size of the last full bet/raise; the minimum raise increment. */
  lastFullRaise: number;
  actingId: string | null;
  /** Players who still have to act in this betting round. */
  needsAction: string[];
  /** Players who have acted since the last full bet/raise (they can't re-raise on an incomplete all-in). */
  actedSinceFullRaise: string[];
  /** Set during showdown. */
  pots: Pot[];
  /** True when betting stopped early because players are all-in. */
  allInRunout: boolean;
  result: HandResult | null;
  log: string[];
}

export interface GameState {
  config: Config;
  players: Player[];
  /** Seat holding the dealer button for the most recent / current hand. */
  buttonSeat: number | null;
  /** False until the first hand (or after the button is set manually): the next hand uses `buttonSeat` as-is. */
  moveButton: boolean;
  hand: HandState | null;
  handCount: number;
  nextPlayerId: number;
}

export type PlayerAction =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  /** Bet or raise to a street total of `to`. */
  | { type: 'raise'; to: number };

export type GameAction =
  | { type: 'START_HAND' }
  | { type: 'ACT'; action: PlayerAction }
  | { type: 'DEAL_NEXT' }
  /** One list of winner ids per pot, in the order of `hand.pots`. */
  | { type: 'AWARD_POTS'; winners: string[][] }
  | { type: 'ADD_PLAYER'; name: string; seat: number; stack: number }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'REBUY'; playerId: string; amount: number }
  | { type: 'SET_SITTING_OUT'; playerId: string; sittingOut: boolean }
  | { type: 'SET_BUTTON'; seat: number }
  | { type: 'UPDATE_CONFIG'; config: Partial<Config> };

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canRaise: boolean;
  /** Minimum street total for a bet/raise (may equal maxRaiseTo when only all-in is possible). */
  minRaiseTo: number;
  /** Street total if the player goes all-in. */
  maxRaiseTo: number;
  /** True when no bet has been made this street (so the UI says "Bet" rather than "Raise"). */
  isBet: boolean;
}
