import { GameState, GameSettings, Player, BettingRound, BETTING_ROUNDS, SidePot } from './types';

// Generate a simple unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function createGame(settings: GameSettings): GameState {
  const players: Player[] = settings.playerNames.map((name, index) => ({
    id: generateId(),
    name,
    chips: settings.startingChips,
    currentBet: 0,
    isFolded: false,
    isAllIn: false,
    isDealer: index === 0,
    isActive: true,
    isTurn: false,
  }));

  const game: GameState = {
    id: generateId(),
    players,
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minimumBet: settings.bigBlind,
    bigBlind: settings.bigBlind,
    smallBlind: settings.smallBlind,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    round: 'pre-flop',
    roundNumber: 1,
    isHandActive: false,
    lastRaiseAmount: settings.bigBlind,
    playersActedThisRound: [],
  };

  return game;
}

export function startNewHand(game: GameState): GameState {
  const newGame = { ...game };
  const activePlayers = newGame.players.filter(p => p.chips > 0);

  if (activePlayers.length < 2) return newGame;

  // Reset player states
  newGame.players = newGame.players.map(p => ({
    ...p,
    currentBet: 0,
    isFolded: p.chips <= 0,
    isAllIn: false,
    isTurn: false,
    isActive: p.chips > 0,
  }));

  // Set dealer
  newGame.players.forEach(p => (p.isDealer = false));
  newGame.players[newGame.dealerIndex].isDealer = true;

  // Reset game state
  newGame.pot = 0;
  newGame.sidePots = [];
  newGame.currentBet = 0;
  newGame.round = 'pre-flop';
  newGame.isHandActive = true;
  newGame.lastRaiseAmount = newGame.bigBlind;
  newGame.playersActedThisRound = [];

  // Post blinds
  const sbIndex = getNextActivePlayerIndex(newGame, newGame.dealerIndex);
  const bbIndex = getNextActivePlayerIndex(newGame, sbIndex);

  // Small blind
  const sbAmount = Math.min(newGame.smallBlind, newGame.players[sbIndex].chips);
  newGame.players[sbIndex].chips -= sbAmount;
  newGame.players[sbIndex].currentBet = sbAmount;
  if (newGame.players[sbIndex].chips === 0) newGame.players[sbIndex].isAllIn = true;

  // Big blind
  const bbAmount = Math.min(newGame.bigBlind, newGame.players[bbIndex].chips);
  newGame.players[bbIndex].chips -= bbAmount;
  newGame.players[bbIndex].currentBet = bbAmount;
  if (newGame.players[bbIndex].chips === 0) newGame.players[bbIndex].isAllIn = true;

  newGame.currentBet = newGame.bigBlind;
  newGame.pot = sbAmount + bbAmount;

  // First to act is after big blind
  newGame.currentPlayerIndex = getNextActivePlayerIndex(newGame, bbIndex);
  newGame.players[newGame.currentPlayerIndex].isTurn = true;

  return newGame;
}

function getNextActivePlayerIndex(game: GameState, fromIndex: number): number {
  let index = (fromIndex + 1) % game.players.length;
  let iterations = 0;
  while (iterations < game.players.length) {
    if (game.players[index].isActive && !game.players[index].isFolded && !game.players[index].isAllIn) {
      return index;
    }
    index = (index + 1) % game.players.length;
    iterations++;
  }
  // If no active player found, return next non-folded
  index = (fromIndex + 1) % game.players.length;
  iterations = 0;
  while (iterations < game.players.length) {
    if (!game.players[index].isFolded) {
      return index;
    }
    index = (index + 1) % game.players.length;
    iterations++;
  }
  return fromIndex;
}

export function getAvailableActions(game: GameState): string[] {
  if (!game.isHandActive) return [];

  const player = game.players[game.currentPlayerIndex];
  if (!player || player.isFolded || player.isAllIn) return [];

  const actions: string[] = ['fold'];
  const toCall = game.currentBet - player.currentBet;

  if (toCall === 0) {
    actions.push('check');
  } else {
    actions.push('call');
  }

  if (player.chips > toCall) {
    if (game.currentBet === 0) {
      actions.push('bet');
    } else {
      actions.push('raise');
    }
  }

  actions.push('all-in');

  return actions;
}

export function getCallAmount(game: GameState): number {
  const player = game.players[game.currentPlayerIndex];
  return Math.min(game.currentBet - player.currentBet, player.chips);
}

export function getMinRaise(game: GameState): number {
  const toCall = game.currentBet - game.players[game.currentPlayerIndex].currentBet;
  return toCall + Math.max(game.lastRaiseAmount, game.bigBlind);
}

export function performAction(
  game: GameState,
  action: string,
  amount?: number
): GameState {
  const newGame = JSON.parse(JSON.stringify(game)) as GameState;
  const playerIndex = newGame.currentPlayerIndex;
  const player = newGame.players[playerIndex];

  switch (action) {
    case 'fold':
      player.isFolded = true;
      break;

    case 'check':
      // No chips needed
      break;

    case 'call': {
      const callAmount = Math.min(newGame.currentBet - player.currentBet, player.chips);
      player.chips -= callAmount;
      player.currentBet += callAmount;
      newGame.pot += callAmount;
      if (player.chips === 0) player.isAllIn = true;
      break;
    }

    case 'bet':
    case 'raise': {
      const betAmount = amount || getMinRaise(newGame);
      const totalBet = Math.min(betAmount, player.chips + player.currentBet);
      const chipsNeeded = totalBet - player.currentBet;
      const actualChips = Math.min(chipsNeeded, player.chips);

      newGame.lastRaiseAmount = totalBet - newGame.currentBet;
      player.chips -= actualChips;
      player.currentBet += actualChips;
      newGame.pot += actualChips;
      newGame.currentBet = player.currentBet;
      if (player.chips === 0) player.isAllIn = true;

      // Reset acted players since there's a raise
      newGame.playersActedThisRound = [player.id];
      break;
    }

    case 'all-in': {
      const allInAmount = player.chips;
      player.currentBet += allInAmount;
      newGame.pot += allInAmount;
      player.chips = 0;
      player.isAllIn = true;

      if (player.currentBet > newGame.currentBet) {
        newGame.lastRaiseAmount = player.currentBet - newGame.currentBet;
        newGame.currentBet = player.currentBet;
        newGame.playersActedThisRound = [player.id];
      }
      break;
    }
  }

  if (action !== 'bet' && action !== 'raise') {
    newGame.playersActedThisRound.push(player.id);
  }

  player.isTurn = false;

  // Check if hand is over (only one player remaining)
  const remainingPlayers = newGame.players.filter(p => !p.isFolded && p.isActive);
  if (remainingPlayers.length === 1) {
    // Award pot to winner
    remainingPlayers[0].chips += newGame.pot;
    newGame.pot = 0;
    newGame.isHandActive = false;
    return newGame;
  }

  // Check if round is over
  const actingPlayers = newGame.players.filter(
    p => p.isActive && !p.isFolded && !p.isAllIn
  );

  const allActed = actingPlayers.every(p => newGame.playersActedThisRound.includes(p.id));
  const allMatched = actingPlayers.every(p => p.currentBet === newGame.currentBet);

  if (allActed && allMatched && actingPlayers.length > 0) {
    return advanceRound(newGame);
  }

  if (actingPlayers.length === 0) {
    // All players are all-in or folded, advance to showdown
    return advanceToShowdown(newGame);
  }

  // Move to next player
  newGame.currentPlayerIndex = getNextActivePlayerIndex(newGame, playerIndex);
  while (
    newGame.players[newGame.currentPlayerIndex].isFolded ||
    newGame.players[newGame.currentPlayerIndex].isAllIn
  ) {
    newGame.currentPlayerIndex = getNextActivePlayerIndex(newGame, newGame.currentPlayerIndex);
    if (newGame.currentPlayerIndex === playerIndex) break;
  }
  newGame.players[newGame.currentPlayerIndex].isTurn = true;

  return newGame;
}

function advanceRound(game: GameState): GameState {
  const newGame = { ...game };
  const currentRoundIndex = BETTING_ROUNDS.indexOf(newGame.round);

  if (currentRoundIndex >= 3) {
    // River is done - go to showdown
    return advanceToShowdown(newGame);
  }

  // Move to next round
  newGame.round = BETTING_ROUNDS[currentRoundIndex + 1] as BettingRound;
  newGame.currentBet = 0;
  newGame.lastRaiseAmount = newGame.bigBlind;
  newGame.playersActedThisRound = [];

  // Reset current bets
  newGame.players.forEach(p => {
    p.currentBet = 0;
    p.isTurn = false;
  });

  // Check if only one player can still act
  const canAct = newGame.players.filter(p => p.isActive && !p.isFolded && !p.isAllIn);
  if (canAct.length <= 1) {
    if (newGame.round !== 'showdown') {
      return advanceRound(newGame);
    }
    return advanceToShowdown(newGame);
  }

  // First to act after dealer
  newGame.currentPlayerIndex = getNextActivePlayerIndex(newGame, newGame.dealerIndex);
  // Skip folded/all-in players
  let safety = 0;
  while (
    (newGame.players[newGame.currentPlayerIndex].isFolded ||
      newGame.players[newGame.currentPlayerIndex].isAllIn) &&
    safety < newGame.players.length
  ) {
    newGame.currentPlayerIndex = getNextActivePlayerIndex(newGame, newGame.currentPlayerIndex);
    safety++;
  }
  newGame.players[newGame.currentPlayerIndex].isTurn = true;

  return newGame;
}

function advanceToShowdown(game: GameState): GameState {
  const newGame = { ...game };
  newGame.round = 'showdown';
  newGame.isHandActive = true; // Keep active for pot awarding
  newGame.players.forEach(p => (p.isTurn = false));
  return newGame;
}

export function awardPot(game: GameState, winnerIds: string[]): GameState {
  const newGame = JSON.parse(JSON.stringify(game)) as GameState;

  if (winnerIds.length === 0) return newGame;

  // Split pot among winners
  const share = Math.floor(newGame.pot / winnerIds.length);
  const remainder = newGame.pot % winnerIds.length;

  winnerIds.forEach((id, index) => {
    const player = newGame.players.find(p => p.id === id);
    if (player) {
      player.chips += share + (index === 0 ? remainder : 0);
    }
  });

  newGame.pot = 0;
  newGame.isHandActive = false;

  return newGame;
}

export function advanceDealer(game: GameState): GameState {
  const newGame = { ...game };
  const activePlayers = newGame.players.filter(p => p.chips > 0);

  if (activePlayers.length < 2) return newGame;

  // Find next dealer among players with chips
  let nextDealer = (newGame.dealerIndex + 1) % newGame.players.length;
  while (newGame.players[nextDealer].chips <= 0) {
    nextDealer = (nextDealer + 1) % newGame.players.length;
  }

  newGame.dealerIndex = nextDealer;
  newGame.roundNumber++;

  return newGame;
}

export function getActivePlayers(game: GameState): Player[] {
  return game.players.filter(p => !p.isFolded && p.isActive);
}

export function getEliminatedPlayers(game: GameState): Player[] {
  return game.players.filter(p => p.chips <= 0 && !p.isAllIn);
}

export function isGameOver(game: GameState): boolean {
  return game.players.filter(p => p.chips > 0).length <= 1;
}

export function getWinner(game: GameState): Player | null {
  const playersWithChips = game.players.filter(p => p.chips > 0);
  return playersWithChips.length === 1 ? playersWithChips[0] : null;
}

export function formatChips(amount: number): string {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 10000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString();
}
