import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RESCUE_STAGES } from '../utils/monsterRescue';
import { GAME_ASSETS } from '../utils/gameAssetPaths';

export default function MonsterRescueHubScreen({
  profileName,
  highestCleared = 0,
  totalRescued = 0,
  onBack,
  onStartStage,
}) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Quests</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Image source={{ uri: GAME_ASSETS.chestClosed }} style={styles.titleIcon} resizeMode="contain" />
          <View>
            <Text style={styles.kicker}>Quest 2</Text>
            <Text style={styles.title}>Monster Rescue</Text>
          </View>
        </View>
        <Text style={styles.sub}>{profileName} · {totalRescued} rescued</Text>
      </View>

      <Text style={styles.blurb}>Match 3+ bubbles to free monsters. Combos boost rewards!</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {RESCUE_STAGES.map((stage) => {
          const locked = stage.id > highestCleared + 1;
          const cleared = stage.id <= highestCleared;
          return (
            <TouchableOpacity
              key={stage.id}
              activeOpacity={locked ? 1 : 0.88}
              disabled={locked}
              style={[styles.stageRow, locked && styles.stageLocked, cleared && styles.stageCleared]}
              onPress={() => onStartStage(stage.id)}
            >
              <View style={styles.stageNum}><Text style={styles.stageNumText}>{stage.id}</Text></View>
              <View style={styles.stageCopy}>
                <Text style={styles.stageName}>{stage.label}</Text>
                <Text style={styles.stageMeta}>
                  {stage.colorCount} colors · {stage.shotLimit} shots · {stage.targetScore} pts
                </Text>
              </View>
              <Text style={styles.stageAction}>{locked ? '🔒' : cleared ? '★' : '▶'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 10, gap: 8 },
  header: { gap: 4 },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: '#c28a3a', fontWeight: '800', fontSize: 13 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  titleIcon: { width: 32, height: 32 },
  kicker: { color: '#c28a3a', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '900', color: '#ffe6a3' },
  sub: { color: '#93c5fd', fontWeight: '700', fontSize: 12 },
  blurb: { color: '#cbd5e1', fontSize: 12, lineHeight: 17 },
  list: { gap: 8, paddingBottom: 12 },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 22, 42, 0.88)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,224,143,0.35)',
  },
  stageLocked: { opacity: 0.5 },
  stageCleared: { borderColor: 'rgba(134,239,172,0.55)' },
  stageNum: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(219,39,119,0.85)',
    borderWidth: 1,
    borderColor: '#fbcfe8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageNumText: { color: '#fff', fontWeight: '900' },
  stageCopy: { flex: 1 },
  stageName: { fontWeight: '800', color: '#f8fafc', fontSize: 14 },
  stageMeta: { color: '#94a3b8', fontSize: 11, marginTop: 2 },
  stageAction: { fontSize: 16, color: '#fde68a' },
});
