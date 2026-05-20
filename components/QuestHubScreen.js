import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Compact quest picker — centered callout over the main menu (game theme).
 */
export default function QuestHubScreen({
  profileName,
  visible = true,
  onClose,
  onOpenMonsterLadder,
  onOpenMonsterRescue,
  rescueHighest = 0,
}) {
  if (!visible) return null;

  return (
    <View style={styles.backdrop} pointerEvents="box-none">
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close quests" />
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Quest Board</Text>
            <Text style={styles.title}>Choose a quest</Text>
            <Text style={styles.sub}>{profileName ?? 'Handler'}</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close">
            <Text style={styles.closeTxt}>×</Text>
          </Pressable>
        </View>

        <Pressable style={styles.questRow} onPress={onOpenMonsterLadder}>
          <View style={styles.badge}><Text style={styles.badgeText}>1</Text></View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Monster Ladder</Text>
            <Text style={styles.rowDesc}>Battle bosses and earn ladder shards.</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <Pressable style={[styles.questRow, styles.questRowRescue]} onPress={onOpenMonsterRescue}>
          <View style={[styles.badge, styles.badgeRescue]}><Text style={styles.badgeText}>2</Text></View>
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>Monster Rescue</Text>
            <Text style={styles.rowDesc}>
              Pop bubbles & rescue monsters. Cleared: stage {rescueHighest}.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const webShadow = Platform.OS === 'web'
  ? { boxShadow: '0 10px 28px rgba(0,0,0,0.45)' }
  : {};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 45,
    pointerEvents: 'box-none',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 8, 18, 0.72)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  card: {
    width: '78%',
    maxWidth: 300,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,224,143,0.9)',
    backgroundColor: 'rgba(15, 22, 42, 0.97)',
    padding: 10,
    zIndex: 46,
    gap: 8,
    ...webShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  headerCopy: { flex: 1 },
  kicker: {
    color: '#c28a3a',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: { color: '#ffe6a3', fontSize: 15, fontWeight: '900', marginTop: 1 },
  sub: { color: '#93c5fd', fontSize: 10, fontWeight: '700', marginTop: 2 },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  closeTxt: { color: '#e0f2fe', fontSize: 18, fontWeight: '900', lineHeight: 20 },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.45)',
    backgroundColor: 'rgba(30, 58, 95, 0.55)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  questRowRescue: {
    borderColor: 'rgba(244,114,182,0.5)',
    backgroundColor: 'rgba(76, 29, 58, 0.45)',
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRescue: { backgroundColor: '#db2777', borderColor: '#fbcfe8' },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  rowBody: { flex: 1 },
  rowTitle: { color: '#f8fafc', fontSize: 13, fontWeight: '900' },
  rowDesc: { color: '#cbd5e1', fontSize: 10, lineHeight: 14, marginTop: 2 },
  chevron: { color: '#fde68a', fontSize: 20, fontWeight: '300' },
});
