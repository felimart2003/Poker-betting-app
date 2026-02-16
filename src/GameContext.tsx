import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { GameState, GameSettings, DEFAULT_SETTINGS } from './types';
import {
  createGame,
  startNewHand,
  performAction,
  awardPot,
  advanceDealer,
} from './gameState';

interface GameContextType {
  game: GameState | null;
  settings: GameSettings;
  updateSettings: (settings: Partial<GameSettings>) => void;
  initGame: () => void;
  dealNewHand: () => void;
  doAction: (action: string, amount?: number) => void;
  awardToWinners: (winnerIds: string[]) => void;
  nextDealer: () => void;
  resetGame: () => void;
  history: string[];
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<string[]>([]);

  const addHistory = useCallback((msg: string) => {
    setHistory(prev => [msg, ...prev].slice(0, 50));
  }, []);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, []);

  const initGame = useCallback(() => {
    const g = createGame(settings);
    setGame(g);
    setHistory([]);
    addHistory(`Game started with ${settings.playerNames.length} players`);
  }, [settings, addHistory]);

  const dealNewHand = useCallback(() => {
    if (!game) return;
    const newGame = startNewHand(game);
    setGame(newGame);
    const dealer = newGame.players[newGame.dealerIndex];
    addHistory(`--- Hand #${newGame.roundNumber} --- Dealer: ${dealer.name}`);
  }, [game, addHistory]);

  const doAction = useCallback((action: string, amount?: number) => {
    if (!game) return;
    const player = game.players[game.currentPlayerIndex];
    const newGame = performAction(game, action, amount);
    setGame(newGame);

    let msg = `${player.name}: ${action}`;
    if (amount && (action === 'bet' || action === 'raise')) {
      msg += ` to ${amount}`;
    }
    if (action === 'all-in') {
      msg += ` (${player.chips + player.currentBet})`;
    }
    addHistory(msg);

    // Check if only one player remains
    const remaining = newGame.players.filter(p => !p.isFolded && p.isActive);
    if (remaining.length === 1 && !newGame.isHandActive) {
      addHistory(`${remaining[0].name} wins the pot!`);
    }
  }, [game, addHistory]);

  const awardToWinners = useCallback((winnerIds: string[]) => {
    if (!game) return;
    const newGame = awardPot(game, winnerIds);
    setGame(newGame);
    const names = winnerIds
      .map(id => newGame.players.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    addHistory(`Pot awarded to: ${names}`);
  }, [game, addHistory]);

  const nextDealer = useCallback(() => {
    if (!game) return;
    const newGame = advanceDealer(game);
    setGame(newGame);
  }, [game]);

  const resetGame = useCallback(() => {
    setGame(null);
    setHistory([]);
  }, []);

  return (
    <GameContext.Provider
      value={{
        game,
        settings,
        updateSettings,
        initGame,
        dealNewHand,
        doAction,
        awardToWinners,
        nextDealer,
        resetGame,
        history,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
