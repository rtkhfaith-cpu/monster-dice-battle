import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import MonsterPreview from './MonsterPreview';
import OnlineLobbyBackground from './OnlineLobbyBackground';
import {
  createOnlineRoom,
  disconnectOnline,
  ensureOnlineSocket,
  getConfiguredServerUrl,
  getOnlineSocket,
  joinOnlineRoom,
  leaveOnlineRoom,
  subscribeOnline,
  syncOnlineProfile,
} from '../utils/onlineSocketManager';
import { loadOnlineSession } from '../utils/onlineSession';
import {
  devOnlineLog,
  getConnectionBanner,
  getWaitingRoomStatus,
  toUserOnlineError,
} from '../utils/onlineUserMessages';
import { unlockBattleAudio } from '../utils/battleAudio';
import { playUiSfx } from '../utils/sounds';
import { isMobileLayout } from '../utils/responsive';

function ConnectionPill({ banner, pulseAnim }) {
  const isPulse = banner.tone === 'pulse';
  const scale = pulseAnim
    ? pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] })
    : 1;
  const toneStyle =
    banner.tone === 'ok'
      ? styles.pillOk
      : banner.tone === 'warn'
        ? styles.pillWarn
        : banner.tone === 'err'
          ? styles.pillErr
          : styles.pillNeutral;

  return (
    <Animated.View style={[styles.connPill, toneStyle, isPulse && { transform: [{ scale }] }]}>
      <Text style={styles.connIcon}>{banner.icon}</Text>
      <View style={styles.connTextCol}>
        <Text style={styles.connLabel}>{banner.label}</Text>
        {banner.sub ? <Text style={styles.connSub}>{banner.sub}</Text> : null}
      </View>
    </Animated.View>
  );
}

function LobbyActionBtn({ icon, label, sub, onPress, disabled, variant = 'primary', compact }) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionBtn,
        compact && styles.actionBtnCompact,
        variant === 'secondary' && styles.actionBtnSecondary,
        variant === 'ghost' && styles.actionBtnGhost,
        variant === 'disabled' && styles.actionBtnDisabled,
        pressed && !disabled && styles.actionBtnPressed,
        disabled && styles.actionBtnOff,
      ]}
      onPress={() => {
        if (disabled) return;
        unlockBattleAudio();
        playUiSfx();
        onPress?.();
      }}
      disabled={disabled}
    >
      <Text style={styles.actionIcon}>{icon}</Text>
      <View style={styles.actionTextCol}>
        <Text style={[styles.actionLabel, compact && styles.actionLabelCompact]}>{label}</Text>
        {sub ? <Text style={styles.actionSub}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

function PlayerBattleCard({ label, player, isYou, emptyLabel, waiting }) {
  const prof = player?.profile;
  const parts = prof?.fighter?.monsterParts;
  const joined = !!player?.connected;
  const ready = joined && !!prof?.monsterName;

  return (
    <View style={[styles.slotCard, isYou && styles.slotCardYou, !joined && styles.slotCardEmpty]}>
      <View style={styles.slotHeader}>
        <Text style={styles.slotLabel}>
          {label}
          {isYou ? ' · You' : ''}
        </Text>
        <View style={[styles.onlineDot, joined ? styles.onlineDotOn : styles.onlineDotOff]} />
      </View>

      {!joined && !prof ? (
        <View style={styles.slotWaiting}>
          <Text style={styles.slotWaitEmoji}>{waiting ? '⏳' : '👤'}</Text>
          <Text style={styles.slotWaitTxt}>{emptyLabel}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.slotName}>{prof?.name ?? '—'}</Text>
          {prof ? (
            <View style={styles.slotBody}>
              {parts ? <MonsterPreview parts={parts} size={52} mood="happy" /> : null}
              <View style={styles.slotMeta}>
                <Text style={styles.slotMon} numberOfLines={1}>
                  {prof.monsterName ?? 'No monster'}
                </Text>
                <Text style={styles.slotStat}>
                  Lv {prof.level} · HP {prof.hp}/{prof.maxHp}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.slotHint}>Pick a monster on Home, then return here.</Text>
          )}
          <View style={[styles.readyBadge, ready ? styles.readyOn : styles.readyOff]}>
            <Text style={styles.readyTxt}>{ready ? '✓ READY' : 'NOT READY'}</Text>
          </View>
        </>
      )}
    </View>
  );
}

async function copyRoomCode(code) {
  const text = String(code || '').trim();
  if (!text) return;
  unlockBattleAudio();
  playUiSfx();
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      Alert.alert('Copied!', `Room code ${text} is on your clipboard.`);
      return;
    }
    Alert.alert('Room code', text);
  } catch {
    Alert.alert('Room code', text);
  }
}

/**
 * Online battle lobby — social, animated, player-friendly (no dev error strings in UI).
 */
export default function OnlineLobbyScreen({
  onBackHome,
  onBattleStart,
  buildProfilePayload,
  mySlot: mySlotProp,
  initialView = 'menu',
}) {
  const { width } = useWindowDimensions();
  const mobile = isMobileLayout(width);
  const configured = getConfiguredServerUrl().length > 5;

  const [view, setView] = useState(initialView);
  const [joinOpen, setJoinOpen] = useState(false);
  const [status, setStatus] = useState(configured ? 'connecting' : 'no_env');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [mySlot, setMySlot] = useState(mySlotProp || loadOnlineSession()?.playerSlot || null);
  const [err, setErr] = useState('');
  const [opponentLeft, setOpponentLeft] = useState('');
  const [busy, setBusy] = useState(false);
  const [connectKey, setConnectKey] = useState(0);

  const pulseAnim = useRef(new Animated.Value(0)).current;
  const waitDots = useRef(new Animated.Value(0)).current;

  const refreshProfile = useCallback(() => {
    const payload = buildProfilePayload?.();
    if (payload) syncOnlineProfile(payload);
  }, [buildProfilePayload]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(waitDots, { toValue: 1, duration: 1200, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [waitDots]);

  const runConnect = useCallback(() => {
    if (!configured) {
      setStatus('no_env');
      return;
    }
    setStatus('connecting');
    setErr('');
    ensureOnlineSocket().then(({ error, url }) => {
      if (error) {
        devOnlineLog('connect failed', error, url);
        setStatus('fail');
        setErr(toUserOnlineError(error));
        return;
      }
      setStatus('connected');
      setErr('');
      refreshProfile();
      playUiSfx();
      const session = loadOnlineSession();
      if (session?.roomCode) {
        setView('waiting');
        setRoomCodeInput(session.roomCode);
        setMySlot(session.playerSlot);
      }
    });
  }, [configured, refreshProfile]);

  useEffect(() => {
    runConnect();
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
  }, [configured, connectKey, onBattleStart, runConnect]);

  useEffect(() => {
    const sock = getOnlineSocket();
    if (!sock || !configured) return undefined;
    const onSockConnect = () => {
      setStatus('connected');
      setErr('');
    };
    const onSockDisconnect = () => {
      setStatus((prev) => (prev === 'connected' ? 'connecting' : prev));
    };
    sock.on('connect', onSockConnect);
    sock.on('disconnect', onSockDisconnect);
    return () => {
      sock.off('connect', onSockConnect);
      sock.off('disconnect', onSockDisconnect);
    };
  }, [configured, connectKey]);

  function handleRetryConnect() {
    disconnectOnline();
    setConnectKey((k) => k + 1);
  }

  useEffect(() => {
    if (view === 'waiting') refreshProfile();
  }, [view, refreshProfile]);

  const connected = status === 'connected';
  const inRoom = !!roomState?.roomCode;
  const bothJoined = !!roomState?.bothJoined;
  const missing = roomState?.missingRequirements ?? [];
  const starting = bothJoined && missing.length === 0 && roomState?.status === 'lobby';
  const userErr = err ? toUserOnlineError(err) : null;

  const connBanner = getConnectionBanner(configured, status);
  const waitStatus = getWaitingRoomStatus({
    configured,
    status,
    inRoom,
    opponentLeft,
    bothJoined,
    missing,
    roomStatus: roomState?.status,
    battleStarting: starting || roomState?.status === 'battle',
  });

  async function handleCreate() {
    setErr('');
    setBusy(true);
    refreshProfile();
    const res = await createOnlineRoom();
    setBusy(false);
    if (res.error) {
      setErr(toUserOnlineError(res.error));
      return;
    }
    playUiSfx();
    setMySlot(res.playerSlot);
    setView('waiting');
    refreshProfile();
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
    if (res.error) {
      setErr(toUserOnlineError(res.error));
      return;
    }
    playUiSfx();
    setJoinOpen(false);
    setMySlot(res.playerSlot);
    setView('waiting');
    refreshProfile();
  }

  function handleLeave() {
    playUiSfx();
    leaveOnlineRoom();
    setRoomState(null);
    setMySlot(null);
    setOpponentLeft('');
    setView('menu');
    setJoinOpen(false);
  }

  const waitOpacity = waitDots.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] });

  const waitingRoom = (
    <View style={[styles.card, mobile && styles.cardMobile]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>⚔ Battle Lobby</Text>
        <View style={[styles.liveTag, bothJoined && styles.liveTagHot]}>
          <Text style={styles.liveTagTxt}>{bothJoined ? 'LIVE' : 'WAITING'}</Text>
        </View>
      </View>

      <Animated.View style={[styles.waitBanner, { opacity: waitOpacity }]}>
        <Text style={styles.waitIcon}>{waitStatus.icon}</Text>
        <Text style={styles.waitTitle}>{waitStatus.title}</Text>
        <Text style={styles.waitDetail}>{waitStatus.detail}</Text>
      </Animated.View>

      <View style={styles.codeBlock}>
        <Text style={styles.codeLbl}>ROOM CODE</Text>
        <Text style={[styles.codeValue, mobile && styles.codeValueMobile]}>{roomState?.roomCode}</Text>
        <TouchableOpacity style={styles.copyBtn} onPress={() => copyRoomCode(roomState?.roomCode)}>
          <Text style={styles.copyTxt}>📋 Copy code</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.slotsRow, mobile && styles.slotsCol]}>
        <PlayerBattleCard
          label="Player A"
          player={roomState?.players?.p1}
          isYou={mySlot === 'p1'}
          emptyLabel="Waiting for Player A…"
          waiting={!roomState?.players?.p1?.connected}
        />
        <Text style={[styles.vs, mobile && styles.vsMobile]}>VS</Text>
        <PlayerBattleCard
          label="Player B"
          player={roomState?.players?.p2}
          isYou={mySlot === 'p2'}
          emptyLabel={bothJoined ? 'Slot open' : 'Waiting for opponent…'}
          waiting={!bothJoined}
        />
      </View>

      {missing.length > 0 ? (
        <View style={styles.tipBox}>
          {missing.map((m) => (
            <Text key={m} style={styles.tipLine}>
              • {m}
            </Text>
          ))}
        </View>
      ) : null}

      <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
        <Text style={styles.leaveTxt}>Leave Room</Text>
      </TouchableOpacity>
    </View>
  );

  const mainMenu = (
    <View style={[styles.card, mobile && styles.cardMobile]}>
      <Text style={styles.cardTitle}>🌐 Online Battle</Text>
      <Text style={styles.cardSub}>Challenge friends around the world!</Text>

      <LobbyActionBtn
        icon="🏠"
        label="Create Room"
        sub="Host a private battle"
        onPress={handleCreate}
        disabled={!connected || busy}
        compact={mobile}
      />
      <LobbyActionBtn
        icon="🔗"
        label="Join Room"
        sub="Enter a friend's code"
        variant="secondary"
        onPress={() => {
          setJoinOpen(true);
          setErr('');
        }}
        disabled={!connected}
        compact={mobile}
      />
      <LobbyActionBtn
        icon="⚡"
        label="Quick Match"
        sub="Coming soon"
        variant="disabled"
        disabled
        compact={mobile}
      />

      {userErr ? (
        <View style={styles.errBox}>
          <Text style={styles.errTxt}>{userErr}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen}>
      <OnlineLobbyBackground />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, mobile && styles.scrollInnerMobile]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, mobile && styles.heroTitleMobile]}>Multiplayer Arena</Text>
          <Text style={styles.heroSub}>Find an opponent · Share your code · Fight!</Text>
          <ConnectionPill banner={connBanner} pulseAnim={status === 'connecting' ? pulseAnim : null} />
          {(status === 'fail' || status === 'no_env') && (
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetryConnect} activeOpacity={0.88}>
              <Text style={styles.retryTxt}>↻ Retry connection</Text>
            </TouchableOpacity>
          )}
        </View>

        {view === 'waiting' && inRoom ? waitingRoom : mainMenu}

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            unlockBattleAudio();
            playUiSfx();
            onBackHome?.();
          }}
        >
          <Text style={styles.backTxt}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={joinOpen} transparent animationType="fade" onRequestClose={() => setJoinOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setJoinOpen(false)}>
          <Pressable style={[styles.modalCard, mobile && styles.modalCardMobile]} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.modalTitle}>🔗 Join Room</Text>
            <Text style={styles.modalSub}>Enter the 6-letter code from your friend</Text>

            <TextInput
              style={styles.codeInput}
              placeholder="ABC123"
              placeholderTextColor="#95a5a6"
              autoCapitalize="characters"
              maxLength={8}
              value={roomCodeInput}
              onChangeText={(t) => setRoomCodeInput(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              onSubmitEditing={handleJoin}
            />

            {userErr && joinOpen ? <Text style={styles.modalErr}>{userErr}</Text> : null}

            <LobbyActionBtn icon="🎮" label="Join Battle" onPress={handleJoin} disabled={!connected || busy} />
            <TouchableOpacity style={styles.modalCancel} onPress={() => setJoinOpen(false)}>
              <Text style={styles.modalCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, backgroundColor: '#8ecdf5' },
  scroll: { flex: 1 },
  scrollInner: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  scrollInnerMobile: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 40,
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontWeight: '900',
    fontSize: 28,
    color: '#1a3a52',
    textAlign: 'center',
    textShadowColor: 'rgba(255,255,255,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  heroTitleMobile: { fontSize: 24 },
  heroSub: {
    fontWeight: '800',
    fontSize: 14,
    color: '#2d5a7b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  connPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    maxWidth: '100%',
  },
  pillOk: { backgroundColor: 'rgba(232, 248, 238, 0.95)', borderColor: '#5cb88a' },
  pillWarn: { backgroundColor: 'rgba(255, 243, 224, 0.95)', borderColor: '#f0b429' },
  pillErr: { backgroundColor: 'rgba(255, 235, 235, 0.95)', borderColor: '#e74c3c' },
  retryBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#ff9f6b',
    borderWidth: 3,
    borderColor: '#2d3561',
  },
  retryTxt: { fontWeight: '900', fontSize: 14, color: '#1a2a3a', textAlign: 'center' },
  pillNeutral: { backgroundColor: 'rgba(255,255,255,0.92)', borderColor: '#74b9ff' },
  connIcon: { fontSize: 20 },
  connTextCol: { flex: 1, minWidth: 0 },
  connLabel: { fontWeight: '900', fontSize: 14, color: '#1a3a52' },
  connSub: { fontWeight: '700', fontSize: 12, color: '#566573', marginTop: 2 },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#2d5a7b',
    padding: 18,
    shadowColor: '#143050',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  cardMobile: { padding: 14, borderRadius: 16 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitle: {
    fontWeight: '900',
    fontSize: 20,
    color: '#1a3a52',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSub: {
    fontWeight: '700',
    fontSize: 13,
    color: '#566573',
    textAlign: 'center',
    marginBottom: 14,
  },
  liveTag: {
    backgroundColor: '#dfe6e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveTagHot: { backgroundColor: '#ff6b6b' },
  liveTagTxt: { fontWeight: '900', fontSize: 10, color: '#1a3a52' },
  waitBanner: {
    alignItems: 'center',
    backgroundColor: '#e8f4ff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#74b9ff',
  },
  waitIcon: { fontSize: 28, marginBottom: 4 },
  waitTitle: { fontWeight: '900', fontSize: 16, color: '#1a5276' },
  waitDetail: { fontWeight: '700', fontSize: 13, color: '#566573', textAlign: 'center', marginTop: 4 },
  codeBlock: {
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#0984e3',
  },
  codeLbl: { fontWeight: '900', fontSize: 11, color: '#636e72', letterSpacing: 2 },
  codeValue: {
    fontWeight: '900',
    fontSize: 38,
    color: '#0984e3',
    letterSpacing: 6,
    marginVertical: 6,
  },
  codeValueMobile: { fontSize: 32, letterSpacing: 4 },
  copyBtn: {
    backgroundColor: '#74b9ff',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
    minHeight: 44,
    justifyContent: 'center',
  },
  copyTxt: { fontWeight: '900', fontSize: 14, color: '#1b1b2f' },
  slotsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  slotsCol: { flexDirection: 'column', alignItems: 'stretch' },
  vs: {
    fontWeight: '900',
    fontSize: 16,
    color: '#c0392b',
    alignSelf: 'center',
    marginVertical: 36,
  },
  vsMobile: { marginVertical: 4 },
  slotCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d8e2ef',
    padding: 10,
  },
  slotCardYou: { borderColor: '#0984e3', backgroundColor: '#eef6ff' },
  slotCardEmpty: { borderStyle: 'dashed' },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotLabel: { fontWeight: '900', fontSize: 11, color: '#636e72', textTransform: 'uppercase' },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineDotOn: { backgroundColor: '#2ecc71' },
  onlineDotOff: { backgroundColor: '#bdc3c7' },
  slotWaiting: { alignItems: 'center', paddingVertical: 16 },
  slotWaitEmoji: { fontSize: 32 },
  slotWaitTxt: { fontWeight: '800', fontSize: 13, color: '#e67e22', marginTop: 6, textAlign: 'center' },
  slotName: { fontWeight: '900', fontSize: 16, color: '#1a1a2e', marginTop: 4, marginBottom: 6 },
  slotBody: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotMeta: { flex: 1, minWidth: 0 },
  slotMon: { fontWeight: '900', fontSize: 14, color: '#2d3436' },
  slotStat: { fontWeight: '700', fontSize: 11, color: '#636e72', marginTop: 2 },
  slotHint: { fontWeight: '700', fontSize: 12, color: '#e67e22', fontStyle: 'italic' },
  readyBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  readyOn: { backgroundColor: '#d4edda' },
  readyOff: { backgroundColor: '#fde8e6' },
  readyTxt: { fontWeight: '900', fontSize: 10, color: '#1a3a52' },
  tipBox: {
    backgroundColor: '#fff8e6',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#f4c56a',
  },
  tipLine: { fontWeight: '800', fontSize: 12, color: '#856404', marginBottom: 3 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#8ac926',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    minHeight: 56,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  actionBtnCompact: { minHeight: 52, paddingVertical: 12 },
  actionBtnSecondary: { backgroundColor: '#74b9ff' },
  actionBtnGhost: { backgroundColor: '#fff' },
  actionBtnDisabled: { backgroundColor: '#ecf0f1', opacity: 0.85 },
  actionBtnPressed: { transform: [{ translateY: 2 }], opacity: 0.92 },
  actionBtnOff: { opacity: 0.45 },
  actionIcon: { fontSize: 26 },
  actionTextCol: { flex: 1, minWidth: 0 },
  actionLabel: { fontWeight: '900', fontSize: 17, color: '#1b1b2f' },
  actionLabelCompact: { fontSize: 16 },
  actionSub: { fontWeight: '700', fontSize: 12, color: '#3d4f63', marginTop: 2 },
  errBox: {
    backgroundColor: '#fde8e6',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  errTxt: { fontWeight: '800', fontSize: 13, color: '#c0392b', textAlign: 'center' },
  leaveBtn: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  leaveTxt: { fontWeight: '900', fontSize: 15, color: '#fff' },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2d5a7b',
    minHeight: 48,
    justifyContent: 'center',
  },
  backTxt: { fontWeight: '900', fontSize: 15, color: '#1a3a52' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(26, 58, 82, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#2d5a7b',
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  modalCardMobile: { padding: 16 },
  modalTitle: { fontWeight: '900', fontSize: 22, color: '#1a3a52', textAlign: 'center' },
  modalSub: { fontWeight: '700', fontSize: 13, color: '#566573', textAlign: 'center', marginVertical: 10 },
  codeInput: {
    borderWidth: 3,
    borderColor: '#0984e3',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: 6,
    textAlign: 'center',
    backgroundColor: '#f0f7ff',
    color: '#1a3a52',
    marginBottom: 12,
    minHeight: 56,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  modalErr: {
    color: '#c0392b',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 13,
  },
  modalCancel: { alignSelf: 'center', paddingVertical: 10, marginTop: 4 },
  modalCancelTxt: { fontWeight: '900', fontSize: 15, color: '#0984e3' },
});
