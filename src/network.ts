import { io, Socket } from 'socket.io-client';
import { ChatMessage, GameState, GameSettings } from './types';

type RoomSnapshot = {
  roomCode: string;
  game: GameState | null;
  settings: GameSettings | null;
  history: string[];
  chat: ChatMessage[];
  timerPaused: boolean;
  users: Array<{ socketId: string; playerName: string }>;
  hostSocketId: string | null;
};

type StateUpdate = {
  game: GameState | null;
  settings: GameSettings | null;
  history: string[];
  timerPaused?: boolean;
};

type ChatUpdate = {
  chat: ChatMessage[];
};

class NetworkClient {
  private socket: Socket | null = null;
  private currentServerUrl: string | null = null;

  connect(serverUrl: string) {
    const normalizedUrl = serverUrl.trim();
    if (this.socket && this.currentServerUrl !== normalizedUrl) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.socket) return this.socket;

    this.currentServerUrl = normalizedUrl;
    this.socket = io(normalizedUrl, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
    });
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.currentServerUrl = null;
  }

  createRoom(
    roomCode: string,
    playerName: string,
    callback: (result: { ok: boolean; error?: string; snapshot?: RoomSnapshot }) => void
  ) {
    this.socket?.emit('room:create', { roomCode, playerName }, callback);
  }

  joinRoom(
    roomCode: string,
    playerName: string,
    callback: (result: { ok: boolean; error?: string; snapshot?: RoomSnapshot }) => void
  ) {
    this.socket?.emit('room:join', { roomCode, playerName }, callback);
  }

  pushState(
    roomCode: string,
    payload: { game: GameState | null; settings: GameSettings; history: string[] }
  ) {
    this.socket?.emit('state:push', { roomCode, ...payload });
  }

  onRoomUpdate(handler: (snapshot: RoomSnapshot) => void) {
    this.socket?.on('room:update', handler);
  }

  onStateUpdate(handler: (state: StateUpdate) => void) {
    this.socket?.on('state:update', handler);
  }

  sendChat(roomCode: string, sender: string, text: string) {
    this.socket?.emit('chat:send', { roomCode, sender, text });
  }

  onChatUpdate(handler: (payload: ChatUpdate) => void) {
    this.socket?.on('chat:update', handler);
  }

  setTimerPaused(roomCode: string, paused: boolean) {
    this.socket?.emit('timer:pause', { roomCode, paused });
  }

  offAll() {
    this.socket?.removeAllListeners();
  }

  getSocketId() {
    return this.socket?.id || null;
  }
}

export const networkClient = new NetworkClient();
