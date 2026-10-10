import { useCallback, useEffect, useState } from 'react';
import { reduce } from './engine/game';
import type { GameAction, GameState } from './engine/types';

const STORAGE_KEY = 'poker-pot:v1';
const MAX_HISTORY = 300;

interface Saved {
  game: GameState | null;
  history: GameState[];
}

function load(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Saved;
  } catch {
    // Corrupt or unavailable storage: start fresh.
  }
  return { game: null, history: [] };
}

export function useGameStore() {
  const [saved, setSaved] = useState<Saved>(load);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // Storage full or disabled; the game still works in memory.
    }
  }, [saved]);

  const dispatch = useCallback((action: GameAction) => {
    setSaved((cur) => {
      if (!cur.game) return cur;
      try {
        const next = reduce(cur.game, action);
        setError(null);
        return { game: next, history: [...cur.history, cur.game].slice(-MAX_HISTORY) };
      } catch (e) {
        setError((e as Error).message);
        return cur;
      }
    });
  }, []);

  const undo = useCallback(() => {
    setError(null);
    setSaved((cur) =>
      cur.history.length ? { game: cur.history[cur.history.length - 1], history: cur.history.slice(0, -1) } : cur,
    );
  }, []);

  const startGame = useCallback((game: GameState) => {
    setError(null);
    setSaved({ game, history: [] });
  }, []);

  const endGame = useCallback(() => {
    setError(null);
    setSaved({ game: null, history: [] });
  }, []);

  return {
    game: saved.game,
    canUndo: saved.history.length > 0,
    error,
    clearError: () => setError(null),
    dispatch,
    undo,
    startGame,
    endGame,
  };
}
