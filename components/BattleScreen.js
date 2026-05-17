import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { isMobileLayout } from '../utils/battleLayout';
import BattleProjectileLayer from './BattleProjectileLayer';
import RpgBattleArena from './RpgBattleArena';
import { pickProjectile } from '../utils/battleProjectiles';
import { getSkillAnimMeta } from '../utils/skillAnimations';
import { playSound, playSoundForSkill } from '../utils/sounds';
import {
  maybeApplySkillStatus,
  resolveMagicBattleDamage,
  resolvePhysicalBattleDamage,
} from '../utils/battleLogic';
import { elementBannerText, ELEMENT_UI } from '../utils/elements';
import {
  canAffordSkill,
  getMagicSkills,
  getPhysicalSkill,
} from '../utils/monsterSkills';
import { tickStatus } from '../utils/statusEffects';
import {
  duckBgm,
  setBattleMusicIntensity,
  startBattleMusic,
  stopBattleMusic,
  isBattleMuted,
  toggleBattleMuted,
  unlockBattleAudio,
} from '../utils/battleAudio';
import { playUiSfx } from '../utils/sounds';
import BattleAudioControls from './BattleAudioControls';
import { ART } from '../utils/artDirection';
import { BATTLE } from '../utils/gameTheme';
import {
  COMBAT_FEEDBACK_MS,
  isCombatFeedbackMessage,
} from '../utils/battleCombatFeedback';

const ATTACK_WINDUP_MS = ART.windup;
const PLAYER_ID = 1;
const CPU_ID = 2;

function seedFighter(p) {
  if (!p?.stats) return null;
  const parts = p.monsterParts && typeof p.monsterParts === 'object' ? p.monsterParts : {};
  return {
    monsterParts: {
      ...parts,
      cosmetics: Array.isArray(parts.cosmetics) ? parts.cosmetics : [],
    },
    stats: p.stats,
    hp: typeof p.hp === 'number' ? p.hp : p.stats.hp,
    maxHp: p.stats.hp,
    mp: typeof p.mp === 'number' ? p.mp : p.stats.mp,
    maxMp: p.stats.mp,
    monsterTemplateId: p.monsterTemplateId,
    ownedMonsterId: p.ownedMonsterId,
    displayName: p.displayName,
    rarity: p.rarity,
    level: p.level ?? 1,
    battleExp: p.battleExp ?? 0,
    battleExpToNext: p.battleExpToNext ?? 36,
    combo: p.combo ?? 0,
    element: p.element ?? 'earth',
    skills: p.skills ?? null,
    status: p.status ?? null,
    isAiOpponent: !!p.isAiOpponent,
    aiPowerRatio: p.aiPowerRatio ?? null,
  };
}

function snapshotFight(f) {
  return {
    monsterParts: { ...f.monsterParts, cosmetics: [...(f.monsterParts?.cosmetics || [])] },
    stats: f.stats,
    hp: f.hp,
    maxHp: f.maxHp ?? f.stats?.hp,
    mp: f.mp,
    maxMp: f.maxMp ?? f.stats?.mp,
    monsterTemplateId: f.monsterTemplateId,
    ownedMonsterId: f.ownedMonsterId,
    displayName: f.displayName,
    rarity: f.rarity,
    level: f.level,
    battleExp: f.battleExp,
    battleExpToNext: f.battleExpToNext,
    combo: f.combo ?? 0,
    element: f.element,
    skills: f.skills,
    status: f.status ?? null,
    isAiOpponent: f.isAiOpponent,
    aiPowerRatio: f.aiPowerRatio,
  };
}

function pickCpuStrike(atk) {
  const physical = atk.skills?.physical ?? getPhysicalSkill(atk.monsterTemplateId);
  const magicList = atk.skills?.magic ?? getMagicSkills(atk.monsterTemplateId);
  const affordable = magicList.filter((s) => canAffordSkill(atk, s));
  if (affordable.length > 0 && Math.random() < 0.42) {
    const skill = affordable[Math.floor(Math.random() * affordable.length)];
    return { skill, strikeKind: 'magic' };
  }
  return { skill: physical, strikeKind: 'physical' };
}

function moodFor(fighter, emotional) {
  if (fighter?.stats?.hp && fighter.hp / fighter.stats.hp <= 0.3 && fighter.hp > 0) return 'dizzy';
  if (emotional === 'happy') return 'happy';
  if (emotional === 'angry') return 'angry';
  return 'neutral';
}

export default function BattleScreen({
  fighter1,
  fighter2,
  onFinish,
  onExitBattle,
  player1Name = '',
  player2Name = '',
  opponentIsAi = true,
  battleExtras = {},
}) {
  const labelP1 = player1Name || fighter1?.displayName || 'You';
  const labelCpu = opponentIsAi ? 'CPU' : player2Name || fighter2?.displayName || 'CPU';

  const [round, setRound] = useState(1);
  const [battlePhase, setBattlePhase] = useState('chooseAction');
  const [menuMode, setMenuMode] = useState('main');
  const [activeBattler, setActiveBattler] = useState(PLAYER_ID);
  const [p1, setP1] = useState(() => seedFighter(fighter1));
  const [p2, setP2] = useState(() => seedFighter(fighter2));
  const [bannerMessage, setBannerMessage] = useState('Choose your move');
  const [bannerCombatHighlight, setBannerCombatHighlight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [currentEffect, setCurrentEffect] = useState(null);
  const [activeAttackEffect, setActiveAttackEffect] = useState(null);
  const [defendGlowP1, setDefendGlowP1] = useState(false);
  const [defendGlowP2, setDefendGlowP2] = useState(false);
  const [defenderFlash, setDefenderFlash] = useState(0);
  const [sicklyFlash, setSicklyFlash] = useState(0);
  const [flyStrikeP1, setFlyStrikeP1] = useState(false);
  const [flyStrikeP2, setFlyStrikeP2] = useState(false);
  const [p1Pose, setP1Pose] = useState('idle');
  const [p2Pose, setP2Pose] = useState('idle');
  const [p1Emotion, setP1Emotion] = useState('neutral');
  const [p2Emotion, setP2Emotion] = useState('neutral');
  const [battleDim] = useState(false);
  const [stageZoom] = useState(() => new Animated.Value(1));
  const [audioMuted, setAudioMuted] = useState(() => isBattleMuted());

  const effectSeqRef = useRef(0);
  const timerRef = useRef(null);
  const extraTimersRef = useRef([]);
  const shakeX = useRef(new Animated.Value(0)).current;
  const hitStopScale = useRef(new Animated.Value(1)).current;
  const pendingStrikeRef = useRef(null);
  const combatBannerTimerRef = useRef(null);
  const p1Ref = useRef(p1);
  const p2Ref = useRef(p2);
  const activeBattlerRef = useRef(PLAYER_ID);

  useEffect(() => {
    p1Ref.current = p1;
    p2Ref.current = p2;
  }, [p1, p2]);

  useEffect(() => {
    const max1 = p1?.maxHp ?? p1?.stats?.hp ?? 1;
    const max2 = p2?.maxHp ?? p2?.stats?.hp ?? 1;
    setBattleMusicIntensity({
      playerHpRatio: max1 > 0 ? p1.hp / max1 : 1,
      opponentHpRatio: max2 > 0 ? p2.hp / max2 : 1,
    });
  }, [p1?.hp, p2?.hp, p1?.maxHp, p2?.maxHp]);

  useEffect(() => {
    activeBattlerRef.current = activeBattler;
  }, [activeBattler]);

  useEffect(() => () => stopBattleMusic(), []);

  useEffect(() => {
    if (battlePhase !== 'resolveAttack') {
      setActiveAttackEffect(null);
      setCurrentEffect(null);
    }
  }, [battlePhase]);

  const showBanner = useCallback((msg) => {
    if (!msg) return;
    if (combatBannerTimerRef.current) {
      clearTimeout(combatBannerTimerRef.current);
      combatBannerTimerRef.current = null;
    }
    const combat = isCombatFeedbackMessage(msg);
    setBannerMessage(msg);
    setBannerCombatHighlight(combat);
    if (combat) {
      combatBannerTimerRef.current = setTimeout(() => {
        setBannerCombatHighlight(false);
        combatBannerTimerRef.current = null;
      }, COMBAT_FEEDBACK_MS);
    }
  }, []);

  function clearTimers() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    extraTimersRef.current.forEach(clearTimeout);
    extraTimersRef.current = [];
  }

  function schedule(ms, fn) {
    const t = setTimeout(() => {
      extraTimersRef.current = extraTimersRef.current.filter((x) => x !== t);
      fn();
    }, ms);
    extraTimersRef.current.push(t);
    return t;
  }

  useEffect(() => () => {
    clearTimers();
    if (combatBannerTimerRef.current) clearTimeout(combatBannerTimerRef.current);
  }, []);

  function clearAttackEffects() {
    setActiveAttackEffect(null);
    setCurrentEffect(null);
    setFlyStrikeP1(false);
    setFlyStrikeP2(false);
    setSicklyFlash(0);
  }

  function doShake(strength) {
    const mag = strength === 'crit' ? 14 : 8;
    Animated.sequence([
      Animated.timing(shakeX, { toValue: mag, duration: 40, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -mag, duration: 42, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  function triggerHitStop(ms = 80) {
    hitStopScale.setValue(0.985);
    Animated.sequence([
      Animated.delay(Math.max(40, ms - 30)),
      Animated.timing(hitStopScale, {
        toValue: 1,
        duration: 50,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }

  function resetPoses() {
    setP1Pose('idle');
    setP2Pose('idle');
    setDefendGlowP1(false);
    setDefendGlowP2(false);
    setDefenderFlash(0);
    setSicklyFlash(0);
    setFlyStrikeP1(false);
    setFlyStrikeP2(false);
    setP1Emotion('neutral');
    setP2Emotion('neutral');
  }

  function wrapUpBattle(winnerSide, np1, np2) {
    clearTimers();
    clearAttackEffects();
    setBusy(false);
    resetPoses();
    const winner = winnerSide === PLAYER_ID ? PLAYER_ID : winnerSide === CPU_ID ? CPU_ID : 'draw';
    if (winner === PLAYER_ID) playSound('win');
    else if (winner === CPU_ID) playSound('lose');
    onFinish({
      winner,
      player1Snapshot: snapshotFight(np1),
      player2Snapshot: snapshotFight(np2),
      battleExtras: { ...battleExtras, mode: 'onePlayer' },
    });
  }

  function tickBothStatuses(np1, np2) {
    let a = np1;
    let b = np2;
    let msg = null;
    const t1 = tickStatus(a);
    a = t1.fighter;
    if (t1.message) msg = t1.message;
    const t2 = tickStatus(b);
    b = t2.fighter;
    if (t2.message && !msg) msg = t2.message;
    if (a.hp <= 0 || b.hp <= 0) {
      return { np1: a, np2: b, ko: true, message: msg };
    }
    return { np1: a, np2: b, ko: false, message: msg };
  }

  function endRound(np1, np2, bannerOverride) {
    const ticked = tickBothStatuses(np1, np2);
    if (ticked.ko) {
      if (ticked.np1.hp <= 0) wrapUpBattle(CPU_ID, ticked.np1, ticked.np2);
      else wrapUpBattle(PLAYER_ID, ticked.np1, ticked.np2);
      return;
    }
    setP1(ticked.np1);
    setP2(ticked.np2);
    p1Ref.current = ticked.np1;
    p2Ref.current = ticked.np2;
    clearAttackEffects();
    resetPoses();
    setRound((r) => r + 1);
    setBattlePhase('chooseAction');
    setMenuMode('main');
    setBusy(false);
    showBanner(bannerOverride || ticked.message || 'Choose your move');
  }

  /** After a strike ends: CPU counter in 1P, pass turn in 2P local. */
  function strikeAftermath(cpuCounterFn) {
    if (opponentIsAi) return cpuCounterFn ?? null;
    return (np1, np2) => {
      const prev = activeBattlerRef.current;
      const next = prev === PLAYER_ID ? CPU_ID : PLAYER_ID;
      setActiveBattler(next);
      const name = next === PLAYER_ID ? labelP1 : labelCpu;
      endRound(np1, np2, `${name}'s turn`);
    };
  }

  function attackSidesForActiveBattler() {
    const p2Turn = !opponentIsAi && activeBattler === CPU_ID;
    return {
      attackerId: p2Turn ? CPU_ID : PLAYER_ID,
      defenderId: p2Turn ? PLAYER_ID : CPU_ID,
      attacker: p2Turn ? p2Ref.current : p1Ref.current,
    };
  }

  function handleProjectileImpact(defId, fx) {
    setDefenderFlash(defId);
    if (fx?.sicklyFlash) {
      setSicklyFlash(defId);
      schedule(500, () => setSicklyFlash(0));
    }
    schedule(400, () => setDefenderFlash(0));
    if (fx?.damage > 0) {
      duckBgm(fx?.critical ? 480 : 380);
      triggerHitStop(fx?.critical ? ART.hitStopCrit : ART.hitStop);
    }
    if (fx?.critical && fx?.damage > 0) {
      playSound('critical');
      doShake('crit');
    } else if (fx?.damage > 0) {
      if (fx?.sfxKey) playSound(fx.sfxKey);
      else playSound('hit', { effectType: fx?.effectType });
      doShake('normal');
    }
  }

  function handleProjectileComplete() {
    clearAttackEffects();
    const pending = pendingStrikeRef.current;
    pendingStrikeRef.current = null;
    if (pending?.safetyId) clearTimeout(pending.safetyId);
    if (pending?.onDone) pending.onDone(pending.np1, pending.np2);
  }

  function runAttack({
    attackerId,
    defenderId,
    bannerText,
    onComplete,
    skill: skillIn,
    strikeKind: strikeKindIn,
  }) {
    const curP1 = p1Ref.current;
    const curP2 = p2Ref.current;
    const atk = attackerId === PLAYER_ID ? curP1 : curP2;
    const def = defenderId === PLAYER_ID ? curP1 : curP2;
    if (!atk || !def) return;

    const strikeKind =
      strikeKindIn ?? (skillIn?.kind === 'magic' ? 'magic' : 'physical');
    const skill =
      skillIn ??
      (strikeKind === 'magic'
        ? (atk.skills?.magic ?? getMagicSkills(atk.monsterTemplateId))[0]
        : atk.skills?.physical ?? getPhysicalSkill(atk.monsterTemplateId));

    if (strikeKind === 'magic' && !canAffordSkill(atk, skill)) {
      showBanner('Not enough MP!');
      setBusy(false);
      setBattlePhase('chooseAction');
      setMenuMode('magic');
      return;
    }

    showBanner(bannerText);
    setBattlePhase('resolveAttack');
    setMenuMode('main');
    setBusy(true);

    if (attackerId === PLAYER_ID) {
      setP1Pose('cast');
      setP2Pose('idle');
    } else {
      setP2Pose('cast');
      setP1Pose('idle');
    }
    if (attackerId === PLAYER_ID) {
      setP1Emotion('happy');
      setP2Emotion('angry');
    } else {
      setP2Emotion('happy');
      setP1Emotion('angry');
    }

    const resolved =
      strikeKind === 'magic'
        ? resolveMagicBattleDamage({
            attacker: atk,
            defender: def,
            skill,
            atkElement: skill?.element ?? atk.element,
            defElement: def.element,
          })
        : resolvePhysicalBattleDamage({ attacker: atk, defender: def, skill });

    const dmg = resolved.dodged ? 0 : resolved.damage;
    const mpCost = strikeKind === 'magic' ? skill?.mpCost ?? 0 : 0;

    if (resolved.dodged) showBanner('Dodged!');
    else if (resolved.critical) showBanner('Critical Hit!');
    else if (resolved.weak) showBanner('Weak Hit!');
    else if (resolved.defended) showBanner('Blocked!');
    else if (strikeKind === 'magic') {
      const elMsg = elementBannerText(resolved.elementRelation);
      if (elMsg) showBanner(elMsg);
    }

    schedule(Math.round(ATTACK_WINDUP_MS * 0.55), () => {
      if (attackerId === PLAYER_ID) setP1Pose('lunge');
      else setP2Pose('lunge');
      if (resolved.dodged) {
        if (defenderId === PLAYER_ID) setP1Pose('dodge');
        else setP2Pose('dodge');
      } else {
        if (attackerId === PLAYER_ID) setP2Pose('hit');
        else setP1Pose('hit');
      }
    });

    let nextAtk = { ...atk, mp: Math.max(0, atk.mp - mpCost) };
    let nextDef = resolved.dodged ? { ...def } : { ...def, hp: Math.max(0, def.hp - dmg) };
    if (dmg > 0 && strikeKind === 'magic' && !resolved.dodged) {
      nextDef = maybeApplySkillStatus(nextDef, skill);
    }

    const np1 =
      attackerId === PLAYER_ID
        ? nextAtk
        : defenderId === PLAYER_ID
          ? nextDef
          : { ...curP1 };
    const np2 =
      attackerId === CPU_ID
        ? nextAtk
        : defenderId === CPU_ID
          ? nextDef
          : { ...curP2 };

    setP1(np1);
    setP2(np2);
    p1Ref.current = np1;
    p2Ref.current = np2;

    const animMeta = getSkillAnimMeta(skill);
    const isFly = animMeta.animKind === 'fly_lunge' || animMeta.animKind === 'bite_lunge';
    setFlyStrikeP1(attackerId === PLAYER_ID && isFly);
    setFlyStrikeP2(attackerId === CPU_ID && isFly);

    effectSeqRef.current += 1;
    const effectPayload = {
      type: strikeKind === 'magic' ? 'magic' : 'normal',
      moveName: skill?.name ?? 'Attack',
      effectType: skill?.effectType ?? 'normal',
      emoji: skill?.emoji,
      skillId: skill?.id,
      animKind: animMeta.animKind,
      sfxKey: animMeta.sfxKey,
      sicklyFlash: animMeta.sicklyFlash,
      critical: resolved.critical,
      weak: resolved.weak,
      dodged: !!resolved.dodged,
      defended: !!resolved.defended,
      damage: dmg,
      superBomb: false,
      attackerId,
      defenderId,
      attackerTemplateId: atk.monsterTemplateId,
      projectileId: pickProjectile({
        templateId: atk.monsterTemplateId,
        effectType: skill?.effectType ?? 'normal',
        projectileId: animMeta.projectileId,
      }),
      useProjectileAnim: true,
      seq: effectSeqRef.current,
    };

    const safetyId = schedule(5000, () => {
      if (pendingStrikeRef.current) handleProjectileComplete();
    });

    pendingStrikeRef.current = {
      np1,
      np2,
      safetyId,
      onDone: () => {
        if (np1.hp <= 0) {
          wrapUpBattle(CPU_ID, np1, np2);
          return;
        }
        if (np2.hp <= 0) {
          wrapUpBattle(PLAYER_ID, np1, np2);
          return;
        }
        if (onComplete) onComplete(np1, np2);
        else endRound(np1, np2);
      },
    };

    clearAttackEffects();
    schedule(ATTACK_WINDUP_MS, () => {
      if (resolved.dodged) playSound('dodge');
      else playSoundForSkill(skill, strikeKind);
      setActiveAttackEffect(effectPayload);
    });
  }

  function runCpuCounter(np1, np2) {
    schedule(400, () => {
      const cpu = p2Ref.current;
      const { skill, strikeKind } = pickCpuStrike(cpu);
      runAttack({
        attackerId: CPU_ID,
        defenderId: PLAYER_ID,
        bannerText: strikeKind === 'magic' ? `CPU used ${skill.name}!` : 'CPU attacks!',
        skill,
        strikeKind,
        onComplete: null,
      });
    });
  }

  function tapUi() {
    unlockBattleAudio();
    playUiSfx();
  }

  function handleFight() {
    if (busy || battlePhase !== 'chooseAction') return;
    unlockBattleAudio();
    startBattleMusic();
    const { attackerId, defenderId, attacker } = attackSidesForActiveBattler();
    const skill = attacker?.skills?.physical ?? getPhysicalSkill(attacker?.monsterTemplateId);
    const banner =
      attackerId === PLAYER_ID
        ? `${skill?.name ?? 'Attack'}!`
        : `${labelCpu}: ${skill?.name ?? 'Attack'}!`;

    runAttack({
      attackerId,
      defenderId,
      bannerText: banner,
      skill,
      strikeKind: 'physical',
      onComplete: strikeAftermath(runCpuCounter),
    });
  }

  function handleMagicOpen() {
    if (busy || battlePhase !== 'chooseAction') return;
    tapUi();
    setMenuMode('magic');
    showBanner('Pick a magic skill');
  }

  function handleMagicBack() {
    if (busy) return;
    tapUi();
    setMenuMode('main');
    showBanner('Choose your move');
  }

  function handleMagicSkill(skill) {
    if (busy || battlePhase !== 'chooseAction' || !skill) return;
    const { attackerId, defenderId, attacker } = attackSidesForActiveBattler();
    if (!canAffordSkill(attacker, skill)) {
      showBanner('Not enough MP!');
      return;
    }
    unlockBattleAudio();
    startBattleMusic();
    runAttack({
      attackerId,
      defenderId,
      bannerText: `${skill.name}!`,
      skill,
      strikeKind: 'magic',
      onComplete: strikeAftermath(runCpuCounter),
    });
  }

  function handleRun() {
    if (busy) return;
    if (typeof onExitBattle === 'function') {
      onExitBattle();
      return;
    }
    onFinish({
      winner: CPU_ID,
      player1Snapshot: snapshotFight(p1),
      player2Snapshot: snapshotFight(p2),
      battleExtras: { ...battleExtras, mode: 'onePlayer', fled: true },
    });
  }

  function handleMutePress() {
    unlockBattleAudio();
    const muted = toggleBattleMuted();
    setAudioMuted(muted);
  }

  const p1Mood = moodFor(p1, p1Emotion);
  const p2Mood = moodFor(p2, p2Emotion);
  const actionsEnabled = !busy && battlePhase === 'chooseAction';
  const actingFighter = activeBattler === CPU_ID ? p2 : p1;
  const magicSkills =
    actingFighter?.skills?.magic ?? getMagicSkills(actingFighter?.monsterTemplateId ?? '');
  const actingElementUi = ELEMENT_UI[actingFighter?.element] ?? ELEMENT_UI.earth;
  const { width, height } = useWindowDimensions();
  const battleMobile = isMobileLayout(width, height);

  return (
    <View style={styles.root}>
      <View style={styles.battleFrame}>
        <View style={styles.arenaField} pointerEvents="box-none">
          <View style={styles.arenaInner}>
          <RpgBattleArena
            topHudExtra={
              <BattleAudioControls muted={audioMuted} onToggleMute={handleMutePress} />
            }
            p1={p1}
            p2={p2}
            p1Mood={p1Mood}
            p2Mood={p2Mood}
            p1Pose={p1Pose}
            p2Pose={p2Pose}
            activeTurn={busy ? CPU_ID : activeBattler}
            round={round}
            turnBadge={bannerMessage}
            turnBadgeCombatHighlight={bannerCombatHighlight}
            player1Label={labelP1}
            player2Label={labelCpu}
            battleDim={battleDim}
            shakeX={shakeX}
            stageZoom={hitStopScale}
            defendGlowP1={defendGlowP1}
            defendGlowP2={defendGlowP2}
            defenderFlashP1={defenderFlash === PLAYER_ID}
            defenderFlashP2={defenderFlash === CPU_ID}
            sicklyFlashP1={sicklyFlash === PLAYER_ID}
            sicklyFlashP2={sicklyFlash === CPU_ID}
            flyStrikeP1={flyStrikeP1}
            flyStrikeP2={flyStrikeP2}
          />
          {battlePhase === 'resolveAttack' && activeAttackEffect ? (
            <BattleProjectileLayer
              effect={activeAttackEffect}
              active
              onImpact={handleProjectileImpact}
              onComplete={handleProjectileComplete}
            />
          ) : null}
          </View>
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
                  const el = ELEMENT_UI[sk.element] ?? actingElementUi;
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
              onPress={() => {
                tapUi();
                handleFight();
              }}
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
                  styles.runBtnOuter,
                  pressed && actionsEnabled && styles.arcadeBtnPressed,
                  !actionsEnabled && styles.disabledBtn,
                ]}
                disabled={!actionsEnabled}
              onPress={() => {
                tapUi();
                handleRun();
              }}
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
  arenaInner: { flex: 1, width: '100%', minHeight: 0 },
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
  menuRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' },
  menuRowMobile: {
    gap: 8,
    flexWrap: 'nowrap',
  },
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
    borderBottomWidth: 4,
    borderBottomColor: '#4834d4',
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
    shadowColor: '#a29bfe',
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
  arcadeBtn: {
    flex: 1,
    minWidth: 76,
    borderRadius: 14,
    paddingBottom: 5,
    overflow: 'visible',
  },
  arcadeBtnMobile: {
    minWidth: 0,
    flex: 1,
    maxWidth: '33.33%',
  },
  arcadeBtnPressed: {
    paddingBottom: 1,
    transform: [{ translateY: 4 }],
  },
  btnFace: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
  btnFaceMobile: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 2,
    paddingHorizontal: 2,
  },
  arcadeBtnTxtMobile: {
    fontSize: 13,
    letterSpacing: 0,
  },
  fightBtn: {
    flex: 1,
    paddingBottom: 6,
    shadowColor: '#ff6b35',
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 12,
  },
  fightFace: {
    backgroundColor: '#ff4757',
    borderColor: '#c0392b',
    borderBottomWidth: 5,
    borderBottomColor: '#922b21',
    shadowColor: '#ff6348',
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
  defendBtn: { paddingBottom: 5 },
  defendFace: {
    backgroundColor: '#48cae4',
    borderColor: '#1d7a9e',
    borderBottomWidth: 5,
    borderBottomColor: '#15627d',
    shadowColor: '#2a9d8f',
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
  runBtnOuter: { flex: 0.88, paddingBottom: 4 },
  runFace: {
    backgroundColor: '#b8c5d6',
    borderColor: '#7f8c9a',
    borderBottomWidth: 4,
    borderBottomColor: '#6b7a88',
    shadowColor: '#636e72',
    shadowOpacity: 0.25,
    elevation: 4,
  },
  arcadeBtnTxt: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  fightBtnTxt: { color: '#fff9f0', fontSize: 18 },
  fightBtnTxtMobile: { fontSize: 14 },
  defendBtnTxt: { color: '#f0fbff' },
  runBtnTxt: { color: '#3d4a5c', fontSize: 15, fontWeight: '800' },
  disabledBtn: { opacity: 0.42 },
});
