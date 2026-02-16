import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { ChatMessage, GameMode, GameSettings, GameState, DEFAULT_SETTINGS, RoomState } from './types';
import {
  addPlayerToGame,
  advanceDealer,
  awardPot,
  createGame,
  editPlayerChips,
  performAction,
  startNewHand,
} from './gameState';
import { networkClient } from './network';

interface GameContextType {
  game: GameState | null;
  settings: GameSettings;
  mode: GameMode;
  room: RoomState | null;
  history: string[];
  chatMessages: ChatMessage[];
  timerPaused: boolean;
  canUndo: boolean;
  updateSettings: (settings: Partial<GameSettings>) => void;
  setMode: (mode: GameMode) => void;
  connectToRoom: (params: {
    roomCode: string;
    playerName: string;
    serverUrl: string;
    create: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  disconnectRoom: () => void;
  initGame: () => void;
  dealNewHand: () => void;
  doAction: (action: string, amount?: number) => void;
  awardToWinners: (winnerIds: string[]) => void;
  nextDealer: () => void;
  addPlayerMidgame: (name: string, chips: number) => void;
  updatePlayerChips: (playerId: string, chips: number) => void;
  undoLastAction: () => void;
  toggleTimerPaused: (paused?: boolean) => void;
  sendChatMessage: (text: string) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

type UndoState = {
  game: GameState | null;
  history: string[];
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<GameMode>('local');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [timerPaused, setTimerPaused] = useState(false);
  const [pastStates, setPastStates] = useState<UndoState[]>([]);
  const applyingRemoteRef = useRef(false);

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
    const roomCode = params.roomCode.trim().toUpperCase();
    const playerName = params.playerName.trim();
    const serverUrl = params.serverUrl.trim();
    const create = params.create;

    if (!roomCode) {
      return { ok: false, error: 'Room code is required.' };
    }
    if (!playerName) {
      return { ok: false, error: 'Player name is required.' };
    }
    if (!serverUrl) {
      return { ok: false, error: 'Server URL is required.' };
    }

    try {
      networkClient.offAll();
      networkClient.disconnect();
      networkClient.connect(serverUrl);

      const response = await new Promise<{ ok: boolean; error?: string; snapshot?: any }>(resolve => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          resolve({ ok: false, error: 'Connection timed out. Check server URL and try again.' });
        }, 12000);

        const finalize = (result: { ok: boolean; error?: string; snapshot?: any }) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          resolve(result);
        };

        if (create) {
          networkClient.createRoom(roomCode, playerName, finalize);
        } else {
          networkClient.joinRoom(roomCode, playerName, finalize);
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
        timerPaused: !!response.snapshot.timerPaused,
      });

      if (response.snapshot.settings) setSettings(response.snapshot.settings);
      if (response.snapshot.game) setGame(response.snapshot.game);
      if (response.snapshot.history) setHistory(response.snapshot.history);
      if (response.snapshot.chat) setChatMessages(response.snapshot.chat);
      setTimerPaused(!!response.snapshot.timerPaused);

      networkClient.offAll();
      networkClient.onRoomUpdate(snapshot => {
        setRoom(prev => prev ? {
          ...prev,
          connectedUsers: snapshot.users || [],
          timerPaused: !!snapshot.timerPaused,
        } : prev);
      });
      networkClient.onStateUpdate(next => {
        applyingRemoteRef.current = true;
        if (next.settings) setSettings(next.settings);
        if (typeof next.game !== 'undefined') setGame(next.game);
        if (next.history) setHistory(next.history);
        if (typeof next.timerPaused === 'boolean') {
          setTimerPaused(next.timerPaused);
          setRoom(prev => prev ? { ...prev, timerPaused: !!next.timerPaused } : prev);
        }
        setTimeout(() => {
          applyingRemoteRef.current = false;
        }, 0);
      });
      networkClient.onChatUpdate(payload => {
        setChatMessages(payload.chat || []);
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
    setChatMessages([]);
    setTimerPaused(false);
  }, []);

  const initGame = useCallback(() => {
    const newGame = createGame(settings);
    saveUndoSnapshot(game, history);
    setGame(newGame);
    const nextHistory = [`[pre-flop] Game started with ${settings.playerNames.length} players`];
    setHistory(nextHistory);
    setPastStates([]);
    setTimerPaused(false);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings]);

  const dealNewHand = useCallback(() => {
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = startNewHand(game);
    const dealer = newGame.players[newGame.dealerIndex];
    const nextHistory = [`[${newGame.round}] --- Hand #${newGame.roundNumber} --- Dealer: ${dealer.name}`, ...history].slice(0, 50);
    setGame(newGame);
    setHistory(nextHistory);
    setTimerPaused(false);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings]);

  const doAction = useCallback((action: string, amount?: number) => {
    if (!game) return;
    saveUndoSnapshot(game, history);
    const player = game.players[game.currentPlayerIndex];
    const newGame = performAction(game, action, amount);
    const playerAfterAction = newGame.players.find(p => p.id === player.id);

    let msg = `[${game.round}] ${player.name}: ${action}`;
    if (typeof amount === 'number' && (action === 'bet' || action === 'raise')) {
      const effectiveBet = playerAfterAction?.currentBet ?? amount;
      msg += ` to ${Math.max(0, Math.floor(effectiveBet))}`;
    }
    if (action === 'all-in') {
      msg += ` (${player.chips + player.currentBet})`;
    }

    let nextHistory = [msg, ...history].slice(0, 50);
    const remaining = newGame.players.filter(p => !p.isFolded && p.isActive);
    if (remaining.length === 1 && !newGame.isHandActive) {
      nextHistory = [`[${newGame.round}] ${remaining[0].name} wins the pot!`, ...nextHistory].slice(0, 50);
    }

    setGame(newGame);
    setHistory(nextHistory);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings]);

  const awardToWinners = useCallback((winnerIds: string[]) => {
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = awardPot(game, winnerIds);
    const names = winnerIds
      .map(id => newGame.players.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    const nextHistory = [`[${newGame.round}] Pot awarded to: ${names}`, ...history].slice(0, 50);
    setGame(newGame);
    setHistory(nextHistory);
    setTimerPaused(false);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings]);

  const nextDealer = useCallback(() => {
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = advanceDealer(game);
    setGame(newGame);
    pushOnlineState(newGame, settings, history);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings]);

  const addPlayerMidgame = useCallback((name: string, chips: number) => {
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = addPlayerToGame(game, name, chips);
    const nextHistory = [`[${newGame.round}] Added player ${name} (${chips} chips)`, ...history].slice(0, 50);
    setGame(newGame);
    setHistory(nextHistory);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings]);

  const updatePlayerChips = useCallback((playerId: string, chips: number) => {
    if (!game) return;
    const player = game.players.find(p => p.id === playerId);
    if (!player) return;

    saveUndoSnapshot(game, history);
    const safeChips = Math.max(0, Math.floor(chips));
    const newGame = editPlayerChips(game, playerId, safeChips);
    const nextHistory = [`[${newGame.round}] Chip correction: ${player.name} -> ${safeChips}`, ...history].slice(0, 50);
    setGame(newGame);
    setHistory(nextHistory);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings]);

  const undoLastAction = useCallback(() => {
    if (pastStates.length === 0) return;
    const [latest, ...rest] = pastStates;
    setPastStates(rest);
    setGame(latest.game);
    setHistory(latest.history);
    pushOnlineState(latest.game, settings, latest.history);
  }, [pastStates, pushOnlineState, settings]);

  const toggleTimerPaused = useCallback((paused?: boolean) => {
    if (settings.decisionTimerSeconds <= 0) return;
    const nextPaused = typeof paused === 'boolean' ? paused : !timerPaused;
    setTimerPaused(nextPaused);
    setRoom(prev => prev ? { ...prev, timerPaused: nextPaused } : prev);
    if (mode === 'online' && room) {
      networkClient.setTimerPaused(room.roomCode, nextPaused);
    }
  }, [mode, room, settings.decisionTimerSeconds, timerPaused]);

  const sendChatMessage = useCallback((text: string) => {
    const messageText = text.trim();
    if (!messageText) return;

    if (mode !== 'online' || !room) return;
    networkClient.sendChat(room.roomCode, room.playerName, messageText);
  }, [mode, room]);

  const resetGame = useCallback(() => {
    setGame(null);
    setHistory([]);
    setPastStates([]);
    setChatMessages([]);
    setTimerPaused(false);
    pushOnlineState(null, settings, []);
  }, [pushOnlineState, settings]);

  return (
    <GameContext.Provider
      value={{
        game,
        settings,
        mode,
        room,
        history,
        chatMessages,
        timerPaused,
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
        toggleTimerPaused,
        sendChatMessage,
        resetGame,
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
