import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import {
  createOnlineRoom,
  ensureOnlineSocket,
  getConfiguredServerUrl,
  joinOnlineRoom,
  leaveOnlineRoom,
  subscribeOnline,
  syncOnlineProfile,
} from '../utils/onlineSocketManager';
import { loadOnlineSession } from '../utils/onlineSession';

function PlayerCard({ label, player, isYou, emptyLabel }) {
  const prof = player?.profile;
  const parts = prof?.fighter?.monsterParts;
  const joined = !!player?.connected;

  if (!joined && !prof) {
    return (
      <View style={[styles.playerCard, styles.playerCardEmpty]}>
        <Text style={styles.playerLabel}>{label}</Text>
        <Text style={styles.wait}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.playerCard, isYou && styles.playerCardYou]}>
      <Text style={styles.playerLabel}>
        {label}
        {isYou ? ' (You)' : ''}
      </Text>
      <Text style={styles.playerName}>{prof?.name ?? '—'}</Text>
      {prof ? (
        <View style={styles.previewRow}>
          {parts ? <MonsterPreview parts={parts} size={56} mood="neutral" /> : null}
          <View style={styles.statsCol}>
            <Text style={styles.monName}>{prof.monsterName}</Text>
            <Text style={styles.stat}>Lv {prof.level}</Text>
            <Text style={styles.stat}>
              HP {prof.hp}/{prof.maxHp} · MP {prof.mp}/{prof.maxMp}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.wait}>Select a monster on Home, then return here.</Text>
      )}
    </View>
  );
}

async function copyRoomCode(code) {
  const text = String(code || '').trim();
  if (!text) return;
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      Alert.alert('Copied', `Room code ${text} copied.`);
      return;
    }
    Alert.alert('Room code', text);
  } catch {
    Alert.alert('Room code', text);
  }
}

/**
 * Online multiplayer: Create / Join → waiting room → auto battle start.
 */
export default function OnlineLobbyScreen({
  onBackHome,
  onBattleStart,
  buildProfilePayload,
  mySlot: mySlotProp,
  initialView = 'menu',
}) {
  const serverUrl = getConfiguredServerUrl();
  const configured = serverUrl.length > 5;

  const [view, setView] = useState(initialView);
  const [status, setStatus] = useState(configured ? 'connecting' : 'no_env');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [mySlot, setMySlot] = useState(mySlotProp || loadOnlineSession()?.playerSlot || null);
  const [err, setErr] = useState('');
  const [opponentLeft, setOpponentLeft] = useState('');
  const [busy, setBusy] = useState(false);

  const refreshProfile = useCallback(() => {
    const payload = buildProfilePayload?.();
    if (payload) syncOnlineProfile(payload);
  }, [buildProfilePayload]);

  useEffect(() => {
    if (!configured) return undefined;
    setStatus('connecting');
    ensureOnlineSocket().then(({ error, url }) => {
      if (error) {
        setStatus('fail');
        setErr(`${error}${url ? ` (${url})` : ''}`);
        return;
      }
      setStatus('connected');
      refreshProfile();
      const session = loadOnlineSession();
      if (session?.roomCode) {
        setView('waiting');
        setRoomCodeInput(session.roomCode);
        setMySlot(session.playerSlot);
      }
    });
    return subscribeOnline((st, meta) => {
      setRoomState(st);
      if (st?.roomCode) {
        setView('waiting');
        setRoomCodeInput(st.roomCode);
      }
      const session = loadOnlineSession();
      if (session?.playerSlot) setMySlot(session.playerSlot);
      if (meta?.opponentLeft) setOpponentLeft(meta.opponentLeft);
      if (st?.status === 'battle' && st.battle && onBattleStart) {
        onBattleStart(st);
      }
    });
  }, [buildProfilePayload, configured, onBattleStart, refreshProfile]);

  useEffect(() => {
    if (view === 'waiting') refreshProfile();
  }, [view, refreshProfile]);

  async function handleCreate() {
    setErr('');
    setBusy(true);
    refreshProfile();
    const res = await createOnlineRoom();
    setBusy(false);
    if (res.error) setErr(res.error);
    else {
      setMySlot(res.playerSlot);
      setView('waiting');
      refreshProfile();
    }
  }

  async function handleJoin() {
    setErr('');
    const code = roomCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      setErr('Enter the 6-letter room code');
      return;
    }
    setBusy(true);
    refreshProfile();
    const res = await joinOnlineRoom(code);
    setBusy(false);
    if (res.error) setErr(res.error);
    else {
      setMySlot(res.playerSlot);
      setView('waiting');
      refreshProfile();
    }
  }

  function handleLeave() {
    leaveOnlineRoom();
    setRoomState(null);
    setMySlot(null);
    setOpponentLeft('');
    setView('menu');
  }

  const connected = status === 'connected';
  const inRoom = !!roomState?.roomCode;
  const opp = mySlot === 'p2' ? roomState?.players?.p1 : roomState?.players?.p2;
  const me = mySlot === 'p2' ? roomState?.players?.p2 : roomState?.players?.p1;
  const bothJoined = !!roomState?.bothJoined;
  const missing = roomState?.missingRequirements ?? [];
  const starting = bothJoined && missing.length === 0 && roomState?.status === 'lobby';

  let statusLine = 'Connecting…';
  if (!configured) statusLine = 'Server not configured. Set EXPO_PUBLIC_SOCKET_SERVER_URL and rebuild.';
  else if (status === 'fail') statusLine = err || 'Connection failed';
  else if (connected && inRoom) {
    if (opponentLeft) statusLine = opponentLeft;
    else if (roomState.status === 'battle') statusLine = 'Battle starting…';
    else if (!bothJoined) statusLine = 'Waiting for opponent…';
    else if (missing.length) statusLine = missing[0];
    else if (starting) statusLine = 'Both players ready — starting battle…';
    else statusLine = `Connected · Room ${roomState.roomCode}`;
  } else if (connected) statusLine = 'Connected';

  if (view === 'waiting' && inRoom) {
    return (
      <ScrollView style={styles.wrap} contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Waiting Room</Text>
        <Text style={[styles.status, opponentLeft && styles.statusWarn]}>{statusLine}</Text>

        <Text style={styles.roomLabel}>Room code</Text>
        <Text style={styles.roomCode}>{roomState.roomCode}</Text>
        <TouchableOpacity style={styles.copyBtn} onPress={() => copyRoomCode(roomState.roomCode)}>
          <Text style={styles.copyTxt}>Copy room code</Text>
        </TouchableOpacity>

        <PlayerCard
          label="Player A"
          player={roomState.players?.p1}
          isYou={mySlot === 'p1'}
          emptyLabel="Waiting for Player A…"
        />
        <PlayerCard
          label="Player B"
          player={roomState.players?.p2}
          isYou={mySlot === 'p2'}
          emptyLabel={bothJoined ? '—' : 'Waiting for opponent…'}
        />

        {missing.length > 1 ? (
          <View style={styles.missingBox}>
            {missing.map((m) => (
              <Text key={m} style={styles.missingLine}>
                • {m}
              </Text>
            ))}
          </View>
        ) : null}

        {DEV_HINT && configured ? (
          <Text style={styles.devUrl} numberOfLines={2}>
            Server: {serverUrl}
          </Text>
        ) : null}

        <TouchableOpacity style={styles.leave} onPress={handleLeave}>
          <Text style={styles.leaveTxt}>Leave Room</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.back} onPress={onBackHome}>
          <Text style={styles.backTxt}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Multiplayer Online</Text>
      <Text style={styles.status}>{statusLine}</Text>

      {view === 'menu' ? (
        <>
          <TouchableOpacity
            style={styles.btn}
            onPress={handleCreate}
            disabled={!connected || busy}
          >
            <Text style={styles.btnTxt}>Create Room</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnAlt}
            onPress={() => setView('join')}
            disabled={!connected}
          >
            <Text style={styles.btnTxt}>Join Room</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.joinHint}>Enter the room code from your friend:</Text>
          <TextInput
            style={styles.input}
            placeholder="ROOM CODE"
            autoCapitalize="characters"
            maxLength={8}
            value={roomCodeInput}
            onChangeText={(t) => setRoomCodeInput(t.toUpperCase())}
          />
          <TouchableOpacity style={styles.btn} onPress={handleJoin} disabled={!connected || busy}>
            <Text style={styles.btnTxt}>Join</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkBtn} onPress={() => setView('menu')}>
            <Text style={styles.linkTxt}>← Back</Text>
          </TouchableOpacity>
        </>
      )}

      {err ? <Text style={styles.err}>{err}</Text> : null}

      {DEV_HINT && configured ? (
        <Text style={styles.devUrl} numberOfLines={2}>
          Server: {serverUrl}
        </Text>
      ) : null}

      <TouchableOpacity style={styles.back} onPress={onBackHome}>
        <Text style={styles.backTxt}>← Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const DEV_HINT = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

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
  statusWarn: { color: '#c0392b' },
  roomLabel: {
    fontWeight: '800',
    fontSize: 12,
    color: '#636e72',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roomCode: {
    fontWeight: '900',
    fontSize: 36,
    textAlign: 'center',
    color: '#0984e3',
    marginVertical: 8,
    letterSpacing: 4,
  },
  copyBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
    backgroundColor: '#dfe6e9',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2d2d44',
  },
  copyTxt: { fontWeight: '900', fontSize: 14, color: '#2d3436' },
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
  joinHint: { fontWeight: '800', fontSize: 14, color: '#566573', textAlign: 'center', marginBottom: 8 },
  input: {
    borderWidth: 3,
    borderColor: '#ff9f1c',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontWeight: '900',
    marginBottom: 10,
    backgroundColor: '#fff',
    fontSize: 22,
    letterSpacing: 3,
    textAlign: 'center',
  },
  linkBtn: { alignSelf: 'center', marginBottom: 12 },
  linkTxt: { fontWeight: '900', fontSize: 15, color: '#0984e3' },
  playerCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dfe6e9',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  playerCardEmpty: { borderStyle: 'dashed', backgroundColor: '#f8f9fa' },
  playerCardYou: { borderColor: '#0984e3', borderWidth: 3 },
  playerLabel: { fontWeight: '900', fontSize: 12, color: '#636e72', textTransform: 'uppercase' },
  playerName: { fontWeight: '900', fontSize: 18, color: '#1a1a2e', marginBottom: 6 },
  wait: { fontWeight: '800', fontSize: 14, color: '#e67e22', fontStyle: 'italic' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statsCol: { flex: 1 },
  monName: { fontWeight: '900', fontSize: 16, color: '#2d3436' },
  stat: { fontWeight: '800', fontSize: 13, color: '#4a5568' },
  missingBox: {
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#ffc107',
  },
  missingLine: { fontWeight: '800', fontSize: 13, color: '#856404', marginBottom: 4 },
  devUrl: { fontSize: 11, color: '#95a5a6', textAlign: 'center', marginBottom: 10, paddingHorizontal: 8 },
  err: { color: '#c0392b', fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  back: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffd166',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    marginTop: 8,
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
    marginBottom: 8,
  },
  leaveTxt: { fontWeight: '900', fontSize: 16, color: '#fff' },
});
