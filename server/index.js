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
  activeTurnFromPhase,
  endTurnAfterResolve,
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
const createRequests = {};

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
    opponentLeftMessage: null,
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

function findRoomForSocket(socketId, roomCodeHint) {
  const hint = normalizeCode(roomCodeHint);
  if (hint && rooms[hint]) {
    const room = rooms[hint];
    if (room.players.p1?.socketId === socketId || room.players.p2?.socketId === socketId) {
      return { code: hint, room };
    }
  }
  return findRoomBySocket(socketId);
}

function leaveSocketFromAllRooms(socket) {
  for (const code of Object.keys(rooms)) {
    const room = rooms[code];
    const slot = playerSlot(room, socket.id);
    if (!slot) continue;

    clearBattleTimer(room);
    removePlayerSlot(room, slot);
    socket.leave(code);

    if (isRoomEmpty(room)) {
      delete rooms[code];
    } else {
      room.opponentLeftMessage = 'Opponent left the room.';
      if (room.status === 'battle' || room.status === 'finished') {
        room.status = 'lobby';
        room.battle = null;
      }
      io.to(code).emit('opponentDisconnected', {
        roomCode: code,
        message: room.opponentLeftMessage,
      });
      emitRoomUpdate(code);
    }
  }
}

function playerSlot(room, socketId) {
  if (room.players.p1?.socketId === socketId) return 'p1';
  if (room.players.p2?.socketId === socketId) return 'p2';
  return null;
}

function removePlayerSlot(room, slot) {
  if (slot === 'p1') room.players.p1 = null;
  if (slot === 'p2') room.players.p2 = null;
}

function isRoomEmpty(room) {
  return !room.players.p1 && !room.players.p2;
}

function publicPlayer(p) {
  if (!p) return null;
  return {
    slot: p.slot,
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

function lobbyMissing(room) {
  const missing = [];
  if (!room.players.p1?.socketId) missing.push('Waiting for Player A to join…');
  else if (!room.players.p1?.profile?.fighter) missing.push('Player A needs a monster (pick on Home)');

  if (!room.players.p2?.socketId) missing.push('Waiting for Player B to join…');
  else if (!room.players.p2?.profile?.fighter) missing.push('Player B needs a monster (pick on Home)');

  return missing;
}

function roomPayload(room) {
  const battleSnap = room.battle ? snapshotForClient(room.battle) : null;
  let activeTurn = null;
  if (room.battle && room.status === 'battle') {
    activeTurn = activeTurnFromPhase(room.battle);
  }
  const playerCount = ['p1', 'p2'].filter((slot) => {
    const p = room.players[slot];
    return !!(p && p.socketId);
  }).length;
  const bothJoined = playerCount >= 2;
  const missing = lobbyMissing(room);
  return {
    roomCode: room.roomCode,
    status: room.status,
    playerCount,
    players: {
      p1: publicPlayer(room.players.p1),
      p2: publicPlayer(room.players.p2),
    },
    battle: battleSnap,
    activeTurn,
    bothJoined,
    canStart: room.status === 'lobby' && bothJoined && missing.length === 0,
    missingRequirements: missing,
    lobbyMessage: room.opponentLeftMessage || (bothJoined ? (missing[0] || 'Starting battle…') : 'Waiting for opponent…'),
  };
}

function emitRoomUpdate(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  const payload = roomPayload(room);
  console.log(
    '[room] roomUpdate',
    roomCode,
    'players',
    payload.playerCount,
    '/2',
    'status',
    payload.status,
    'bothJoined',
    payload.bothJoined,
  );
  io.to(roomCode).emit('roomUpdate', payload);
  return payload;
}

function joinSocketToRoom(socket, roomCode, cb) {
  try {
    const joined = socket.join(roomCode);
    if (joined && typeof joined.then === 'function') {
      joined.then(() => cb?.(null)).catch((err) => {
        console.error('[room] socket.join failed', roomCode, err.message || err);
        cb?.(err);
      });
      return;
    }
    cb?.(null);
  } catch (err) {
    console.error('[room] socket.join failed', roomCode, err.message || err);
    cb?.(err);
  }
}

function clearBattleTimer(room) {
  if (room.battleResolveTimer) {
    clearTimeout(room.battleResolveTimer);
    room.battleResolveTimer = null;
  }
}

function tryAutoStartBattle(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.status !== 'lobby') return false;

  const p1 = room.players.p1;
  const p2 = room.players.p2;
  if (!p1?.socketId || !p2?.socketId) return false;
  if (!p1.profile?.fighter || !p2.profile?.fighter) return false;

  clearBattleTimer(room);
  room.opponentLeftMessage = null;
  room.battle = createBattle(p1.profile.fighter, p2.profile.fighter);
  room.status = 'battle';
  room.battle.bannerMessage = `${p1.profile.name || 'Player 1'} — choose your move`;
  console.log('[battle] auto-started', roomCode, p1.profile.name, 'vs', p2.profile.name);

  const snap = snapshotForClient(room.battle);
  const roomSnap = roomPayload(room);
  console.log('[battle] auto-started', roomCode, 'playerCount', roomSnap.playerCount);
  io.to(roomCode).emit('battleStarted', { roomCode, battle: snap, room: roomSnap });
  io.to(roomCode).emit('battle_started', { roomCode, battle: snap, room: roomSnap });
  emitRoomUpdate(roomCode);
  return true;
}

function emitBattleEvents(roomCode, battle, extra = {}) {
  const snap = snapshotForClient(battle);
  const roomSnap = roomPayload(rooms[roomCode]);
  io.to(roomCode).emit('battleUpdate', { battle: snap, ...extra });
  io.to(roomCode).emit('battle_state_updated', { battle: snap, room: roomSnap });
  return snap;
}

function scheduleEndTurn(roomCode) {
  const room = rooms[roomCode];
  if (!room?.battle) return;
  clearBattleTimer(room);
  room.battleResolveTimer = setTimeout(() => {
    room.battleResolveTimer = null;
    if (!room.battle || room.battle.winner) {
      emitRoomUpdate(roomCode);
      return;
    }
    const res = endTurnAfterResolve(room.battle);
    if (res.ok) {
      console.log('[battle] turn ended', roomCode, 'round', room.battle.round, 'active', room.battle.activePlayerId);
      const snap = emitBattleEvents(roomCode, room.battle);
      io.to(roomCode).emit('turn_changed', {
        activePlayerId: room.battle.activePlayerId,
        round: room.battle.round,
        battle: snap,
      });
    }
    emitRoomUpdate(roomCode);
  }, RESOLVE_MS);
}

function ensurePlayerRecord(room, slot, socket) {
  const existing = room.players[slot];
  if (!existing) {
    room.players[slot] = { socketId: socket.id, slot, profile: null };
    return room.players[slot];
  }
  existing.socketId = socket.id;
  return existing;
}

function assignJoinSlot(room, socket) {
  if (!room.players.p1?.socketId) {
    ensurePlayerRecord(room, 'p1', socket);
    return 'p1';
  }
  if (!room.players.p2?.socketId) {
    ensurePlayerRecord(room, 'p2', socket);
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

    let slot = playerSlot(room, socket.id);
    if (!slot) {
      const want = payload.playerSlot === 'p2' ? 'p2' : 'p1';
      if (room.players[want] && !room.players[want].socketId) {
        ensurePlayerRecord(room, want, socket);
        slot = want;
      } else {
        slot = assignJoinSlot(room, socket);
      }
    }

    if (!slot) {
      if (typeof ack === 'function') ack({ error: 'Room is full' });
      return;
    }

    ensurePlayerRecord(room, slot, socket);
    joinSocketToRoom(socket, roomCode, () => {
      console.log('[room] rejoined', roomCode, slot, socket.id);
      const state = emitRoomUpdate(roomCode);
      if (typeof ack === 'function') ack({ roomCode, playerSlot: slot, room: state });
      tryAutoStartBattle(roomCode);
    });
  });

  socket.on('requestRoomState', (payload = {}, ack) => {
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];
    if (!room) {
      if (typeof ack === 'function') ack({ error: 'Room not found' });
      return;
    }
    const state = emitRoomUpdate(roomCode);
    if (typeof ack === 'function') ack({ room: state });
  });

  socket.on('createRoom', (_payload, ack) => {
    const requestId = String(_payload?.requestId || '').slice(0, 80);
    if (requestId && createRequests[requestId] && rooms[createRequests[requestId].roomCode]) {
      const existing = createRequests[requestId];
      const room = rooms[existing.roomCode];
      ensurePlayerRecord(room, existing.playerSlot, socket);
      joinSocketToRoom(socket, existing.roomCode, (err) => {
        if (typeof ack !== 'function') return;
        if (err) {
          ack({ error: err.message || String(err) || 'Failed to create room' });
          return;
        }
        const state = emitRoomUpdate(existing.roomCode);
        ack({ roomCode: existing.roomCode, playerSlot: existing.playerSlot, room: state });
      });
      return;
    }

    leaveSocketFromAllRooms(socket);
    let roomCode = randomRoomCode();
    while (rooms[roomCode]) roomCode = randomRoomCode();

    const room = createEmptyRoom(roomCode);
    ensurePlayerRecord(room, 'p1', socket);
    rooms[roomCode] = room;

    const sendAck = (err) => {
      if (typeof ack !== 'function') return;
      if (err) {
        ack({ error: err.message || String(err) || 'Failed to create room' });
        return;
      }
      console.log('[room] created', roomCode, 'host', socket.id);
      if (requestId) createRequests[requestId] = { roomCode, playerSlot: 'p1', t: Date.now() };
      const state = emitRoomUpdate(roomCode);
      ack({ roomCode, playerSlot: 'p1', room: state });
    };

    joinSocketToRoom(socket, roomCode, (err) => {
      if (err) {
        delete rooms[roomCode];
        sendAck(err);
        return;
      }
      sendAck(null);
    });
  });

  socket.on('joinRoom', (payload = {}, ack) => {
    leaveSocketFromAllRooms(socket);
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];

    if (!room) {
      const err = 'Room not found — check the code and server URL';
      if (typeof ack === 'function') ack({ error: err });
      socket.emit('errorMessage', err);
      return;
    }

    let slot = playerSlot(room, socket.id);
    if (!slot) {
      slot = assignJoinSlot(room, socket);
    }
    if (!slot) {
      const err = 'Room is full';
      if (typeof ack === 'function') ack({ error: err });
      socket.emit('errorMessage', err);
      return;
    }

    ensurePlayerRecord(room, slot, socket);
    room.opponentLeftMessage = null;

    joinSocketToRoom(socket, roomCode, () => {
      console.log('[room] joined', roomCode, slot, socket.id);

      const state = emitRoomUpdate(roomCode);
      io.to(roomCode).emit('opponentJoined', { roomCode, slot });
      if (typeof ack === 'function') ack({ roomCode, playerSlot: slot, room: state });

      const started = tryAutoStartBattle(roomCode);
      if (started) console.log('[battle] auto-start after join', roomCode);
    });
  });

  socket.on('syncProfile', (payload = {}) => {
    const { code, room } = findRoomForSocket(socket.id, payload.roomCode);
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
    console.log('[profile] synced', code, slot, p.profile.name);
    emitRoomUpdate(code);
    const started = tryAutoStartBattle(code);
    if (started) console.log('[battle] auto-start after profile sync', code);
  });

  socket.on('battleAction', (payload = {}, ack) => {
    const { code, room } = findRoomForSocket(socket.id, payload.roomCode);
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
    console.log('[battle] action', code, slot, action, payload.skillId || '');
    const res = applyBattleAction(room.battle, slot, action, payload);
    if (res.error) {
      console.log('[battle] action rejected', code, slot, res.error);
      if (typeof ack === 'function') ack({ error: res.error });
      return;
    }

    const snap = emitBattleEvents(code, room.battle, { action });
    io.to(code).emit('action_result', { battle: snap, action });
    emitRoomUpdate(code);

    if (res.scheduleEndTurn && !room.battle.winner) {
      scheduleEndTurn(code);
    }

    if (room.battle.winner) {
      room.status = 'finished';
      console.log('[battle] finished', code, 'winner', room.battle.winner);
      const endSnap = snapshotForClient(room.battle);
      io.to(code).emit('battleEnded', {
        winner: room.battle.winner,
        battle: endSnap,
      });
      io.to(code).emit('battleUpdate', { battle: endSnap });
      emitRoomUpdate(code);
      setTimeout(() => {
        const r = rooms[code];
        if (!r || r.status !== 'finished') return;
        r.status = 'lobby';
        r.battle = null;
        r.opponentLeftMessage = null;
        emitRoomUpdate(code);
      }, 12000);
    }

    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('leaveRoom', (payload = {}) => {
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];
    if (!room) return;

    const slot = playerSlot(room, socket.id);
    clearBattleTimer(room);
    if (slot) removePlayerSlot(room, slot);
    socket.leave(roomCode);
    console.log('[room] leave', roomCode, socket.id);

    if (isRoomEmpty(room)) {
      delete rooms[roomCode];
    } else {
      room.opponentLeftMessage = 'Opponent left the room.';
      if (room.status === 'battle') {
        room.status = 'lobby';
        room.battle = null;
      }
      io.to(roomCode).emit('opponentDisconnected', { roomCode, message: room.opponentLeftMessage });
      emitRoomUpdate(roomCode);
    }
  });

  socket.on('disconnect', () => {
    console.log('[socket] disconnected', socket.id);
    const { code, room } = findRoomBySocket(socket.id);
    if (!code || !room) return;

    const slot = playerSlot(room, socket.id);
    if (slot) {
      room.players[slot].socketId = null;
    }

    if (isRoomEmpty(room)) {
      clearBattleTimer(room);
      delete rooms[code];
    } else {
      room.opponentLeftMessage = 'Opponent left the room.';
      io.to(code).emit('opponentDisconnected', { roomCode: code, message: room.opponentLeftMessage });
      emitRoomUpdate(code);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
});
