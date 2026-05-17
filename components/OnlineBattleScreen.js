import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import BattleProjectileLayer from './BattleProjectileLayer';
import ConfirmDialog from './ConfirmDialog';
import RpgBattleArena from './RpgBattleArena';
import { isMobileLayout } from '../utils/battleLayout';
import { ELEMENT_UI } from '../utils/elements';
import { canAffordSkill, getMagicSkills } from '../utils/monsterSkills';
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
    skills: f.skills ?? null,
    status: f.status ?? null,
  };
}

/**
 * Server-authoritative online battle — turn-based (Fight / Magic / Defend / Run), no dice.
 */
export default function OnlineBattleScreen({
  mySlot = 'p1',
  snapshot = null,
  activeTurn: activeTurnProp = null,
  emitAction,
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  onFinish,
  onFlee,
}) {
  const myPlayerId = mySlot === 'p2' ? 2 : 1;
  const labelP1 = player1Name || 'Player 1';
  const labelP2 = player2Name || 'Player 2';

  const [p1, setP1] = useState(null);
  const [p2, setP2] = useState(null);
  const [phase, setPhase] = useState('chooseAction');
  const [activePlayerId, setActivePlayerId] = useState(1);
  const [round, setRound] = useState(1);
  const [bannerMessage, setBannerMessage] = useState('Choose your move');
  const [menuMode, setMenuMode] = useState('main');
  const [activeAttackEffect, setActiveAttackEffect] = useState(null);
  const [audioMuted, setAudioMuted] = useState(() => isBattleMuted());
  const [actionError, setActionError] = useState('');
  const [runConfirmOpen, setRunConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lastSeqRef = useRef(0);
  const lastEffectSeqRef = useRef(0);
  const finishedRef = useRef(false);

  const { width, height } = useWindowDimensions();
  const battleMobile = isMobileLayout(width, height);

  const activeTurn = activeTurnProp ?? activePlayerId ?? 1;
  const isMyTurn = phase === 'chooseAction' && activePlayerId === myPlayerId;
  const busy = phase === 'resolveAttack' || submitting;
  const actionsEnabled = isMyTurn && !busy;

  const actingFighter = myPlayerId === 1 ? p1 : p2;
  const magicSkills =
    actingFighter?.skills?.magic ?? getMagicSkills(actingFighter?.monsterTemplateId ?? '');

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
    if (typeof snapshot.activePlayerId === 'number') setActivePlayerId(snapshot.activePlayerId);
    if (typeof snapshot.round === 'number') setRound(snapshot.round);
    if (snapshot.bannerMessage) setBannerMessage(snapshot.bannerMessage);

    const eff = snapshot.currentEffect;
    const effSeq = eff?.seq ?? 0;
    if (snapshot.phase === 'resolveAttack' && eff && effSeq > lastEffectSeqRef.current) {
      lastEffectSeqRef.current = effSeq;
      setActiveAttackEffect(eff);
    }
    if (snapshot.phase === 'chooseAction') {
      setActiveAttackEffect(null);
      setMenuMode('main');
    }

    if (snapshot.winner && !finishedRef.current) {
      finishedRef.current = true;
      const outcome =
        snapshot.winner === 'draw' ? 'draw' : snapshot.winner === myPlayerId ? myPlayerId : myPlayerId === 1 ? 2 : 1;
      onFinish?.({
        winner: outcome,
        player1Snapshot: nextP1,
        player2Snapshot: nextP2,
        battleExtras: { mode: 'online', online: true },
      });
    }
  }, [snapshot, myPlayerId, onFinish]);

  const actionHint = useMemo(() => {
    if (actionError) return actionError;
    if (phase === 'chooseAction') {
      return isMyTurn ? 'Choose your move' : `Waiting for ${activePlayerId === 1 ? labelP1 : labelP2}…`;
    }
    if (phase === 'resolveAttack') return bannerMessage || 'Resolving attack…';
    return bannerMessage || '';
  }, [phase, isMyTurn, activePlayerId, labelP1, labelP2, bannerMessage, actionError]);

  function tapUi() {
    unlockBattleAudio();
    startBattleMusic();
    playUiSfx();
  }

  async function submit(action, payload = {}) {
    if (!emitAction || !actionsEnabled) return;
    setSubmitting(true);
    setActionError('');
    const res = await emitAction(action, payload);
    setSubmitting(false);
    if (res?.error) setActionError(res.error);
    else setMenuMode('main');
  }

  function handleProjectileComplete() {
    setActiveAttackEffect(null);
  }

  function handleFight() {
    tapUi();
    void submit('fight');
  }

  function handleMagicOpen() {
    if (!actionsEnabled) return;
    tapUi();
    setMenuMode('magic');
  }

  function handleMagicBack() {
    tapUi();
    setMenuMode('main');
  }

  function handleMagicSkill(skill) {
    if (!skill || !canAffordSkill(actingFighter, skill)) {
      setActionError('Not enough MP!');
      return;
    }
    tapUi();
    void submit('magic', { skillId: skill.id });
  }

  function handleDefend() {
    tapUi();
    void submit('defend');
  }

  function handleRun() {
    if (busy) return;
    tapUi();
    setRunConfirmOpen(true);
  }

  function confirmRun() {
    setRunConfirmOpen(false);
    void submit('run');
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
        title="Give up?"
        message="You will forfeit — your opponent wins."
        confirmLabel="Give up"
        cancelLabel="Keep fighting"
        destructive
        onCancel={() => setRunConfirmOpen(false)}
        onConfirm={confirmRun}
      />

      <View style={styles.battleFrame}>
        <View style={styles.arenaField} pointerEvents="box-none">
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
            activeTurn={busy ? 0 : activeTurn}
            round={round}
            turnBadge={actionHint}
            player1Label={labelP1}
            player2Label={labelP2}
          />
          {phase === 'resolveAttack' && activeAttackEffect ? (
            <BattleProjectileLayer
              effect={activeAttackEffect}
              active
              onComplete={handleProjectileComplete}
            />
          ) : null}
        </View>

        <View style={[styles.actionDock, battleMobile && styles.actionDockMobile]}>
          {menuMode === 'magic' ? (
            <View style={styles.magicPanel}>
              <View style={styles.magicHeader}>
                <Pressable style={styles.magicBackBtn} onPress={handleMagicBack} disabled={busy}>
                  <Text style={styles.magicBackTxt}>← Back</Text>
                </Pressable>
                <Text style={styles.magicMp}>
                  MP {actingFighter?.mp ?? 0}/{actingFighter?.maxMp ?? actingFighter?.stats?.mp ?? 0}
                </Text>
              </View>
              <View style={styles.skillList}>
                {magicSkills.map((sk) => {
                  const ok = canAffordSkill(actingFighter, sk);
                  const el = ELEMENT_UI[sk.element] ?? ELEMENT_UI.earth;
                  return (
                    <Pressable
                      key={sk.id}
                      style={({ pressed }) => [
                        styles.skillBtn,
                        !ok && styles.skillBtnDisabled,
                        pressed && ok && styles.skillBtnPressed,
                      ]}
                      disabled={!actionsEnabled || !ok}
                      onPress={() => handleMagicSkill(sk)}
                    >
                      <Text style={styles.skillEmoji}>{sk.emoji ?? el.emoji}</Text>
                      <View style={styles.skillTextCol}>
                        <Text style={styles.skillName} numberOfLines={1}>
                          {sk.name}
                        </Text>
                        <Text style={styles.skillMeta}>
                          {el.emoji} {sk.mpCost} MP
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={[styles.menuRow, battleMobile && styles.menuRowMobile]}>
              <Pressable
                style={({ pressed }) => [
                  styles.arcadeBtn,
                  battleMobile && styles.arcadeBtnMobile,
                  styles.fightBtn,
                  pressed && actionsEnabled && styles.arcadeBtnPressed,
                  !actionsEnabled && styles.disabledBtn,
                ]}
                disabled={!actionsEnabled}
                onPress={handleFight}
              >
                <View style={[styles.btnFace, battleMobile && styles.btnFaceMobile, styles.fightFace]} pointerEvents="none">
                  <View style={styles.fightBtnShine} />
                  <Text style={[styles.arcadeBtnTxt, battleMobile && styles.arcadeBtnTxtMobile, styles.fightBtnTxt]}>
                    Fight
                  </Text>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.arcadeBtn,
                  battleMobile && styles.arcadeBtnMobile,
                  styles.magicBtnOuter,
                  pressed && actionsEnabled && styles.arcadeBtnPressed,
                  !actionsEnabled && styles.disabledBtn,
                ]}
                disabled={!actionsEnabled}
                onPress={handleMagicOpen}
              >
                <View style={[styles.btnFace, battleMobile && styles.btnFaceMobile, styles.magicFace]} pointerEvents="none">
                  <View style={styles.magicBtnShine} />
                  <Text style={[styles.arcadeBtnTxt, battleMobile && styles.arcadeBtnTxtMobile, styles.magicBtnTxt]}>
                    Magic
                  </Text>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.arcadeBtn,
                  battleMobile && styles.arcadeBtnMobile,
                  styles.defendBtn,
                  pressed && actionsEnabled && styles.arcadeBtnPressed,
                  !actionsEnabled && styles.disabledBtn,
                ]}
                disabled={!actionsEnabled}
                onPress={handleDefend}
              >
                <View style={[styles.btnFace, battleMobile && styles.btnFaceMobile, styles.defendFace]} pointerEvents="none">
                  <View style={styles.defendBtnShine} />
                  <Text style={[styles.arcadeBtnTxt, battleMobile && styles.arcadeBtnTxtMobile, styles.defendBtnTxt]}>
                    Defend
                  </Text>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.arcadeBtn,
                  battleMobile && styles.arcadeBtnMobile,
                  styles.runBtnOuter,
                  pressed && actionsEnabled && styles.arcadeBtnPressed,
                  !actionsEnabled && styles.disabledBtn,
                ]}
                disabled={!actionsEnabled}
                onPress={handleRun}
              >
                <View style={[styles.btnFace, battleMobile && styles.btnFaceMobile, styles.runFace]} pointerEvents="none">
                  <Text style={[styles.arcadeBtnTxt, battleMobile && styles.arcadeBtnTxtMobile, styles.runBtnTxt]}>
                    Run
                  </Text>
                </View>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', minHeight: 0, overflow: 'hidden' },
  loadingTxt: { textAlign: 'center', marginTop: 40, fontWeight: '800', fontSize: 16 },
  battleFrame: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    flexDirection: 'column',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BATTLE.dockBorder,
    overflow: 'hidden',
    backgroundColor: BATTLE.dockBorder,
  },
  arenaField: { flex: 1, minHeight: 0, width: '100%', position: 'relative', overflow: 'hidden' },
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
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 10,
  },
  actionDockMobile: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'web' ? 12 : 10,
  },
  menuRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between', alignItems: 'flex-end' },
  menuRowMobile: { gap: 8, flexWrap: 'nowrap' },
  magicPanel: { gap: 6 },
  magicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  magicBackBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
  },
  magicBackTxt: { color: '#dfe6e9', fontWeight: '800', fontSize: 13 },
  magicMp: { color: '#a29bfe', fontWeight: '900', fontSize: 14 },
  skillList: { gap: 6 },
  skillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(108, 92, 231, 0.35)',
    borderWidth: 2,
    borderColor: '#6c5ce7',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skillBtnPressed: { opacity: 0.9, transform: [{ translateY: 2 }] },
  skillBtnDisabled: { opacity: 0.38, borderColor: '#636e72' },
  skillEmoji: { fontSize: 22 },
  skillTextCol: { flex: 1, minWidth: 0 },
  skillName: { fontWeight: '900', fontSize: 15, color: '#fff' },
  skillMeta: { fontWeight: '700', fontSize: 12, color: '#dfe6e9', marginTop: 2 },
  magicBtnOuter: { flex: 1 },
  magicFace: {
    backgroundColor: '#9b59b6',
    borderColor: '#6c3483',
    borderBottomWidth: 5,
    borderBottomColor: '#5b2c6f',
  },
  magicBtnShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  magicBtnTxt: { color: '#f8f0ff', fontSize: 15 },
  arcadeBtn: { flex: 1, minWidth: 76, borderRadius: 14, paddingBottom: 5, overflow: 'visible' },
  arcadeBtnMobile: { minWidth: 0, flex: 1, maxWidth: '25%' },
  arcadeBtnPressed: { paddingBottom: 1, transform: [{ translateY: 4 }] },
  btnFace: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    elevation: 8,
  },
  btnFaceMobile: { minHeight: 46, borderRadius: 10, borderWidth: 2 },
  arcadeBtnTxt: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  arcadeBtnTxtMobile: { fontSize: 13 },
  fightBtn: { flex: 1, paddingBottom: 6 },
  fightFace: {
    backgroundColor: '#ff4757',
    borderColor: '#c0392b',
    borderBottomWidth: 5,
    borderBottomColor: '#922b21',
  },
  fightBtnShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '46%',
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  fightBtnTxt: { color: '#fff9f0', fontSize: 16 },
  defendBtn: { paddingBottom: 5 },
  defendFace: {
    backgroundColor: '#48cae4',
    borderColor: '#1d7a9e',
    borderBottomWidth: 5,
    borderBottomColor: '#15627d',
  },
  defendBtnShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  defendBtnTxt: { color: '#f0fbff' },
  runBtnOuter: { flex: 0.88, paddingBottom: 4 },
  runFace: {
    backgroundColor: '#b8c5d6',
    borderColor: '#7f8c9a',
    borderBottomWidth: 4,
    borderBottomColor: '#6b7a88',
  },
  runBtnTxt: { color: '#3d4a5c', fontSize: 14, fontWeight: '800' },
  disabledBtn: { opacity: 0.42 },
});
