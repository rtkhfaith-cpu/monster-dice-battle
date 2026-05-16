import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Constants from 'expo-constants';
import MonsterPreview from './MonsterPreview';
import {
  createOnlineRoom,
  ensureOnlineSocket,
  joinOnlineRoom,
  leaveOnlineRoom,
  setOnlineReady,
  subscribeOnline,
  syncOnlineProfile,
} from '../utils/onlineSocketManager';
import { loadOnlineSession } from '../utils/onlineSession';

function socketUrlConfigured() {
  const u = Constants.expoConfig?.extra?.socketServerUrl ?? '';
  return typeof u === 'string' && u.length > 5;
}

function PlayerCard({ label, player, isYou }) {
  const prof = player?.profile;
  const parts = prof?.fighter?.monsterParts;
  return (
    <View style={[styles.playerCard, isYou && styles.playerCardYou]}>
      <Text style={styles.playerLabel}>
        {label}
        {isYou ? ' (You)' : ''}
      </Text>
      <Text style={styles.playerName}>{prof?.name ?? '—'}</Text>
      {!player?.connected && !prof ? (
        <Text style={styles.wait}>Waiting for opponent…</Text>
      ) : null}
      {prof ? (
        <>
          <View style={styles.previewRow}>
            {parts ? <MonsterPreview parts={parts} size={56} mood="neutral" /> : null}
            <View style={styles.statsCol}>
              <Text style={styles.monName}>{prof.monsterName}</Text>
              <Text style={styles.stat}>Lv {prof.level}</Text>
              <Text style={styles.stat}>
                HP {prof.hp}/{prof.maxHp} · MP {prof.mp}/{prof.maxMp}
              </Text>
              <Text style={[styles.readyTag, player.ready ? styles.readyYes : styles.readyNo]}>
                {player.ready ? 'Ready' : 'Not ready'}
              </Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

/**
 * Online multiplayer lobby — room persists when navigating home.
 */
export default function OnlineLobbyScreen({
  onBackHome,
  onBattleStart,
  buildProfilePayload,
  mySlot: mySlotProp,
}) {
  const [status, setStatus] = useState(socketUrlConfigured() ? 'idle' : 'no_env');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [mySlot, setMySlot] = useState(mySlotProp || loadOnlineSession()?.playerSlot || null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');

  const refreshProfile = useCallback(() => {
    const payload = buildProfilePayload?.();
    if (payload?.fighter) syncOnlineProfile(payload);
  }, [buildProfilePayload]);

  useEffect(() => {
    if (!socketUrlConfigured()) return undefined;
    setStatus('connecting');
    ensureOnlineSocket().then(({ error }) => {
      if (error) {
        setStatus('fail');
        setErr(error);
        return;
      }
      setStatus('connected');
      refreshProfile();
    });
    return subscribeOnline((st) => {
      setRoomState(st);
      if (st?.roomCode) setRoomCodeInput(st.roomCode);
      const session = loadOnlineSession();
      if (session?.playerSlot) setMySlot(session.playerSlot);
      const me = session?.playerSlot === 'p2' ? st?.players?.p2 : st?.players?.p1;
      setReady(!!me?.ready);
      if (st?.status === 'battle' && st.battle && onBattleStart) {
        onBattleStart(st);
      }
    });
  }, [buildProfilePayload, onBattleStart, refreshProfile]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  async function handleCreate() {
    setErr('');
    const res = await createOnlineRoom();
    if (res.error) setErr(res.error);
    else {
      setMySlot(res.playerSlot);
      refreshProfile();
    }
  }

  async function handleJoin() {
    setErr('');
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      setErr('Enter a room code');
      return;
    }
    const res = await joinOnlineRoom(code);
    if (res.error) setErr(res.error);
    else {
      setMySlot(res.playerSlot);
      refreshProfile();
    }
  }

  function toggleReady() {
    const next = !ready;
    setReady(next);
    setOnlineReady(next);
  }

  function handleLeave() {
    leaveOnlineRoom();
    setRoomState(null);
    setMySlot(null);
    setReady(false);
  }

  const connected = status === 'connected';
  const inRoom = !!roomState?.roomCode;
  const opp = mySlot === 'p2' ? roomState?.players?.p1 : roomState?.players?.p2;
  const me = mySlot === 'p2' ? roomState?.players?.p2 : roomState?.players?.p1;
  const canReady = !!me?.profile?.fighter && !!opp?.profile?.fighter;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Online Multiplayer</Text>
      <Text style={styles.status}>
        {status === 'no_env'
          ? 'Server not configured. Set EXPO_PUBLIC_SOCKET_SERVER_URL and rebuild.'
          : connected
            ? inRoom
              ? `Connected · Room ${roomState.roomCode}`
              : 'Connected — create or join a room'
            : status === 'fail'
              ? err || 'Connection failed'
              : 'Connecting…'}
      </Text>

      {!inRoom ? (
        <>
          <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={!connected}>
            <Text style={styles.btnTxt}>Create Room</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="ROOM CODE"
            autoCapitalize="characters"
            value={roomCodeInput}
            onChangeText={setRoomCodeInput}
          />
          <TouchableOpacity style={styles.btnAlt} onPress={handleJoin} disabled={!connected}>
            <Text style={styles.btnTxt}>Join Room</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.roomCode}>Room {roomState.roomCode}</Text>
          <PlayerCard label="Player 1" player={roomState.players?.p1} isYou={mySlot === 'p1'} />
          <PlayerCard label="Player 2" player={roomState.players?.p2} isYou={mySlot === 'p2'} />

          {!opp?.profile ? (
            <Text style={styles.hint}>Waiting for opponent to join…</Text>
          ) : !canReady ? (
            <Text style={styles.hint}>Both players need a monster selected on Home.</Text>
          ) : (
            <Text style={styles.hint}>Both monsters locked in — tap Ready when set.</Text>
          )}

          <TouchableOpacity
            style={[styles.readyBtn, ready && styles.readyBtnOn]}
            onPress={toggleReady}
            disabled={!canReady || roomState.status === 'battle'}
          >
            <Text style={styles.btnTxt}>{ready ? 'Unready' : 'Ready'}</Text>
          </TouchableOpacity>

          {roomState.canStart ? (
            <Text style={styles.startHint}>Starting battle…</Text>
          ) : null}
        </>
      )}

      {err ? <Text style={styles.err}>{err}</Text> : null}

      <TouchableOpacity style={styles.back} onPress={onBackHome}>
        <Text style={styles.backTxt}>← Back to Home</Text>
      </TouchableOpacity>

      {inRoom ? (
        <TouchableOpacity style={styles.leave} onPress={handleLeave}>
          <Text style={styles.leaveTxt}>Leave Room</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  inner: { paddingVertical: 12, paddingBottom: 28 },
  title: { fontSize: 24, fontWeight: '900', color: '#273043', textAlign: 'center', marginBottom: 8 },
  status: {
    fontWeight: '700',
    fontSize: 14,
    color: '#566573',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
  roomCode: {
    fontWeight: '900',
    fontSize: 22,
    textAlign: 'center',
    color: '#0984e3',
    marginBottom: 10,
    letterSpacing: 2,
  },
  btn: {
    backgroundColor: '#8ac926',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnAlt: {
    backgroundColor: '#74b9ff',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    alignItems: 'center',
    marginBottom: 14,
  },
  btnTxt: { fontWeight: '900', fontSize: 17, color: '#1b1b2f' },
  input: {
    borderWidth: 3,
    borderColor: '#ff9f1c',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '900',
    marginBottom: 10,
    backgroundColor: '#fff',
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
  },
  playerCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dfe6e9',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  playerCardYou: { borderColor: '#0984e3', borderWidth: 3 },
  playerLabel: { fontWeight: '900', fontSize: 12, color: '#636e72', textTransform: 'uppercase' },
  playerName: { fontWeight: '900', fontSize: 18, color: '#1a1a2e', marginBottom: 6 },
  wait: { fontWeight: '800', fontSize: 14, color: '#e67e22', fontStyle: 'italic' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statsCol: { flex: 1 },
  monName: { fontWeight: '900', fontSize: 16, color: '#2d3436' },
  stat: { fontWeight: '800', fontSize: 13, color: '#4a5568' },
  readyTag: {
    marginTop: 4,
    alignSelf: 'flex-start',
    fontWeight: '900',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  readyYes: { backgroundColor: '#8ac926', color: '#1b4332' },
  readyNo: { backgroundColor: '#ffd166', color: '#4a2800' },
  hint: {
    fontWeight: '800',
    fontSize: 14,
    color: '#566573',
    textAlign: 'center',
    marginBottom: 10,
  },
  startHint: {
    fontWeight: '900',
    fontSize: 16,
    color: '#27ae60',
    textAlign: 'center',
    marginBottom: 10,
  },
  readyBtn: {
    backgroundColor: '#dfe6e9',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    alignItems: 'center',
    marginBottom: 12,
  },
  readyBtnOn: { backgroundColor: '#8ac926' },
  err: { color: '#c0392b', fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  back: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffd166',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    marginBottom: 10,
  },
  backTxt: { fontWeight: '900', fontSize: 16, color: '#1b1b2f' },
  leave: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ff6b6b',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
  },
  leaveTxt: { fontWeight: '900', fontSize: 16, color: '#fff' },
});
