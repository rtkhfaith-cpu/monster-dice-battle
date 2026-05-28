import React, { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DUNGEON_BOSSES, isDungeonBossAvailable, daysUntilDungeonBoss } from '../../utils/dungeon/dungeonBosses';
import { WEB_DECORATIVE_IMAGE_PROPS } from '../../utils/webGameTouch';

const ELEMENT_COLORS = {
  dark: '#7c3aed',
  ice: '#38bdf8',
  fire_dark: '#ef4444',
};

function BossImage({ uri, fallbackColor }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return <View style={[styles.bossImg, styles.bossImgFallback, { backgroundColor: fallbackColor }]} />;
  }
  return (
    <Image
      source={{ uri }}
      style={styles.bossImg}
      resizeMode="contain"
      onError={() => setFailed(true)}
      {...WEB_DECORATIVE_IMAGE_PROPS}
    />
  );
}

export default function DungeonsHubScreen({ onBack, onEnterBoss }) {
  const now = useMemo(() => new Date(), []);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dungeons</Text>
        <View style={{ width: 56 }} />
      </View>
      <Text style={styles.subtitle}>
        End-game boss raids. Build a real team — Tanker, Healer/Support, Damager — and bring pets, gear, skills and gems.
      </Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {DUNGEON_BOSSES.map((boss) => {
          const available = isDungeonBossAvailable(boss, now);
          const daysLeft = available ? 0 : daysUntilDungeonBoss(boss, now);
          const accent = ELEMENT_COLORS[boss.element] ?? '#a78bfa';
          return (
            <View key={boss.id} style={[styles.card, { borderColor: accent }]}>
              <View style={styles.cardHeader}>
                <BossImage uri={boss.image} fallbackColor={accent} />
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.bossName}>{boss.name}</Text>
                  <Text style={styles.bossMeta}>
                    Lv {boss.level} · {String(boss.element).replace('_', '/')}
                  </Text>
                  <View style={[styles.statusPill, available ? styles.statusOn : styles.statusOff]}>
                    <Text style={styles.statusTxt}>
                      {available ? 'AVAILABLE NOW' : `Available in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.blurb}>{boss.blurb}</Text>

              <View style={styles.statRow}>
                <Text style={styles.recPower}>Recommended power: {boss.recommendedPower.toLocaleString()}</Text>
              </View>
              <Text style={styles.rewards}>🎁 {boss.rewardsText}</Text>

              <TouchableOpacity
                style={[styles.enterBtn, !available && styles.enterBtnOff, available && { borderColor: accent }]}
                disabled={!available}
                onPress={() => onEnterBoss?.(boss.id)}
                activeOpacity={0.88}
              >
                <Text style={styles.enterTxt}>{available ? 'Enter Dungeon' : 'Locked'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, paddingHorizontal: 12, paddingTop: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#ffe08a', fontWeight: '900', fontSize: 14, minWidth: 56 },
  title: {
    color: '#fff4cf',
    fontWeight: '900',
    fontSize: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: { color: '#bfdbfe', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 8, lineHeight: 17 },
  list: { flex: 1, marginTop: 10 },
  listContent: { paddingBottom: 20 },
  card: {
    backgroundColor: 'rgba(12, 20, 40, 0.92)',
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  bossImg: { width: 92, height: 92, borderRadius: 12 },
  bossImgFallback: { opacity: 0.5 },
  cardHeaderInfo: { flex: 1, minWidth: 0 },
  bossName: { color: '#fff4cf', fontWeight: '900', fontSize: 18 },
  bossMeta: { color: '#c4b5fd', fontWeight: '800', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  statusPill: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusOn: { backgroundColor: 'rgba(34,197,94,0.22)', borderWidth: 1, borderColor: '#4ade80' },
  statusOff: { backgroundColor: 'rgba(148,163,184,0.18)', borderWidth: 1, borderColor: 'rgba(148,163,184,0.5)' },
  statusTxt: { color: '#f8fafc', fontWeight: '900', fontSize: 10, letterSpacing: 0.4 },
  blurb: { color: '#dbeafe', fontSize: 12, fontWeight: '700', marginTop: 10, lineHeight: 17 },
  statRow: { marginTop: 8 },
  recPower: { color: '#fcd34d', fontWeight: '900', fontSize: 12 },
  rewards: { color: '#86efac', fontWeight: '800', fontSize: 12, marginTop: 6 },
  enterBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(92, 57, 143, 0.9)',
    borderWidth: 2,
    borderColor: '#d8b4fe',
  },
  enterBtnOff: { backgroundColor: 'rgba(51,65,85,0.7)', borderColor: 'rgba(148,163,184,0.4)' },
  enterTxt: { color: '#fff8dd', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
});
