import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import BattleEffect from './BattleEffect';
import BattleLog from './BattleLog';
import ChaosEventBanner from './ChaosEventBanner';
import BattleDiceButton from './BattleDiceButton';
import RpgBattleArena from './RpgBattleArena';
import { CHAOS_EVENT_IDS, pickRandomChaosEvent, rulesForChaosEvent } from '../utils/chaosEvents';
import { pickRandomMagic, pickRandomNormal } from '../utils/moves';
import { resolveDiceBattleDamage, resolveSuperStrike } from '../utils/battleLogic';
import { playSfx } from '../utils/gameSounds';
import { rollDice } from '../utils/random';
import { playSound } from '../utils/sounds';
import { pickRandomTaunt } from '../utils/taunts';
import { BATTLE } from '../utils/gameTheme';

const MAGIC_COST = 10;
const SUPER_MP = 20;
const SUPER_NEED_DEFAULT = 3;
const RESOLVE_MS = 2200;
const LOG_MAX = 3;

function superNeedFor(fighter) {
  const n = fighter?.superNeedThreshold;
  return typeof n === 'number' && n >= 1 ? Math.floor(n) : SUPER_NEED_DEFAULT;
}

function seedFighter(p) {
  if (!p?.stats) return null;
  const parts = p.monsterParts && typeof p.monsterParts === 'object' ? p.monsterParts : {};
  return {
    monsterParts: {
      ...parts,
      species: parts.species ?? 0,
      body: parts.body ?? 0,
      head: parts.head ?? 0,
      eyes: parts.eyes ?? 0,
      mouth: parts.mouth ?? 0,
      horn: parts.horn ?? 0,
      tail: parts.tail ?? 0,
      hands: parts.hands ?? 0,
      legs: parts.legs ?? 0,
      colorIdx: parts.colorIdx ?? 0,
      cosmetics: Array.isArray(parts.cosmetics) ? parts.cosmetics : [],
    },
    stats: p.stats,
    hp: p.stats.hp,
    mp: p.stats.mp,
    combo: 0,
    superNeedThreshold: p.superNeedThreshold,
    monsterTemplateId: p.monsterTemplateId,
    ownedMonsterId: p.ownedMonsterId,
    displayName: p.displayName,
    rarity: p.rarity,
    level: p.level ?? 1,
    battleExp: p.battleExp ?? 0,
    battleExpToNext: p.battleExpToNext ?? 36,
  };
}

function snapshotFight(f) {
  return {
    monsterParts: { ...f.monsterParts, cosmetics: [...(f.monsterParts?.cosmetics || [])] },
    stats: f.stats,
    hp: f.hp,
    mp: f.mp,
    combo: f.combo,
    superNeedThreshold: f.superNeedThreshold,
    monsterTemplateId: f.monsterTemplateId,
    ownedMonsterId: f.ownedMonsterId,
    displayName: f.displayName,
    rarity: f.rarity,
    level: f.level,
    battleExp: f.battleExp,
    battleExpToNext: f.battleExpToNext,
  };
}

function isRage(fighter) {
  if (!fighter?.stats?.hp) return false;
  return fighter.hp / fighter.stats.hp <= 0.3 && fighter.hp > 0;
}

function moodFor(fighter, emotional) {
  if (isRage(fighter)) return 'dizzy';
  if (emotional === 'happy') return 'happy';
  if (emotional === 'angry') return 'angry';
  return 'neutral';
}

function applyChaosImmediate(ev, f1, f2) {
  const a = { ...f1 };
  const b = { ...f2 };
  switch (ev.id) {
    case CHAOS_EVENT_IDS.TOILET:
      a.hp = Math.max(0, a.hp - 10);
      b.hp = Math.max(0, b.hp - 10);
      break;
    case CHAOS_EVENT_IDS.AH_MA:
      a.mp = Math.max(0, a.mp - 5);
      b.mp = Math.max(0, b.mp - 5);
      break;
    case CHAOS_EVENT_IDS.SNACK:
      a.hp = Math.min(a.stats.hp, a.hp + 10);
      b.hp = Math.min(b.stats.hp, b.hp + 10);
      break;
    default:
      break;
  }
  return [a, b];
}

function diceShout(val) {
  if (val === 6) {
    const o = ['BIG ROLL!', 'HUGE NUMBER!', 'CLUTCH!'];
    return o[Math.floor(Math.random() * o.length)];
  }
  if (val === 1) return 'OH NO!';
  if (val >= 5) return 'BIG ROLL!';
  if (val >= 4) return 'Nice!';
  return '';
}

function elementScaleDmg(dmg, effectType, rain) {
  if (!rain || !dmg) return dmg;
  if (effectType === 'fire') return Math.max(1, Math.round(dmg * 0.8));
  if (effectType === 'water') return Math.max(1, Math.round(dmg * 1.3));
  return dmg;
}

export default function BattleScreen({
  fighter1,
  fighter2,
  onFinish,
  onExitBattle,
  battleIntroSubtitle = '',
  player1Name = 'Player 1',
  player2Name = 'Player 2',
  opponentLabel = 'Player 2',
  opponentIsAi = false,
  battleExtras = {},
}) {
  const labelP1 = player1Name || 'Player 1';
  const labelP2 = opponentIsAi ? player2Name || 'CPU' : player2Name || opponentLabel || 'Player 2';

  function nameFor(side) {
    return side === 1 ? labelP1 : labelP2;
  }
  const [round, setRound] = useState(1);
  const [battlePhase, setBattlePhase] = useState('player1Dice');
  const [diceP1, setDiceP1] = useState(null);
  const [diceP2, setDiceP2] = useState(null);
  const [diceSession, setDiceSession] = useState({ active: false, player: null, value: 1 });
  const [diceShoutText, setDiceShoutText] = useState('');
  const [attackerId, setAttackerId] = useState(null);
  const [strikeKind, setStrikeKind] = useState(null);
  const [p1, setP1] = useState(() => seedFighter(fighter1));
  const [p2, setP2] = useState(() => seedFighter(fighter2));
  const [log, setLog] = useState([]);
  const [instruction, setInstruction] = useState('');
  const [currentEffect, setCurrentEffect] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resultBlurb, setResultBlurb] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [defendGlowSide, setDefendGlowSide] = useState(null);
  const [p1Pose, setP1Pose] = useState('idle');
  const [p2Pose, setP2Pose] = useState('idle');
  const [p1Emotion, setP1Emotion] = useState('neutral');
  const [p2Emotion, setP2Emotion] = useState('neutral');
  const [p1Bubble, setP1Bubble] = useState('');
  const [p2Bubble, setP2Bubble] = useState('');
  const [chaosBanner, setChaosBanner] = useState(null);
  const [chaosRules, setChaosRules] = useState({ mummyNext: false, rain: false, skipAttackerTurn: false });
  const [chaosFx, setChaosFx] = useState(null);
  const [battleDim, setBattleDim] = useState(false);
  const [stageZoom] = useState(() => new Animated.Value(1));
  const [superJumpSide, setSuperJumpSide] = useState(null);

  const timerRef = useRef(null);
  const extraTimersRef = useRef([]);
  const diceP1Ref = useRef(null);
  const pendingDicePlayerRef = useRef(null);
  const chaosRulesRef = useRef(chaosRules);
  const shakeX = useRef(new Animated.Value(0)).current;
  const attackerRef = useRef(1);
  const battleExtrasRef = useRef(battleExtras);
  const throwP2Ref = useRef(() => {});
  const pickStrikeRef = useRef(() => {});
  const pickDefenseRef = useRef(() => {});

  useEffect(() => {
    battleExtrasRef.current = battleExtras;
  }, [battleExtras]);

  useEffect(() => {
    if (attackerId) attackerRef.current = attackerId;
  }, [attackerId]);

  useEffect(() => {
    chaosRulesRef.current = chaosRules;
  }, [chaosRules]);

  useEffect(() => {
    diceP1Ref.current = diceP1;
  }, [diceP1]);

  useEffect(() => {
    if (!chaosBanner) return undefined;
    const t = setTimeout(() => setChaosBanner(null), 2600);
    return () => clearTimeout(t);
  }, [chaosBanner]);

  useEffect(() => {
    if (!diceShoutText) return undefined;
    const t = setTimeout(() => setDiceShoutText(''), 1600);
    return () => clearTimeout(t);
  }, [diceShoutText]);

  useEffect(() => {
    let t;
    if (p1Bubble) t = setTimeout(() => setP1Bubble(''), 2400);
    return () => clearTimeout(t);
  }, [p1Bubble]);

  useEffect(() => {
    let t;
    if (p2Bubble) t = setTimeout(() => setP2Bubble(''), 2400);
    return () => clearTimeout(t);
  }, [p2Bubble]);

  const pushLine = useCallback((line) => {
    setLog((prev) => [...prev, line].slice(-LOG_MAX));
  }, []);

  const showBanner = useCallback((msg) => {
    if (msg) setBannerMessage(msg);
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

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    const msg = `${labelP1}'s Turn — tap your dice`;
    setInstruction(msg);
    setBannerMessage(msg);
  }, [labelP1]);

  function doShake(strength) {
    const mag = strength === 'super' ? 22 : strength === 'crit' ? 16 : 9;
    Animated.sequence([
      Animated.timing(shakeX, { toValue: mag, duration: 40, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -mag, duration: 42, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: mag * 0.55, duration: 36, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => {
    if (!currentEffect || currentEffect.superBomb || currentEffect.dodged) return;
    if (currentEffect.critical && currentEffect.damage > 0) {
      playSound('critical');
      void playSfx(attackerRef.current === 1 ? 'attackP1' : 'attackP2', { volume: 1 });
      doShake('crit');
      return;
    }
    if (currentEffect.damage > 0) {
      playSound('hit');
      void playSfx(attackerRef.current === 1 ? 'attackP1' : 'attackP2');
      doShake('normal');
    }
  }, [currentEffect]);

  const wrapUpBattle = useCallback(
    (np1, np2) => {
      let winner;
      if (np1.hp <= 0 && np2.hp <= 0) winner = 'draw';
      else if (np1.hp <= 0) winner = 2;
      else winner = 1;
      pushLine(winner === 'draw' ? 'Double KO!' : `${nameFor(winner)} wins!`);
      onFinish({
        winner,
        player1Snapshot: snapshotFight(np1),
        player2Snapshot: snapshotFight(np2),
        battleExtras: battleExtrasRef.current,
      });
    },
    [onFinish, pushLine, labelP1, labelP2],
  );

  function resetMonstersIdle() {
    setP1Pose('idle');
    setP2Pose('idle');
    setSuperJumpSide(null);
  }

  function applyMonsterPosesForStrike({ atkId, strike, dodged, defendMode, isSuper }) {
    if (isSuper) {
      if (atkId === 1) {
        setP1Pose('superWindup');
        setP2Pose('hit');
      } else {
        setP2Pose('superWindup');
        setP1Pose('hit');
      }
      return;
    }
    const atkPose = strike === 'magic' ? 'cast' : 'lunge';
    let defPose = 'hit';
    if (dodged) defPose = 'dodge';
    else if (defendMode === 'defend') defPose = 'defend';
    if (atkId === 1) {
      setP1Pose(atkPose);
      setP2Pose(defPose);
    } else {
      setP2Pose(atkPose);
      setP1Pose(defPose);
    }
  }

  function beginResolveCooldown(np1, np2, endingDead, blurb) {
    clearTimers();
    setP1(np1);
    setP2(np2);
    setBusy(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setCurrentEffect(null);
      setBusy(false);
      resetMonstersIdle();
      setP1Emotion('neutral');
      setP2Emotion('neutral');
      setDefendGlowSide(null);
      if (endingDead) wrapUpBattle(np1, np2);
      else {
        if (blurb) showBanner(blurb);
        schedule(1100, () => handleNextRound());
      }
    }, RESOLVE_MS);
  }

  const onDiceRollFinished = useCallback(
    (val) => {
      const playerId = pendingDicePlayerRef.current;
      setDiceShoutText(diceShout(val));
      if (playerId === 1) {
        setDiceP1(val);
        const rollMsg = `${labelP1} rolled ${val}!`;
        pushLine(rollMsg);
        showBanner(rollMsg);
        setBattlePhase('player2Dice');
        setInstruction(opponentIsAi ? `${labelP2} is rolling…` : `${labelP2}'s Turn — tap your dice`);
      } else if (playerId === 2) {
        setDiceP2(val);
        const rollMsg = `${labelP2} rolled ${val}!`;
        pushLine(rollMsg);
        showBanner(rollMsg);
        const p1v = diceP1Ref.current;
        if (val === p1v) {
          pushLine('Draw! Throw again.');
          showBanner('Draw — roll again!');
          setDiceP1(null);
          setDiceP2(null);
          setBattlePhase('player1Dice');
          setInstruction(`${labelP1}'s Turn — tap your dice`);
        } else {
          const atk = val > p1v ? 2 : 1;
          setAttackerId(atk);
          if (chaosRulesRef.current.skipAttackerTurn) {
            setChaosRules((r) => {
              const n = { ...r, skipAttackerTurn: false };
              chaosRulesRef.current = n;
              return n;
            });
            pushLine('Homework Monster stole the turn!');
            showBanner('Everyone studies…');
            setBusy(false);
            setDiceSession({ active: false, player: null, value: 1 });
            schedule(1400, () => handleNextRound());
            return;
          }
          setBattlePhase('chooseAttack');
          const fightMsg = `${nameFor(atk)} — Fight, Defend, or Run`;
          setInstruction(fightMsg);
          showBanner(fightMsg);
        }
      }
      setDiceSession({ active: false, player: null, value: 1 });
      setBusy(false);
    },
    [pushLine, labelP1, labelP2, opponentIsAi, showBanner],
  );

  useEffect(() => {
    if (!opponentIsAi || battlePhase !== 'player2Dice' || busy || diceSession.active || diceP1 == null) return undefined;
    const t = setTimeout(() => throwP2Ref.current(), 680);
    return () => clearTimeout(t);
  }, [battlePhase, opponentIsAi, busy, diceSession.active, diceP1]);

  useEffect(() => {
    if (!opponentIsAi || battlePhase !== 'chooseAttack' || attackerId !== 2 || busy || strikeKind != null) return undefined;
    const t = setTimeout(() => {
      const atk = p2;
      const need = superNeedFor(atk);
      const choices = ['normal'];
      if (atk.mp >= MAGIC_COST) choices.push('magic');
      if (atk.combo >= need && atk.mp >= SUPER_MP) choices.push('super');
      const pick = choices[Math.floor(Math.random() * choices.length)];
      pickStrikeRef.current(pick);
    }, 720);
    return () => clearTimeout(t);
  }, [battlePhase, attackerId, opponentIsAi, busy, strikeKind, p2.combo, p2.mp]);

  useEffect(() => {
    if (!opponentIsAi || battlePhase !== 'chooseDefense' || attackerId !== 1 || busy || strikeKind == null) return undefined;
    const t = setTimeout(() => {
      const mode = Math.random() < 0.42 ? 'dodge' : 'defend';
      pickDefenseRef.current(mode);
    }, 680);
    return () => clearTimeout(t);
  }, [battlePhase, attackerId, opponentIsAi, busy, strikeKind]);

  function handleThrowPlayer1Dice() {
    if (battlePhase !== 'player1Dice' || busy || diceSession.active) return;
    playSound('dice');
    void playSfx('dice');
    const v = rollDice();
    pendingDicePlayerRef.current = 1;
    setDiceShoutText('');
    setBusy(true);
    setDiceSession({ active: true, player: 1, value: v });
  }

  function handleThrowPlayer2Dice() {
    if (battlePhase !== 'player2Dice' || busy || diceP1 == null || diceSession.active) return;
    playSound('dice');
    void playSfx('dice');
    const v = rollDice();
    pendingDicePlayerRef.current = 2;
    setDiceShoutText('');
    setBusy(true);
    setDiceSession({ active: true, player: 2, value: v });
  }

  function fireTaunt(side, text) {
    if (side === 1) setP1Bubble(text);
    else setP2Bubble(text);
  }

  function handlePickDefense(mode) {
    if (battlePhase !== 'chooseDefense' || busy || attackerId == null || !strikeKind) return;

    const movePick = strikeKind === 'magic' ? pickRandomMagic() : pickRandomNormal();
    const defId = attackerId === 1 ? 2 : 1;
    const defName = nameFor(defId);

    let atkPaid = attackerId === 1 ? p1 : p2;
    const defSnap = attackerId === 1 ? p2 : p1;

    if (strikeKind === 'magic') {
      if (atkPaid.mp < MAGIC_COST) return;
      atkPaid = { ...atkPaid, mp: atkPaid.mp - MAGIC_COST };
    }

    const atkRage = isRage(atkPaid);
    if (atkRage) playSound('rage');

    const atkDice = attackerId === 1 ? diceP1 : diceP2;
    const defDice = attackerId === 1 ? diceP2 : diceP1;

    if (mode === 'defend') {
      setDefendGlowSide(defId);
      if (defId === 1) setP1Pose('defend');
      else setP2Pose('defend');
    }

    const resolved = resolveDiceBattleDamage({
      attacker: atkPaid,
      defender: defSnap,
      attackerDice: atkDice ?? 1,
      defenderDice: defDice ?? 1,
      defenseChoice: mode,
      strikeKind: strikeKind === 'magic' ? 'magic' : 'normal',
      rageMode: atkRage,
    });

    const dodged = resolved.dodged;
    let dmgFinal = dodged ? 0 : resolved.damage;

    if (!dodged && chaosRules.mummyNext && dmgFinal > 0) {
      dmgFinal = Math.max(1, Math.round(dmgFinal * 0.7));
      setChaosRules((r) => ({ ...r, mummyNext: false }));
    }
    if (!dodged) {
      dmgFinal = elementScaleDmg(dmgFinal, movePick.effectType, chaosRules.rain);
    }

    const atkName = nameFor(attackerId);
    pushLine(`${atkName} uses ${movePick.name}!`);
    pushLine(`${defName} chooses ${mode === 'defend' ? 'Defend' : 'Dodge'}!`);
    if (mode === 'defend') {
      showBanner(`${defName} is defending!`);
    } else {
      showBanner(`${defName} tries to dodge!`);
    }
    if (mode === 'dodge' && dodged) {
      pushLine('Dodge succeeded!');
      playSound('dodge');
      fireTaunt(defId, pickRandomTaunt());
    }
    if (mode === 'dodge' && !dodged) pushLine('Dodge failed!');
    if (!dodged) {
      const dmgMsg = `${defName} took ${dmgFinal} damage!`;
      pushLine(dmgMsg);
      showBanner(dmgMsg);
    }
    if (resolved.critical && !dodged && dmgFinal > 0) {
      pushLine('Critical hit!');
      showBanner('Critical hit!');
      fireTaunt(attackerId, pickRandomTaunt());
    }
    if (resolved.weak && !dodged && dmgFinal > 0) {
      pushLine('Weak hit!');
      showBanner('Weak hit!');
    }

    let nextAtk = { ...atkPaid };
    let nextDef = { ...defSnap };

    if (dodged) nextAtk.combo = 0;
    else {
      nextAtk.combo = atkPaid.combo + 1;
      nextDef.hp = Math.max(0, defSnap.hp - dmgFinal);
      nextDef.combo = 0;
    }

    let np1;
    let np2;
    if (attackerId === 1) {
      np1 = nextAtk;
      np2 = nextDef;
    } else {
      np2 = nextAtk;
      np1 = nextDef;
    }

    if (!dodged && dmgFinal > 0 && movePick.effectType === 'smellySocks' && nextDef.hp <= 0) {
      pushLine(`${defName} is destroyed by stink cloud!`);
    }

    const atkComboEnd = attackerId === 1 ? np1.combo : np2.combo;
    const atkSnapForSuper = attackerId === 1 ? np1 : np2;
    const needHits = superNeedFor(atkSnapForSuper);
    if (!dodged && dmgFinal > 0 && atkComboEnd === needHits) {
      pushLine(`${nameFor(attackerId)} — SUPER READY`);
      fireTaunt(attackerId, pickRandomTaunt());
    }

    if (!dodged && dmgFinal > 0) {
      if (attackerId === 1) {
        setP1Emotion('happy');
        setP2Emotion('angry');
      } else {
        setP2Emotion('happy');
        setP1Emotion('angry');
      }
    } else if (dodged) {
      if (defId === 1) setP1Emotion('happy');
      else setP2Emotion('happy');
    }

    applyMonsterPosesForStrike({
      atkId: attackerId,
      strike: strikeKind,
      dodged,
      defendMode: mode,
      isSuper: false,
    });

    setCurrentEffect({
      type: strikeKind === 'magic' ? 'magic' : 'normal',
      moveName: movePick.name,
      effectType: movePick.effectType,
      emoji: movePick.emoji,
      critical: !!(resolved.critical && !dodged && dmgFinal > 0),
      dodged,
      dodgeFailed: mode === 'dodge' && !dodged,
      defended: mode === 'defend',
      damage: dodged ? 0 : dmgFinal,
      superBomb: false,
      rageTag: atkRage && !dodged && dmgFinal > 0,
      rageBoost: atkRage && movePick.effectType === 'fire' && !dodged && dmgFinal > 0,
    });
    setBattlePhase('resolveAttack');
    setInstruction(dodged ? 'Smoke escape!' : 'Battle clash!');
    setStrikeKind(null);

    const dead = np1.hp <= 0 || np2.hp <= 0;
    beginResolveCooldown(np1, np2, dead, dodged ? 'Dodge superstar!' : '');
  }

  function handlePickStrike(kind) {
    if (battlePhase !== 'chooseAttack' || busy || attackerId == null) return;

    const atkNow = attackerId === 1 ? p1 : p2;

    if (kind === 'super') {
      const need = superNeedFor(atkNow);
      if (atkNow.combo < need || atkNow.mp < SUPER_MP) return;
      runSuperAttack(attackerId, atkNow, attackerId === 1 ? p2 : p1);
      return;
    }

    if (kind === 'magic' && atkNow.mp < MAGIC_COST) return;

    fireTaunt(attackerId, pickRandomTaunt());

    setStrikeKind(kind);
    const defId = attackerId === 1 ? 2 : 1;
    setBattlePhase('chooseDefense');
    const defMsg = `${nameFor(defId)} — Defend or Dodge`;
    setInstruction(defMsg);
    showBanner(defMsg);
  }

  function runSuperAttack(attkId, atk, def) {
    attackerRef.current = attkId;
    const { damage } = resolveSuperStrike(atk.stats.attack, atk.stats.magic);
    const nextAtk = { ...atk, mp: atk.mp - SUPER_MP, combo: 0 };

    clearTimers();
    setBusy(true);
    setBattleDim(true);
    Animated.spring(stageZoom, { toValue: 1.08, friction: 6, useNativeDriver: true }).start();
    setSuperJumpSide(attkId === 1 ? 'left' : 'right');

    pushLine(`${nameFor(attkId)} unleashes Super Power!`);
    void playSfx('super');
    playSound('super');

    applyMonsterPosesForStrike({
      atkId: attkId,
      strike: 'magic',
      dodged: false,
      defendMode: null,
      isSuper: true,
    });

    setCurrentEffect({
      type: 'super',
      moveName: 'Super Power',
      effectType: 'super',
      emoji: '💣',
      critical: false,
      dodged: false,
      dodgeFailed: false,
      defended: false,
      damage,
      superBomb: true,
      superPhase: 'windup',
    });
    setBattlePhase('resolveAttack');
    setInstruction('Charging mega strike…');

    if (attkId === 1) {
      setP1Emotion('happy');
      setP2Emotion('angry');
    } else {
      setP2Emotion('happy');
      setP1Emotion('angry');
    }

    schedule(700, () => {
      const nextDef = { ...def, hp: Math.max(0, def.hp - damage), combo: 0 };
      const np1 = attkId === 1 ? nextAtk : nextDef;
      const np2 = attkId === 1 ? nextDef : nextAtk;
      setP1(np1);
      setP2(np2);
      setCurrentEffect((prev) => (prev ? { ...prev, superPhase: 'boom' } : prev));
      playSound('hit');
      doShake('super');
      pushLine(`BOOOOM! ${nameFor(attkId === 1 ? 2 : 1)} blasted for ${damage} damage!`);

      const dead = np1.hp <= 0 || np2.hp <= 0;
      schedule(3000, () => {
        setBattleDim(false);
        Animated.spring(stageZoom, { toValue: 1, friction: 7, useNativeDriver: true }).start();
        setCurrentEffect(null);
        setBusy(false);
        resetMonstersIdle();
        setP1Emotion('neutral');
        setP2Emotion('neutral');
        if (dead) wrapUpBattle(np1, np2);
        else {
          showBanner('Super fallout clears.');
          schedule(1100, () => handleNextRound());
        }
      });
    });
  }

  function handleNextRound() {
    if (busy) return;
    const nextR = round + 1;
    let n1 = p1;
    let n2 = p2;
    let newRules = { mummyNext: false, rain: false, skipAttackerTurn: false };
    if (nextR > 0 && nextR % 3 === 0) {
      const ev = pickRandomChaosEvent();
      setChaosBanner(ev);
      newRules = { mummyNext: false, rain: false, skipAttackerTurn: false, ...rulesForChaosEvent(ev) };
      const [a, b] = applyChaosImmediate(ev, n1, n2);
      n1 = a;
      n2 = b;
      pushLine(`CHAOS! ${ev.title}!`);
      if (ev.id === CHAOS_EVENT_IDS.TOILET) {
        setChaosFx('toilet');
        setTimeout(() => setChaosFx(null), 1400);
      }
    }
    setChaosRules(newRules);
    chaosRulesRef.current = newRules;
    setP1(n1);
    setP2(n2);
    setRound(nextR);
    setDiceP1(null);
    setDiceP2(null);
    setDiceSession({ active: false, player: null, value: 1 });
    setAttackerId(null);
    setStrikeKind(null);
    setCurrentEffect(null);
    setResultBlurb('');
    setBannerMessage('');
    setDefendGlowSide(null);
    setP1Emotion('neutral');
    setP2Emotion('neutral');
    resetMonstersIdle();
    setBattlePhase('player1Dice');
    setInstruction(`${labelP1}'s Turn — tap your dice`);
    showBanner(`${labelP1}'s Turn — tap your dice`);
  }

  const atkBtn = attackerId === 1 ? p1 : attackerId === 2 ? p2 : null;

  const activeTurn = (() => {
    if (battlePhase === 'player1Dice') return 1;
    if (battlePhase === 'player2Dice') return 2;
    if (battlePhase === 'chooseAttack') return attackerId ?? 1;
    if (battlePhase === 'chooseDefense') return attackerId === 1 ? 2 : 1;
    if (battlePhase === 'resolveAttack') return attackerId ?? 1;
    return 1;
  })();

  function turnPromptText() {
    if (battlePhase === 'player1Dice') return `${labelP1}'s Turn — tap your dice`;
    if (battlePhase === 'player2Dice') {
      if (opponentIsAi) return `${labelP2} is rolling…`;
      return `${labelP2}'s Turn — tap your dice`;
    }
    if (battlePhase === 'chooseAttack') return `${nameFor(attackerId)} — pick Fight`;
    if (battlePhase === 'chooseDefense') return `${nameFor(attackerId === 1 ? 2 : 1)} — Defend or Dodge`;
    return '';
  }

  const turnBadge = turnPromptText() || `${nameFor(activeTurn)}'s Turn`;

  function handleFightPress() {
    if (busy || diceSession.active) return;
    if (battlePhase === 'chooseAttack') {
      handlePickStrike('normal');
    }
  }

  function handleDefendPress() {
    if (busy || diceSession.active) return;
    if (battlePhase === 'chooseDefense') {
      handlePickDefense('defend');
    }
  }

  function handleRunPress() {
    if (busy || diceSession.active) return;
    if (typeof onExitBattle === 'function') {
      onExitBattle();
      return;
    }
    pushLine('You fled from battle!');
    onFinish({
      winner: 2,
      player1Snapshot: snapshotFight(p1),
      player2Snapshot: snapshotFight(p2),
      battleExtras: { ...battleExtrasRef.current, fled: true },
    });
  }

  function renderMenuBtn(key, label, onPress, tone, disabled = false) {
    return (
      <TouchableOpacity
        key={key}
        style={[styles.menuBtn, styles[tone], disabled && styles.disabledBtn]}
        disabled={disabled || busy || diceSession.active}
        onPress={onPress}
      >
        <Text style={styles.menuBtnTxt}>{label}</Text>
      </TouchableOpacity>
    );
  }

  function renderDiceControl() {
    const isP1Roll = battlePhase === 'player1Dice';
    const isP2Roll = battlePhase === 'player2Dice';
    const p1CanRoll = isP1Roll && !busy && !diceSession.active;
    const p2CanRoll = isP2Roll && !busy && !diceSession.active && diceP1 != null;
    const p1Rolling = diceSession.active && diceSession.player === 1;
    const p2Rolling = diceSession.active && diceSession.player === 2;
    const p1Active =
      isP1Roll || (activeTurn === 1 && (battlePhase === 'chooseAttack' || battlePhase === 'chooseDefense'));
    const p2Active =
      isP2Roll || (activeTurn === 2 && (battlePhase === 'chooseAttack' || battlePhase === 'chooseDefense'));
    const prompt = turnPromptText();

    return (
      <View style={styles.diceDock}>
        {prompt ? (
          <Text style={styles.dicePrompt} numberOfLines={2}>
            {prompt}
          </Text>
        ) : null}
        <View style={styles.dualDiceRow}>
          <BattleDiceButton
            sideLabel={labelP1}
            rolling={p1Rolling}
            rollValue={diceSession.value}
            shownValue={p1Rolling ? null : diceP1}
            canRoll={p1CanRoll}
            active={p1Active}
            dimmed={!p1Active && !p1CanRoll}
            onPress={handleThrowPlayer1Dice}
            onRollComplete={onDiceRollFinished}
            size={diceSize}
            durationMs={1000}
            compact
          />
          <BattleDiceButton
            sideLabel={labelP2}
            rolling={p2Rolling}
            rollValue={diceSession.value}
            shownValue={p2Rolling ? null : diceP2}
            canRoll={p2CanRoll}
            active={p2Active}
            dimmed={!p2Active && !p2CanRoll}
            onPress={handleThrowPlayer2Dice}
            onRollComplete={onDiceRollFinished}
            size={diceSize}
            durationMs={1000}
            compact
          />
        </View>
      </View>
    );
  }

  function renderActionDock() {
    const sub = [];
    const fightEnabled = !busy && !diceSession.active && battlePhase === 'chooseAttack';
    const defendEnabled =
      !busy && !diceSession.active && battlePhase === 'chooseDefense';

    if (battlePhase === 'chooseAttack' && atkBtn) {
      const magLocked = atkBtn.mp < MAGIC_COST;
      const needHits = superNeedFor(atkBtn);
      const superLocked = atkBtn.combo < needHits || atkBtn.mp < SUPER_MP;
      sub.push(
        renderMenuBtn('n', 'Normal', () => handlePickStrike('normal'), 'grass'),
        renderMenuBtn('m', 'Magic', () => handlePickStrike('magic'), 'violet', magLocked),
        renderMenuBtn('su', 'Super', () => handlePickStrike('super'), 'pink', superLocked),
      );
    }
    if (battlePhase === 'chooseDefense') {
      sub.push(renderMenuBtn('dd', 'Dodge', () => handlePickDefense('dodge'), 'smoke'));
    }

    const fightLabel = 'Fight';

    return (
      <View style={styles.actionDock}>
        <View style={styles.menuRow}>
          {renderMenuBtn('fight', fightLabel, handleFightPress, 'fight', !fightEnabled)}
          {renderMenuBtn('defend', 'Defend', handleDefendPress, 'shield', !defendEnabled)}
          {renderMenuBtn('run', 'Run', handleRunPress, 'run')}
        </View>
        {sub.length ? <View style={styles.subMenuRow}>{sub}</View> : null}

        <View style={styles.logWrap}>
          <BattleLog lines={log} maxLines={LOG_MAX} compact />
        </View>

        {instruction ? (
          <Text style={styles.miniNote} numberOfLines={1}>
            {instruction}
          </Text>
        ) : null}
        {resultBlurb ? (
          <Text style={styles.miniNote} numberOfLines={1}>
            {resultBlurb}
          </Text>
        ) : null}
      </View>
    );
  }

  const p1Mood = moodFor(p1, p1Emotion);
  const p2Mood = moodFor(p2, p2Emotion);

  throwP2Ref.current = handleThrowPlayer2Dice;
  pickStrikeRef.current = handlePickStrike;
  pickDefenseRef.current = handlePickDefense;

  const { height: vh, width: vw } = useWindowDimensions();
  const diceSize = vh < 680 || vw < 520 ? 58 : 66;

  const floaterMessage =
    diceShoutText ||
    (log.length && !bannerMessage ? log[log.length - 1] : '') ||
    instruction ||
    resultBlurb ||
    '';

  return (
    <View style={styles.root}>
      <View style={styles.battleFrame}>
        {chaosBanner ? (
          <View style={styles.chaosWrap}>
            <ChaosEventBanner event={chaosBanner} />
          </View>
        ) : null}

        <View style={styles.arenaField} pointerEvents="box-none">
          <RpgBattleArena
            p1={p1}
            p2={p2}
            p1Mood={p1Mood}
            p2Mood={p2Mood}
            p1Pose={p1Pose}
            p2Pose={p2Pose}
            p1Bubble={p1Bubble}
            p2Bubble={p2Bubble}
            diceP1={diceP1}
            diceP2={diceP2}
            activeTurn={activeTurn}
            round={round}
            turnBadge={turnBadge}
            player1Label={labelP1}
            player2Label={labelP2}
            centerDock={renderDiceControl()}
            battleDim={battleDim}
            shakeX={shakeX}
            stageZoom={stageZoom}
            superJumpSide={superJumpSide}
            p1Rage={isRage(p1)}
            p2Rage={isRage(p2)}
            defendGlowP1={defendGlowSide === 1}
            defendGlowP2={defendGlowSide === 2}
          />
          {bannerMessage ? (
            <View style={styles.battleBanner} pointerEvents="none">
              <Text style={styles.battleBannerTxt} numberOfLines={3}>
                {bannerMessage}
              </Text>
            </View>
          ) : floaterMessage ? (
            <View style={styles.battleFloater} pointerEvents="none">
              <Text style={styles.battleFloaterTxt} numberOfLines={2}>
                {floaterMessage}
              </Text>
            </View>
          ) : null}
          {battlePhase === 'resolveAttack' && currentEffect ? (
            <View style={styles.fxStrip} pointerEvents="none">
              <BattleEffect currentEffect={currentEffect} instruction="" />
            </View>
          ) : null}
        </View>

        {renderActionDock()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    overflow: 'hidden',
  },
  introTiny: {
    backgroundColor: 'rgba(255,243,224,0.95)',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ff9f1c',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 3,
    fontWeight: '800',
    fontSize: 12,
    color: '#4a2800',
    textAlign: 'center',
  },
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
  arenaField: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  chaosWrap: {
    position: 'absolute',
    top: 2,
    left: 4,
    right: 4,
    zIndex: 30,
  },
  battleFloater: {
    position: 'absolute',
    top: '18%',
    left: '8%',
    right: '8%',
    zIndex: 18,
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '84%',
    backgroundColor: 'rgba(26, 26, 46, 0.88)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffd166',
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  battleFloaterTxt: {
    fontWeight: '800',
    fontSize: 16,
    color: '#fff8e8',
    textAlign: 'center',
    lineHeight: 22,
  },
  battleBanner: {
    position: 'absolute',
    top: '14%',
    left: '5%',
    right: '5%',
    zIndex: 20,
    alignItems: 'center',
    alignSelf: 'center',
    maxWidth: '92%',
    backgroundColor: 'rgba(26, 26, 46, 0.94)',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#ffd166',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  battleBannerTxt: {
    fontWeight: '900',
    fontSize: 22,
    color: '#fff8e8',
    textAlign: 'center',
    lineHeight: 28,
  },
  dualDiceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingHorizontal: 4,
  },
  fxStrip: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '24%',
    alignItems: 'center',
    zIndex: 19,
    pointerEvents: 'none',
  },
  diceDock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    width: '100%',
  },
  dicePrompt: {
    fontWeight: '900',
    fontSize: 14,
    color: '#1a1a2e',
    textAlign: 'center',
    marginBottom: 4,
    backgroundColor: 'rgba(255,248,220,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2d2d44',
    overflow: 'hidden',
    maxWidth: '95%',
  },
  dicePairTxt: {
    fontWeight: '800',
    fontSize: 11,
    color: '#1a1a2e',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: '100%',
  },
  diceShoutWrap: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  actionDock: {
    flexShrink: 0,
    marginTop: 'auto',
    backgroundColor: BATTLE.dock,
    borderTopWidth: 2,
    borderColor: BATTLE.dockBorder,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 8,
    width: '100%',
    maxHeight: 132,
  },
  logWrap: {
    maxHeight: 44,
    overflow: 'hidden',
    marginTop: 3,
  },
  menuRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  subMenuRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  menuBtn: {
    flex: 1,
    minWidth: 72,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: BATTLE.dockBorder,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnTxt: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1a1a2e',
    textAlign: 'center',
  },
  fight: { backgroundColor: '#ff6b6b' },
  run: { backgroundColor: '#ffd166' },
  diceShout: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff8e8',
    textAlign: 'center',
    backgroundColor: 'rgba(61, 74, 92, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  hero: {
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#252540',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    elevation: 2,
  },
  heroTxt: {
    fontSize: 20,
    fontWeight: '900',
    color: '#19192b',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  grass: { backgroundColor: '#8ac926' },
  ice: { backgroundColor: '#48cae4' },
  fire: { backgroundColor: '#ff9650' },
  violet: { backgroundColor: '#b794f6' },
  pink: { backgroundColor: '#ff6b9d' },
  shield: { backgroundColor: '#94d2bd' },
  smoke: { backgroundColor: '#ccd5e0' },
  sun: { backgroundColor: '#ffc300' },
  disabledBtn: { opacity: 0.4 },
  miniNote: {
    marginTop: 3,
    textAlign: 'center',
    fontWeight: '800',
    color: '#ffeaa7',
    fontSize: 13,
  },
});
