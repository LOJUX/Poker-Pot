import { describe, expect, it } from 'vitest';
import { createGame, reduce } from '../engine/game';
import type { GameAction, GameState } from '../engine/types';
import { chipMoves } from './chipMoves';

const config = { maxSeats: 6, smallBlind: 5, bigBlind: 10, currency: '', unitScale: 1 };

function setup() {
  return createGame(
    config,
    [
      { name: 'A', seat: 0, stack: 1000 },
      { name: 'B', seat: 1, stack: 1000 },
      { name: 'C', seat: 2, stack: 1000 },
    ],
    0,
  );
}

function step(s: GameState, a: GameAction) {
  const next = reduce(s, a);
  return { next, ...chipMoves(s, next) };
}

const id = (s: GameState, n: string) => s.players.find((p) => p.name === n)!.id;

describe('chipMoves', () => {
  it('moves blinds and bets from stacks to the bets in front of players', () => {
    const s = setup();
    const { next, moves, changes } = step(s, { type: 'START_HAND' });
    expect(moves).toEqual([
      { kind: 'bet', playerId: id(s, 'B'), amount: 5 },
      { kind: 'bet', playerId: id(s, 'C'), amount: 10 },
    ]);
    expect(changes).toEqual([
      { playerId: id(s, 'B'), delta: -5 },
      { playerId: id(s, 'C'), delta: -10 },
    ]);
    const call = step(next, { type: 'ACT', action: { type: 'call' } });
    expect(call.moves).toEqual([{ kind: 'bet', playerId: id(s, 'A'), amount: 10 }]);
  });

  it('sweeps bets into the pot when the next street is dealt', () => {
    let s = reduce(setup(), { type: 'START_HAND' });
    for (const a of ['call', 'call', 'check'] as const) s = reduce(s, { type: 'ACT', action: { type: a } });
    const { moves, changes } = step(s, { type: 'DEAL_NEXT' });
    expect(moves.map((m) => [m.kind, m.amount])).toEqual([
      ['collect', 10],
      ['collect', 10],
      ['collect', 10],
    ]);
    expect(changes).toEqual([]);
  });

  it('collects bets and pays the winner when everyone folds', () => {
    let s = reduce(setup(), { type: 'START_HAND' });
    s = reduce(s, { type: 'ACT', action: { type: 'fold' } });
    const { moves, changes } = step(s, { type: 'ACT', action: { type: 'fold' } });
    expect(moves).toEqual([
      { kind: 'collect', playerId: id(s, 'B'), amount: 5 },
      { kind: 'collect', playerId: id(s, 'C'), amount: 10 },
      { kind: 'payout', playerId: id(s, 'C'), amount: 15 },
    ]);
    expect(changes).toEqual([{ playerId: id(s, 'C'), delta: 15 }]);
  });

  it('shows a rebuy as a stack change without chips flying from the pot', () => {
    let s = reduce(setup(), { type: 'START_HAND' });
    s = reduce(s, { type: 'ACT', action: { type: 'fold' } });
    s = reduce(s, { type: 'ACT', action: { type: 'fold' } });
    const { moves, changes } = step(s, { type: 'REBUY', playerId: id(s, 'A'), amount: 500 });
    expect(moves).toEqual([]);
    expect(changes).toEqual([{ playerId: id(s, 'A'), delta: 500 }]);
  });
});
