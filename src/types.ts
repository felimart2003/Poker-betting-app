// Poker Betting App - Type Definitions

export interface Player {
  id: string;
  name: string;
  chips: number;
  currentBet: number;
  isFolded: boolean;
  isAllIn: boolean;
  isDealer: boolean;
  isActive: boolean; // still in the game (has chips or is all-in)
  isTurn: boolean;
}

export type BettingAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in';

export interface GameState {
  id: string;
  players: Player[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  minimumBet: number;
  bigBlind: number;
  smallBlind: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  currentPlayerIndex: number;
  round: BettingRound;
  roundNumber: number;
  isHandActive: boolean;
  lastRaiseAmount: number;
  playersActedThisRound: string[];
}

export interface SidePot {
  amount: number;
  eligiblePlayerIds: string[];
}

export type BettingRound = 'pre-flop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface GameSettings {
  startingChips: number;
  bigBlind: number;
  smallBlind: number;
  playerNames: string[];
  decisionTimerSeconds: number;
  blindIncreaseInterval: number; // 0 = no increase, otherwise number of hands
  blindIncreaseAmount: number;
}

export type GameMode = 'local' | 'online';

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  createdAt: number;
}

export interface RoomState {
  roomCode: string;
  playerName: string;
  serverUrl: string;
  mode: GameMode;
  connectedUsers: Array<{ socketId: string; playerName: string }>;
  timerPaused: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  startingChips: 1000,
  bigBlind: 20,
  smallBlind: 10,
  playerNames: ['Player 1', 'Player 2'],
  decisionTimerSeconds: 0,
  blindIncreaseInterval: 0,
  blindIncreaseAmount: 0,
};

export const BETTING_ROUNDS: BettingRound[] = ['pre-flop', 'flop', 'turn', 'river', 'showdown'];
