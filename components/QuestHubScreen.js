import React from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GAME_ASSETS } from '../utils/gameAssetPaths';

export default function QuestHubScreen({ profileName, onBack, onOpenMonsterLadder, onOpenMonsterRescue, rescueHighest = 0 }) {
  return (
    <ImageBackground source={{ uri: GAME_ASSETS.questHubBackground }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Quests</Text>
          <Text style={styles.sub}>{profileName ?? 'Handler'}</Text>
        </View>

        <Text style={styles.hint}>Pick a quest mode. More adventures unlock as you progress!</Text>

        <TouchableOpacity activeOpacity={0.9} style={styles.questCard} onPress={onOpenMonsterLadder}>
          <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Monster Ladder</Text>
            <Text style={styles.cardDesc}>Climb stages, earn shards, and battle ladder bosses.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.9} style={[styles.questCard, styles.questCardRescue]} onPress={onOpenMonsterRescue}>
          <View style={[styles.badge, styles.badgeRescue]}><Text style={styles.badgeText}>2</Text></View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Monster Rescue</Text>
            <Text style={styles.cardDesc}>
              Pop bubble chains and rescue cute monsters trapped inside. Best cleared: stage {rescueHighest}.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={onBack} activeOpacity={0.88}>
          <Text style={styles.homeBtnText}>← Back to Home</Text>
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
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  header: { gap: 4 },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { color: '#1e3a5f', fontWeight: '700', fontSize: 15 },
  title: { fontSize: 28, fontWeight: '900', color: '#0f172a' },
  sub: { color: '#475569', fontWeight: '600' },
  hint: { color: '#64748b', marginBottom: 4 },
  questCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: '#93c5fd',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  questCardRescue: { borderColor: '#f9a8d4', shadowColor: '#ec4899' },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRescue: { backgroundColor: '#ec4899' },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  cardDesc: { color: '#475569', fontSize: 13, lineHeight: 18 },
  chevron: { fontSize: 28, color: '#94a3b8', fontWeight: '300' },
  homeBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(226,232,240,0.95)',
  },
  homeBtnText: { fontWeight: '800', color: '#334155' },
});
