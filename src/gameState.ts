import { GameState, GameSettings, Player, BETTING_ROUNDS, SidePot } from './types';
const copy = (game: GameState): GameState => JSON.parse(JSON.stringify(game));
const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const validChips = (n: number) => Number.isSafeInteger(n) && n >= 0 && n <= 1000000000;
export function createGame(settings: GameSettings): GameState {
  if (settings.playerNames.length < 2 || settings.playerNames.length > 8 ||
      !validChips(settings.startingChips) || settings.startingChips < 1 ||
      !validChips(settings.smallBlind) || settings.smallBlind < 1 ||
      !validChips(settings.bigBlind) || settings.bigBlind < settings.smallBlind)
    throw new Error('Use 2–8 players, positive whole-number chips, and a big blind at least as large as the small blind.');
  return { id: id(), players: settings.playerNames.map((name,index) => ({id:id(),name:name.trim().slice(0,40)||`Player ${index+1}`,chips:settings.startingChips,currentBet:0,totalContribution:0,isFolded:false,isAllIn:false,isDealer:index===0,isActive:true,isTurn:false})),pot:0,sidePots:[],currentBet:0,minimumBet:settings.bigBlind,bigBlind:settings.bigBlind,smallBlind:settings.smallBlind,dealerIndex:0,smallBlindIndex:0,bigBlindIndex:0,currentPlayerIndex:0,round:'pre-flop',roundNumber:0,isHandActive:false,lastRaiseAmount:settings.bigBlind,playersActedThisRound:[] };
}
function next(game: GameState, from: number, canAct = true): number {
  for (let i=1;i<=game.players.length;i++) {
    const index=(from+i)%game.players.length,p=game.players[index];
    if(p.isActive&&!p.isFolded&&(!canAct||!p.isAllIn))return index;
  }
  return from;
}
function contribute(game: GameState, player: Player, chips: number) {
  const value=Math.min(player.chips,Math.max(0,chips));
  player.chips-=value;player.currentBet+=value;player.totalContribution+=value;game.pot+=value;player.isAllIn=player.chips===0;
}
export function startNewHand(game: GameState): GameState {
  if(game.isHandActive||game.players.filter(p=>p.chips>0).length<2)return game;
  const g=copy(game);
  if(g.roundNumber>0)g.dealerIndex=advanceDealer(g).dealerIndex;
  if(g.players[g.dealerIndex].chips<=0)g.dealerIndex=advanceDealer(g).dealerIndex;
  g.roundNumber++;g.players=g.players.map((p,i)=>({...p,currentBet:0,totalContribution:0,isFolded:p.chips<=0,isActive:p.chips>0,isAllIn:false,isTurn:false,isDealer:i===g.dealerIndex}));
  g.pot=0;g.sidePots=[];g.currentBet=g.bigBlind;g.round='pre-flop';g.isHandActive=true;g.lastRaiseAmount=g.bigBlind;g.playersActedThisRound=[];
  g.smallBlindIndex=g.players.filter(p=>p.isActive).length===2?g.dealerIndex:next(g,g.dealerIndex,false);
  g.bigBlindIndex=next(g,g.smallBlindIndex,false);
  contribute(g,g.players[g.smallBlindIndex],g.smallBlind);contribute(g,g.players[g.bigBlindIndex],g.bigBlind);
  const acting=g.players.filter(p=>p.isActive&&!p.isAllIn);
  if(acting.length===0||(acting.length===1&&acting[0].currentBet>=Math.max(...g.players.map(p=>p.currentBet))))return showdown(g);
  g.currentPlayerIndex=next(g,g.bigBlindIndex);g.players[g.currentPlayerIndex].isTurn=true;return g;
}
export function getAvailableActions(game: GameState): string[] {
  const p=game.players[game.currentPlayerIndex];
  if(!game.isHandActive||game.round==='showdown'||!p||p.isFolded||p.isAllIn)return [];
  const toCall=Math.max(0,game.currentBet-p.currentBet),actions=['fold',toCall===0?'check':'call'];
  // A short all-in does not reopen raising for a player who already acted.
  const canRaise=!game.playersActedThisRound.includes(p.id)&&game.players.some(other=>other.id!==p.id&&other.isActive&&!other.isFolded&&!other.isAllIn);
  if(canRaise&&p.chips+p.currentBet>=getMinRaise(game))actions.push(game.currentBet===0?'bet':'raise');
  if(canRaise||p.chips<=toCall)actions.push('all-in');
  return actions;
}
export function getCallAmount(game: GameState): number {const p=game.players[game.currentPlayerIndex];return p?Math.min(p.chips,Math.max(0,game.currentBet-p.currentBet)):0;}
/** Minimum total bet for this street, including chips already committed. */
export function getMinRaise(game: GameState): number {return game.currentBet+Math.max(game.lastRaiseAmount,game.bigBlind);}
export function performAction(game: GameState,action:string,amount?:number):GameState {
  if(!getAvailableActions(game).includes(action))return game;
  const g=copy(game),p=g.players[g.currentPlayerIndex],oldBet=g.currentBet;
  if(action==='fold')p.isFolded=true;
  else if(action==='call')contribute(g,p,getCallAmount(g));
  else if(action==='all-in')contribute(g,p,p.chips);
  else if(action==='bet'||action==='raise'){
    if(amount!==undefined&&(!validChips(amount)||amount<getMinRaise(g)||amount>p.chips+p.currentBet))return game;
    contribute(g,p,(amount??getMinRaise(g))-p.currentBet);
  }
  if(p.currentBet>oldBet){
    const raise=p.currentBet-oldBet;g.currentBet=p.currentBet;
    if(raise>=g.lastRaiseAmount){g.lastRaiseAmount=raise;g.playersActedThisRound=[];}
  }
  if(!g.playersActedThisRound.includes(p.id))g.playersActedThisRound.push(p.id);
  g.players.forEach(p=>p.isTurn=false);
  const remaining=getActivePlayers(g);
  if(remaining.length===1){remaining[0].chips+=g.pot;g.pot=0;g.sidePots=[];g.isHandActive=false;return g;}
  const acting=remaining.filter(p=>!p.isAllIn);
  if(acting.length===0||(acting.length===1&&acting[0].currentBet>=g.currentBet))return showdown(g);
  if(acting.every(p=>g.playersActedThisRound.includes(p.id)&&p.currentBet===g.currentBet))return advanceRound(g);
  g.currentPlayerIndex=next(g,g.currentPlayerIndex);g.players[g.currentPlayerIndex].isTurn=true;return g;
}
function advanceRound(g:GameState):GameState {
  const index=BETTING_ROUNDS.indexOf(g.round);
  if(index>=3)return showdown(g);
  g.round=BETTING_ROUNDS[index+1];g.currentBet=0;g.lastRaiseAmount=g.bigBlind;g.playersActedThisRound=[];
  g.players.forEach(p=>{p.currentBet=0;p.isTurn=false;});
  g.currentPlayerIndex=next(g,g.dealerIndex);g.players[g.currentPlayerIndex].isTurn=true;return g;
}
function showdown(g:GameState):GameState {
  g.round='showdown';g.players.forEach(p=>p.isTurn=false);
  const levels=[...new Set(g.players.map(p=>p.totalContribution).filter(v=>v>0))].sort((a,b)=>a-b);
  let previous=0;g.sidePots=[];
  for(const level of levels){
    const contributors=g.players.filter(p=>p.totalContribution>=level),amount=(level-previous)*contributors.length;
    const eligible=contributors.filter(p=>p.isActive&&!p.isFolded);previous=level;
    // Uncalled overbets are returned, rather than becoming an unwinnable side pot.
    if(contributors.length===1){contributors[0].chips+=amount;g.pot-=amount;continue;}
    if(eligible.length===0){const pot=g.sidePots[g.sidePots.length-1];if(pot)pot.amount+=amount;continue;}
    const last=g.sidePots[g.sidePots.length-1];
    if(last&&last.eligiblePlayerIds.join(',')===eligible.map(p=>p.id).join(','))last.amount+=amount;
    else g.sidePots.push({amount,eligiblePlayerIds:eligible.map(p=>p.id)});
  }
  return g;
}
/** Resolve one pot at a time, so each side pot can have a different winner. */
export function awardPot(game:GameState,winnerIds:string[]):GameState {
  if(!game.isHandActive||game.round!=='showdown')return game;
  const pot=game.sidePots[0];if(!pot||winnerIds.length===0)return game;
  const ids=[...new Set(winnerIds)];if(ids.some(id=>!pot.eligiblePlayerIds.includes(id)))return game;
  const g=copy(game),share=Math.floor(pot.amount/ids.length);let remainder=pot.amount%ids.length;
  // Odd chips go clockwise from the dealer among tied winners.
  for(let n=1;n<=g.players.length;n++){const p=g.players[(g.dealerIndex+n)%g.players.length];if(ids.includes(p.id)){p.chips+=share+(remainder>0?1:0);remainder--;}}
  g.pot-=pot.amount;g.sidePots.shift();g.isHandActive=g.sidePots.length>0;return g;
}
export function advanceDealer(game:GameState):GameState {
  if(game.isHandActive)return game;const g=copy(game);
  for(let i=1;i<=g.players.length;i++){const index=(g.dealerIndex+i)%g.players.length;if(g.players[index].chips>0){g.dealerIndex=index;break;}}
  g.players.forEach((p,i)=>p.isDealer=i===g.dealerIndex);return g;
}
export function getActivePlayers(game:GameState):Player[]{return game.players.filter(p=>p.isActive&&!p.isFolded);}
export function getEliminatedPlayers(game:GameState):Player[]{return game.players.filter(p=>p.chips<=0&&!p.isAllIn);}
export function isGameOver(game:GameState):boolean{return !game.isHandActive&&game.roundNumber>0&&game.players.filter(p=>p.chips>0).length<=1;}
export function getWinner(game:GameState):Player|null{return isGameOver(game)?game.players.find(p=>p.chips>0)||null:null;}
export function addPlayerToGame(game:GameState,name:string,chips:number):GameState {
  if(game.players.length>=8||!name.trim()||!validChips(chips)||chips===0)return game;
  const g=copy(game);g.players.push({id:id(),name:name.trim().slice(0,40),chips,currentBet:0,totalContribution:0,isFolded:game.isHandActive,isActive:!game.isHandActive,isAllIn:false,isDealer:false,isTurn:false});return g;
}
export function editPlayerChips(game:GameState,playerId:string,chips:number):GameState {
  if(game.isHandActive||!validChips(chips))return game;const g=copy(game),p=g.players.find(p=>p.id===playerId);if(p){p.chips=chips;p.isActive=chips>0;p.isAllIn=false;}return g;
}
export function formatChips(amount:number):string {if(amount>=1000000)return `${(amount/1000000).toFixed(1)}M`;if(amount>=10000)return `${(amount/1000).toFixed(1)}K`;return amount.toLocaleString();}
