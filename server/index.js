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
const { registerSyncProfileHandler } = require('./syncProfileHandler');
const { bindSocketHandler, registerUnknownEventGuard, logSocketError } = require('./socketLog');
const { promisifyJoin } = require('./joinRoomAsync');

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

  bindSocketHandler(socket, 'rejoinRoom', async ({ socket: sock, payload, ack }) => {
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];
    if (!room) {
      ack({ ok: false, error: 'Room not found', errorName: 'ROOM_NOT_FOUND' });
      return;
    }

    let slot = playerSlot(room, sock.id);
    if (!slot) {
      const want = payload.playerSlot === 'p2' ? 'p2' : 'p1';
      if (room.players[want] && !room.players[want].socketId) {
        ensurePlayerRecord(room, want, sock);
        slot = want;
      } else {
        slot = assignJoinSlot(room, sock);
      }
    }

    if (!slot) {
      ack({ ok: false, error: 'Room is full', errorName: 'ROOM_FULL' });
      return;
    }

    ensurePlayerRecord(room, slot, sock);
    await promisifyJoin(joinSocketToRoom, sock, roomCode);
    console.log('[room] rejoined', roomCode, slot, sock.id);
    const state = emitRoomUpdate(roomCode);
    ack({ ok: true, roomCode, playerSlot: slot, room: state });
    tryAutoStartBattle(roomCode);
  });

  bindSocketHandler(socket, 'requestRoomState', async ({ payload, ack }) => {
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];
    if (!room) {
      ack({ ok: false, error: 'Room not found', errorName: 'ROOM_NOT_FOUND' });
      return;
    }
    const state = emitRoomUpdate(roomCode);
    ack({ ok: true, room: state });
  });

  bindSocketHandler(socket, 'createRoom', async ({ socket: sock, payload, ack }) => {
    const requestId = String(payload?.requestId || '').slice(0, 80);
    if (requestId && createRequests[requestId] && rooms[createRequests[requestId].roomCode]) {
      const existing = createRequests[requestId];
      const room = rooms[existing.roomCode];
      ensurePlayerRecord(room, existing.playerSlot, sock);
      await promisifyJoin(joinSocketToRoom, sock, existing.roomCode);
      const state = emitRoomUpdate(existing.roomCode);
      ack({
        ok: true,
        roomCode: existing.roomCode,
        playerSlot: existing.playerSlot,
        room: state,
      });
      return;
    }

    leaveSocketFromAllRooms(sock);
    let roomCode = randomRoomCode();
    while (rooms[roomCode]) roomCode = randomRoomCode();

    const room = createEmptyRoom(roomCode);
    ensurePlayerRecord(room, 'p1', sock);
    rooms[roomCode] = room;

    try {
      await promisifyJoin(joinSocketToRoom, sock, roomCode);
      console.log('[room] created', roomCode, 'host', sock.id);
      if (requestId) createRequests[requestId] = { roomCode, playerSlot: 'p1', t: Date.now() };
      const state = emitRoomUpdate(roomCode);
      ack({ ok: true, roomCode, playerSlot: 'p1', room: state });
    } catch (err) {
      delete rooms[roomCode];
      throw err;
    }
  });

  bindSocketHandler(socket, 'joinRoom', async ({ socket: sock, payload, ack }) => {
    leaveSocketFromAllRooms(sock);
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];

    if (!room) {
      const err = 'Room not found — check the code and server URL';
      ack({ ok: false, error: err, errorName: 'ROOM_NOT_FOUND' });
      sock.emit('errorMessage', err);
      return;
    }

    let slot = playerSlot(room, sock.id);
    if (!slot) {
      slot = assignJoinSlot(room, sock);
    }
    if (!slot) {
      const err = 'Room is full';
      ack({ ok: false, error: err, errorName: 'ROOM_FULL' });
      sock.emit('errorMessage', err);
      return;
    }

    ensurePlayerRecord(room, slot, sock);
    room.opponentLeftMessage = null;

    await promisifyJoin(joinSocketToRoom, sock, roomCode);
    console.log('[room] joined', roomCode, slot, sock.id);

    const state = emitRoomUpdate(roomCode);
    io.to(roomCode).emit('opponentJoined', { roomCode, slot });
    ack({ ok: true, roomCode, playerSlot: slot, room: state });

    const started = tryAutoStartBattle(roomCode);
    if (started) console.log('[battle] auto-start after join', roomCode);
  });

  registerSyncProfileHandler({
    socket,
    findRoomForSocket,
    playerSlot,
    emitRoomUpdate,
    tryAutoStartBattle,
  });

  bindSocketHandler(socket, 'battleAction', async ({ socket: sock, payload, ack, profileId }) => {
    const { code, room } = findRoomForSocket(sock.id, payload.roomCode);
    if (!code || !room || room.status !== 'battle' || !room.battle) {
      ack({ ok: false, error: 'No active battle', errorName: 'NO_BATTLE' });
      return;
    }
    const slot = playerSlot(room, sock.id);
    if (!slot) {
      ack({ ok: false, error: 'Not in room', errorName: 'NO_SLOT' });
      return;
    }

    const action = payload.action;
    console.log('[battle] action', code, slot, profileId, action, payload.skillId || '');
    const res = applyBattleAction(room.battle, slot, action, payload);
    if (res.error) {
      console.log('[battle] action rejected', code, slot, res.error);
      ack({ ok: false, error: res.error, errorName: 'ACTION_REJECTED' });
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

    ack({ ok: true });
  });

  bindSocketHandler(socket, 'leaveRoom', async ({ socket: sock, payload, ack, profileId }) => {
    const roomCode = normalizeCode(payload.roomCode);
    const room = rooms[roomCode];
    if (!room) {
      ack({ ok: true, skipped: true, details: 'Room already gone' });
      return;
    }

    const slot = playerSlot(room, sock.id);
    clearBattleTimer(room);
    if (slot) removePlayerSlot(room, slot);
    sock.leave(roomCode);
    console.log('[room] leave', roomCode, sock.id, profileId);

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
    ack({ ok: true });
  });

  registerUnknownEventGuard(socket);

  socket.on('disconnect', () => {
    try {
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
    } catch (err) {
      logSocketError('disconnect', socket, err);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on ${PORT}`);
});
