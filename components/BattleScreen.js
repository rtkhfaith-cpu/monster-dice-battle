import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { isMobileLayout } from '../utils/battleLayout';
import BattleProjectileLayer from './BattleProjectileLayer';
import PhaserBattleView from './PhaserBattleView';
import RpgBattleArena from './RpgBattleArena';
import { resolveAttackVisuals } from '../utils/battleProjectiles';
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
  unlockBattleAudio,
} from '../utils/battleAudio';
import { playUiSfx } from '../utils/sounds';
import { ART } from '../utils/artDirection';
import { BATTLE } from '../utils/gameTheme';
import {
  COMBAT_FEEDBACK_MS,
  isCombatFeedbackMessage,
} from '../utils/battleCombatFeedback';
import { getActionTiming } from '../utils/battleActionTiming';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import { chestDropSubtitle, chestDropTitle } from '../utils/mainBattleChest';
import { RARITY_UI } from '../utils/monsterTemplates';
import { getGear, compactGearIds } from '../utils/cosmetics';
import {
  gameSurfaceDataProps,
  WEB_DECORATIVE_IMAGE_PROPS,
  WEB_GAME_TOUCH_STYLE,
} from '../utils/webGameTouch';

const RESULT_SFX_DELAY_MS = 450;
const PLAYER_ID = 1;
const CPU_ID = 2;

function fighterToPhaserState(fighter, fallbackName) {
  const maxHp = fighter?.maxHp ?? fighter?.stats?.hp ?? 1;
  const maxMp = fighter?.maxMp ?? fighter?.stats?.mp ?? 0;
  return {
    name: fighter?.displayName || fallbackName || 'Monster',
    templateId: fighter?.monsterTemplateId,
    hp: fighter?.hp ?? maxHp,
    maxHp,
    mp: fighter?.mp ?? maxMp,
    maxMp,
    element: fighter?.element ?? 'normal',
    rarity: fighter?.rarity ?? 'common',
    baseRarity: fighter?.baseRarity,
    parts: fighter?.monsterParts || {},
    theme: fighter?.monsterParts?.themeBody ?? 'default',
    stageKind: fighter?.ladderStageKind ?? 'normal',
  };
}

function ladderStageBanner(kind) {
  if (kind === 'miniBoss') return 'MINI BOSS STAGE';
  if (kind === 'bigBoss') return 'BOSS STAGE';
  return '';
}

function ladderIntroTitle(kind) {
  if (kind === 'miniBoss') return 'Mini Boss Appears!';
  if (kind === 'bigBoss') return 'BOSS BATTLE!';
  return '';
}

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
    isMainMiniBoss: !!p.isMainMiniBoss,
    isLadderMonster: !!p.isLadderMonster,
    ladderStageKind: p.ladderStageKind,
    mergeTier: p.mergeTier ?? 0,
    equippedGear: compactGearIds(p.equippedGear ?? p.monsterParts?.cosmetics),
  };
}

function snapshotFight(f) {
  return {
    monsterParts: { ...f.monsterParts, cosmetics: [...(f.monsterParts?.cosmetics || [])] },
    stats: f.stats,
    baseStats: f.baseStats,
    gearBonuses: f.gearBonuses,
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
    isLadderMonster: !!f.isLadderMonster,
    mergeTier: f.mergeTier ?? 0,
    equippedGear: compactGearIds(f.equippedGear ?? f.monsterParts?.cosmetics),
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

/** Highest-MP affordable magic skill for auto-cast (list order = strongest last). */
function pickPlayerAutoMagic(atk) {
  const magicList = atk.skills?.magic ?? getMagicSkills(atk.monsterTemplateId);
  const affordable = magicList.filter((s) => canAffordSkill(atk, s));
  if (!affordable.length) return null;
  return affordable[affordable.length - 1];
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
  onClaimMainMiniBossChest,
  player1Name = '',
  player2Name = '',
  opponentIsAi = true,
  battleExtras = {},
}) {
  const labelP1 = player1Name || fighter1?.displayName || 'You';
  const labelCpu = opponentIsAi ? 'CPU' : player2Name || fighter2?.displayName || 'CPU';
  const ladderFloor = battleExtras?.ladderFloor;
  const ladderRegionName = battleExtras?.ladderRegionName;
  const ladderBossName = battleExtras?.ladderBossName;
  const ladderStageKind = battleExtras?.ladderStageKind ?? fighter2?.ladderStageKind ?? 'normal';
  const ladderStageLabel = battleExtras?.ladderStageLabel ?? '';
  const isMainMiniBoss = !!(battleExtras?.mainMiniBoss ?? fighter2?.isMainMiniBoss);
  const bossStageBanner = ladderStageBanner(ladderStageKind);
  const ladderStagePillLabel =
    battleExtras?.mode === 'monsterLadder'
      ? [ladderStageLabel || `Level ${ladderFloor ?? ''}`, ladderBossName].filter(Boolean).join(' · ')
      : '';
  // Live battles use the React/SVG renderer until Phaser has real monster textures.
  const usePhaserBattleRenderer = false;

  const [round, setRound] = useState(1);
  const [battlePhase, setBattlePhase] = useState('chooseAction');
  const [menuMode, setMenuMode] = useState('main');
  const [activeBattler, setActiveBattler] = useState(PLAYER_ID);
  const [p1, setP1] = useState(() => seedFighter(fighter1));
  const [p2, setP2] = useState(() => seedFighter(fighter2));
  const [bannerMessage, setBannerMessage] = useState('Choose your move');
  const [bannerCombatHighlight, setBannerCombatHighlight] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isActionPlaying, setIsActionPlaying] = useState(false);
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
  const [phaserVisualEvent, setPhaserVisualEvent] = useState(null);
  const [battleIntro, setBattleIntro] = useState(() => !!bossStageBanner);
  const [phaserFailed, setPhaserFailed] = useState(false);
  const [fleeConfirmOpen, setFleeConfirmOpen] = useState(false);
  const [pendingFinish, setPendingFinish] = useState(null);
  const [mainChestPhase, setMainChestPhase] = useState(null);
  const [mainChestDrop, setMainChestDrop] = useState(null);
  const [mainChestGameData, setMainChestGameData] = useState(null);
  const [mainChestBusy, setMainChestBusy] = useState(false);
  const chestDropY = useRef(new Animated.Value(-220)).current;

  const effectSeqRef = useRef(0);
  const timerRef = useRef(null);
  const extraTimersRef = useRef([]);
  const shakeX = useRef(new Animated.Value(0)).current;
  const hitStopScale = useRef(new Animated.Value(1)).current;
  const pendingStrikeRef = useRef(null);
  const actionSfxRef = useRef({ launch: false, dodge: false, impact: false });
  const combatBannerTimerRef = useRef(null);
  const p1Ref = useRef(p1);
  const p2Ref = useRef(p2);
  const activeBattlerRef = useRef(PLAYER_ID);
  const phaserEventSeqRef = useRef(0);
  const autoMagicRef = useRef(false);
  const [autoMagicOn, setAutoMagicOn] = useState(false);
  const battlePhaseRef = useRef(battlePhase);
  const busyRef = useRef(busy);
  const isActionPlayingRef = useRef(isActionPlaying);
  const battleIntroRef = useRef(battleIntro);

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

  useEffect(() => {
    battlePhaseRef.current = battlePhase;
  }, [battlePhase]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    isActionPlayingRef.current = isActionPlaying;
  }, [isActionPlaying]);

  useEffect(() => {
    battleIntroRef.current = battleIntro;
  }, [battleIntro]);

  useEffect(() => {
    unlockBattleAudio();
    startBattleMusic({ kind: ladderStageKind, mainMiniBoss: isMainMiniBoss });
    if (!bossStageBanner) return undefined;
    setBusy(true);
    setBattleIntro(true);
    playSound('rage', { volume: ladderStageKind === 'bigBoss' ? 1.1 : 0.85 });
    phaserEventSeqRef.current += 1;
    setPhaserVisualEvent({
      id: phaserEventSeqRef.current,
      kind: 'bossIntro',
      stageKind: ladderStageKind,
      title: ladderIntroTitle(ladderStageKind),
    });
    const t = setTimeout(() => {
      setBattleIntro(false);
      setBusy(false);
    }, ladderStageKind === 'bigBoss' ? 1250 : 900);
    return () => clearTimeout(t);
  }, [bossStageBanner, isMainMiniBoss, ladderStageKind]);

  useEffect(() => {
    if (!usePhaserBattleRenderer || phaserFailed || isActionPlaying || busy) return;
    phaserEventSeqRef.current += 1;
    setPhaserVisualEvent({
      id: phaserEventSeqRef.current,
      kind: 'turn',
      activeId: activeBattler,
      text: activeBattler === PLAYER_ID ? 'Your Turn' : `${labelCpu}'s Turn`,
      actionType: 'turn',
    });
  }, [activeBattler, busy, isActionPlaying, labelCpu, phaserFailed, usePhaserBattleRenderer]);

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
    autoMagicRef.current = false;
    setAutoMagicOn(false);
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

  function finishBattleNow(winner, np1, np2, extras = {}) {
    setBusy(false);
    setMainChestPhase(null);
    setPendingFinish(null);
    onFinish({
      winner,
      player1Snapshot: snapshotFight(np1),
      player2Snapshot: snapshotFight(np2),
      battleExtras: {
        ...battleExtras,
        mode: battleExtras?.mode ?? 'onePlayer',
        mainMiniBoss: isMainMiniBoss,
        ...extras,
      },
    });
  }

  function startMainChestDrop(np1, np2) {
    setPendingFinish({ np1, np2 });
    setMainChestPhase('dropping');
    setMainChestDrop(null);
    setMainChestGameData(null);
    chestDropY.setValue(-220);
    playSound('shop');
    Animated.spring(chestDropY, {
      toValue: 0,
      friction: 7,
      tension: 42,
      useNativeDriver: true,
    }).start(() => {
      setMainChestPhase('ready');
      showBanner('Tap the chest to open your reward!');
    });
  }

  async function handleMainChestPress() {
    if (mainChestPhase !== 'ready' || mainChestBusy || !pendingFinish) return;
    if (!onClaimMainMiniBossChest) {
      finishBattleNow(PLAYER_ID, pendingFinish.np1, pendingFinish.np2);
      return;
    }
    setMainChestBusy(true);
    playSound('shop');
    try {
      const result = await onClaimMainMiniBossChest({
        p1OwnedId: pendingFinish.np1?.ownedMonsterId ?? fighter1?.ownedMonsterId ?? null,
        enemyLevel: pendingFinish.np2?.level ?? fighter2?.level ?? 1,
      });
      setMainChestDrop(result?.drop ?? null);
      setMainChestGameData(result?.gameData ?? null);
      setMainChestPhase('revealed');
      if (result?.drop?.kind === 'monster') playSound('levelUp');
    } finally {
      setMainChestBusy(false);
    }
  }

  function handleMainChestContinue() {
    if (!pendingFinish) return;
    tapUi();
    finishBattleNow(PLAYER_ID, pendingFinish.np1, pendingFinish.np2, {
      mainChestDrop: mainChestDrop ?? undefined,
      mainChestClaimed: true,
      gameDataAfterChest: mainChestGameData ?? undefined,
    });
  }

  function wrapUpBattle(winnerSide, np1, np2) {
    stopAutoMagic();
    clearTimers();
    clearAttackEffects();
    setIsActionPlaying(false);
    setBusy(true);
    resetPoses();
    showBanner(
      winnerSide === PLAYER_ID ? `${labelP1} wins!` : winnerSide === CPU_ID ? `${labelCpu} wins!` : 'Draw!',
    );
    const winner = winnerSide === PLAYER_ID ? PLAYER_ID : winnerSide === CPU_ID ? CPU_ID : 'draw';
    schedule(RESULT_SFX_DELAY_MS, () => {
      if (winner === PLAYER_ID) playSound('win');
      else if (winner === CPU_ID) playSound('lose');
    });

    const mainBossWin =
      winner === PLAYER_ID
      && isMainMiniBoss
      && (battleExtras?.mode === 'onePlayer' || battleExtras?.mode == null)
      && battleExtras?.mode !== 'monsterLadder';

    if (mainBossWin) {
      schedule(RESULT_SFX_DELAY_MS + 320, () => startMainChestDrop(np1, np2));
      return;
    }

    schedule(RESULT_SFX_DELAY_MS + 280, () => {
      finishBattleNow(winner, np1, np2);
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
    setIsActionPlaying(false);
    showBanner(bannerOverride || ticked.message || 'Choose your move');
    if (autoMagicRef.current && opponentIsAi && activeBattlerRef.current === PLAYER_ID) {
      schedule(150, () => tryAutoMagicAttack());
    }
  }

  function stopAutoMagic(banner) {
    if (!autoMagicRef.current) return;
    autoMagicRef.current = false;
    setAutoMagicOn(false);
    if (banner) showBanner(banner);
  }

  function tryAutoMagicAttack() {
    if (!autoMagicRef.current || !opponentIsAi) return;
    if (
      battleIntroRef.current ||
      isActionPlayingRef.current ||
      busyRef.current ||
      battlePhaseRef.current !== 'chooseAction'
    ) {
      return;
    }
    if (activeBattlerRef.current !== PLAYER_ID) return;
    const attacker = p1Ref.current;
    if (!attacker) return;
    const skill = pickPlayerAutoMagic(attacker);
    if (!skill) {
      stopAutoMagic('Auto magic off — no MP');
      return;
    }
    startBattleAudioFromInput();
    runAttack({
      attackerId: PLAYER_ID,
      defenderId: CPU_ID,
      bannerText: `${skill.name}!`,
      skill,
      strikeKind: 'magic',
      onComplete: strikeAftermath(runCpuCounter),
    });
  }

  function toggleAutoMagic() {
    tapUi();
    if (autoMagicRef.current) {
      stopAutoMagic('Auto magic off');
      return;
    }
    if (!opponentIsAi) {
      showBanner('Auto magic: vs CPU only');
      return;
    }
    autoMagicRef.current = true;
    setAutoMagicOn(true);
    showBanner('Auto magic on');
    schedule(120, () => tryAutoMagicAttack());
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

  function playImpactSfx(fx) {
    if (actionSfxRef.current.impact) return;
    actionSfxRef.current.impact = true;
    if (fx?.critical && fx?.damage > 0) {
      playSound('critical');
    } else if (fx?.damage > 0 && fx?.strikeKind !== 'magic') {
      if (fx?.sfxKey) playSound(fx.sfxKey);
      else playSound('hit', { effectType: fx?.effectType });
    } else if (fx?.superBomb && fx?.damage > 0) {
      playSound('super');
    }
  }

  function applyImpactVisuals(defId, fx) {
    if (usePhaserBattleRenderer && !phaserFailed) {
      if (fx?.damage > 0) duckBgm(fx?.critical ? 300 : 220);
      playImpactSfx(fx);
      return;
    }
    setDefenderFlash(defId);
    if (fx?.sicklyFlash) {
      setSicklyFlash(defId);
      schedule(500, () => setSicklyFlash(0));
    }
    schedule(400, () => setDefenderFlash(0));
    if (fx?.damage > 0) {
      duckBgm(fx?.critical ? 300 : 220);
      triggerHitStop(fx?.critical ? ART.hitStopCrit : ART.hitStop);
    }
    if (fx?.critical && fx?.damage > 0) {
      doShake('crit');
    } else if (fx?.damage > 0) {
      doShake('normal');
    }
    playImpactSfx(fx);
  }

  function emitPhaserActionResult(result) {
    if (!usePhaserBattleRenderer || phaserFailed) return;
    phaserEventSeqRef.current += 1;
    setPhaserVisualEvent({
      id: phaserEventSeqRef.current,
      kind: 'actionResult',
      ...result,
    });
  }

  function applyPendingHp() {
    const pending = pendingStrikeRef.current;
    if (!pending?.np1After || !pending?.np2After) return;
    setP1(pending.np1After);
    setP2(pending.np2After);
    p1Ref.current = pending.np1After;
    p2Ref.current = pending.np2After;
    setActiveAttackEffect((prev) =>
      prev ? { ...prev, revealDamage: true, damage: pending.dmg } : prev,
    );
  }

  function finishActionSequence() {
    const pending = pendingStrikeRef.current;
    if (!pending) return;
    pendingStrikeRef.current = null;
    if (pending.safetyId) clearTimeout(pending.safetyId);
    clearAttackEffects();
    resetPoses();
    setIsActionPlaying(false);
    setBusy(false);
    setBattlePhase('chooseAction');
    if (pending.onDone) pending.onDone(pending.np1After, pending.np2After);
  }

  function runAttack({
    attackerId,
    defenderId,
    bannerText,
    onComplete,
    skill: skillIn,
    strikeKind: strikeKindIn,
    superBomb = false,
  }) {
    if (isActionPlaying) return;

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
      if (autoMagicRef.current) stopAutoMagic('Auto magic off — no MP');
      else showBanner('Not enough MP!');
      setBusy(false);
      setIsActionPlaying(false);
      setBattlePhase('chooseAction');
      setMenuMode(autoMagicRef.current ? 'main' : 'magic');
      return;
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
    const timing = getActionTiming({
      strikeKind,
      dodged: resolved.dodged,
      defended: resolved.defended,
      critical: resolved.critical,
      superBomb,
    });

    actionSfxRef.current = { launch: false, dodge: false, impact: false };
    setIsActionPlaying(true);
    setBusy(true);
    setBattlePhase('resolveAttack');
    setMenuMode('main');
    clearAttackEffects();
    showBanner(bannerText || skill?.name || 'Attack');

    if (attackerId === PLAYER_ID) {
      setP2Pose('idle');
      if (!usePhaserBattleRenderer) setP1Pose(superBomb ? 'superWindup' : strikeKind === 'magic' ? 'cast' : 'idle');
      if (!usePhaserBattleRenderer) setP1Emotion('happy');
      setP2Emotion('angry');
    } else {
      setP1Pose('idle');
      if (!usePhaserBattleRenderer) setP2Pose(superBomb ? 'superWindup' : strikeKind === 'magic' ? 'cast' : 'idle');
      if (!usePhaserBattleRenderer) setP2Emotion('happy');
      setP1Emotion('angry');
    }

    const mpSpentAtk = { ...atk, mp: Math.max(0, atk.mp - mpCost) };
    setP1(attackerId === PLAYER_ID ? mpSpentAtk : curP1);
    setP2(attackerId === CPU_ID ? mpSpentAtk : curP2);
    if (attackerId === PLAYER_ID) p1Ref.current = mpSpentAtk;
    else p2Ref.current = mpSpentAtk;

    let nextDef = resolved.dodged ? { ...def } : { ...def, hp: Math.max(0, def.hp - dmg) };
    if (dmg > 0 && strikeKind === 'magic' && !resolved.dodged) {
      nextDef = maybeApplySkillStatus(nextDef, skill);
    }

    const np1After =
      attackerId === PLAYER_ID
        ? mpSpentAtk
        : defenderId === PLAYER_ID
          ? nextDef
          : { ...curP1 };
    const np2After =
      attackerId === CPU_ID
        ? mpSpentAtk
        : defenderId === CPU_ID
          ? nextDef
          : { ...curP2 };

    const visuals = resolveAttackVisuals(skill, { templateId: atk.monsterTemplateId });
    const shouldAttackerJump = strikeKind !== 'magic';

    effectSeqRef.current += 1;
    const effectPayload = {
      type: strikeKind === 'magic' ? 'magic' : 'normal',
      moveName: skill?.name ?? 'Attack',
      strikeKind,
      element: skill?.element ?? atk.element,
      effectType: skill?.effectType ?? 'normal',
      skillId: skill?.id,
      animKind: visuals.animKind,
      sfxKey: visuals.sfxKey,
      sicklyFlash: visuals.sicklyFlash,
      critical: resolved.critical,
      weak: resolved.weak,
      dodged: !!resolved.dodged,
      defended: !!resolved.defended,
      damage: dmg,
      revealDamage: false,
      superBomb,
      attackerId,
      defenderId,
      attackerTemplateId: atk.monsterTemplateId,
      projectileId: visuals.projectileId,
      useProjectileAnim: true,
      actionTiming: timing,
      seq: effectSeqRef.current,
    };

    const safetyId = schedule(timing.total + 400, () => {
      if (pendingStrikeRef.current) finishActionSequence();
    });

    pendingStrikeRef.current = {
      np1After,
      np2After,
      dmg,
      effectPayload,
      defenderId,
      resolved,
      safetyId,
      onDone: (finalP1, finalP2) => {
        if (finalP1.hp <= 0) {
          wrapUpBattle(CPU_ID, finalP1, finalP2);
          return;
        }
        if (finalP2.hp <= 0) {
          wrapUpBattle(PLAYER_ID, finalP1, finalP2);
          return;
        }
        if (onComplete) onComplete(finalP1, finalP2);
        else endRound(finalP1, finalP2);
      },
    };

    emitPhaserActionResult({
      attackerId,
      defenderId,
      actionType: strikeKind === 'magic' ? 'magic' : 'physical',
      skillId: skill?.id,
      skillName: skill?.name ?? 'Attack',
      element: skill?.element ?? atk.element,
      damage: dmg,
      crit: !!resolved.critical,
      dodged: !!resolved.dodged,
      defended: !!resolved.defended,
      hpAfter: defenderId === PLAYER_ID ? np1After.hp : np2After.hp,
      mpAfter: attackerId === PLAYER_ID ? np1After.mp : np2After.mp,
      miniBoss: ladderStageKind === 'miniBoss',
      boss: ladderStageKind === 'bigBoss',
    });

    if (strikeKind === 'magic' && !actionSfxRef.current.launch) {
      actionSfxRef.current.launch = true;
      playSoundForSkill(skill, strikeKind);
    }

    schedule(timing.attackerEnd, () => {
      if (usePhaserBattleRenderer && !phaserFailed) return;
      setFlyStrikeP1(attackerId === PLAYER_ID && shouldAttackerJump);
      setFlyStrikeP2(attackerId === CPU_ID && shouldAttackerJump);
      if (attackerId === PLAYER_ID) setP1Pose('lunge');
      else setP2Pose('lunge');
      setActiveAttackEffect({ ...effectPayload, seq: effectSeqRef.current });
    });

    schedule(timing.defenderAt, () => {
      if (resolved.dodged) {
        if (!actionSfxRef.current.dodge) {
          actionSfxRef.current.dodge = true;
          playSound('dodge');
        }
        if (!usePhaserBattleRenderer || phaserFailed) {
          if (defenderId === PLAYER_ID) setP1Pose('dodge');
          else setP2Pose('dodge');
        }
        return;
      }
      if (resolved.defended) {
        if (!usePhaserBattleRenderer || phaserFailed) {
          if (defenderId === PLAYER_ID) setDefendGlowP1(true);
          else setDefendGlowP2(true);
        }
        schedule(520, () => {
          setDefendGlowP1(false);
          setDefendGlowP2(false);
        });
      }
      if (!usePhaserBattleRenderer || phaserFailed) {
        if (attackerId === PLAYER_ID) setP2Pose('hit');
        else setP1Pose('hit');
      }
    });

    schedule(timing.impactAt, () => {
      if (!resolved.dodged) {
        applyPendingHp();
        applyImpactVisuals(defenderId, { ...effectPayload, damage: dmg });
        if (!resolved.critical && !resolved.weak && !resolved.defended && strikeKind === 'magic') {
          const elMsg = elementBannerText(resolved.elementRelation);
          if (elMsg) showBanner(elMsg);
        }
      }
    });

    schedule(timing.total, () => finishActionSequence());
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

  function startBattleAudioFromInput() {
    unlockBattleAudio();
    startBattleMusic({ kind: ladderStageKind, mainMiniBoss: isMainMiniBoss });
  }

  function tapUi() {
    startBattleAudioFromInput();
    playUiSfx();
  }

  function handleFight() {
    if (isActionPlaying || busy || battlePhase !== 'chooseAction') return;
    startBattleAudioFromInput();
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
    if (isActionPlaying || busy || battlePhase !== 'chooseAction') return;
    tapUi();
    setMenuMode('magic');
    showBanner('Pick a magic skill');
  }

  function handleMagicBack() {
    if (isActionPlaying || busy) return;
    tapUi();
    setMenuMode('main');
    showBanner('Choose your move');
  }

  function handleMagicSkill(skill) {
    if (isActionPlaying || busy || battlePhase !== 'chooseAction' || !skill) return;
    const { attackerId, defenderId, attacker } = attackSidesForActiveBattler();
    if (!canAffordSkill(attacker, skill)) {
      showBanner('Not enough MP!');
      return;
    }
    startBattleAudioFromInput();
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
    if (isActionPlaying || busy) return;
    tapUi();
    setFleeConfirmOpen(true);
  }

  function handleStayBattle() {
    tapUi();
    setFleeConfirmOpen(false);
  }

  function handleConfirmFlee() {
    tapUi();
    stopAutoMagic();
    setFleeConfirmOpen(false);
    const latestP1 = p1Ref.current ?? p1;
    const latestP2 = p2Ref.current ?? p2;
    onFinish({
      winner: CPU_ID,
      player1Snapshot: snapshotFight({ ...latestP1, hp: 0 }),
      player2Snapshot: snapshotFight(latestP2),
      battleExtras: { ...battleExtras, fled: true, mainMiniBoss: isMainMiniBoss },
    });
  }

  const p1Mood = moodFor(p1, p1Emotion);
  const p2Mood = moodFor(p2, p2Emotion);
  const actionsEnabled = !battleIntro && !isActionPlaying && !busy && battlePhase === 'chooseAction';
  const runEnabled = !battleIntro && !isActionPlaying && !busy;
  const autoToggleEnabled = !battleIntro && opponentIsAi;
  const actingFighter = activeBattler === CPU_ID ? p2 : p1;
  const magicSkills =
    actingFighter?.skills?.magic ?? getMagicSkills(actingFighter?.monsterTemplateId ?? '');
  const actingElementUi = ELEMENT_UI[actingFighter?.element] ?? ELEMENT_UI.earth;
  const { width, height } = useWindowDimensions();
  const battleMobile = isMobileLayout(width, height);
  const phaserArenaHeight = Math.max(
    battleMobile ? 420 : 560,
    Math.min(battleMobile ? 560 : 760, height - (battleMobile ? 170 : 135)),
  );
  const phaserBattleState = useMemo(() => ({
    player: fighterToPhaserState(p1, labelP1),
    enemy: fighterToPhaserState(p2, labelCpu),
    activeId: activeBattler,
    round,
    bannerMessage,
  }), [activeBattler, bannerMessage, labelCpu, labelP1, p1, p2, round]);

  return (
    <View style={[styles.root, WEB_GAME_TOUCH_STYLE]} {...gameSurfaceDataProps()}>
      <View style={[styles.battleFrame, WEB_GAME_TOUCH_STYLE]} {...gameSurfaceDataProps()}>
        <View style={[styles.arenaField, WEB_GAME_TOUCH_STYLE]} pointerEvents="box-none" {...gameSurfaceDataProps()}>
          <View style={styles.arenaInner}>
          {usePhaserBattleRenderer && !phaserFailed ? (
            <>
              <PhaserBattleView
                battleState={phaserBattleState}
                visualEvent={phaserVisualEvent}
                onVisualEventComplete={(event) => {
                  if (typeof __DEV__ !== 'undefined' && __DEV__) {
                    console.debug('[battle-animation] visual event completed', {
                      type: event?.actionType,
                      damage: event?.damage,
                      crit: !!event?.crit,
                      dodged: !!event?.dodged,
                    });
                  }
                }}
                onError={(message) => {
                  console.warn('[battle-animation] Phaser renderer fallback:', message);
                  setPhaserFailed(true);
                }}
                height={phaserArenaHeight}
              />
            </>
          ) : (
            <>
              <RpgBattleArena
                mainMiniBossEncounter={isMainMiniBoss && battleExtras?.mode !== 'monsterLadder'}
                enemyStageKind={ladderStageKind}
                ladderRegionName={ladderRegionName}
                ladderBossName={ladderBossName}
                p1={p1}
                p2={p2}
                p1Mood={p1Mood}
                p2Mood={p2Mood}
                p1Pose={p1Pose}
                p2Pose={p2Pose}
                activeTurn={isActionPlaying || busy ? CPU_ID : activeBattler}
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
                  sequenceControlled
                />
              ) : null}
            </>
          )}
          {battleExtras?.mode === 'monsterLadder' ? (
            <View style={[styles.ladderStagePill, bossStageBanner && styles.ladderStagePillBoss]} pointerEvents="none">
              <Text style={styles.ladderStagePillMain} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
                {ladderStagePillLabel}
              </Text>
              {bossStageBanner ? <Text style={styles.ladderStagePillBossTxt}>{bossStageBanner}</Text> : null}
            </View>
          ) : null}
          {battleExtras?.mode !== 'monsterLadder' && isMainMiniBoss ? (
            <View style={[styles.ladderStagePill, styles.ladderStagePillBoss]} pointerEvents="none">
              <Text style={styles.ladderStagePillMain}>Mini Boss Encounter</Text>
              <Text style={styles.ladderStagePillBossTxt}>50% stronger · Chest reward</Text>
            </View>
          ) : null}
          {battleIntro && bossStageBanner ? (
            <View
              style={[
                styles.bossIntroOverlay,
                ladderStageKind === 'bigBoss' && styles.bossIntroOverlayStrong,
              ]}
              pointerEvents="none"
            >
              <Text style={styles.bossIntroStage}>{ladderStageLabel}</Text>
              <Text
                style={[
                  styles.bossIntroTitle,
                  ladderStageKind === 'bigBoss' && styles.bossIntroTitleStrong,
                ]}
              >
                {ladderIntroTitle(ladderStageKind)}
              </Text>
              <Text style={styles.bossIntroSub}>{bossStageBanner}</Text>
            </View>
          ) : null}
          </View>
        </View>

        <View style={[styles.actionDock, battleMobile && styles.actionDockMobile]}>
          {menuMode === 'magic' ? (
            <View style={styles.magicPanel}>
              <View style={styles.magicHeader}>
                <Pressable style={styles.magicBackBtn} onPress={handleMagicBack} disabled={isActionPlaying || busy}>
                  <Text style={styles.magicBackTxt}>← Back</Text>
                </Pressable>
                <Text style={styles.magicMp}>
                  MP {actingFighter?.mp ?? 0}/{actingFighter?.maxMp ?? actingFighter?.stats?.mp ?? 0}
                </Text>
              </View>
              <View style={styles.skillList}>
                {magicSkills.map((sk, index) => {
                  const ok = canAffordSkill(actingFighter, sk);
                  const el = ELEMENT_UI[sk.element] ?? actingElementUi;
                  const magicIcons = GAME_ASSETS.battleActions.magicVariants?.length
                    ? GAME_ASSETS.battleActions.magicVariants
                    : [GAME_ASSETS.battleActions.magic];
                  const magicIcon = magicIcons[index % magicIcons.length];
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
                        source={{ uri: magicIcon }}
                        style={styles.skillActionIcon}
                        resizeMode="contain"
                        {...WEB_DECORATIVE_IMAGE_PROPS}
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
              onPress={() => {
                tapUi();
                handleFight();
              }}
            >
                <View style={[styles.btnFace, battleMobile && styles.btnFaceMobile, styles.fightFace]} pointerEvents="none">
                  <View style={styles.fightBtnShine} />
                  <Text style={[styles.arcadeBtnTxt, battleMobile && styles.arcadeBtnTxtMobile, styles.fightBtnTxt]}>
                    Basic Attack
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
                    Magic Attack
                  </Text>
                </View>
              </Pressable>
              <View style={[styles.runColumn, battleMobile && styles.runColumnMobile]}>
                {opponentIsAi ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.autoBtnOuter,
                      autoMagicOn && styles.autoBtnOuterOn,
                      pressed && autoToggleEnabled && styles.autoBtnPressed,
                      !autoToggleEnabled && styles.disabledBtn,
                    ]}
                    disabled={!autoToggleEnabled}
                    accessibilityRole="button"
                    accessibilityLabel={autoMagicOn ? 'Stop auto magic' : 'Start auto magic'}
                    onPress={() => {
                      tapUi();
                      toggleAutoMagic();
                    }}
                  >
                    <View
                      style={[
                        styles.autoFace,
                        battleMobile && styles.autoFaceMobile,
                        autoMagicOn && styles.autoFaceOn,
                      ]}
                      pointerEvents="none"
                    >
                      {autoMagicOn ? <View style={styles.autoFaceGlow} /> : null}
                      <Text
                        style={[
                          styles.autoBtnTxt,
                          battleMobile && styles.autoBtnTxtMobile,
                          autoMagicOn && styles.autoBtnTxtOn,
                        ]}
                      >
                        Auto
                      </Text>
                    </View>
                  </Pressable>
                ) : null}
                <Pressable
                  style={({ pressed }) => [
                    styles.arcadeBtn,
                    styles.runBtnOuter,
                    battleMobile && styles.runBtnOuterMobile,
                    pressed && runEnabled && styles.arcadeBtnPressed,
                    !runEnabled && styles.disabledBtn,
                  ]}
                  disabled={!runEnabled}
                  onPress={() => {
                    tapUi();
                    handleRun();
                  }}
                >
                  <View style={[styles.btnFace, battleMobile && styles.btnFaceMobile, styles.runFace]} pointerEvents="none">
                    <Text style={[styles.arcadeBtnTxt, battleMobile && styles.arcadeBtnTxtMobile, styles.runBtnTxt]}>
                      Flee
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
      {mainChestPhase ? (
        <View style={styles.mainChestOverlay} pointerEvents="box-none">
          {(mainChestPhase === 'dropping' || mainChestPhase === 'ready') ? (
            <Animated.View style={[styles.mainChestDropWrap, { transform: [{ translateY: chestDropY }] }]}>
              <Pressable
                onPress={handleMainChestPress}
                disabled={mainChestPhase !== 'ready' || mainChestBusy}
                style={({ pressed }) => [styles.mainChestTap, pressed && mainChestPhase === 'ready' && styles.mainChestTapPressed]}
              >
                <Image
                  source={{ uri: GAME_ASSETS.chestClosed }}
                  style={styles.mainChestImg}
                  resizeMode="contain"
                  {...WEB_DECORATIVE_IMAGE_PROPS}
                />
                {mainChestPhase === 'ready' ? (
                  <Text style={styles.mainChestTapHint}>Tap to open!</Text>
                ) : null}
              </Pressable>
            </Animated.View>
          ) : null}
          {mainChestPhase === 'revealed' && mainChestDrop ? (
            <View
              style={[
                styles.mainChestRevealPanel,
                { borderColor: (RARITY_UI[mainChestDrop.rarity] ?? RARITY_UI.common).border },
              ]}
            >
              <Image
                source={{ uri: GAME_ASSETS.chestOpen }}
                style={styles.mainChestImgOpen}
                resizeMode="contain"
                {...WEB_DECORATIVE_IMAGE_PROPS}
              />
              <Text style={styles.mainChestRevealKicker}>Mini Boss Chest</Text>
              <Text style={styles.mainChestRevealTitle}>{chestDropTitle(mainChestDrop)}</Text>
              {mainChestDrop.kind === 'gear' ? (
                <Text style={styles.mainChestRevealEmoji}>{getGear(mainChestDrop.id)?.emoji ?? mainChestDrop.emoji ?? '🎁'}</Text>
              ) : null}
              <Text style={styles.mainChestRevealSub}>{chestDropSubtitle(mainChestDrop)}</Text>
              <Pressable style={styles.mainChestContinueBtn} onPress={handleMainChestContinue}>
                <Text style={styles.mainChestContinueTxt}>Continue</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
      {fleeConfirmOpen ? (
        <View style={styles.fleeOverlay}>
          <View style={styles.fleePanel}>
            <Text style={styles.fleeTitle}>Flee battle?</Text>
            <Text style={styles.fleeMessage}>Running away will count as a loss.</Text>
            <View style={styles.fleeButtonRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stay in battle"
                onPress={handleStayBattle}
                style={({ pressed }) => [styles.fleeBtn, styles.stayBtn, pressed && styles.fleeBtnPressed]}
              >
                <Text style={[styles.fleeBtnText, styles.stayBtnText]}>Stay</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Flee battle"
                onPress={handleConfirmFlee}
                style={({ pressed }) => [styles.fleeBtn, styles.fleeBtnDanger, pressed && styles.fleeBtnPressed]}
              >
                <Text style={[styles.fleeBtnText, styles.fleeBtnDangerText]}>Flee</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' },
  battleFrame: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    flexDirection: 'column',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BATTLE.dockBorder,
    overflow: 'visible',
    backgroundColor: BATTLE.dockBorder,
  },
  arenaField: { flex: 1, minHeight: 0, width: '100%', position: 'relative', overflow: 'visible' },
  arenaInner: { flex: 1, width: '100%', minHeight: 0 },
  ladderStagePill: {
    position: 'absolute',
    top: '1.2%',
    left: '24%',
    right: '24%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(45, 27, 105, 0.9)',
    borderWidth: 2,
    borderColor: 'rgba(250, 204, 21, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 18,
  },
  ladderStagePillBoss: {
    backgroundColor: 'rgba(45, 27, 105, 0.9)',
    borderColor: '#facc15',
  },
  ladderStagePillMain: { color: '#fff', fontWeight: '900', fontSize: 11 },
  ladderStagePillBossTxt: { color: '#fde68a', fontWeight: '900', fontSize: 9, marginTop: 1 },
  bossIntroOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    padding: 24,
  },
  bossIntroOverlayStrong: {
    backgroundColor: 'rgba(32, 16, 63, 0.74)',
  },
  bossIntroStage: {
    color: '#cbd5e1',
    fontWeight: '900',
    fontSize: 18,
    marginBottom: 8,
  },
  bossIntroTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 34,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  bossIntroTitleStrong: {
    color: '#facc15',
    fontSize: 42,
  },
  bossIntroSub: {
    marginTop: 8,
    color: '#fde68a',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
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
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'web' ? 18 : 14,
  },
  menuRow: { flexDirection: 'row', gap: 6, justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' },
  menuRowMobile: {
    gap: 12,
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
  skillActionIcon: {
    width: 34,
    height: 34,
  },
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
  magicBtnTxt: { color: '#f8f0ff', fontSize: 18 },
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
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
  btnFaceMobile: {
    minHeight: 72,
    borderRadius: 15,
    borderWidth: 3,
    paddingHorizontal: 6,
  },
  arcadeBtnTxtMobile: {
    fontSize: 15,
    letterSpacing: 0.2,
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
  runBtnOuter: { flex: 1, paddingBottom: 4, minWidth: 76 },
  runBtnOuterMobile: { minWidth: 0, width: '100%' },
  runColumn: {
    flex: 0.92,
    minWidth: 76,
    gap: 6,
    alignItems: 'stretch',
    justifyContent: 'flex-end',
  },
  runColumnMobile: {
    flex: 1,
    minWidth: 0,
    maxWidth: '33.33%',
    gap: 8,
  },
  autoBtnOuter: {
    paddingBottom: 3,
    borderRadius: 10,
    overflow: 'visible',
    opacity: 0.52,
  },
  autoBtnOuterOn: {
    opacity: 0.72,
    shadowColor: '#e056fd',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  autoBtnPressed: {
    paddingBottom: 0,
    transform: [{ translateY: 2 }],
    opacity: 0.62,
  },
  autoFace: {
    minHeight: 34,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(108, 52, 131, 0.38)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(91, 44, 111, 0.42)',
    backgroundColor: 'rgba(108, 92, 231, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  autoFaceMobile: {
    minHeight: 38,
    borderRadius: 10,
  },
  autoFaceOn: {
    backgroundColor: 'rgba(155, 89, 182, 0.32)',
    borderColor: 'rgba(215, 189, 226, 0.45)',
    borderBottomColor: 'rgba(142, 68, 173, 0.5)',
  },
  autoFaceGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255,255,255, 0.14)',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  autoBtnTxt: {
    color: 'rgba(232, 218, 239, 0.78)',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  autoBtnTxtMobile: {
    fontSize: 13,
  },
  autoBtnTxtOn: {
    color: 'rgba(255, 249, 255, 0.92)',
  },
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
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.65,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.42)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  fightBtnTxt: { color: '#fff9f0', fontSize: 15 },
  fightBtnTxtMobile: { fontSize: 23 },
  defendBtnTxt: { color: '#f0fbff' },
  runBtnTxt: { color: '#263244', fontSize: 15, fontWeight: '900' },
  disabledBtn: { opacity: 0.42 },
  fleeOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5, 8, 18, 0.72)',
    paddingHorizontal: 20,
  },
  fleePanel: {
    width: '76%',
    maxWidth: 420,
    minWidth: 260,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#c28a3a',
    borderBottomWidth: 6,
    borderBottomColor: '#6f421b',
    backgroundColor: 'rgba(20, 25, 45, 0.96)',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 18,
  },
  fleeTitle: {
    color: '#ffe7a3',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  fleeMessage: {
    color: '#f8ead0',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  fleeButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    width: '100%',
  },
  fleeBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  fleeBtnPressed: {
    transform: [{ translateY: 3 }],
    borderBottomWidth: 2,
    opacity: 0.92,
  },
  stayBtn: {
    backgroundColor: '#2f6f57',
    borderColor: '#73d7a5',
    borderBottomColor: '#184332',
  },
  fleeBtnDanger: {
    backgroundColor: '#8f3f32',
    borderColor: '#f0a45f',
    borderBottomColor: '#522116',
  },
  fleeBtnText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stayBtnText: {
    color: '#effff5',
  },
  fleeBtnDangerText: {
    color: '#fff4dc',
  },
  mainChestOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4, 8, 20, 0.42)',
  },
  mainChestDropWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainChestTap: {
    alignItems: 'center',
    padding: 12,
  },
  mainChestTapPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  mainChestImg: {
    width: 148,
    height: 148,
  },
  mainChestImgOpen: {
    width: 112,
    height: 112,
    marginBottom: 6,
  },
  mainChestTapHint: {
    color: '#fde68a',
    fontWeight: '900',
    fontSize: 16,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mainChestRevealPanel: {
    width: '86%',
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.97)',
    padding: 20,
    alignItems: 'center',
    shadowColor: '#facc15',
    shadowOpacity: 0.55,
    shadowRadius: 16,
  },
  mainChestRevealKicker: {
    color: '#fde68a',
    fontWeight: '900',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mainChestRevealTitle: {
    color: '#fff4cf',
    fontWeight: '900',
    fontSize: 24,
    textAlign: 'center',
    marginTop: 4,
  },
  mainChestRevealEmoji: {
    fontSize: 42,
    marginVertical: 6,
  },
  mainChestRevealSub: {
    color: '#bbf7d0',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  mainChestContinueBtn: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#2f6f57',
    borderWidth: 2,
    borderColor: '#73d7a5',
    borderBottomWidth: 4,
    borderBottomColor: '#184332',
  },
  mainChestContinueTxt: {
    color: '#effff5',
    fontWeight: '900',
    fontSize: 16,
    textTransform: 'uppercase',
  },
});
