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

  const battleState = useMemo(() => ({
    player: { name: 'Nugget Dragon', hp: playerHp, maxHp: 100, element: 'fire' },
    enemy: { name: 'Noise Boss', hp: enemyHp, maxHp: 140, element: 'shadow' },
  }), [enemyHp, playerHp]);

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
                setEnemyHp((hp) => Math.max(0, hp - 12));
                emit('attack', { attacker: 'player' });
              }}
            />
            <LabButton
              label="Critical Hit"
              onPress={() => {
                setEnemyHp((hp) => Math.max(0, hp - 28));
                emit('crit', { attacker: 'player' });
              }}
            />
            <LabButton
              label="Enemy Attack"
              onPress={() => {
                setPlayerHp((hp) => Math.max(0, hp - 10));
                emit('attack', { attacker: 'enemy' });
              }}
            />
            <LabButton label="Dodge" onPress={() => emit('dodge', { target: 'player' })} />
            <LabButton label="Boss Intro" onPress={() => emit('bossIntro')} />
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
