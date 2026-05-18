import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { getSocketConfigDebug, loadSocketConfig } from '../utils/socketConfig';
import { loadOnlineSession } from '../utils/onlineSession';
import {
  devOnlineLog,
  getConnectionBanner,
  getRoomPlayerCountLabel,
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

async function copyRoomCode(code, onNotice) {
  const text = String(code || '').trim();
  if (!text) return;
  unlockBattleAudio();
  playUiSfx();
  const showCopied = (title, message) => onNotice?.(title, message);
  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showCopied('Copied!', `Room code ${text} is on your clipboard.`);
      return;
    }
    showCopied('Room code', text);
  } catch {
    showCopied('Room code', text);
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
  onNotice,
}) {
  const { width } = useWindowDimensions();
  const mobile = isMobileLayout(width);
  const [serverUrl, setServerUrl] = useState(() => getConfiguredServerUrl());
  const configured = serverUrl.length > 5;

  const [view, setView] = useState(initialView);
  const [joinOpen, setJoinOpen] = useState(false);
  const [status, setStatus] = useState('connecting');
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
    setStatus('connecting');
    setErr('');
    loadSocketConfig().then((url) => {
      setServerUrl(url || '');
      if (!url || url.length <= 5) {
        setStatus('no_env');
        return;
      }
      ensureOnlineSocket().then(({ error, url: resolved }) => {
        if (error) {
          devOnlineLog('connect failed', error, resolved, getSocketConfigDebug());
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
    });
  }, [refreshProfile]);

  useEffect(() => {
    runConnect();
  }, [connectKey, runConnect]);

  useEffect(() => {
    return subscribeOnline((st, meta) => {
      setRoomState(st);
      if (st?.roomCode) {
        setView('waiting');
        setRoomCodeInput(st.roomCode);
      }
      const session = loadOnlineSession();
      if (session?.playerSlot) setMySlot(session.playerSlot);
      if (meta?.opponentLeft) setOpponentLeft(meta.opponentLeft);
      const count =
        typeof st?.playerCount === 'number' ? st.playerCount : null;
      if (count !== null) {
        devOnlineLog('room state from server', st?.roomCode, 'players', count, '/2', 'status', st?.status);
      }
      const inBattle =
        st?.status === 'battle' &&
        st.battle &&
        (typeof st.playerCount === 'number' ? st.playerCount >= 2 : !!st.bothJoined);
      if (inBattle && onBattleStart) {
        onBattleStart(st);
      }
    });
  }, [onBattleStart]);

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
  const playerCountLabel = inRoom ? getRoomPlayerCountLabel(roomState) : null;
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
    if (!res.roomCode) {
      setErr('Could not create a room. Try again.');
      return;
    }
    playUiSfx();
    setMySlot(res.playerSlot);
    setRoomCodeInput(res.roomCode);
    if (res.room) setRoomState(res.room);
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
        <View style={styles.cardHeaderRight}>
          {playerCountLabel ? (
            <View style={styles.playerCountPill}>
              <Text style={styles.playerCountPillTxt}>{playerCountLabel}</Text>
            </View>
          ) : null}
          <View style={[styles.liveTag, bothJoined && styles.liveTagHot]}>
            <Text style={styles.liveTagTxt}>{bothJoined ? 'LIVE' : 'WAITING'}</Text>
          </View>
        </View>
      </View>

      <Animated.View style={[styles.waitBanner, { opacity: waitOpacity }]}>
        <Text style={styles.waitIcon}>{waitStatus.icon}</Text>
        <Text style={styles.waitTitle}>{waitStatus.title}</Text>
        <Text style={styles.waitDetail}>{waitStatus.detail}</Text>
      </Animated.View>

      <View style={styles.codeBlock}>
        <Text style={styles.codeLbl}>ROOM CODE</Text>
        {playerCountLabel ? (
          <Text style={styles.codePlayerCount}>{playerCountLabel}</Text>
        ) : null}
        <Text style={[styles.codeValue, mobile && styles.codeValueMobile]}>
          {roomState?.roomCode || roomCodeInput || '—'}
        </Text>
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={() => copyRoomCode(roomState?.roomCode || roomCodeInput, onNotice)}
        >
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
          setRoomCodeInput('');
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
          {inRoom && playerCountLabel ? (
            <View style={styles.heroPlayerCount}>
              <Text style={styles.heroPlayerCountTxt}>👥 {playerCountLabel}</Text>
            </View>
          ) : null}
          {(status === 'fail' || status === 'no_env') && configured ? (
            <Text style={styles.serverHint} numberOfLines={2}>
              Server: {serverUrl}
            </Text>
          ) : null}
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
  screen: { flex: 1, minHeight: 0, backgroundColor: '#081324' },
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
    color: '#fff4cf',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.78)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 5,
  },
  heroTitleMobile: { fontSize: 24 },
  heroSub: {
    fontWeight: '800',
    fontSize: 14,
    color: '#bfdbfe',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  heroPlayerCount: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(92, 57, 143, 0.96)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#d8b4fe',
  },
  heroPlayerCountTxt: { fontWeight: '900', fontSize: 15, color: '#fff' },
  serverHint: {
    marginTop: 8,
    fontWeight: '700',
    fontSize: 12,
    color: '#bfdbfe',
    textAlign: 'center',
    maxWidth: 320,
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
  pillOk: { backgroundColor: 'rgba(18, 83, 45, 0.94)', borderColor: '#86efac' },
  pillWarn: { backgroundColor: 'rgba(255, 243, 224, 0.95)', borderColor: '#f0b429' },
  pillErr: { backgroundColor: 'rgba(255, 235, 235, 0.95)', borderColor: '#e74c3c' },
  retryBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    borderWidth: 2,
    borderColor: '#efd17a',
  },
  retryTxt: { fontWeight: '900', fontSize: 14, color: '#fff8dd', textAlign: 'center' },
  pillNeutral: { backgroundColor: 'rgba(14, 28, 52, 0.88)', borderColor: 'rgba(255,224,138,0.36)' },
  connIcon: { fontSize: 20 },
  connTextCol: { flex: 1, minWidth: 0 },
  connLabel: { fontWeight: '900', fontSize: 14, color: '#fff4cf' },
  connSub: { fontWeight: '800', fontSize: 12, color: '#bfdbfe', marginTop: 2 },
  card: {
    width: '100%',
    backgroundColor: 'rgba(11, 24, 48, 0.94)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#b9843b',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  cardMobile: { padding: 14, borderRadius: 16 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  playerCountPill: {
    backgroundColor: 'rgba(92, 57, 143, 0.96)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#d8b4fe',
  },
  playerCountPillTxt: { fontWeight: '900', fontSize: 11, color: '#fff' },
  cardTitle: {
    fontWeight: '900',
    fontSize: 20,
    color: '#fff4cf',
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSub: {
    fontWeight: '700',
    fontSize: 13,
    color: '#bfdbfe',
    textAlign: 'center',
    marginBottom: 14,
  },
  liveTag: {
    backgroundColor: 'rgba(42, 58, 86, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveTagHot: { backgroundColor: 'rgba(127, 29, 29, 0.92)' },
  liveTagTxt: { fontWeight: '900', fontSize: 10, color: '#fff4cf' },
  waitBanner: {
    alignItems: 'center',
    backgroundColor: 'rgba(14, 28, 52, 0.82)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.32)',
  },
  waitIcon: { fontSize: 28, marginBottom: 4 },
  waitTitle: { fontWeight: '900', fontSize: 16, color: '#fff4cf' },
  waitDetail: { fontWeight: '800', fontSize: 13, color: '#bfdbfe', textAlign: 'center', marginTop: 4 },
  codeBlock: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 17, 32, 0.76)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.42)',
  },
  codeLbl: { fontWeight: '900', fontSize: 11, color: '#f4e3bd', letterSpacing: 2 },
  codePlayerCount: {
    fontWeight: '900',
    fontSize: 14,
    color: '#c4b5fd',
    marginTop: 6,
    marginBottom: 2,
  },
  codeValue: {
    fontWeight: '900',
    fontSize: 38,
    color: '#fcd34d',
    letterSpacing: 6,
    marginVertical: 6,
  },
  codeValueMobile: { fontSize: 32, letterSpacing: 4 },
  copyBtn: {
    backgroundColor: 'rgba(92, 57, 143, 0.96)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d8b4fe',
    minHeight: 44,
    justifyContent: 'center',
  },
  copyTxt: { fontWeight: '900', fontSize: 14, color: '#fff8dd' },
  slotsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  slotsCol: { flexDirection: 'column', alignItems: 'stretch' },
  vs: {
    fontWeight: '900',
    fontSize: 16,
    color: '#fcd34d',
    alignSelf: 'center',
    marginVertical: 36,
  },
  vsMobile: { marginVertical: 4 },
  slotCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(14, 28, 52, 0.82)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.28)',
    padding: 10,
  },
  slotCardYou: { borderColor: '#d8b4fe', backgroundColor: 'rgba(39, 31, 78, 0.86)' },
  slotCardEmpty: { borderStyle: 'dashed' },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotLabel: { fontWeight: '900', fontSize: 11, color: '#f4e3bd', textTransform: 'uppercase' },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  onlineDotOn: { backgroundColor: '#2ecc71' },
  onlineDotOff: { backgroundColor: '#64748b' },
  slotWaiting: { alignItems: 'center', paddingVertical: 16 },
  slotWaitEmoji: { fontSize: 32 },
  slotWaitTxt: { fontWeight: '900', fontSize: 13, color: '#fcd34d', marginTop: 6, textAlign: 'center' },
  slotName: { fontWeight: '900', fontSize: 16, color: '#fff4cf', marginTop: 4, marginBottom: 6 },
  slotBody: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotMeta: { flex: 1, minWidth: 0 },
  slotMon: { fontWeight: '900', fontSize: 14, color: '#fff4cf' },
  slotStat: { fontWeight: '800', fontSize: 11, color: '#bfdbfe', marginTop: 2 },
  slotHint: { fontWeight: '800', fontSize: 12, color: '#fcd34d', fontStyle: 'italic' },
  readyBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  readyOn: { backgroundColor: 'rgba(22, 101, 52, 0.82)' },
  readyOff: { backgroundColor: 'rgba(127, 29, 29, 0.72)' },
  readyTxt: { fontWeight: '900', fontSize: 10, color: '#fff4cf' },
  tipBox: {
    backgroundColor: 'rgba(74, 48, 24, 0.42)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.4)',
  },
  tipLine: { fontWeight: '800', fontSize: 12, color: '#fde68a', marginBottom: 3 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#efd17a',
    borderBottomWidth: 5,
    borderBottomColor: '#31551f',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    minHeight: 56,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  actionBtnCompact: { minHeight: 52, paddingVertical: 12 },
  actionBtnSecondary: { backgroundColor: 'rgba(92, 57, 143, 0.96)', borderColor: '#d8b4fe', borderBottomColor: '#4c2878' },
  actionBtnGhost: { backgroundColor: 'rgba(42, 58, 86, 0.9)' },
  actionBtnDisabled: { backgroundColor: 'rgba(71, 85, 105, 0.7)', opacity: 0.85, borderColor: '#64748b', borderBottomColor: '#334155' },
  actionBtnPressed: { transform: [{ translateY: 2 }], opacity: 0.92 },
  actionBtnOff: { opacity: 0.45 },
  actionIcon: { fontSize: 26 },
  actionTextCol: { flex: 1, minWidth: 0 },
  actionLabel: { fontWeight: '900', fontSize: 17, color: '#fff8dd' },
  actionLabelCompact: { fontSize: 16 },
  actionSub: { fontWeight: '800', fontSize: 12, color: '#d9f7ff', marginTop: 2 },
  errBox: {
    backgroundColor: 'rgba(127, 29, 29, 0.36)',
    borderRadius: 10,
    padding: 10,
    marginTop: 4,
    borderWidth: 2,
    borderColor: '#fca5a5',
  },
  errTxt: { fontWeight: '800', fontSize: 13, color: '#fecaca', textAlign: 'center' },
  leaveBtn: {
    backgroundColor: 'rgba(127, 29, 29, 0.88)',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fecaca',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  leaveTxt: { fontWeight: '900', fontSize: 15, color: '#fff' },
  backBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(74, 48, 24, 0.84)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.62)',
    minHeight: 48,
    justifyContent: 'center',
  },
  backTxt: { fontWeight: '900', fontSize: 15, color: '#fff1bc' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.74)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0b1830',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#b9843b',
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  modalCardMobile: { padding: 16 },
  modalTitle: { fontWeight: '900', fontSize: 22, color: '#fff4cf', textAlign: 'center' },
  modalSub: { fontWeight: '800', fontSize: 13, color: '#bfdbfe', textAlign: 'center', marginVertical: 10 },
  codeInput: {
    borderWidth: 3,
    borderColor: '#b9843b',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: 6,
    textAlign: 'center',
    backgroundColor: 'rgba(7, 17, 32, 0.76)',
    color: '#fcd34d',
    marginBottom: 12,
    minHeight: 56,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  modalErr: {
    color: '#fecaca',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 13,
  },
  modalCancel: { alignSelf: 'center', paddingVertical: 10, marginTop: 4 },
  modalCancelTxt: { fontWeight: '900', fontSize: 15, color: '#ffe08a' },
});
