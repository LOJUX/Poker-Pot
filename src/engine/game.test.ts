import { describe, expect, it } from 'vitest';
import { createGame, reduce, type NewPlayer } from './game';
import { legalActions } from './betting';
import type { Config, GameAction, GameState, PlayerAction } from './types';

const config: Config = { maxSeats: 9, smallBlind: 5, bigBlind: 10, currency: '', unitScale: 1 };

function chips(s: GameState) {
  return s.players.reduce((t, p) => t + p.stack + p.handCommitted, 0);
}

/** Runs actions, asserting chips are conserved after every step. */
function run(state: GameState, ...actions: GameAction[]): GameState {
  const total = chips(state);
  for (const a of actions) {
    state = reduce(state, a);
    expect(chips(state)).toBe(total);
  }
  return state;
}

const act = (action: PlayerAction): GameAction => ({ type: 'ACT', action });
const fold = act({ type: 'fold' });
const check = act({ type: 'check' });
const call = act({ type: 'call' });
const raise = (to: number) => act({ type: 'raise', to });
const deal: GameAction = { type: 'DEAL_NEXT' };

function game(players: NewPlayer[], button = players[0].seat) {
  return run(createGame(config, players, button), { type: 'START_HAND' });
}

const name = (s: GameState, id: string | null | undefined) => s.players.find((p) => p.id === id)?.name;
const stack = (s: GameState, n: string) => s.players.find((p) => p.name === n)!.stack;
const id = (s: GameState, n: string) => s.players.find((p) => p.name === n)!.id;

describe('blinds and action order', () => {
  it('posts blinds left of the button and starts UTG', () => {
    const s = game([
      { name: 'A', seat: 0, stack: 1000 },
      { name: 'B', seat: 2, stack: 1000 },
      { name: 'C', seat: 5, stack: 1000 },
      { name: 'D', seat: 7, stack: 1000 },
    ]);
    expect(s.hand!.sbSeat).toBe(2);
    expect(s.hand!.bbSeat).toBe(5);
    expect(stack(s, 'B')).toBe(995);
    expect(stack(s, 'C')).toBe(990);
    expect(name(s, s.hand!.actingId)).toBe('D');
  });

  it('heads-up: button is small blind, acts first preflop and last postflop', () => {
    let s = game([
      { name: 'A', seat: 0, stack: 1000 },
      { name: 'B', seat: 4, stack: 1000 },
    ]);
    expect(s.hand!.sbSeat).toBe(0);
    expect(s.hand!.bbSeat).toBe(4);
    expect(name(s, s.hand!.actingId)).toBe('A');
    s = run(s, call);
    expect(name(s, s.hand!.actingId)).toBe('B'); // BB option
    s = run(s, check);
    expect(s.hand!.phase).toBe('dealNext');
    s = run(s, deal);
    expect(name(s, s.hand!.actingId)).toBe('B');
  });

  it('gives the big blind the option when limped to', () => {
    let s = game([
      { name: 'A', seat: 0, stack: 1000 },
      { name: 'B', seat: 1, stack: 1000 },
      { name: 'C', seat: 2, stack: 1000 },
    ]);
    s = run(s, call, call);
    expect(name(s, s.hand!.actingId)).toBe('C');
    expect(legalActions(s)!.canCheck).toBe(true);
    expect(legalActions(s)!.canRaise).toBe(true);
  });

  it('moves the button and skips busted players', () => {
    let s = game([
      { name: 'A', seat: 0, stack: 1000 },
      { name: 'B', seat: 1, stack: 10 },
      { name: 'C', seat: 2, stack: 1000 },
      { name: 'D', seat: 3, stack: 1000 },
    ]);
    // B (SB) posts 5, C (BB) posts 10. D raises, everyone else folds except B who calls all-in.
    s = run(s, raise(500), fold, call, fold);
    expect(s.hand!.phase).toBe('showdown');
    s = run(s, { type: 'AWARD_POTS', winners: s.hand!.pots.map(() => [id(s, 'D')]) });
    expect(stack(s, 'B')).toBe(0);
    s = run(s, { type: 'START_HAND' });
    // Button moves from A to the next player with chips: C (B is bust).
    expect(s.hand!.buttonSeat).toBe(2);
    expect(s.players.find((p) => p.name === 'B')!.inHand).toBe(false);
  });
});

describe('ending a hand', () => {
  it('awards the pot when everyone folds to the big blind', () => {
    let s = game([
      { name: 'A', seat: 0, stack: 1000 },
      { name: 'B', seat: 1, stack: 1000 },
      { name: 'C', seat: 2, stack: 1000 },
    ]);
    s = run(s, fold, fold);
    expect(s.hand!.phase).toBe('complete');
    expect(s.hand!.result!.uncontested).toBe(true);
    expect(stack(s, 'C')).toBe(1005);
    expect(stack(s, 'B')).toBe(995);
  });

  it('returns an uncalled bet', () => {
    let s = game([
      { name: 'A', seat: 0, stack: 1000 },
      { name: 'B', seat: 1, stack: 1000 },
      { name: 'C', seat: 2, stack: 1000 },
    ]);
    s = run(s, raise(30), fold, fold);
    expect(s.hand!.result!.refund).toEqual({ playerId: id(s, 'A'), amount: 20 });
    expect(stack(s, 'A')).toBe(1015);
  });

  it('plays every street to showdown and splits the odd chip left of the button', () => {
    let s = game(
      [
        { name: 'A', seat: 0, stack: 1000 },
        { name: 'B', seat: 1, stack: 1000 },
        { name: 'C', seat: 2, stack: 1000 },
      ],
      0,
    );
    s = run(s, raise(20), fold, call); // A raises, B folds the SB (5 dead), C calls: pot 45
    for (const street of ['flop', 'turn', 'river']) {
      s = run(s, deal);
      expect(s.hand!.street).toBe(street);
      expect(name(s, s.hand!.actingId)).toBe('C');
      s = run(s, check, check);
    }
    expect(s.hand!.phase).toBe('showdown');
    expect(s.hand!.allInRunout).toBe(false);
    expect(s.hand!.pots).toEqual([{ amount: 45, eligible: [id(s, 'A'), id(s, 'C')] }]);
    s = run(s, { type: 'AWARD_POTS', winners: [[id(s, 'A'), id(s, 'C')]] });
    expect(stack(s, 'C')).toBe(1003); // 980 + 23 (odd chip: first left of the button)
    expect(stack(s, 'A')).toBe(1002);
    expect(stack(s, 'B')).toBe(995);
  });
});

describe('side pots', () => {
  it('builds a main pot and two side pots for three different all-ins', () => {
    let s = game(
      [
        { name: 'A', seat: 0, stack: 100 },
        { name: 'B', seat: 1, stack: 300 },
        { name: 'C', seat: 2, stack: 600 },
        { name: 'D', seat: 3, stack: 1000 },
      ],
      0,
    );
    // B SB, C BB, D first. D raises to 1000 (all-in), A calls all-in 100, B calls all-in 300, C calls all-in 600.
    s = run(s, raise(1000), call, call, call);
    expect(s.hand!.phase).toBe('showdown');
    expect(s.hand!.allInRunout).toBe(true);
    // D's 400 over C is uncalled and returned.
    expect(s.hand!.result!.refund).toEqual({ playerId: id(s, 'D'), amount: 400 });
    const pots = s.hand!.pots.map((p) => ({ amount: p.amount, eligible: p.eligible.map((x) => name(s, x)).sort() }));
    expect(pots).toEqual([
      { amount: 400, eligible: ['A', 'B', 'C', 'D'] },
      { amount: 600, eligible: ['B', 'C', 'D'] },
      { amount: 600, eligible: ['C', 'D'] },
    ]);
    // A wins main, C wins the rest.
    s = run(s, { type: 'AWARD_POTS', winners: [[id(s, 'A')], [id(s, 'C')], [id(s, 'C')]] });
    expect(stack(s, 'A')).toBe(400);
    expect(stack(s, 'B')).toBe(0);
    expect(stack(s, 'C')).toBe(1200);
    expect(stack(s, 'D')).toBe(400);
  });

  it('puts folded chips in the pot without making the folder eligible', () => {
    let s = game(
      [
        { name: 'A', seat: 0, stack: 50 },
        { name: 'B', seat: 1, stack: 1000 },
        { name: 'C', seat: 2, stack: 1000 },
      ],
      0,
    );
    s = run(s, raise(50), raise(200), call); // A all-in 50, B raises 200, C calls
    s = run(s, deal, raise(100), fold); // B bets, C folds -> B wins side pot uncontested
    expect(s.hand!.phase).toBe('showdown');
    const pots = s.hand!.pots;
    expect(pots).toHaveLength(2);
    expect(pots[0]).toEqual({ amount: 150, eligible: [id(s, 'A'), id(s, 'B')] });
    expect(pots[1]).toEqual({ amount: 300, eligible: [id(s, 'B')] });
  });

  it('an incomplete all-in raise does not reopen betting', () => {
    let s = game(
      [
        { name: 'A', seat: 0, stack: 1000 },
        { name: 'B', seat: 1, stack: 1000 },
        { name: 'C', seat: 2, stack: 1000 },
        { name: 'D', seat: 3, stack: 125 },
      ],
      0,
    );
    // B SB, C BB, D UTG folds; A raises to 100, B folds, C calls ... use flop instead.
    s = run(s, call, call, call, check); // D, A, B call; C checks
    s = run(s, deal);
    expect(name(s, s.hand!.actingId)).toBe('B');
    s = run(s, raise(100)); // B bets 100 (full bet)
    s = run(s, call); // C calls
    s = run(s, raise(115)); // D all-in 115: raise of 15, less than 100
    expect(name(s, s.hand!.actingId)).toBe('A');
    expect(legalActions(s)!.canRaise).toBe(true); // A hasn't acted yet
    s = run(s, call);
    expect(name(s, s.hand!.actingId)).toBe('B');
    const legal = legalActions(s)!;
    expect(legal.canRaise).toBe(false); // B already acted since the last full raise
    expect(legal.callAmount).toBe(15);
  });

  it('enforces the minimum raise', () => {
    const s = game([
      { name: 'A', seat: 0, stack: 1000 },
      { name: 'B', seat: 1, stack: 1000 },
      { name: 'C', seat: 2, stack: 1000 },
    ]);
    expect(legalActions(s)!.minRaiseTo).toBe(20);
    expect(() => reduce(s, raise(15))).toThrow(/Minimum raise/);
    const s2 = run(s, raise(50));
    expect(legalActions(s2)!.minRaiseTo).toBe(90);
  });

  it('goes straight to showdown when blinds put everyone all-in', () => {
    const s = game([
      { name: 'A', seat: 0, stack: 5 },
      { name: 'B', seat: 1, stack: 8 },
    ]);
    expect(s.hand!.phase).toBe('showdown');
    expect(s.hand!.result!.refund).toEqual({ playerId: id(s, 'B'), amount: 3 });
  });
});
