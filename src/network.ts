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

  /**
   * Connect to the server and WAIT until the socket is actually connected.
   * Resolves when connected, rejects on error or timeout.
   */
  async connectAndWait(serverUrl: string, timeoutMs = 10000): Promise<void> {
    const normalizedUrl = serverUrl.trim();

    // Already connected to same URL — reuse
    if (this.socket?.connected && this.currentServerUrl === normalizedUrl) {
      return;
    }

    // Clean up any existing socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentServerUrl = normalizedUrl;

    return new Promise<void>((resolve, reject) => {
      this.socket = io(normalizedUrl, {
        transports: ['websocket', 'polling'],
        timeout: timeoutMs,
        reconnection: true,
        reconnectionAttempts: 5,
        forceNew: true,
      });

      const timer = setTimeout(() => {
        this.socket?.removeAllListeners();
        this.socket?.disconnect();
        this.socket = null;
        this.currentServerUrl = null;
        reject(new Error('Connection timed out. Is the server running?'));
      }, timeoutMs);

      this.socket.on('connect', () => {
        clearTimeout(timer);
        resolve();
      });

      this.socket.on('connect_error', (err: Error) => {
        clearTimeout(timer);
        this.socket?.removeAllListeners();
        this.socket?.disconnect();
        this.socket = null;
        this.currentServerUrl = null;
        reject(new Error(err.message || 'Could not reach the server.'));
      });
    });
  }

  disconnect() {
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.currentServerUrl = null;
  }

  createRoom(
    playerName: string,
    callback: (result: { ok: boolean; error?: string; snapshot?: RoomSnapshot }) => void
  ) {
    this.socket?.emit('room:create', { playerName }, callback);
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

  isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const networkClient = new NetworkClient();
