import { Fragment, useRef, useState } from 'react';
import type { GameAction, GameState, Player } from '../engine/types';
import { formatAmount, handInProgress, nextButtonSeat } from '../engine/game';
import { legalActions, totalPot } from '../engine/betting';
import { SEAT_INSET, seatGeometry } from '../layout/geometry';
import { enterFullscreen, useClockwise, useElementSize, useWakeLock } from '../hooks';
import { ActionBar } from './ActionBar';
import { ShowdownPanel } from './ShowdownPanel';
import { HandSummary } from './HandSummary';
import { PlayersPanel } from './PlayersPanel';
import { AddSeat } from './AddSeat';
import { NewGameDialog } from './NewGameDialog';
import { ChipStack, chipUnit } from './ChipStack';
import { BetMarker, EmptySeat, Seat } from './Seat';
import { CenterPanel, EdgePanel } from './Facing';
import { TurnArrow } from './TurnArrow';
import { Modal } from './Modal';
import { ChipFlights } from './ChipFlights';

interface Props {
  game: GameState;
  dispatch: (a: GameAction) => void;
  undo: () => void;
  canUndo: boolean;
  /** Animate chips for this state change (false after undo or reload). */
  animate: boolean;
  error: string | null;
  onNewGame: (samePlayers: boolean) => void;
}

type Dialog = 'menu' | 'players' | 'history' | 'newGame' | null;

const STREET_LABEL = { preflop: 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River' } as const;
const DEAL_LABEL = { preflop: 'Deal the flop', flop: 'Deal the turn', turn: 'Deal the river', river: '' } as const;

export function GameScreen({ game, dispatch, undo, canUndo, animate, error, onNewGame }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useElementSize(ref);
  useWakeLock(true);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [addingSeat, setAddingSeat] = useState<number | null>(null);

  const { config } = game;
  const hand = game.hand;
  const fmt = (n: number) => formatAmount(config, n);
  const unit = chipUnit(config);
  const inHand = handInProgress(game);
  const between = !hand || hand.phase === 'complete';
  const acting = hand?.actingId ? (game.players.find((p) => p.id === hand.actingId) ?? null) : null;
  const legal = legalActions(game);
  const geom = (seat: number) => seatGeometry(seat, config.maxSeats, w, h, SEAT_INSET);

  // Between hands everything faces whoever deals next; during a hand, the player to act or the dealer.
  const dealerSeat = between ? (nextButtonSeat(game) ?? game.buttonSeat) : hand!.buttonSeat;
  const dealer = game.players.find((p) => p.seat === dealerSeat) ?? null;
  const focusSeat = acting?.seat ?? dealerSeat ?? game.players[0]?.seat ?? 0;
  const focus = geom(focusSeat);
  const centerRot = useClockwise(focus.sideRot) ?? 0;

  function status(p: Player): string | null {
    if (inHand && !p.inHand) return p.stack === 0 ? 'Bust' : p.sittingOut ? 'Sitting out' : 'Next hand';
    if (!inHand && p.sittingOut) return 'Sitting out';
    if (!inHand && p.stack === 0) return 'Bust';
    if (inHand && p.folded) return 'Folded';
    if (inHand && p.stack === 0) return 'All-in';
    return null;
  }

  const tools = (
    <>
      <button className="icon" onClick={undo} disabled={!canUndo} aria-label="Undo">
        ↶
      </button>
      <button className="icon" onClick={() => setDialog('menu')} aria-label="Menu">
        ☰
      </button>
    </>
  );

  function panel() {
    if (hand?.phase === 'betting' && acting && legal) {
      return (
        <EdgePanel seat={focus} w={w} h={h} tools={tools}>
          <ActionBar key={`${hand.number}-${hand.log.length}`} game={game} player={acting} legal={legal} unit={unit} dispatch={dispatch} />
        </EdgePanel>
      );
    }
    if (hand?.phase === 'dealNext') {
      return (
        <EdgePanel seat={focus} w={w} h={h} tools={tools}>
          <div className="panel-head">
            <strong>{dealer?.name}</strong>
            <span className="muted">is dealing</span>
          </div>
          <button className="primary big" onClick={() => dispatch({ type: 'DEAL_NEXT' })}>
            {DEAL_LABEL[hand.street]}
          </button>
        </EdgePanel>
      );
    }
    if (hand?.phase === 'showdown') {
      return (
        <CenterPanel seat={focus} w={w} h={h} tools={tools}>
          <ShowdownPanel game={game} dispatch={dispatch} />
        </CenterPanel>
      );
    }
    return (
      <EdgePanel seat={focus} w={w} h={h} tools={tools}>
        {hand?.phase === 'complete' && <HandSummary game={game} />}
        {dealer && nextButtonSeat(game) != null ? (
          <>
            <button className="primary big" onClick={() => dispatch({ type: 'START_HAND' })}>
              {hand ? 'Next hand' : 'Deal first hand'}
            </button>
            <div className="muted small center-text">{dealer.name} deals</div>
          </>
        ) : (
          <p className="muted small center-text">Need two players with chips. Open ☰ → Players to rebuy or add someone.</p>
        )}
      </EdgePanel>
    );
  }

  const potTotal = inHand ? totalPot(game) : 0;
  const showBets = hand?.phase === 'betting' || hand?.phase === 'dealNext';

  return (
    <div className="arena" ref={ref}>
      {w > 0 && (
        <>
          {Array.from({ length: config.maxSeats }, (_, seat) => {
            const g = geom(seat);
            const p = game.players.find((x) => x.seat === seat);
            if (!p) {
              return <EmptySeat key={seat} geom={g} onClick={() => setAddingSeat(seat)} label={`Add a player to seat ${seat + 1}`} />;
            }
            const st = status(p);
            return (
              <Fragment key={seat}>
                <Seat
                  geom={g}
                  name={p.name}
                  stack={p.stack}
                  unit={unit}
                  fmt={fmt}
                  status={st}
                  className={[p.id === acting?.id ? 'acting' : '', st && st !== 'All-in' ? 'inactive' : ''].join(' ')}
                  tags={
                    <>
                      {dealerSeat === seat && <span className="tag tag-d">D</span>}
                      {inHand && hand!.sbSeat === seat && <span className="tag tag-sb">SB</span>}
                      {inHand && hand!.bbSeat === seat && <span className="tag tag-bb">BB</span>}
                    </>
                  }
                />
                {showBets && p.inHand && p.streetCommitted > 0 && (
                  <BetMarker geom={g} amount={p.streetCommitted} unit={unit} fmt={fmt} />
                )}
              </Fragment>
            );
          })}

          <ChipFlights game={game} animate={animate} geom={geom} w={w} h={h} unit={unit} fmt={fmt} />

          <TurnArrow angle={focus.angle} muted={!acting} />

          {hand?.phase !== 'showdown' && (
            <div className="center" style={{ transform: `translate(-50%, -50%) rotate(${centerRot}deg)` }}>
              {inHand ? (
                <>
                  <div className="street">{STREET_LABEL[hand!.street]}</div>
                  <ChipStack amount={potTotal} unit={unit} />
                  <div className="pot">{fmt(potTotal)}</div>
                </>
              ) : (
                <div className="street">
                  Blinds {fmt(config.smallBlind)}/{fmt(config.bigBlind)}
                </div>
              )}
            </div>
          )}

          {panel()}
        </>
      )}

      {error && <div className="toast">{error}</div>}

      {dialog === 'menu' && (
        <Modal title="Menu" onClose={() => setDialog(null)} narrow>
          <div className="menu-list">
            <button disabled={inHand} onClick={() => setDialog('players')}>
              Players &amp; rebuys
              {inHand && <small className="muted">After this hand</small>}
            </button>
            <button disabled={!hand?.log.length} onClick={() => setDialog('history')}>
              Hand history
            </button>
            <button
              onClick={() => {
                setDialog(null);
                void enterFullscreen();
              }}
            >
              Full screen
            </button>
            <button onClick={() => setDialog('newGame')}>New game…</button>
          </div>
        </Modal>
      )}
      {dialog === 'players' && <PlayersPanel game={game} dispatch={dispatch} onClose={() => setDialog(null)} />}
      {dialog === 'history' && hand && (
        <Modal title={`Hand #${hand.number}`} onClose={() => setDialog(null)} narrow>
          <ol className="log">
            {hand.log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>
        </Modal>
      )}
      {dialog === 'newGame' && <NewGameDialog game={game} onCancel={() => setDialog(null)} onNewGame={onNewGame} />}
      {addingSeat != null && <AddSeat game={game} seat={addingSeat} dispatch={dispatch} onDone={() => setAddingSeat(null)} />}
    </div>
  );
}
