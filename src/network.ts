import { io, Socket } from 'socket.io-client';
import { GameState, GameSettings } from './types';

type RoomSnapshot = {
  roomCode: string;
  game: GameState | null;
  settings: GameSettings | null;
  history: string[];
  users: Array<{ socketId: string; playerName: string }>;
  hostSocketId: string | null;
};

type StateUpdate = {
  game: GameState | null;
  settings: GameSettings | null;
  history: string[];
};

class NetworkClient {
  private socket: Socket | null = null;

  connect(serverUrl: string) {
    if (this.socket?.connected) return this.socket;
    this.socket = io(serverUrl, { transports: ['websocket'] });
    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
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

  offAll() {
    this.socket?.removeAllListeners();
  }

  getSocketId() {
    return this.socket?.id || null;
  }
}

export const networkClient = new NetworkClient();
