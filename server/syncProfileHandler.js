/**
 * socket.on('syncProfile') — lobby display + optional DynamoDB cloud persist.
 */
const {
  persistCloudProfile,
  hasCloudSavePayload,
  redactCloudPayloadForLog,
} = require('./cloudProfileStore');

function safeAck(ack, result) {
  if (typeof ack === 'function') {
    try {
      ack(result);
    } catch (err) {
      console.error('[syncProfile] ack callback failed', err?.message || err);
    }
  }
}

/**
 * @param {object} ctx — { socket, findRoomForSocket, playerSlot, emitRoomUpdate, tryAutoStartBattle }
 */
function registerSyncProfileHandler(ctx) {
  const { socket, findRoomForSocket, playerSlot, emitRoomUpdate, tryAutoStartBattle } = ctx;

  socket.on('syncProfile', async (payload = {}, ack) => {
    const profileId = payload.profileId || payload.profileID || payload.cloudDocument?.profileID;
    const roomCodeHint = payload.roomCode;

    console.log('[syncProfile] event received', {
      socketId: socket.id,
      profileId: profileId || null,
      roomCode: roomCodeHint || null,
      hasCloudDocument: !!payload.cloudDocument,
      cloud: redactCloudPayloadForLog(payload.cloudDocument),
    });

    const sendFail = (error, details) => {
      console.warn('[syncProfile] failed', { profileId, error, details });
      safeAck(ack, { ok: false, error, details: details || '' });
    };

    try {
      const { code, room } = findRoomForSocket(socket.id, roomCodeHint);
      if (!code || !room) {
        sendFail('Not in a room', 'Join or create a room before syncing profile');
        return;
      }

      const slot = playerSlot(room, socket.id);
      if (!slot) {
        sendFail('Not in room', 'Socket is not assigned to p1 or p2');
        return;
      }

      const fighter = payload.fighter || null;
      const p = room.players[slot];
      p.profile = {
        name: String(payload.name || 'Player').slice(0, 24),
        profileId: payload.profileId || payload.profileID || null,
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

      console.log('[syncProfile] room profile updated', {
        roomCode: code,
        slot,
        profileId: p.profile.profileId,
        name: p.profile.name,
      });

      emitRoomUpdate(code);

      let cloud = { skipped: true, reason: 'lobby_only' };
      if (hasCloudSavePayload(payload)) {
        const playerKey = String(payload.playerKey || payload.cloudDocument.playerKey || '')
          .replace(/\D/g, '')
          .slice(0, 4);
        cloud = await persistCloudProfile(payload.cloudDocument, playerKey);
        if (!cloud.ok && !cloud.skipped) {
          sendFail(cloud.error || 'Cloud save failed', cloud.details || '');
          return;
        }
      }

      const started = tryAutoStartBattle(code);
      if (started) {
        console.log('[syncProfile] battle auto-started after profile sync', code);
      }

      console.log('[syncProfile] success', { roomCode: code, slot, profileId, cloudOk: cloud.ok });
      safeAck(ack, { ok: true, roomCode: code, playerSlot: slot, cloud });
    } catch (err) {
      console.error('[syncProfile] unhandled error', {
        profileId,
        name: err?.name,
        message: err?.message,
        stack: err?.stack,
      });
      sendFail('syncProfile failed', err?.message || String(err));
    }
  });
}

module.exports = { registerSyncProfileHandler };
