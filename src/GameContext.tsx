import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
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
import { DEFAULT_SERVER_URL } from './config';

interface GameContextType {
  game: GameState | null;
  settings: GameSettings;
  mode: GameMode;
  room: RoomState | null;
  history: string[];
  chatMessages: ChatMessage[];
  timerPaused: boolean;
  canUndo: boolean;
  canControl: boolean;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  setMode: (mode: GameMode) => void;
  connectToRoom: (params: {
    playerName: string;
    roomCode?: string;
    create: boolean;
  }) => Promise<{ ok: boolean; error?: string; roomCode?: string }>;
  disconnectRoom: () => void;
  initGame: (overrides?: Partial<GameSettings>) => void;
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
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER_URL);
  const applyingRemoteRef = useRef(false);
  const canControl = mode !== 'online' || (!!room && room.hostSocketId === networkClient.getSocketId());
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem('poker-chips:local:v2').then(raw => {
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.version !== 2 || !saved.settings || !Array.isArray(saved.history)) return;
      createGame(saved.settings); // Validate settings before accepting stored data.
      const stored = saved.game;
      if (stored && (!Array.isArray(stored.players) || stored.players.length < 2 || stored.players.length > 8 || !Number.isSafeInteger(stored.pot) || stored.pot < 0 || !Number.isInteger(stored.currentPlayerIndex) || stored.currentPlayerIndex < 0 || stored.currentPlayerIndex >= stored.players.length || !Array.isArray(stored.sidePots) || !stored.players.every((p: any) => Number.isSafeInteger(p.chips) && p.chips >= 0 && Number.isSafeInteger(p.totalContribution) && p.totalContribution >= 0))) return;
      setSettings(saved.settings); setGame(stored || null); setHistory(saved.history.filter((x: unknown) => typeof x === 'string').slice(0, 50));
    }).catch(() => {}).finally(() => setRestored(true));
  }, []);
  useEffect(() => {
    if (!restored || mode !== 'local') return;
    AsyncStorage.setItem('poker-chips:local:v2', JSON.stringify({version:2,game,settings,history})).catch(() => {});
  }, [restored, mode, game, settings, history]);


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
  }, [mode, room, canControl]);

  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    if (!canControl) return;
    setSettings(prev => {
      const next = { ...prev, ...partial };
      pushOnlineState(game, next, history);
      return next;
    });
  }, [game, history, pushOnlineState, canControl]);

  const connectToRoom = useCallback(async (
    params: { playerName: string; roomCode?: string; create: boolean }
  ) => {
    const playerName = params.playerName.trim();
    const create = params.create;

    if (!playerName) {
      return { ok: false, error: 'Player name is required.' };
    }
    if (!create && !params.roomCode?.trim()) {
      return { ok: false, error: 'Room code is required to join.' };
    }
    if (!serverUrl.trim()) {
      return { ok: false, error: 'Server URL is not configured.' };
    }

    try {
      networkClient.offAll();
      networkClient.disconnect();
      await networkClient.connectAndWait(serverUrl);

      const response = await new Promise<{ ok: boolean; error?: string; snapshot?: any }>(resolve => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          resolve({ ok: false, error: 'Server did not respond. Try again.' });
        }, 10000);

        const finalize = (result: { ok: boolean; error?: string; snapshot?: any }) => {
          if (resolved) return;
          resolved = true;
          clearTimeout(timeout);
          resolve(result);
        };

        if (create) {
          networkClient.createRoom(playerName, finalize);
        } else {
          networkClient.joinRoom(params.roomCode!.trim().toUpperCase(), playerName, finalize);
        }
      });

      if (!response.ok || !response.snapshot) {
        return { ok: false, error: response.error || 'Unable to connect to room' };
      }

      const roomCode = response.snapshot.roomCode;

      setMode('online');
      setRoom({
        roomCode,
        playerName,
        serverUrl,
        mode: 'online',
        hostSocketId: response.snapshot.hostSocketId || null,
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
          hostSocketId: snapshot.hostSocketId || null,
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

      return { ok: true, roomCode };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Network error' };
    }
  }, [serverUrl]);

  const disconnectRoom = useCallback(() => {
    networkClient.offAll();
    networkClient.disconnect();
    if (mode === 'online') { setGame(null); setHistory([]); setPastStates([]); }
    setMode('local');
    setRoom(null);
    setChatMessages([]);
    setTimerPaused(false);
  }, [mode]);

  const initGame = useCallback((overrides?: Partial<GameSettings>) => {
    if (!canControl) return;
    const nextSettings = { ...settings, ...overrides };
    const newGame = createGame(nextSettings);
    setSettings(nextSettings);
    saveUndoSnapshot(game, history);
    setGame(newGame);
    const nextHistory = [`[pre-flop] Game started with ${nextSettings.playerNames.length} players`];
    setHistory(nextHistory);
    setPastStates([]);
    setTimerPaused(false);
    pushOnlineState(newGame, nextSettings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings, canControl]);

  const dealNewHand = useCallback(() => {
    if (!canControl) return;
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = startNewHand(game);
    const dealer = newGame.players[newGame.dealerIndex];
    const nextHistory = [`[${newGame.round}] --- Hand #${newGame.roundNumber} --- Dealer: ${dealer.name}`, ...history].slice(0, 50);
    setGame(newGame);
    setHistory(nextHistory);
    setTimerPaused(false);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings, canControl]);

  const doAction = useCallback((action: string, amount?: number) => {
    if (!canControl) return;
    if (!game) return;
    saveUndoSnapshot(game, history);
    const player = game.players[game.currentPlayerIndex];
    const newGame = performAction(game, action, amount);
    if (newGame === game) return;
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
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings, canControl]);

  const awardToWinners = useCallback((winnerIds: string[]) => {
    if (!canControl) return;
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = awardPot(game, winnerIds);
    if (newGame === game) return;
    const names = winnerIds
      .map(id => newGame.players.find(p => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');

    const nextHistory = [`[${newGame.round}] Pot awarded to: ${names}`, ...history].slice(0, 50);
    setGame(newGame);
    setHistory(nextHistory);
    setTimerPaused(false);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings, canControl]);

  const nextDealer = useCallback(() => {
    if (!canControl) return;
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = advanceDealer(game);
    setGame(newGame);
    pushOnlineState(newGame, settings, history);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings, canControl]);

  const addPlayerMidgame = useCallback((name: string, chips: number) => {
    if (!canControl) return;
    if (!game) return;
    saveUndoSnapshot(game, history);
    const newGame = addPlayerToGame(game, name, chips);
    if (newGame === game) return;
    const nextHistory = [`[${newGame.round}] Added player ${name} (${chips} chips)`, ...history].slice(0, 50);
    setGame(newGame);
    setHistory(nextHistory);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings, canControl]);

  const updatePlayerChips = useCallback((playerId: string, chips: number) => {
    if (!canControl) return;
    if (!game) return;
    const player = game.players.find(p => p.id === playerId);
    if (!player) return;

    saveUndoSnapshot(game, history);
    const safeChips = Math.max(0, Math.floor(chips));
    const newGame = editPlayerChips(game, playerId, safeChips);
    if (newGame === game) return;
    const nextHistory = [`[${newGame.round}] Chip correction: ${player.name} -> ${safeChips}`, ...history].slice(0, 50);
    setGame(newGame);
    setHistory(nextHistory);
    pushOnlineState(newGame, settings, nextHistory);
  }, [game, history, pushOnlineState, saveUndoSnapshot, settings, canControl]);

  const undoLastAction = useCallback(() => {
    if (!canControl) return;
    if (pastStates.length === 0) return;
    const [latest, ...rest] = pastStates;
    setPastStates(rest);
    setGame(latest.game);
    setHistory(latest.history);
    pushOnlineState(latest.game, settings, latest.history);
  }, [pastStates, pushOnlineState, settings, canControl]);

  const toggleTimerPaused = useCallback((paused?: boolean) => {
    if (!canControl) return;
    if (settings.decisionTimerSeconds <= 0) return;
    const nextPaused = typeof paused === 'boolean' ? paused : !timerPaused;
    setTimerPaused(nextPaused);
    setRoom(prev => prev ? { ...prev, timerPaused: nextPaused } : prev);
    if (mode === 'online' && room) {
      networkClient.setTimerPaused(room.roomCode, nextPaused);
    }
  }, [mode, room, settings.decisionTimerSeconds, timerPaused, canControl]);

  const sendChatMessage = useCallback((text: string) => {
    const messageText = text.trim();
    if (!messageText) return;

    if (mode !== 'online' || !room) return;
    networkClient.sendChat(room.roomCode, room.playerName, messageText);
  }, [mode, room, canControl]);

  const resetGame = useCallback(() => {
    if (!canControl) return;
    setGame(null);
    setHistory([]);
    setPastStates([]);
    setChatMessages([]);
    setTimerPaused(false);
    pushOnlineState(null, settings, []);
  }, [pushOnlineState, settings, canControl]);

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
        canControl,
        canUndo: canControl && pastStates.length > 0,
        serverUrl,
        setServerUrl,
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
