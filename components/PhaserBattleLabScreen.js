import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PhaserBattleView from './PhaserBattleView';

function LabButton({ label, onPress, primary = false }) {
  return (
    <TouchableOpacity style={[styles.btn, primary && styles.btnPrimary]} onPress={onPress} activeOpacity={0.86}>
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function PhaserBattleLabScreen({ onBack }) {
  const [tick, setTick] = useState(0);
  const [visualEvent, setVisualEvent] = useState(null);
  const [enemyHp, setEnemyHp] = useState(120);
  const [playerHp, setPlayerHp] = useState(82);
  const [enemySkin, setEnemySkin] = useState({
    name: 'Charging Cable Serpent',
    element: 'electric',
    rarity: 'rare',
    theme: 'cable_serpent',
  });

  const battleState = useMemo(() => ({
    player: { name: 'Nugget Dragon', hp: playerHp, maxHp: 100, element: 'fire', rarity: 'common', theme: 'nugget_dragon' },
    enemy: { hp: enemyHp, maxHp: 140, ...enemySkin },
  }), [enemyHp, enemySkin, playerHp]);

  function emit(kind, extra = {}) {
    setTick((n) => n + 1);
    setVisualEvent({ id: tick + 1, kind, ...extra });
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <TouchableOpacity style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.heading}>
          <Text style={styles.title}>Phaser Battle Lab</Text>
          <Text style={styles.subtitle}>Frontend-only sandbox. No saves, multiplayer, or live battles touched.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <PhaserBattleView battleState={battleState} visualEvent={visualEvent} />

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Visual Tests</Text>
          <Text style={styles.copy}>
            This sandbox proves Phaser can own the battlefield, monster motion, VFX, particles,
            damage text, camera shake, and boss presentation while React remains the source of truth.
          </Text>
          <View style={styles.grid}>
            <LabButton
              primary
              label="Player Attack"
              onPress={() => {
                const hpAfter = Math.max(0, enemyHp - 12);
                setEnemyHp(hpAfter);
                emit('actionResult', { attackerId: 1, defenderId: 2, actionType: 'physical', damage: 12, hpAfter });
              }}
            />
            <LabButton
              label="Critical Hit"
              onPress={() => {
                const hpAfter = Math.max(0, enemyHp - 28);
                setEnemyHp(hpAfter);
                emit('actionResult', { attackerId: 1, defenderId: 2, actionType: 'physical', damage: 28, hpAfter, crit: true });
              }}
            />
            <LabButton
              label="Enemy Attack"
              onPress={() => {
                const hpAfter = Math.max(0, playerHp - 10);
                setPlayerHp(hpAfter);
                emit('actionResult', { attackerId: 2, defenderId: 1, actionType: 'physical', damage: 10, hpAfter });
              }}
            />
            <LabButton label="Dodge" onPress={() => emit('actionResult', { attackerId: 2, defenderId: 1, actionType: 'physical', damage: 0, dodged: true, hpAfter: playerHp })} />
            <LabButton label="Defend" onPress={() => emit('actionResult', { defenderId: 1, actionType: 'defend' })} />
            <LabButton label="Hurt Pose" onPress={() => emit('hurt', { target: 'enemy' })} />
            <LabButton label="KO Pose" onPress={() => emit('ko', { target: 'enemy' })} />
            <LabButton label="Boss Intro" onPress={() => emit('bossIntro')} />
            <LabButton
              label="Fire Magic"
              onPress={() => {
                const hpAfter = Math.max(0, enemyHp - 18);
                setEnemyHp(hpAfter);
                emit('actionResult', { attackerId: 1, defenderId: 2, actionType: 'magic', element: 'fire', damage: 18, hpAfter, mpAfter: 28 });
              }}
            />
            <LabButton
              label="Glitch Magic"
              onPress={() => {
                const hpAfter = Math.max(0, enemyHp - 16);
                setEnemyHp(hpAfter);
                emit('actionResult', { attackerId: 1, defenderId: 2, actionType: 'magic', element: 'tech', damage: 16, hpAfter, mpAfter: 24 });
              }}
            />
            <LabButton
              label="Reset HP"
              onPress={() => {
                setPlayerHp(82);
                setEnemyHp(120);
              }}
            />
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Monster Actor Samples</Text>
          <Text style={styles.copy}>
            These are still procedural placeholder actors, not final art. They test silhouette,
            facing, aura, element particles, and secondary motion before live battle migration.
          </Text>
          <View style={styles.grid}>
            <LabButton
              label="Rare Electric Serpent"
              onPress={() => setEnemySkin({
                name: 'Charging Cable Serpent',
                element: 'electric',
                rarity: 'rare',
                theme: 'cable_serpent',
              })}
            />
            <LabButton
              label="Epic Tech Toiletron"
              onPress={() => setEnemySkin({
                name: 'Toiletron',
                element: 'tech',
                rarity: 'epic',
                theme: 'toiletron',
              })}
            />
            <LabButton
              label="Legendary Pizza Meteor"
              onPress={() => setEnemySkin({
                name: 'Pizza Meteor',
                element: 'fire',
                rarity: 'legendary',
                theme: 'pizza_meteor',
              })}
            />
            <LabButton
              label="Mythic Wifi Wraith"
              onPress={() => setEnemySkin({
                name: 'Wifi Wraith',
                element: 'shadow',
                rarity: 'mythic',
                theme: 'wifi_wraith',
              })}
            />
            <LabButton
              label="Poison Durian Knight"
              onPress={() => setEnemySkin({
                name: 'Durian Knight',
                element: 'poison',
                rarity: 'epic',
                theme: 'durian_knight',
              })}
            />
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Integration Contract</Text>
          <Text style={styles.bullet}>React sends battle snapshots: HP, MP, turn, fighter identity, and latest visual event.</Text>
          <Text style={styles.bullet}>Phaser renders those snapshots and plays animation, but does not decide damage or turns.</Text>
          <Text style={styles.bullet}>Live battle migration can replace `RpgBattleArena` visually while keeping `BattleScreen` logic intact.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
    backgroundColor: '#111827',
  },
  back: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
  },
  backText: { color: '#fff', fontWeight: '900' },
  heading: { flex: 1 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginTop: 2 },
  content: { padding: 14, gap: 14, paddingBottom: 28 },
  panel: {
    backgroundColor: '#fff7ed',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#fb923c',
    padding: 14,
    gap: 10,
  },
  panelTitle: { color: '#1f2937', fontSize: 18, fontWeight: '900' },
  copy: { color: '#475569', fontSize: 14, fontWeight: '700', lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: '#334155',
  },
  btnPrimary: { backgroundColor: '#22c55e' },
  btnText: { color: '#111827', fontWeight: '900' },
  btnTextPrimary: { color: '#052e16' },
  bullet: { color: '#334155', fontWeight: '800', lineHeight: 20 },
});
