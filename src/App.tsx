import { useState } from 'react';
import { useGameStore } from './store';
import { SetupScreen, type SetupPrefill } from './components/SetupScreen';
import { GameScreen } from './components/GameScreen';

export function App() {
  const store = useGameStore();
  const [prefill, setPrefill] = useState<SetupPrefill | null>(null);

  if (!store.game) return <SetupScreen key={prefill ? 'prefilled' : 'blank'} onStart={store.startGame} prefill={prefill} />;

  const newGame = (samePlayers: boolean) => {
    const game = store.game!;
    setPrefill(
      samePlayers
        ? { config: game.config, players: game.players.map((p) => ({ name: p.name, seat: p.seat })) }
        : null,
    );
    store.endGame();
  };

  return (
    <GameScreen
      game={store.game}
      dispatch={store.dispatch}
      undo={store.undo}
      canUndo={store.canUndo}
      animate={store.lastOp === 'act'}
      error={store.error}
      onNewGame={newGame}
    />
  );
}
