import { useGameStore } from './store';
import { SetupScreen } from './components/SetupScreen';
import { GameScreen } from './components/GameScreen';

export function App() {
  const store = useGameStore();
  if (!store.game) return <SetupScreen onStart={store.startGame} />;
  return (
    <GameScreen
      game={store.game}
      dispatch={store.dispatch}
      undo={store.undo}
      canUndo={store.canUndo}
      error={store.error}
      onEndGame={store.endGame}
    />
  );
}
