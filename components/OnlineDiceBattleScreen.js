import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import BattleDiceButton from './BattleDiceButton';
import ConfirmDialog from './ConfirmDialog';
import RpgBattleArena from './RpgBattleArena';
import { isMobileLayout } from '../utils/battleLayout';
import {
  isBattleMuted,
  startBattleMusic,
  stopBattleMusic,
  toggleBattleMuted,
  unlockBattleAudio,
} from '../utils/battleAudio';
import { playUiSfx } from '../utils/sounds';
import { BATTLE } from '../utils/gameTheme';

function fighterFromServer(f) {
  if (!f?.stats) return null;
  const parts = f.monsterParts && typeof f.monsterParts === 'object' ? f.monsterParts : {};
  return {
    ...f,
    monsterParts: {
      ...parts,
      cosmetics: Array.isArray(parts.cosmetics) ? parts.cosmetics : [],
    },
    hp: typeof f.hp === 'number' ? f.hp : f.stats.hp,
    maxHp: typeof f.maxHp === 'number' ? f.maxHp : f.stats.hp,
    mp: typeof f.mp === 'number' ? f.mp : f.stats.mp,
    maxMp: typeof f.maxMp === 'number' ? f.maxMp : f.stats.mp,
    combo: f.combo ?? 0,
    displayName: f.displayName || 'Monster',
    element: f.element ?? 'earth',
    level: f.level ?? 1,
    battleExp: f.battleExp ?? 0,
    battleExpToNext: f.battleExpToNext ?? 36,
    status: f.status ?? null,
  };
}

function activeTurnFromSnapshot(snap) {
  if (!snap) return 1;
  if (snap.phase === 'player1Dice') return 1;
  if (snap.phase === 'player2Dice') return 2;
  if (snap.phase === 'chooseAttack') return snap.attackerId ?? 1;
  if (snap.phase === 'chooseDefense') return (snap.attackerId === 1 ? 2 : 1);
  return snap.attackerId ?? 1;
}

/**
 * Server-authoritative online dice battle — HP/state from socket snapshot only.
 */
export default function OnlineDiceBattleScreen({
  mySlot = 'p1',
  snapshot = null,
  activeTurn: activeTurnProp = null,
  emitAction,
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  onFinish,
  onFlee,
  onExitBattle,
}) {
  const myPlayerId = mySlot === 'p2' ? 2 : 1;
  const labelP1 = player1Name || 'Player 1';
  const labelP2 = player2Name || 'Player 2';

  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [phase, setPhase] = useState('player1Dice');
  const [round, setRound] = useState(1);
  const [diceP1, setDiceP1] = useState(null);
  const [diceP2, setDiceP2] = useState(null);
  const [attackerId, setAttackerId] = useState(null);
  const [bannerMessage, setBannerMessage] = useState('Roll your dice!');
  const [audioMuted, setAudioMuted] = useState(() => isBattleMuted());
  const [diceRolling, setDiceRolling] = useState(false);
  const [pendingRollValue, setPendingRollValue] = useState(1);
  const [actionError, setActionError] = useState('');
  const [runConfirmOpen, setRunConfirmOpen] = useState(false);

  const lastSeqRef = useRef(0);
  const finishedRef = useRef(false);
  const prevPhaseRef = useRef('player1Dice');

  const { width, height } = useWindowDimensions();
  const battleMobile = isMobileLayout(width, height);

  const activeTurn = activeTurnProp ?? activeTurnFromSnapshot(snapshot);

  useEffect(() => () => stopBattleMusic(), []);

  useEffect(() => {
    if (!snapshot) return;
    const seq = snapshot.seq ?? 0;
    if (seq > 0 && seq < lastSeqRef.current) return;
    lastSeqRef.current = Math.max(lastSeqRef.current, seq);

    const nextP1 = fighterFromServer(snapshot.p1);
    const nextP2 = fighterFromServer(snapshot.p2);
    if (nextP1) setP1(nextP1);
    if (nextP2) setP2(nextP2);
    if (snapshot.phase) setPhase(snapshot.phase);
    if (typeof snapshot.round === 'number') setRound(snapshot.round);
    if (snapshot.diceP1 !== undefined) setDiceP1(snapshot.diceP1);
    if (snapshot.diceP2 !== undefined) setDiceP2(snapshot.diceP2);
    if (snapshot.attackerId !== undefined) setAttackerId(snapshot.attackerId);
    if (snapshot.bannerMessage) setBannerMessage(snapshot.bannerMessage);

    if (snapshot.phase && snapshot.phase !== prevPhaseRef.current) {
      prevPhaseRef.current = snapshot.phase;
      if (snapshot.phase === 'player1Dice' || snapshot.phase === 'player2Dice') {
        setDiceRolling(false);
      }
    }

    if (snapshot.winner && !finishedRef.current) {
      finishedRef.current = true;
      const myId = myPlayerId;
      const outcome =
        snapshot.winner === 'draw' ? 'draw' : snapshot.winner === myId ? myId : myId === 1 ? 2 : 1;
      onFinish?.({
        winner: outcome,
        player1Snapshot: nextP1,
        player2Snapshot: nextP2,
        battleExtras: { mode: 'online', online: true },
      });
    }
  }, [snapshot, myPlayerId, onFinish]);

  const isDicePhase = phase === 'player1Dice' || phase === 'player2Dice';
  const isMyDiceTurn =
    (phase === 'player1Dice' && myPlayerId === 1) || (phase === 'player2Dice' && myPlayerId === 2);
  const canRollDice = isDicePhase && isMyDiceTurn && !diceRolling;
  const isAttacker = phase === 'chooseAttack' && attackerId === myPlayerId;
  const isDefender = phase === 'chooseDefense' && attackerId !== myPlayerId;

  const actionHint = useMemo(() => {
    if (actionError) return actionError;
    if (phase === 'player1Dice' || phase === 'player2Dice') {
      return isMyDiceTurn ? 'Tap your die to ROLL' : 'Waiting for opponent to roll…';
    }
    if (phase === 'chooseAttack') {
      return isAttacker ? 'Pick Fight or Magic' : 'Opponent is attacking…';
    }
    if (phase === 'chooseDefense') {
      return isDefender ? 'Defend or Dodge!' : 'Waiting for defense…';
    }
    if (phase === 'resolveAttack') return bannerMessage || 'Resolving attack…';
    return bannerMessage || '';
  }, [phase, isMyDiceTurn, isAttacker, isDefender, bannerMessage, actionError]);

  function tapUi() {
    unlockBattleAudio();
    startBattleMusic();
    playUiSfx();
  }

  async function submit(action, payload = {}) {
    if (!emitAction) return;
    setActionError('');
    const res = await emitAction(action, payload);
    if (res?.error) {
      setActionError(res.error);
    }
  }

  function handleRollPress() {
    if (!canRollDice) return;
    tapUi();
    const expected =
      phase === 'player1Dice' ? snapshot?.diceP1 : phase === 'player2Dice' ? snapshot?.diceP2 : null;
    const preview = typeof expected === 'number' ? expected : Math.floor(Math.random() * 6) + 1;
    setPendingRollValue(preview);
    setDiceRolling(true);
    void submit('rollDice');
  }

  function onDiceRollComplete() {
    setDiceRolling(false);
  }

  function handleRun() {
    if (diceRolling) return;
    tapUi();
    setRunConfirmOpen(true);
  }

  function confirmFlee() {
    setRunConfirmOpen(false);
    finishedRef.current = true;
    stopBattleMusic();
    onFlee?.();
  }

  function handleMutePress() {
    tapUi();
    setAudioMuted(toggleBattleMuted());
  }

  if (!p1 || !p2) {
    return (
      <View style={styles.root}>
        <Text style={styles.loadingTxt}>Loading battle…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ConfirmDialog
        visible={runConfirmOpen}
        title="Flee battle?"
        message="You will leave the room and return home. Your opponent will be notified."
        confirmLabel="Flee"
        cancelLabel="Stay"
        destructive
        onCancel={() => setRunConfirmOpen(false)}
        onConfirm={confirmFlee}
      />

      <View style={styles.battleFrame}>
        <View style={styles.arenaField}>
          <RpgBattleArena
            topHudExtra={
              <TouchableOpacity style={styles.muteBtn} onPress={handleMutePress}>
                <Text style={styles.muteBtnTxt}>{audioMuted ? '🔇' : '🔊'}</Text>
              </TouchableOpacity>
            }
            p1={p1}
            p2={p2}
            p1Mood="neutral"
            p2Mood="neutral"
            p1Pose="idle"
            p2Pose="idle"
            activeTurn={activeTurn}
            round={round}
            turnBadge={`R${round}`}
            player1Label={labelP1}
            player2Label={labelP2}
          />
        </View>

        <View style={[styles.actionDock, battleMobile && styles.actionDockMobile]}>
          <Text style={[styles.banner, actionError ? styles.bannerErr : null]} numberOfLines={2}>
            {actionHint}
          </Text>

          {(isDicePhase || diceP1 != null || diceP2 != null) && (
            <View style={styles.diceRow}>
              <BattleDiceButton
                tagLabel={labelP1}
                rolling={diceRolling && phase === 'player1Dice' && myPlayerId === 1}
                rollValue={pendingRollValue}
                shownValue={diceP1}
                canRoll={phase === 'player1Dice' && myPlayerId === 1 && canRollDice}
                active={phase === 'player1Dice'}
                dimmed={phase !== 'player1Dice'}
                onPress={myPlayerId === 1 ? handleRollPress : undefined}
                onRollComplete={onDiceRollComplete}
                size={battleMobile ? 64 : 72}
                compact={battleMobile}
              />
              <Text style={styles.vsTxt}>VS</Text>
              <BattleDiceButton
                tagLabel={labelP2}
                rolling={diceRolling && phase === 'player2Dice' && myPlayerId === 2}
                rollValue={pendingRollValue}
                shownValue={diceP2}
                canRoll={phase === 'player2Dice' && myPlayerId === 2 && canRollDice}
                active={phase === 'player2Dice'}
                dimmed={phase !== 'player2Dice'}
                onPress={myPlayerId === 2 ? handleRollPress : undefined}
                onRollComplete={onDiceRollComplete}
                size={battleMobile ? 64 : 72}
                compact={battleMobile}
              />
            </View>
          )}

          {phase === 'chooseAttack' && isAttacker ? (
            <View style={styles.btnRow}>
              <Pressable style={[styles.btn, styles.fightBtn]} onPress={() => { tapUi(); void submit('pickStrike', { kind: 'normal' }); }}>
                <Text style={styles.btnTxt}>Fight</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.magicBtn]}
                onPress={() => { tapUi(); void submit('pickStrike', { kind: 'magic' }); }}
              >
                <Text style={styles.btnTxt}>Magic</Text>
              </Pressable>
            </View>
          ) : null}

          {phase === 'chooseDefense' && isDefender ? (
            <View style={styles.btnRow}>
              <Pressable
                style={[styles.btn, styles.defendBtn]}
                onPress={() => { tapUi(); void submit('pickDefense', { mode: 'defend' }); }}
              >
                <Text style={styles.btnTxt}>Defend</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.dodgeBtn]}
                onPress={() => { tapUi(); void submit('pickDefense', { mode: 'dodge' }); }}
              >
                <Text style={styles.btnTxt}>Dodge</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.btnRow}>
            <Pressable style={[styles.btn, styles.runBtn]} onPress={handleRun}>
              <Text style={styles.runBtnTxt}>Run</Text>
            </Pressable>
            {onExitBattle ? (
              <Pressable style={[styles.btn, styles.leaveBtn]} onPress={onExitBattle}>
                <Text style={styles.leaveBtnTxt}>Leave</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', minHeight: 0 },
  loadingTxt: { textAlign: 'center', marginTop: 40, fontWeight: '800', fontSize: 16 },
  battleFrame: {
    flex: 1,
    minHeight: 0,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BATTLE.dockBorder,
    overflow: 'hidden',
    backgroundColor: BATTLE.dockBorder,
  },
  arenaField: { flex: 1, minHeight: 0 },
  muteBtn: {
    backgroundColor: 'rgba(26, 26, 46, 0.82)',
    borderWidth: 2,
    borderColor: 'rgba(255, 209, 102, 0.65)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  muteBtnTxt: { fontSize: 16 },
  actionDock: {
    flexShrink: 0,
    backgroundColor: 'rgba(18, 22, 36, 0.98)',
    borderTopWidth: 4,
    borderColor: '#3d4a6a',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  actionDockMobile: { paddingBottom: 16 },
  banner: {
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 14,
    color: '#f8f9fa',
    lineHeight: 20,
  },
  bannerErr: { color: '#ff6b6b' },
  diceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  vsTxt: { fontWeight: '900', fontSize: 16, color: '#ffd166' },
  btnRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  btnTxt: { fontWeight: '900', fontSize: 15, color: '#1b1b2f' },
  fightBtn: { backgroundColor: '#8ac926' },
  magicBtn: { backgroundColor: '#74b9ff' },
  defendBtn: { backgroundColor: '#ffeaa7' },
  dodgeBtn: { backgroundColor: '#dfe6e9' },
  runBtn: { backgroundColor: '#e8ecf1', flex: 0.9 },
  runBtnTxt: { fontWeight: '900', fontSize: 15, color: '#4a5568' },
  leaveBtn: { backgroundColor: '#636e72', flex: 0.9 },
  leaveBtnTxt: { fontWeight: '900', fontSize: 14, color: '#fff' },
});
