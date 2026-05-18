import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
  startBattleMusic,
  stopBattleMusic,
  unlockBattleAudio,
} from '../utils/battleAudio';
import { playUiSfx, playSound } from '../utils/sounds';
import { BATTLE } from '../utils/gameTheme';
import { isCombatFeedbackMessage } from '../utils/battleCombatFeedback';
import {
  devOnlineBattleLog,
  normalizeOnlineBattleSnapshot,
} from '../utils/onlineBattleState';
import { visualFormTierFromLevel } from '../utils/evolution';
import { evolutionFormForMonster } from '../utils/monsterEvolutionForms';
import { GAME_ASSETS } from '../utils/gameAssetPaths';

function fighterFromServer(f) {
  if (!f?.stats) return null;
  const parts = f.monsterParts && typeof f.monsterParts === 'object' ? f.monsterParts : {};
  const level = f.level ?? 1;
  const templateId = f.monsterTemplateId || parts.templateId;
  const visualTier = visualFormTierFromLevel(level);
  const form = templateId ? evolutionFormForMonster(templateId, visualTier) : null;
  return {
    ...f,
    monsterParts: {
      ...parts,
      cosmetics: Array.isArray(parts.cosmetics) ? parts.cosmetics : [],
      visualFormTier: parts.visualFormTier ?? visualTier,
      evolutionFormName: parts.evolutionFormName ?? form?.name,
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
 * Server-authoritative online battle — turn-based (Fight / Magic / Run), no dice.
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
  const [battleState, setBattleState] = useState('preparing');
  const [activePlayerId, setActivePlayerId] = useState(1);
  const [round, setRound] = useState(1);
  const [combatLog, setCombatLog] = useState([]);
  const [bannerMessage, setBannerMessage] = useState('Choose your move');
  const [menuMode, setMenuMode] = useState('main');
  const [activeAttackEffect, setActiveAttackEffect] = useState(null);
  const [actionError, setActionError] = useState('');
  const [runConfirmOpen, setRunConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const lastSeqRef = useRef(0);
  const lastEffectSeqRef = useRef(0);
  const finishedRef = useRef(false);

  const { width, height } = useWindowDimensions();
  const battleMobile = isMobileLayout(width, height);

  const activeTurn = activeTurnProp ?? activePlayerId ?? 1;
  const battleActive = battleState === 'active';
  const animating = battleState === 'animating' || phase === 'resolveAttack';
  const isMyTurn = battleActive && activePlayerId === myPlayerId;
  const myFighterAlive = (myPlayerId === 1 ? p1 : p2)?.hp > 0;
  const busy = animating || submitting;
  const actionsEnabled = isMyTurn && myFighterAlive && !busy && battleState !== 'finished';

  useEffect(() => {
    devOnlineBattleLog('button gate', {
      battleState,
      phase,
      activePlayerId,
      myPlayerId,
      isMyTurn,
      busy,
      actionsEnabled,
    });
  }, [battleState, phase, activePlayerId, myPlayerId, isMyTurn, busy, actionsEnabled]);

  const actingFighter = myPlayerId === 1 ? p1 : p2;
  const magicSkills =
    actingFighter?.skills?.magic ?? getMagicSkills(actingFighter?.monsterTemplateId ?? '');

  useEffect(() => {
    unlockBattleAudio();
    startBattleMusic();
    return () => stopBattleMusic();
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    const norm = normalizeOnlineBattleSnapshot(snapshot);
    if (!norm) return;

    const seq = norm.seq ?? 0;
    if (seq > 0 && seq < lastSeqRef.current) return;
    lastSeqRef.current = Math.max(lastSeqRef.current, seq);

    devOnlineBattleLog('snapshot', {
      phase: norm.phase,
      battleState: norm.battleState,
      activePlayerId: norm.activePlayerId,
      myPlayerId,
      seq,
    });

    const nextP1 = fighterFromServer(norm.p1);
    const nextP2 = fighterFromServer(norm.p2);
    if (nextP1) setP1(nextP1);
    if (nextP2) setP2(nextP2);
    if (norm.phase) setPhase(norm.phase);
    if (norm.battleState) setBattleState(norm.battleState);
    if (typeof norm.activePlayerId === 'number') setActivePlayerId(norm.activePlayerId);
    if (typeof norm.round === 'number') setRound(norm.round);
    if (norm.bannerMessage) setBannerMessage(norm.bannerMessage);
    if (Array.isArray(norm.log)) setCombatLog(norm.log.slice(-8));

    const eff = norm.currentEffect;
    const effSeq = eff?.seq ?? 0;
    if (norm.battleState === 'animating' && eff && effSeq > lastEffectSeqRef.current) {
      lastEffectSeqRef.current = effSeq;
      setActiveAttackEffect(eff);
    }
    if (norm.battleState === 'active' || norm.phase === 'chooseAction') {
      setActiveAttackEffect(null);
      if (!submitting) setMenuMode('main');
    }

    if (norm.winner && !finishedRef.current) {
      finishedRef.current = true;
      setBattleState('finished');
      if (norm.winner === 'draw') {
        /* no win/lose sting */
      } else if (norm.winner === myPlayerId) {
        playSound('win');
      } else {
        playSound('lose');
      }
      const outcome =
        norm.winner === 'draw' ? 'draw' : norm.winner;
      onFinish?.({
        winner: outcome,
        player1Snapshot: nextP1,
        player2Snapshot: nextP2,
        battleExtras: { mode: 'online', online: true, serverWinner: norm.winner },
      });
    }
  }, [snapshot, myPlayerId, onFinish]);

  const turnLabel = useMemo(() => {
    if (battleState === 'finished') return 'Battle over';
    if (animating) return bannerMessage || 'Resolving…';
    if (isMyTurn) return 'Your turn';
    if (battleActive) return 'Opponent turn';
    return 'Preparing…';
  }, [battleState, animating, isMyTurn, battleActive, bannerMessage]);

  const actionHint = useMemo(() => {
    if (actionError) return actionError;
    if (battleActive) {
      return isMyTurn ? 'Choose your move' : `Waiting for ${activePlayerId === 1 ? labelP1 : labelP2}…`;
    }
    if (animating) return bannerMessage || 'Resolving attack…';
    return bannerMessage || turnLabel;
  }, [battleActive, animating, isMyTurn, activePlayerId, labelP1, labelP2, bannerMessage, actionError, turnLabel]);

  const turnBadgeCombatHighlight = useMemo(
    () => animating && isCombatFeedbackMessage(bannerMessage),
    [animating, bannerMessage],
  );

  function tapUi() {
    unlockBattleAudio();
    startBattleMusic();
    playUiSfx();
  }

  async function submit(action, payload = {}) {
    if (!emitAction) return;
    if (!isMyTurn || busy || battleState === 'finished') {
      setActionError('Not your turn');
      devOnlineBattleLog('action blocked locally', action);
      return;
    }
    setSubmitting(true);
    setActionError('');
    devOnlineBattleLog('action submitting', action, payload.skillId || '');
    const res = await emitAction(action, payload);
    setSubmitting(false);
    if (res?.error) {
      devOnlineBattleLog('action rejected', res.error);
      setActionError(res.error);
    } else {
      setMenuMode('main');
    }
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

  function handleRun() {
    if (busy) return;
    tapUi();
    setRunConfirmOpen(true);
  }

  function confirmRun() {
    setRunConfirmOpen(false);
    void submit('run');
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
            p1={p1}
            p2={p2}
            p1Mood="neutral"
            p2Mood="neutral"
            p1Pose="idle"
            p2Pose="idle"
            activeTurn={busy ? 0 : activeTurn}
            round={round}
            turnBadge={actionHint}
            turnBadgeCombatHighlight={turnBadgeCombatHighlight}
            player1Label={labelP1}
            player2Label={labelP2}
          />
          <View style={styles.turnPillWrap} pointerEvents="none">
            <View
              style={[
                styles.turnPill,
                isMyTurn && styles.turnPillMine,
                !isMyTurn && battleActive && styles.turnPillOpp,
              ]}
            >
              <Text style={styles.turnPillTxt}>{turnLabel}</Text>
            </View>
          </View>
          {combatLog.length > 0 ? (
            <View style={styles.combatLog} pointerEvents="none">
              {combatLog.map((line, i) => (
                <Text key={`${i}-${line}`} style={styles.combatLogLine} numberOfLines={1}>
                  {line}
                </Text>
              ))}
            </View>
          ) : null}
          {animating && activeAttackEffect ? (
            <View style={styles.projectileWrap} pointerEvents="box-none">
              <BattleProjectileLayer
                effect={activeAttackEffect}
                active
                onComplete={handleProjectileComplete}
              />
            </View>
          ) : null}
        </View>

        <View style={[styles.actionDock, battleMobile && styles.actionDockMobile]} pointerEvents="box-none">
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
                      <Image
                        source={{ uri: GAME_ASSETS.battleActions.magic }}
                        style={styles.skillActionIcon}
                        resizeMode="contain"
                      />
                      <View style={styles.skillTextCol}>
                        <Text style={styles.skillName} numberOfLines={1}>
                          {sk.name}
                        </Text>
                        <Text style={styles.skillMeta}>
                          {el.label ?? sk.element ?? 'Magic'} · {sk.mpCost} MP
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
                  <Image
                    source={{ uri: GAME_ASSETS.battleActions.attack }}
                    style={[styles.actionBtnImage, battleMobile && styles.actionBtnImageMobile]}
                    resizeMode="contain"
                  />
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
                  <Image
                    source={{ uri: GAME_ASSETS.battleActions.magic }}
                    style={[styles.actionBtnImage, battleMobile && styles.actionBtnImageMobile]}
                    resizeMode="contain"
                  />
                  <Text style={[styles.arcadeBtnTxt, battleMobile && styles.arcadeBtnTxtMobile, styles.magicBtnTxt]}>
                    Magic
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
                  <Image
                    source={{ uri: GAME_ASSETS.battleActions.run }}
                    style={[styles.actionBtnImage, battleMobile && styles.actionBtnImageMobile]}
                    resizeMode="contain"
                  />
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
  turnPillWrap: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 12,
  },
  turnPill: {
    backgroundColor: 'rgba(20, 24, 40, 0.88)',
    borderWidth: 2,
    borderColor: '#636e72',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  turnPillMine: {
    borderColor: '#ffd166',
    backgroundColor: 'rgba(255, 209, 102, 0.22)',
  },
  turnPillOpp: {
    borderColor: '#74b9ff',
    backgroundColor: 'rgba(116, 185, 255, 0.18)',
  },
  turnPillTxt: { fontWeight: '900', fontSize: 13, color: '#fff', letterSpacing: 0.4 },
  combatLog: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    gap: 2,
    zIndex: 10,
  },
  combatLogLine: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  projectileWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 8,
  },
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
  skillActionIcon: { width: 34, height: 34 },
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
  arcadeBtnMobile: { minWidth: 0, flex: 1, maxWidth: '33.33%' },
  arcadeBtnPressed: { paddingBottom: 1, transform: [{ translateY: 4 }] },
  btnFace: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
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
  actionBtnImage: { width: 28, height: 28 },
  actionBtnImageMobile: { width: 30, height: 30 },
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
