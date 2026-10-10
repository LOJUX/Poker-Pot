import { useState } from 'react';
import type { GameAction, GameState } from '../engine/types';
import { formatAmount, handInProgress } from '../engine/game';
import { legalActions, totalPot } from '../engine/betting';
import { TableLayout } from './TableLayout';
import { ActionBar } from './ActionBar';
import { ShowdownPanel } from './ShowdownPanel';
import { HandSummary } from './HandSummary';
import { PlayersPanel } from './PlayersPanel';
import { AddSeat } from './AddSeat';
import { NewGameDialog } from './NewGameDialog';

interface Props {
  game: GameState;
  dispatch: (a: GameAction) => void;
  undo: () => void;
  canUndo: boolean;
  error: string | null;
  onNewGame: (samePlayers: boolean) => void;
}

const STREET_LABEL = { preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River' } as const;
const DEAL_LABEL = { preflop: 'Deal the flop', flop: 'Deal the turn', turn: 'Deal the river', river: '' } as const;

export function GameScreen({ game, dispatch, undo, canUndo, error, onNewGame }: Props) {
  const [showPlayers, setShowPlayers] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showNewGame, setShowNewGame] = useState(false);
  const [addingSeat, setAddingSeat] = useState<number | null>(null);
  const hand = game.hand;
  const fmt = (n: number) => formatAmount(game.config, n);
  const inHand = handInProgress(game);
  const acting = hand?.actingId ? game.players.find((p) => p.id === hand.actingId) : null;
  const legal = legalActions(game);

  return (
    <div className="game">
      <header className="topbar">
        <button onClick={undo} disabled={!canUndo}>
          ↶ Undo
        </button>
        <span className="blinds">
          Blinds {fmt(game.config.smallBlind)}/{fmt(game.config.bigBlind)}
          {hand && ` · Hand #${hand.number}`}
        </span>
        <div className="menu">
          <button onClick={() => setShowMenu(!showMenu)} aria-expanded={showMenu}>
            Menu ▾
          </button>
          {showMenu && (
            <>
              <div className="menu-dismiss" onClick={() => setShowMenu(false)} />
              <div className="menu-items" role="menu">
                <button
                  role="menuitem"
                  disabled={inHand}
                  onClick={() => {
                    setShowMenu(false);
                    setShowPlayers(true);
                  }}
                >
                  Players &amp; rebuys
                  {inHand && <small className="muted">After this hand</small>}
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setShowMenu(false);
                    setShowNewGame(true);
                  }}
                >
                  New game…
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <TableLayout
        maxSeats={game.config.maxSeats}
        arrowSeat={acting?.seat ?? null}
        center={
          <div className="pot-display">
            {hand && inHand && <div className="street">{STREET_LABEL[hand.street]}</div>}
            {hand && inHand && hand.phase !== 'showdown' && <div className="pot">Pot {fmt(totalPot(game))}</div>}
            {hand?.phase === 'showdown' &&
              hand.pots.map((pot, i) => (
                <div key={i} className="pot small">
                  {i === 0 ? 'Main' : `Side ${i}`} {fmt(pot.amount)}
                </div>
              ))}
            {acting && <div className="to-act">{acting.name} to act</div>}
          </div>
        }
        renderSeat={(seat) => {
          const p = game.players.find((x) => x.seat === seat);
          if (!p) {
            if (addingSeat === seat) {
              return <AddSeat game={game} seat={seat} dispatch={dispatch} onDone={() => setAddingSeat(null)} />;
            }
            return (
              <button className="seat-add" onClick={() => setAddingSeat(seat)} aria-label={`Add a player to seat ${seat + 1}`}>
                +
              </button>
            );
          }
          const live = hand && inHand && p.inHand;
          const status = !p.inHand && inHand
            ? p.stack === 0 ? 'Bust' : p.sittingOut ? 'Sitting out' : 'Next hand'
            : !inHand && p.sittingOut ? 'Sitting out'
            : !inHand && p.stack === 0 ? 'Bust'
            : live && p.folded ? 'Folded'
            : live && p.stack === 0 ? 'All-in'
            : null;
          return (
            <div
              className={[
                'seat',
                p.id === acting?.id ? 'acting' : '',
                live && p.folded ? 'folded' : '',
                status === 'Bust' || status === 'Next hand' || status === 'Sitting out' ? 'inactive' : '',
              ].join(' ')}
            >
              <div className="seat-main">
                <strong>{p.name}</strong>
                <span className="stack">{fmt(p.stack)}</span>
                {status && <small className="status">{status}</small>}
              </div>
              <div className="badges">
                {hand && hand.buttonSeat === seat && <span className="badge badge-d">D</span>}
                {hand && inHand && hand.sbSeat === seat && <span className="badge badge-sb">SB</span>}
                {hand && inHand && hand.bbSeat === seat && <span className="badge badge-bb">BB</span>}
              </div>
              {live && p.streetCommitted > 0 && <div className="bet-chip">{fmt(p.streetCommitted)}</div>}
            </div>
          );
        }}
      />

      {error && <p className="error">{error}</p>}

      <section className="controls">
        {(!hand || hand.phase === 'complete') && (
          <>
            {hand?.phase === 'complete' && <HandSummary game={game} />}
            <button className="primary big" onClick={() => dispatch({ type: 'START_HAND' })}>
              {hand ? 'Next hand' : 'Deal first hand'}
            </button>
          </>
        )}
        {hand?.phase === 'betting' && legal && acting && (
          <ActionBar key={`${hand.number}-${hand.log.length}`} game={game} player={acting} legal={legal} dispatch={dispatch} />
        )}
        {hand?.phase === 'dealNext' && (
          <button className="primary big" onClick={() => dispatch({ type: 'DEAL_NEXT' })}>
            {DEAL_LABEL[hand.street]}
          </button>
        )}
        {hand?.phase === 'showdown' && <ShowdownPanel game={game} dispatch={dispatch} />}
      </section>

      {hand && hand.log.length > 0 && (
        <details className="log">
          <summary>Hand history</summary>
          <ol>
            {hand.log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </details>
      )}

      {showPlayers && (
        <PlayersPanel game={game} dispatch={dispatch} onClose={() => setShowPlayers(false)} />
      )}

      {showNewGame && <NewGameDialog game={game} onCancel={() => setShowNewGame(false)} onNewGame={onNewGame} />}
    </div>
  );
}
