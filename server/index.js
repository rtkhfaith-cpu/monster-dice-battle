/**
 * Socket.io lobby + authoritative online battle server.
 */
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const {
  createBattle,
  applyBattleAction,
  snapshotForClient,
  slotToId,
  activeTurnFromPhase,
} = require('./battleEngine');

const PORT = Number(process.env.PORT) || 3000;
const RESOLVE_MS = 2200;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('Monster Battle server is running');
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'monster-dice-battle-socket', t: Date.now() });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
});

/** @type {Record<string, object>} */
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
    status: 'lobby',
    players: { p1: null, p2: null },
    battle: null,
    battleResolveTimer: null,
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

function playerSlot(room, socketId) {
  if (room.players.p1?.socketId === socketId) return 'p1';
  if (room.players.p2?.socketId === socketId) return 'p2';
  return null;
}

function removePlayerFromRoom(room, socketId) {
  if (room.players.p1?.socketId === socketId) room.players.p1 = null;
  if (room.players.p2?.socketId === socketId) room.players.p2 = null;
}

function isRoomEmpty(room) {
  return !room.players.p1 && !room.players.p2;
}

function publicPlayer(p) {
  if (!p) return null;
  return {
    slot: p.slot,
    ready: !!p.ready,
    connected: !!p.socketId,
    profile: p.profile
      ? {
          name: p.profile.name,
          profileId: p.profile.profileId,
          ownedMonsterId: p.profile.ownedMonsterId,
          monsterName: p.profile.monsterName,
          level: p.profile.level,
          hp: p.profile.hp,
          maxHp: p.profile.maxHp,
          mp: p.profile.mp,
          maxMp: p.profile.maxMp,
          templateId: p.profile.templateId,
          fighter: p.profile.fighter,
        }
      : null,
  };
}

function roomPayload(room) {
  const battleSnap = room.battle ? snapshotForClient(room.battle) : null;
  let activeTurn = null;
  if (room.battle && room.status === 'battle') {
    activeTurn = activeTurnFromPhase(room.battle);
  }
  return {
    roomCode: room.roomCode,
    status: room.status,
    players: {
      p1: publicPlayer(room.players.p1),
      p2: publicPlayer(room.players.p2),
    },
    battle: battleSnap,
    activeTurn,
    canStart:
      room.status === 'lobby' &&
      room.players.p1?.profile?.fighter &&
      room.players.p2?.profile?.fighter &&
      room.players.p1?.ready &&
      room.players.p2?.ready,
  };
}

function emitRoomUpdate(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  io.to(roomCode).emit('roomUpdate', roomPayload(room));
}

function clearBattleTimer(room) {
  if (room.battleResolveTimer) {
    clearTimeout(room.battleResolveTimer);
    room.battleResolveTimer = null;
  }
}

function tryStartBattle(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.status !== 'lobby') return;
  const p1 = room.players.p1;
  const p2 = room.players.p2;
  if (!p1?.ready || !p2?.ready) return;
  if (!p1.profile?.fighter || !p2.profile?.fighter) return;

  clearBattleTimer(room);
  room.battle = createBattle(p1.profile.fighter, p2.profile.fighter);
  room.status = 'battle';
  room.battle.bannerMessage = `${p1.profile.name || 'P1'} — roll your dice!`;
  console.log('[battle] started', roomCode);
  io.to(roomCode).emit('battleStarted', { roomCode, battle: snapshotForClient(room.battle) });
  emitRoomUpdate(roomCode);
}

function scheduleRoundAdvance(roomCode) {
  const room = rooms[roomCode];
  if (!room?.battle) return;
  clearBattleTimer(room);
  room.battleResolveTimer = setTimeout(() => {
    room.battleResolveTimer = null;
    if (!room.battle || room.battle.winner) {
      emitRoomUpdate(roomCode);
      return;
    }
    const res = applyBattleAction(room.battle, 'p1', 'advanceRound');
    if (res.ok) {
      console.log('[battle] round advanced', roomCode, 'round', room.battle.round);
      io.to(roomCode).emit('battleUpdate', { battle: snapshotForClient(room.battle) });
    }
    emitRoomUpdate(roomCode);
  }, RESOLVE_MS);
}

function assignSlot(room, socket) {
  if (!room.players.p1) {
    room.players.p1 = { socketId: socket.id, slot: 'p1', ready: false, profile: null };
    return 'p1';
  }
  if (!room.players.p2) {
    room.players.p2 = { socketId: socket.id, slot: 'p2', ready: false, profile: null };
    return 'p2';
  }
  return null;
}

io.on('connection', (socket) => {
  console.log('[socket] connected', socket.id);
  socket.emit('serverStatus', { ok: true, t: Date.now() });

  socket.on('rejoinRoom', (payload = {}, ack) => {
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];
    if (!room) {
      if (typeof ack === 'function') ack({ error: 'Room not found' });
      return;
    }
    const wantSlot = payload.playerSlot === 'p2' ? 'p2' : 'p1';
    const slot = room.players[wantSlot] ? wantSlot : assignSlot(room, socket);
    if (!slot) {
      if (typeof ack === 'function') ack({ error: 'Room is full' });
      return;
    }
    room.players[slot].socketId = socket.id;
    room.players[slot].connected = true;
    socket.join(roomCode);
    console.log('[room] rejoined', roomCode, slot);
    if (typeof ack === 'function') ack({ roomCode, playerSlot: slot });
    emitRoomUpdate(roomCode);
  });

  socket.on('createRoom', (_payload, ack) => {
    let roomCode = randomRoomCode();
    while (rooms[roomCode]) roomCode = randomRoomCode();

    const room = createEmptyRoom(roomCode);
    room.players.p1 = { socketId: socket.id, slot: 'p1', ready: false, profile: null };
    rooms[roomCode] = room;
    socket.join(roomCode);
    console.log('[room] created', roomCode);
    if (typeof ack === 'function') ack({ roomCode, playerSlot: 'p1' });
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

    if (room.players.p1?.socketId === socket.id) {
      if (typeof ack === 'function') ack({ roomCode, playerSlot: 'p1' });
      emitRoomUpdate(roomCode);
      return;
    }
    if (room.players.p2?.socketId === socket.id) {
      if (typeof ack === 'function') ack({ roomCode, playerSlot: 'p2' });
      emitRoomUpdate(roomCode);
      return;
    }

    if (room.players.p2) {
      const err = 'Room is full';
      if (typeof ack === 'function') ack({ error: err });
      socket.emit('errorMessage', err);
      return;
    }

    if (!room.players.p1) {
      room.players.p1 = { socketId: socket.id, slot: 'p1', ready: false, profile: null };
    } else {
      room.players.p2 = { socketId: socket.id, slot: 'p2', ready: false, profile: null };
    }
    const slot = playerSlot(room, socket.id);
    socket.join(roomCode);
    console.log('[room] joined', roomCode, slot);
    if (typeof ack === 'function') ack({ roomCode, playerSlot: slot });
    io.to(roomCode).emit('opponentJoined', { roomCode });
    emitRoomUpdate(roomCode);
  });

  socket.on('syncProfile', (payload = {}) => {
    const { code, room } = findRoomBySocket(socket.id);
    if (!code || !room) return;
    const slot = playerSlot(room, socket.id);
    if (!slot) return;

    const fighter = payload.fighter || null;
    const p = room.players[slot];
    p.profile = {
      name: String(payload.name || 'Player').slice(0, 24),
      profileId: payload.profileId || null,
      ownedMonsterId: payload.ownedMonsterId || null,
      monsterName: payload.monsterName || fighter?.displayName || 'Monster',
      level: fighter?.level ?? 1,
      hp: fighter?.stats?.hp ?? 0,
      maxHp: fighter?.stats?.hp ?? 0,
      mp: fighter?.stats?.mp ?? 0,
      maxMp: fighter?.stats?.mp ?? 0,
      templateId: fighter?.monsterTemplateId || null,
      fighter,
    };
    if (room.status === 'lobby') p.ready = false;
    console.log('[profile] synced', code, slot, p.profile.name);
    emitRoomUpdate(code);
  });

  socket.on('setReady', (payload = {}) => {
    const { code, room } = findRoomBySocket(socket.id);
    if (!code || !room || room.status !== 'lobby') return;
    const slot = playerSlot(room, socket.id);
    if (!slot) return;
    const p = room.players[slot];
    if (!p.profile?.fighter) {
      socket.emit('errorMessage', 'Select a monster first');
      return;
    }
    p.ready = !!payload.ready;
    console.log('[ready]', code, slot, p.ready);
    emitRoomUpdate(code);
    if (p.ready && room.players.p1?.ready && room.players.p2?.ready) {
      tryStartBattle(code);
    }
  });

  socket.on('battleAction', (payload = {}, ack) => {
    const { code, room } = findRoomBySocket(socket.id);
    if (!code || !room || room.status !== 'battle' || !room.battle) {
      if (typeof ack === 'function') ack({ error: 'No active battle' });
      return;
    }
    const slot = playerSlot(room, socket.id);
    if (!slot) {
      if (typeof ack === 'function') ack({ error: 'Not in room' });
      return;
    }

    const action = payload.action;
    console.log('[battle] action', code, slot, action);
    const res = applyBattleAction(room.battle, slot, action, payload);
    if (res.error) {
      if (typeof ack === 'function') ack({ error: res.error });
      return;
    }

    io.to(code).emit('battleUpdate', { battle: snapshotForClient(room.battle) });
    emitRoomUpdate(code);

    if (res.scheduleNextRound && !room.battle.winner) {
      scheduleRoundAdvance(code);
    }

    if (room.battle.winner) {
      room.status = 'finished';
      console.log('[battle] finished', code, 'winner', room.battle.winner);
      io.to(code).emit('battleEnded', {
        winner: room.battle.winner,
        battle: snapshotForClient(room.battle),
      });
      setTimeout(() => {
        const r = rooms[code];
        if (!r || r.status !== 'finished') return;
        r.status = 'lobby';
        r.battle = null;
        if (r.players.p1) r.players.p1.ready = false;
        if (r.players.p2) r.players.p2.ready = false;
        emitRoomUpdate(code);
      }, 8000);
    }

    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('leaveRoom', (payload = {}) => {
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];
    if (!room) return;

    clearBattleTimer(room);
    removePlayerFromRoom(room, socket.id);
    socket.leave(roomCode);
    console.log('[room] leave', roomCode, socket.id);

    if (isRoomEmpty(room)) {
      delete rooms[roomCode];
    } else {
      const remaining = room.players.p1 || room.players.p2;
      if (remaining) remaining.ready = false;
      if (room.status === 'battle') {
        room.status = 'lobby';
        room.battle = null;
      }
      io.to(roomCode).emit('opponentDisconnected', { roomCode });
      emitRoomUpdate(roomCode);
    }
  });

  socket.on('disconnect', () => {
    console.log('[socket] disconnected', socket.id);
    const { code, room } = findRoomBySocket(socket.id);
    if (!code || !room) return;

    const slot = playerSlot(room, socket.id);
    if (slot && room.players[slot]) {
      room.players[slot].socketId = null;
      room.players[slot].ready = false;
    }

    if (isRoomEmpty(room)) {
      clearBattleTimer(room);
      delete rooms[code];
    } else {
      io.to(code).emit('opponentDisconnected', { roomCode: code, temporary: true });
      emitRoomUpdate(code);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
});
