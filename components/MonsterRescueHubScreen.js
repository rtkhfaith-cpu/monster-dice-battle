import React from 'react';
import { Image, ImageBackground, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    <ImageBackground source={{ uri: GAME_ASSETS.monsterRescueBackground }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Quests</Text>
          </TouchableOpacity>
          <View style={styles.titleRow}>
            <Image source={{ uri: GAME_ASSETS.chestClosed }} style={styles.titleIcon} resizeMode="contain" />
            <Text style={styles.title}>Monster Rescue</Text>
          </View>
          <Text style={styles.sub}>{profileName} · {totalRescued} rescued</Text>
        </View>

        <Text style={styles.blurb}>
          Aim, shoot, and match 3+ bubbles to free monsters. Combos earn bonus coins and EXP!
        </Text>

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
                    {stage.colorCount} colors · {stage.shotLimit} shots · goal {stage.targetScore} pts
                  </Text>
                </View>
                <Text style={styles.stageAction}>{locked ? '🔒' : cleared ? '★' : '▶'}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={styles.backFooter} onPress={onBack} activeOpacity={0.88}>
          <Text style={styles.backFooterText}>← Back to Quests</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  header: { gap: 4, marginBottom: 8 },
  backBtn: { alignSelf: 'flex-start' },
  backText: { color: '#9d174d', fontWeight: '700' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleIcon: { width: 36, height: 36 },
  title: { fontSize: 26, fontWeight: '900', color: '#831843' },
  sub: { color: '#be185d', fontWeight: '600' },
  blurb: { color: '#64748b', marginBottom: 10, lineHeight: 20 },
  list: { gap: 10, paddingBottom: 16 },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: '#fbcfe8',
  },
  stageLocked: { opacity: 0.55 },
  stageCleared: { borderColor: '#86efac' },
  stageNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f472b6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageNumText: { color: '#fff', fontWeight: '900' },
  stageCopy: { flex: 1 },
  stageName: { fontWeight: '800', color: '#0f172a', fontSize: 16 },
  stageMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  stageAction: { fontSize: 18 },
  backFooter: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#fce7f3',
  },
  backFooterText: { fontWeight: '800', color: '#9d174d' },
});
