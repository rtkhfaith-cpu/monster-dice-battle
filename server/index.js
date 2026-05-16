/**
 * Minimal Socket.io lobby server for Monster Dice Battle online mode.
 * Rooms live in RAM only — extend with battle sync when ready.
 */
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// HTTP routes (Express) — same process as Socket.io below
app.get('/', (_req, res) => {
  res.send('Monster Battle server is running');
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'monster-dice-battle-socket', t: Date.now() });
});

// One shared HTTP server: Express handles REST; Socket.io upgrades the same server
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

/** @type {Record<string, { roomCode: string, players: object, battleState: object }>} */
const rooms = {};

function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase();
}

function createEmptyRoom(roomCode) {
  return {
    roomCode,
    players: {
      p1: null,
      p2: null,
    },
    battleState: {
      round: 1,
      phase: 'lobby',
      log: [],
    },
  };
}

function findRoomBySocket(socketId) {
  for (const code of Object.keys(rooms)) {
    const room = rooms[code];
    if (room.players.p1?.socketId === socketId || room.players.p2?.socketId === socketId) {
      return { code, room };
    }
  }
  return { code: null, room: null };
}

function removePlayerFromRoom(room, socketId) {
  if (room.players.p1?.socketId === socketId) {
    room.players.p1 = null;
  }
  if (room.players.p2?.socketId === socketId) {
    room.players.p2 = null;
  }
}

function isRoomEmpty(room) {
  return !room.players.p1 && !room.players.p2;
}

function emitRoomUpdate(roomCode) {
  const room = rooms[roomCode];
  if (room) {
    io.to(roomCode).emit('roomUpdate', room);
  }
}

io.on('connection', (socket) => {
  socket.emit('serverStatus', { ok: true, t: Date.now() });

  socket.on('createRoom', (_payload, ack) => {
    let roomCode = randomRoomCode();
    while (rooms[roomCode]) {
      roomCode = randomRoomCode();
    }

    const room = createEmptyRoom(roomCode);
    room.players.p1 = { socketId: socket.id, ready: false, monster: null };
    rooms[roomCode] = room;

    socket.join(roomCode);
    if (typeof ack === 'function') {
      ack({ roomCode, playerSlot: 'p1' });
    }
    emitRoomUpdate(roomCode);
  });

  socket.on('joinRoom', (payload = {}, ack) => {
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];

    if (!room) {
      const err = 'Room not found';
      if (typeof ack === 'function') ack({ error: err });
      socket.emit('errorMessage', err);
      return;
    }

    if (room.players.p2) {
      const err = 'Room is full';
      if (typeof ack === 'function') ack({ error: err });
      socket.emit('errorMessage', err);
      return;
    }

    if (!room.players.p1) {
      room.players.p1 = { socketId: socket.id, ready: false, monster: null };
      socket.join(roomCode);
      if (typeof ack === 'function') ack({ roomCode, playerSlot: 'p1' });
      emitRoomUpdate(roomCode);
      return;
    }

    room.players.p2 = { socketId: socket.id, ready: false, monster: null };
    socket.join(roomCode);

    if (typeof ack === 'function') {
      ack({ roomCode, playerSlot: 'p2' });
    }
    io.to(roomCode).emit('roomJoined', { roomCode });
    emitRoomUpdate(roomCode);
  });

  socket.on('leaveRoom', (payload = {}) => {
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];
    if (!room) return;

    removePlayerFromRoom(room, socket.id);
    socket.leave(roomCode);

    if (isRoomEmpty(room)) {
      delete rooms[roomCode];
    } else {
      io.to(roomCode).emit('opponentDisconnected', { roomCode });
      emitRoomUpdate(roomCode);
    }
  });

  socket.on('disconnect', () => {
    const { code, room } = findRoomBySocket(socket.id);
    if (!code || !room) return;

    removePlayerFromRoom(room, socket.id);

    if (isRoomEmpty(room)) {
      delete rooms[code];
    } else {
      io.to(code).emit('opponentDisconnected', { roomCode: code });
      emitRoomUpdate(code);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
});
