import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from '../MonsterPreview';
import { WEB_DECORATIVE_IMAGE_PROPS } from '../../utils/webGameTouch';
import { fighterFromOwned } from '../../utils/fighterFromOwned';
import { dungeonRoleForOwned, dungeonRoleLabel, DUNGEON_ROLE_COLORS } from '../../utils/dungeon/dungeonRoles';
import { createDungeonBattle, advanceDungeonStep } from '../../utils/dungeon/dungeonBattleEngine';
import { getOwnedRoster } from '../../utils/rosterInventory';

const POSITION_LABEL = { 1: 'Tanker', 2: 'Healer / Support', 3: 'Damager' };

function statusBadges(statuses) {
  const out = [];
  if (statuses.stun) out.push('💫 Stun');
  if (statuses.freeze) out.push('❄️ Freeze');
  if (statuses.burn) out.push('🔥 Burn');
  if (statuses.damageTakenPct) out.push('🎯 Marked');
  if (statuses.speedDodgeDown) out.push('🐌 Slowed');
  return out;
}

function BossArt({ uri }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <View style={[styles.bossArt, styles.bossArtFallback]} />;
  return (
    <Image source={{ uri }} style={styles.bossArt} resizeMode="contain" onError={() => setFailed(true)} {...WEB_DECORATIVE_IMAGE_PROPS} />
  );
}

export default function DungeonBattleScreen({ boss, team, profile, onExit, onClaimRewards }) {
  const engineRef = useRef(null);
  const [, setVersion] = useState(0);
  const [auto, setAuto] = useState(true);
  const [rewards, setRewards] = useState(null);
  const claimedRef = useRef(false);

  // Build the battle once.
  if (!engineRef.current) {
    const roster = getOwnedRoster(profile);
    const builtTeam = (team || [])
      .map(({ ownedId, position }) => {
        const owned = roster.find((m) => m.id === ownedId);
        if (!owned) return null;
        return {
          owned,
          fighter: fighterFromOwned(owned, profile),
          role: dungeonRoleForOwned(owned),
          position,
        };
      })
      .filter(Boolean);
    engineRef.current = createDungeonBattle({ boss, team: builtTeam });
  }

  const state = engineRef.current;
  const finished = state.phase !== 'active';

  function step() {
    if (state.phase !== 'active') return;
    advanceDungeonStep(state);
    setVersion((v) => v + 1);
  }

  // Auto-advance loop.
  useEffect(() => {
    if (!auto || finished) return undefined;
    const t = setInterval(() => {
      if (engineRef.current.phase !== 'active') {
        clearInterval(t);
        setVersion((v) => v + 1);
        return;
      }
      advanceDungeonStep(engineRef.current);
      setVersion((v) => v + 1);
    }, 650);
    return () => clearInterval(t);
  }, [auto, finished]);

  // Grant rewards once on victory.
  useEffect(() => {
    if (state.phase === 'win' && !claimedRef.current) {
      claimedRef.current = true;
      const drops = onClaimRewards?.(boss.id) ?? [];
      setRewards(drops);
    }
  }, [state.phase, boss?.id, onClaimRewards]);

  const bossHpPct = Math.max(0, Math.round((state.boss.hp / state.boss.maxHp) * 100));
  const recentLog = useMemo(() => state.log.slice(-40).reverse(), [state.log, state.log.length]);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onExit} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>← Leave</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{boss?.name}</Text>
        <Text style={styles.turn}>Turn {state.turn}</Text>
      </View>

      {/* Boss */}
      <View style={styles.bossWrap}>
        <BossArt uri={boss?.image} />
        <View style={styles.bossInfo}>
          <Text style={styles.bossName}>
            {boss?.name} {state.boss.enraged ? '🔴 ENRAGED' : ''}
          </Text>
          <Text style={styles.bossLevel}>Lv {boss?.level}</Text>
          <View style={styles.hpBarOuter}>
            <View style={[styles.hpBarInner, styles.bossHpFill, { width: `${bossHpPct}%` }]} />
          </View>
          <Text style={styles.hpTxt}>{Math.round(state.boss.hp).toLocaleString()} / {state.boss.maxHp.toLocaleString()}</Text>
        </View>
      </View>

      {/* Player monsters */}
      <View style={styles.teamRow}>
        {state.monsters.map((m) => {
          const hpPct = Math.max(0, Math.round((m.hp / m.maxHp) * 100));
          const badges = statusBadges(m.statuses);
          return (
            <View key={m.id} style={[styles.monCard, !m.alive && styles.monCardDead]}>
              <Text style={styles.monPos}>{m.position} {POSITION_LABEL[m.position]}</Text>
              <MonsterPreview parts={m.monsterParts} size={40} mood={m.alive ? 'happy' : 'dizzy'} />
              <Text style={styles.monName} numberOfLines={1}>{m.name}</Text>
              <Text style={[styles.monRole, { color: DUNGEON_ROLE_COLORS[m.role] }]}>{dungeonRoleLabel(m.role)}</Text>
              <View style={styles.hpBarOuterSm}>
                <View style={[styles.hpBarInner, m.alive ? styles.allyHpFill : styles.deadHpFill, { width: `${hpPct}%` }]} />
              </View>
              <Text style={styles.monHp}>{m.alive ? `${Math.round(m.hp)}/${m.maxHp}` : 'KO'}</Text>
              {badges.length > 0 ? (
                <Text style={styles.monStatus} numberOfLines={2}>{badges.join(' ')}</Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Controls */}
      {!finished ? (
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.ctrlBtn, styles.ctrlStep]} onPress={step}>
            <Text style={styles.ctrlTxt}>Next</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ctrlBtn, auto ? styles.ctrlAutoOn : styles.ctrlAuto]} onPress={() => setAuto((a) => !a)}>
            <Text style={styles.ctrlTxt}>{auto ? 'Pause' : 'Auto'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Log */}
      <Text style={styles.logLbl}>Battle log</Text>
      <ScrollView style={styles.log} showsVerticalScrollIndicator={false}>
        {recentLog.map((entry) => (
          <Text key={entry.id} style={[styles.logEntry, logStyle(entry.kind)]}>{entry.text}</Text>
        ))}
      </ScrollView>

      {/* Result overlay */}
      {finished ? (
        <View style={styles.resultOverlay}>
          <View style={[styles.resultCard, state.phase === 'win' ? styles.resultWin : styles.resultLose]}>
            <Text style={styles.resultTitle}>{state.phase === 'win' ? 'Dungeon Cleared' : 'Dungeon Failed'}</Text>
            {state.phase === 'win' ? (
              <>
                <Text style={styles.resultSub}>Rewards</Text>
                <ScrollView style={styles.rewardList}>
                  {(rewards ?? []).length === 0 ? (
                    <Text style={styles.rewardEmpty}>Rewards granted to your inventory.</Text>
                  ) : (
                    (rewards ?? []).map((d, i) => (
                      <Text key={`${d.name}_${i}`} style={styles.rewardLine}>
                        {d.emoji ?? '🎁'} {d.name} <Text style={styles.rewardRarity}>({d.rarity})</Text>
                        {d.duplicate ? ' · duplicate' : ''}
                      </Text>
                    ))
                  )}
                </ScrollView>
              </>
            ) : (
              <Text style={styles.resultSub}>Strengthen your monsters, equipment, pets, and gems before trying again.</Text>
            )}
            <TouchableOpacity style={styles.resultBtn} onPress={onExit}>
              <Text style={styles.resultBtnTxt}>Back to Dungeons</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function logStyle(kind) {
  switch (kind) {
    case 'crit': return { color: '#fde047', fontWeight: '900' };
    case 'playerHit': return { color: '#86efac' };
    case 'bossHit': return { color: '#fca5a5' };
    case 'boss': return { color: '#f0abfc', fontWeight: '800' };
    case 'ko': return { color: '#f87171', fontWeight: '900' };
    case 'status': return { color: '#93c5fd' };
    case 'dot': return { color: '#fb923c' };
    case 'heal': return { color: '#6ee7b7' };
    case 'dodge': return { color: '#cbd5e1' };
    case 'turnBanner': return { color: '#fcd34d', fontWeight: '900' };
    case 'win': return { color: '#86efac', fontWeight: '900' };
    case 'lose': return { color: '#f87171', fontWeight: '900' };
    default: return { color: '#cbd5e1' };
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, paddingHorizontal: 10, paddingTop: 8 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#ffe08a', fontWeight: '900', fontSize: 13, minWidth: 60 },
  title: { color: '#fff4cf', fontWeight: '900', fontSize: 16 },
  turn: { color: '#bfdbfe', fontWeight: '800', fontSize: 12, minWidth: 60, textAlign: 'right' },
  bossWrap: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 8,
    padding: 10,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#7c3aed',
    backgroundColor: 'rgba(20,12,36,0.9)',
  },
  bossArt: { width: 84, height: 84, borderRadius: 10 },
  bossArtFallback: { backgroundColor: 'rgba(124,58,237,0.4)' },
  bossInfo: { flex: 1, minWidth: 0 },
  bossName: { color: '#fff4cf', fontWeight: '900', fontSize: 15 },
  bossLevel: { color: '#c4b5fd', fontWeight: '800', fontSize: 11 },
  hpBarOuter: { height: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginTop: 6 },
  hpBarOuterSm: { height: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginTop: 4, alignSelf: 'stretch' },
  hpBarInner: { height: '100%' },
  bossHpFill: { backgroundColor: '#ef4444' },
  allyHpFill: { backgroundColor: '#34d399' },
  deadHpFill: { backgroundColor: '#64748b' },
  hpTxt: { color: '#e2e8f0', fontWeight: '800', fontSize: 10, marginTop: 3 },
  teamRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  monCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.25)',
    backgroundColor: 'rgba(10,18,36,0.85)',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  monCardDead: { opacity: 0.5, borderColor: '#475569' },
  monPos: { color: '#fcd34d', fontWeight: '900', fontSize: 8, textAlign: 'center' },
  monName: { color: '#fff4cf', fontWeight: '800', fontSize: 9, marginTop: 2, maxWidth: 90, textAlign: 'center' },
  monRole: { fontWeight: '900', fontSize: 8 },
  monHp: { color: '#e2e8f0', fontWeight: '800', fontSize: 8, marginTop: 2 },
  monStatus: { color: '#93c5fd', fontWeight: '800', fontSize: 8, marginTop: 2, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ctrlBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  ctrlStep: { backgroundColor: 'rgba(37,99,235,0.88)', borderColor: '#bfdbfe' },
  ctrlAuto: { backgroundColor: 'rgba(42,58,86,0.96)', borderColor: 'rgba(255,224,138,0.45)' },
  ctrlAutoOn: { backgroundColor: 'rgba(92,57,143,0.96)', borderColor: '#d8b4fe' },
  ctrlTxt: { color: '#fff8dd', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
  logLbl: { color: '#ffe08a', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', marginTop: 10, marginBottom: 4 },
  log: { flex: 1, backgroundColor: 'rgba(7,17,32,0.6)', borderRadius: 10, padding: 8 },
  logEntry: { fontSize: 11, fontWeight: '700', marginBottom: 3, lineHeight: 15 },
  resultOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,6,18,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  resultCard: { width: '100%', maxWidth: 360, borderRadius: 18, borderWidth: 3, padding: 18, backgroundColor: '#15203a', maxHeight: '80%' },
  resultWin: { borderColor: '#4ade80' },
  resultLose: { borderColor: '#f87171' },
  resultTitle: { color: '#fff4cf', fontWeight: '900', fontSize: 22, textAlign: 'center', textTransform: 'uppercase' },
  resultSub: { color: '#bfdbfe', fontWeight: '800', fontSize: 13, textAlign: 'center', marginTop: 10 },
  rewardList: { marginTop: 8, maxHeight: 180 },
  rewardLine: { color: '#e2e8f0', fontWeight: '800', fontSize: 13, marginTop: 6, textAlign: 'center' },
  rewardRarity: { color: '#c4b5fd', fontWeight: '900' },
  rewardEmpty: { color: '#94a3b8', fontWeight: '800', fontSize: 12, textAlign: 'center', marginTop: 8 },
  resultBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(48,129,66,0.96)', borderWidth: 1, borderColor: '#efd17a' },
  resultBtnTxt: { color: '#fff8dd', fontWeight: '900', fontSize: 14, textTransform: 'uppercase' },
});
