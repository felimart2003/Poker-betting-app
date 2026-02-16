import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { GameState, GameMode, GameSettings, DEFAULT_SETTINGS, RoomState } from './types';
import {
  addPlayerToGame,
  editPlayerChips,
  createGame,
  startNewHand,
  performAction,
  awardPot,
  advanceDealer,
} from './gameState';
import { networkClient } from './network';

interface GameContextType {
  game: GameState | null;
  settings: GameSettings;
  mode: GameMode;
  room: RoomState | null;
  canUndo: boolean;
  updateSettings: (settings: Partial<GameSettings>) => void;
  setMode: (mode: GameMode) => void;
  connectToRoom: (params: { roomCode: string; playerName: string; serverUrl: string; create: boolean }) => Promise<{ ok: boolean; error?: string }>;
  disconnectRoom: () => void;
  initGame: () => void;
  dealNewHand: () => void;
  doAction: (action: string, amount?: number) => void;
  awardToWinners: (winnerIds: string[]) => void;
  nextDealer: () => void;
  addPlayerMidgame: (name: string, chips: number) => void;
  updatePlayerChips: (playerId: string, chips: number) => void;
  undoLastAction: () => void;
  resetGame: () => void;
  history: string[];
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<GameMode>('local');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [pastStates, setPastStates] = useState<Array<{ game: GameState | null; history: string[] }>>([]);
  const applyingRemoteRef = useRef(false);

  const addHistory = useCallback((msg: string) => {
    setHistory(prev => [msg, ...prev].slice(0, 50));
  }, []);

  const saveUndoSnapshot = useCallback((currentGame: GameState | null, currentHistory: string[]) => {
    setPastStates(prev => [{
      game: currentGame ? JSON.parse(JSON.stringify(currentGame)) : null,
      history: [...currentHistory],
    }, ...prev].slice(0, 30));
  }, []);

  const pushOnlineState = useCallback((nextGame: GameState | null, nextSettings: GameSettings, nextHistory: string[]) => {
    if (mode !== 'online' || !room || applyingRemoteRef.current) return;
    networkClient.pushState(room.roomCode, {
      game: nextGame,
      settings: nextSettings,
      history: nextHistory,
    });
  }, [mode, room]);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      pushOnlineState(game, next, history);
      return next;
    });
  }, [game, history, pushOnlineState]);

  const connectToRoom = useCallback(async (
    params: { roomCode: string; playerName: string; serverUrl: string; create: boolean }
  ) => {
    const { roomCode, playerName, serverUrl, create } = params;
    try {
      networkClient.connect(serverUrl);
      const response = await new Promise<{ ok: boolean; error?: string; snapshot?: any }>(resolve => {
        if (create) {
          networkClient.createRoom(roomCode, playerName, resolve);
        } else {
          networkClient.joinRoom(roomCode, playerName, resolve);
        }
      });

      if (!response.ok || !response.snapshot) {
        return { ok: false, error: response.error || 'Unable to connect room' };
      }

      setMode('online');
      setRoom({
        roomCode: response.snapshot.roomCode,
        playerName,
        serverUrl,
        mode: 'online',
        connectedUsers: response.snapshot.users || [],
      });

      if (response.snapshot.settings) setSettings(response.snapshot.settings);
      if (response.snapshot.game) setGame(response.snapshot.game);
      if (response.snapshot.history) setHistory(response.snapshot.history);

      networkClient.offAll();
      networkClient.onRoomUpdate(snapshot => {
        setRoom(prev => prev ? { ...prev, connectedUsers: snapshot.users || [] } : prev);
      });
      networkClient.onStateUpdate(next => {
        applyingRemoteRef.current = true;
        if (next.settings) setSettings(next.settings);
        if (typeof next.game !== 'undefined') setGame(next.game);
        if (next.history) setHistory(next.history);
        setTimeout(() => {
          applyingRemoteRef.current = false;
        }, 0);
      });

      return { ok: true };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Network error' };
    }
  }, []);

  const disconnectRoom = useCallback(() => {
    networkClient.offAll();
    networkClient.disconnect();
    setMode('local');
    setRoom(null);
  }, []);

  const initGame = useCallback(() => {
    const g = createGame(settings);
    saveUndoSnapshot(game, history);
    setGame(g);
    setHistory([]);
    const nextHistory = [`[pre-flop] Game started with ${settings.playerNames.length} players`];
    setHistory(nextHistory);
    pushOnlineState(g, settings, nextHistory);
  }, [settings, saveUndoSnapshot, game, history, pushOnlineState]);

  const dealNewHand = useCallback(() => {
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = startNewHand(game);
    setGame(newGame);
    const dealer = newGame.players[newGame.dealerIndex];
    const nextHistory = [`[${newGame.round}] --- Hand #${newGame.roundNumber} --- Dealer: ${dealer.name}`, ...history].slice(0, 50);
    setHistory(nextHistory);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, settings, saveUndoSnapshot, pushOnlineState]);

  const doAction = useCallback((action: string, amount?: number) => {
    if (!game) return;
    saveUndoSnapshot(game, history);
    const player = game.players[game.currentPlayerIndex];
    const newGame = performAction(game, action, amount);
    setGame(newGame);

    let msg = `[${game.round}] ${player.name}: ${action}`;
    if (amount && (action === 'bet' || action === 'raise')) {
      msg += ` to ${amount}`;
    }
    if (action === 'all-in') {
      msg += ` (${player.chips + player.currentBet})`;
    }
    let nextHistory = [msg, ...history].slice(0, 50);

    // Check if only one player remains
    const remaining = newGame.players.filter(p => !p.isFolded && p.isActive);
    if (remaining.length === 1 && !newGame.isHandActive) {
      nextHistory = [`[${newGame.round}] ${remaining[0].name} wins the pot!`, ...nextHistory].slice(0, 50);
    }
    setHistory(nextHistory);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, settings, saveUndoSnapshot, pushOnlineState]);

  const awardToWinners = useCallback((winnerIds: string[]) => {
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = awardPot(game, winnerIds);
    setGame(newGame);
    const names = winnerIds
      .map(id => newGame.players.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    const nextHistory = [`[${newGame.round}] Pot awarded to: ${names}`, ...history].slice(0, 50);
    setHistory(nextHistory);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, settings, saveUndoSnapshot, pushOnlineState]);

  const nextDealer = useCallback(() => {
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = advanceDealer(game);
    setGame(newGame);
    pushOnlineState(newGame, settings, history);
  }, [game, history, settings, saveUndoSnapshot, pushOnlineState]);

  const addPlayerMidgame = useCallback((name: string, chips: number) => {
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = addPlayerToGame(game, name, chips);
    const nextHistory = [`[${newGame.round}] Added player ${name} (${chips} chips)`, ...history].slice(0, 50);
    setGame(newGame);
    setHistory(nextHistory);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, settings, saveUndoSnapshot, pushOnlineState]);

  const updatePlayerChips = useCallback((playerId: string, chips: number) => {
    if (!game) return;
    const player = game.players.find(p => p.id === playerId);
    if (!player) return;
    saveUndoSnapshot(game, history);
    const newGame = editPlayerChips(game, playerId, chips);
    const nextHistory = [`[${newGame.round}] Chip correction: ${player.name} -> ${chips}`, ...history].slice(0, 50);
    setGame(newGame);
    setHistory(nextHistory);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, settings, saveUndoSnapshot, pushOnlineState]);

  const undoLastAction = useCallback(() => {
    if (pastStates.length === 0) return;
    const [latest, ...rest] = pastStates;
    setPastStates(rest);
    setGame(latest.game);
    setHistory(latest.history);
    pushOnlineState(latest.game, settings, latest.history);
  }, [pastStates, settings, pushOnlineState]);

  const resetGame = useCallback(() => {
    setGame(null);
    setHistory([]);
    setPastStates([]);
    pushOnlineState(null, settings, []);
  }, [settings, pushOnlineState]);

  return (
    <GameContext.Provider
      value={{
        game,
        settings,
        mode,
        room,
        canUndo: pastStates.length > 0,
        updateSettings,
        setMode,
        connectToRoom,
        disconnectRoom,
        initGame,
        dealNewHand,
        doAction,
        awardToWinners,
        nextDealer,
        addPlayerMidgame,
        updatePlayerChips,
        undoLastAction,
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
