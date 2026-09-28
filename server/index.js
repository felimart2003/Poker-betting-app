const express = require('express');
const http = require('node:http');
const crypto = require('node:crypto');
const { Server } = require('socket.io');

const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const integer = (value, max = 1_000_000_000) => Number.isSafeInteger(value) && value >= 0 && value <= max;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function validSettings(value) {
  return object(value) && ['startingChips','bigBlind','smallBlind','decisionTimerSeconds','blindIncreaseInterval','blindIncreaseAmount'].every(key => integer(value[key])) && value.bigBlind > 0 && value.smallBlind > 0 && value.smallBlind <= value.bigBlind && value.startingChips > 0 && Array.isArray(value.playerNames) && value.playerNames.length >= 2 && value.playerNames.length <= 12 && value.playerNames.every(name => text(name, 40));
}
function validGame(game) {
  if (game === null) return true;
  if (!object(game) || !text(game.id,100) || !Array.isArray(game.players) || game.players.length < 2 || game.players.length > 12) return false;
  const ids = new Set();
  for (const player of game.players) {
    if (!object(player) || !text(player.id,100) || ids.has(player.id) || !text(player.name,40) || !['chips','currentBet','totalContribution'].every(key => integer(player[key])) || !['isFolded','isAllIn','isDealer','isActive','isTurn'].every(key => typeof player[key] === 'boolean')) return false;
    ids.add(player.id);
  }
  return ['pot','currentBet','minimumBet','bigBlind','smallBlind','roundNumber','lastRaiseAmount'].every(key => integer(game[key])) && ['dealerIndex','smallBlindIndex','bigBlindIndex','currentPlayerIndex'].every(key => integer(game[key],game.players.length-1)) && ['pre-flop','flop','turn','river','showdown'].includes(game.round) && typeof game.isHandActive === 'boolean' && Array.isArray(game.playersActedThisRound) && game.playersActedThisRound.length <= 12 && game.playersActedThisRound.every(id => ids.has(id)) && Array.isArray(game.sidePots) && game.sidePots.length <= 12 && game.sidePots.every(pot => object(pot) && integer(pot.amount) && Array.isArray(pot.eligiblePlayerIds) && pot.eligiblePlayerIds.length <= 12 && pot.eligiblePlayerIds.every(id => ids.has(id)));
}

// This is a trusted host-controlled scoreboard relay, not a real-money game server.
function createPokerServer(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/health', (_, res) => res.json({ ok: true }));
  const server = http.createServer(app);
  const origins = new Set((options.allowedOrigins ?? process.env.ALLOWED_ORIGINS ?? 'http://localhost:8081,http://localhost:8082,http://localhost:8083').split(',').map(value => value.trim()).filter(Boolean));
  const allowed = origin => !origin || origins.has(origin);
  const io = new Server(server, {
    maxHttpBufferSize: 64 * 1024,
    cors: { origin: (origin, callback) => callback(null, allowed(origin)) },
    allowRequest: (request, callback) => callback(null, allowed(request.headers.origin)),
  });
  const rooms = new Map();
  const snapshot = (code,room) => ({roomCode:code,game:room.game,settings:room.settings,history:room.history,chat:room.chat,timerPaused:room.timerPaused,users:[...room.users.values()],hostSocketId:room.hostSocketId});
  const state = room => ({game:room.game,settings:room.settings,history:room.history,timerPaused:room.timerPaused});
  function leave(socket) {
    const code = socket.data.roomCode;
    const room = rooms.get(code);
    socket.data.roomCode = null;
    if (!room) return;
    socket.leave(code);
    room.users.delete(socket.id);
    if (!room.users.size) { rooms.delete(code); return; }
    if (room.hostSocketId === socket.id) room.hostSocketId = room.users.keys().next().value;
    io.to(code).emit('room:update',snapshot(code,room));
  }
  io.on('connection', socket => {
    let count = 0, windowStart = Date.now();
    function handle(event, action) {
      socket.on(event, (payload, ack) => {
        const respond = value => { if (typeof ack === 'function') ack(value); };
        if (Date.now()-windowStart > 10000) {count=0;windowStart=Date.now();}
        if (++count > 80) return respond({ok:false,error:'Too many requests. Please wait.'});
        if (!object(payload)) return respond({ok:false,error:'Invalid request.'});
        try { action(payload,respond); }
        catch { respond({ok:false,error:'Invalid request.'}); }
      });
    }
    function member(payload, respond, hostOnly = false) {
      const code = typeof payload.roomCode === 'string' ? payload.roomCode.trim().toUpperCase() : '';
      const room = rooms.get(code);
      if (!room || socket.data.roomCode !== code || !room.users.has(socket.id)) {respond({ok:false,error:'Join this room first.'});return null;}
      if (hostOnly && room.hostSocketId !== socket.id) {respond({ok:false,error:'Only the room host can change the game.'});return null;}
      return {code,room};
    }
    handle('room:create', (payload, respond) => {
      if (!text(payload.playerName,40)) return respond({ok:false,error:'Player name must be 1–40 characters.'});
      if (rooms.size >= 1000) return respond({ok:false,error:'Server is full. Try again later.'});
      leave(socket);
      const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code;
      do {code=Array.from({length:5},()=>alphabet[crypto.randomInt(alphabet.length)]).join('');} while (rooms.has(code));
      const room={game:null,settings:null,history:[],chat:[],timerPaused:false,users:new Map([[socket.id,{socketId:socket.id,playerName:payload.playerName.trim()}]]),hostSocketId:socket.id};
      rooms.set(code,room);
      socket.data.roomCode=code;
      socket.join(code);
      io.to(code).emit('room:update',snapshot(code,room));
      respond({ok:true,snapshot:snapshot(code,room)});
    });
    handle('room:join', (payload,respond) => {
      const code=typeof payload.roomCode==='string'?payload.roomCode.trim().toUpperCase():'';
      const room=rooms.get(code);
      if (!room) return respond({ok:false,error:'Room not found.'});
      if (!text(payload.playerName,40)) return respond({ok:false,error:'Player name must be 1–40 characters.'});
      if (!room.users.has(socket.id) && room.users.size>=12) return respond({ok:false,error:'Room is full.'});
      if (socket.data.roomCode !== code) leave(socket);
      room.users.set(socket.id,{socketId:socket.id,playerName:payload.playerName.trim()});
      socket.data.roomCode=code;
      socket.join(code);
      io.to(code).emit('room:update',snapshot(code,room));
      respond({ok:true,snapshot:snapshot(code,room)});
    });
    handle('state:push', (payload,respond) => {
      const membership=member(payload,respond,true); if(!membership)return;
      if (!validGame(payload.game) || !validSettings(payload.settings) || !Array.isArray(payload.history) || payload.history.length>500 || !payload.history.every(entry=>text(entry,500))) return respond({ok:false,error:'Invalid game state.'});
      const {code,room}=membership;
      room.game=payload.game; room.settings=payload.settings; room.history=payload.history;
      io.to(code).emit('state:update',state(room));
      respond({ok:true});
    });
    handle('chat:send', (payload,respond) => {
      const membership=member(payload,respond); if(!membership)return;
      if (!text(payload.text,500)) return respond({ok:false,error:'Messages must be 1–500 characters.'});
      const {code,room}=membership;
      room.chat=[{id:crypto.randomUUID(),sender:room.users.get(socket.id).playerName,text:payload.text.trim(),createdAt:Date.now()},...room.chat].slice(0,100);
      io.to(code).emit('chat:update',{chat:room.chat});
      respond({ok:true});
    });
    handle('timer:pause', (payload,respond) => {
      const membership=member(payload,respond,true); if(!membership)return;
      if(typeof payload.paused!=='boolean') return respond({ok:false,error:'Invalid timer state.'});
      const {code,room}=membership;room.timerPaused=payload.paused;
      io.to(code).emit('state:update',state(room));respond({ok:true});
    });
    socket.on('disconnect',()=>leave(socket));
  });
  return {server,io,rooms};
}
if (require.main === module) {
  const {server}=createPokerServer();
  const port=Number(process.env.PORT || 4000);
  server.listen(port,()=>console.log(`Poker scoreboard server listening on ${port}`));
}
module.exports={createPokerServer,validGame,validSettings};
