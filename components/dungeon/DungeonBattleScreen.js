import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DungeonBattleArena from './DungeonBattleArena';
import { fighterFromOwned } from '../../utils/fighterFromOwned';
import { dungeonRoleForOwned } from '../../utils/dungeon/dungeonRoles';
import { createDungeonBattle, advanceDungeonStep } from '../../utils/dungeon/dungeonBattleEngine';
import { vfxDelayForLogEntry, vfxFromLogEntry } from '../../utils/dungeon/dungeonBattleVfx';
import { getOwnedRoster } from '../../utils/rosterInventory';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DungeonBattleScreen({ boss, team, profile, onExit, onClaimRewards }) {
  const engineRef = useRef(null);
  const [, setVersion] = useState(0);
  const [rewards, setRewards] = useState(null);
  const claimedRef = useRef(false);
  const [autoOn, setAutoOn] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentVfx, setCurrentVfx] = useState(null);
  const [bannerText, setBannerText] = useState('');
  const autoRef = useRef(true);
  const playingRef = useRef(false);
  const runTokenRef = useRef(0);

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

  const recentLog = useMemo(() => state.log.slice(-8).reverse(), [state.log, state.log.length, playing]);

  const playLogEntries = useCallback(async (entries, token) => {
    for (const entry of entries) {
      if (token !== runTokenRef.current) return;
      const vfx = vfxFromLogEntry(entry);
      if (vfx?.type === 'skill' || vfx?.type === 'turn') {
        setBannerText(entry.text);
      } else if (vfx?.type === 'banner') {
        setBannerText(vfx.text);
      } else if (entry.kind === 'win' || entry.kind === 'lose') {
        setBannerText(entry.text);
      }
      if (vfx && vfx.type !== 'win' && vfx.type !== 'lose') {
        setCurrentVfx({ ...vfx, _ts: Date.now() });
      }
      await sleep(vfxDelayForLogEntry(entry));
      if (token !== runTokenRef.current) return;
    }
    setBannerText('');
    setCurrentVfx(null);
  }, []);

  const runStep = useCallback(async () => {
    if (playingRef.current || state.phase !== 'active') return;
    playingRef.current = true;
    setPlaying(true);
    const token = ++runTokenRef.current;

    const { newLog } = advanceDungeonStep(state);
    setVersion((v) => v + 1);

    if (newLog?.length) {
      await playLogEntries(newLog, token);
    } else {
      await sleep(350);
    }

    if (token === runTokenRef.current) {
      playingRef.current = false;
      setPlaying(false);
    }
  }, [playLogEntries, state]);

  // Auto-battle loop.
  useEffect(() => {
    autoRef.current = autoOn;
  }, [autoOn]);

  useEffect(() => {
    if (!autoOn || finished || playing) return undefined;
    const t = setTimeout(() => {
      if (autoRef.current && !playingRef.current && state.phase === 'active') {
        void runStep();
      }
    }, 400);
    return () => clearTimeout(t);
  }, [autoOn, finished, playing, runStep, state.phase, state.turn, state.log.length]);

  // Kick off first turn when auto starts.
  useEffect(() => {
    if (autoOn && !finished && !playingRef.current && state.log.length === 0) {
      const t = setTimeout(() => void runStep(), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [autoOn, finished, runStep, state.log.length]);

  useEffect(() => {
    if (state.phase === 'win' && !claimedRef.current) {
      claimedRef.current = true;
      const drops = onClaimRewards?.(boss.id) ?? [];
      setRewards(drops);
    }
  }, [state.phase, boss?.id, onClaimRewards]);

  function toggleAuto() {
    setAutoOn((v) => !v);
  }

  function handleManualStep() {
    if (autoOn) setAutoOn(false);
    void runStep();
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onExit} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>← Leave</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{boss?.name}</Text>
        <Text style={styles.turn}>Turn {state.turn}</Text>
      </View>

      <DungeonBattleArena
        state={state}
        bossImage={boss?.image}
        battleGroundUri={boss?.battleGround}
        vfx={currentVfx}
        bannerText={bannerText}
      />

      {!finished ? (
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.ctrlBtn, styles.ctrlAuto, autoOn && styles.ctrlAutoOn]}
            onPress={toggleAuto}
          >
            <Text style={styles.ctrlTxt}>{autoOn ? 'Auto ON' : 'Auto OFF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctrlBtn, styles.ctrlStep, playing && styles.ctrlOff]}
            onPress={handleManualStep}
            disabled={playing}
          >
            <Text style={styles.ctrlTxt}>{playing ? '…' : 'Step'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.logLbl}>Recent</Text>
      <ScrollView style={styles.log} showsVerticalScrollIndicator={false}>
        {recentLog.map((entry) => (
          <Text key={entry.id} style={[styles.logEntry, logStyle(entry.kind)]}>{entry.text}</Text>
        ))}
      </ScrollView>

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
                        {d.emoji ?? '🎁'} {d.name}{' '}
                        <Text style={styles.rewardRarity}>({d.rarity})</Text>
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
  root: { flex: 1, minHeight: 0, paddingHorizontal: 10, paddingTop: 8, backgroundColor: '#050b16' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#ffe08a', fontWeight: '900', fontSize: 13, minWidth: 60 },
  title: { color: '#fff8dd', fontWeight: '900', fontSize: 16, textShadowColor: '#000', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  turn: { color: '#e0f2fe', fontWeight: '900', fontSize: 12, minWidth: 60, textAlign: 'right' },
  controls: { flexDirection: 'row', gap: 8, marginTop: 10 },
  ctrlBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  ctrlStep: { backgroundColor: 'rgba(37,99,235,0.88)', borderColor: '#bfdbfe' },
  ctrlAuto: { backgroundColor: 'rgba(42,58,86,0.96)', borderColor: 'rgba(255,224,138,0.45)' },
  ctrlAutoOn: { backgroundColor: 'rgba(92,57,143,0.96)', borderColor: '#d8b4fe' },
  ctrlOff: { opacity: 0.5 },
  ctrlTxt: { color: '#fff8dd', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
  logLbl: { color: '#ffe08a', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  log: {
    maxHeight: 82,
    backgroundColor: 'rgba(2,8,23,0.96)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.18)',
    padding: 8,
  },
  logEntry: { fontSize: 10, fontWeight: '900', marginBottom: 2, lineHeight: 13 },
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
