const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;
const app = express();
app.use(cors());
app.get('/health', (_, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

const rooms = new Map();

function getRoom(roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      game: null,
      settings: null,
      history: [],
      users: new Map(),
      hostSocketId: null,
    });
  }
  return rooms.get(roomCode);
}

function roomSnapshot(roomCode) {
  const room = getRoom(roomCode);
  return {
    roomCode,
    game: room.game,
    settings: room.settings,
    history: room.history,
    users: Array.from(room.users.values()),
    hostSocketId: room.hostSocketId,
  };
}

io.on('connection', socket => {
  socket.on('room:create', ({ roomCode, playerName }, ack) => {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    if (!normalizedCode) {
      ack?.({ ok: false, error: 'Room code required' });
      return;
    }

    const room = getRoom(normalizedCode);
    room.hostSocketId = socket.id;
    room.users.set(socket.id, { socketId: socket.id, playerName: playerName || 'Host' });
    socket.join(normalizedCode);

    io.to(normalizedCode).emit('room:update', roomSnapshot(normalizedCode));
    ack?.({ ok: true, snapshot: roomSnapshot(normalizedCode) });
  });

  socket.on('room:join', ({ roomCode, playerName }, ack) => {
    const normalizedCode = (roomCode || '').trim().toUpperCase();
    if (!rooms.has(normalizedCode)) {
      ack?.({ ok: false, error: 'Room not found' });
      return;
    }

    const room = getRoom(normalizedCode);
    room.users.set(socket.id, { socketId: socket.id, playerName: playerName || 'Player' });
    socket.join(normalizedCode);

    io.to(normalizedCode).emit('room:update', roomSnapshot(normalizedCode));
    ack?.({ ok: true, snapshot: roomSnapshot(normalizedCode) });
  });

  socket.on('state:push', ({ roomCode, game, settings, history }, ack) => {
    const room = rooms.get((roomCode || '').trim().toUpperCase());
    if (!room) {
      ack?.({ ok: false, error: 'Room not found' });
      return;
    }

    room.game = game;
    room.settings = settings;
    room.history = history || room.history;
    io.to(roomCode.toUpperCase()).emit('state:update', {
      game: room.game,
      settings: room.settings,
      history: room.history,
    });
    ack?.({ ok: true });
  });

  socket.on('disconnect', () => {
    for (const [roomCode, room] of rooms.entries()) {
      if (!room.users.has(socket.id)) continue;
      room.users.delete(socket.id);
      if (room.hostSocketId === socket.id) {
        const nextHost = Array.from(room.users.keys())[0] || null;
        room.hostSocketId = nextHost;
      }
      io.to(roomCode).emit('room:update', roomSnapshot(roomCode));
      if (room.users.size === 0) {
        rooms.delete(roomCode);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Poker server running on port ${PORT}`);
});
