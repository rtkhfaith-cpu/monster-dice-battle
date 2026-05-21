import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RARITY_ORDER } from '../utils/monsterTemplates';
import {
  MAIN_MINI_BOSS_CHANCE,
  MAIN_MINI_BOSS_CHEST_ROWS,
  MAIN_MINI_BOSS_MONSTER_RARITY_ROWS,
  MAIN_MINI_BOSS_MONSTER_RARITY_WEIGHTS,
  MAIN_MINI_BOSS_STAT_MULT,
} from '../utils/mainBattleChest';

export default function MainMiniBossDropsModal({ visible, onClose }) {
  const encounterPct = Math.round(MAIN_MINI_BOSS_CHANCE * 100);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Main Battle · Mini Boss</Text>
          <Text style={styles.sub}>
            Random CPU fights on the home screen can spawn a mini boss. Win to open the chest before results.
          </Text>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.section}>Encounter</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoLine}>• {encounterPct}% chance per CPU battle (not multiplayer)</Text>
              <Text style={styles.infoLine}>• Boss stats ≈ {MAIN_MINI_BOSS_STAT_MULT}× normal CPU power</Text>
              <Text style={styles.infoLine}>• Lose or flee → next CPU battle is a normal fight (no mini boss)</Text>
              <Text style={styles.infoLine}>• First battle after a full page reload never rolls mini boss</Text>
            </View>

            <Text style={styles.section}>Chest drop table (one roll per win)</Text>
            {MAIN_MINI_BOSS_CHEST_ROWS.map((row) => (
              <View key={row.id} style={styles.dropRow}>
                <View style={styles.dropHead}>
                  <Text style={styles.dropLabel}>{row.label}</Text>
                  <Text style={styles.dropPct}>{row.chancePct}%</Text>
                </View>
                <Text style={styles.dropDetail}>{row.detail}</Text>
              </View>
            ))}

            <Text style={styles.section}>Monster drop — rarity first (then random species)</Text>
            <Text style={styles.infoLine}>
              Base weights at Lv 36+ (lower levels only use tiers you have unlocked; % are renormalized):
            </Text>
            {RARITY_ORDER.map((rarity) => {
              const w = MAIN_MINI_BOSS_MONSTER_RARITY_WEIGHTS[rarity] ?? 0;
              const pct = Math.round((w / 100) * 1000) / 10;
              return (
                <View key={rarity} style={styles.rarityRow}>
                  <Text style={styles.rarityLv}>{rarity}</Text>
                  <Text style={styles.rarityVal}>{pct}%</Text>
                </View>
              );
            })}
            {MAIN_MINI_BOSS_MONSTER_RARITY_ROWS.map((row) => (
              <View key={row.levelRange} style={styles.rarityRow}>
                <Text style={styles.rarityLv}>Lv {row.levelRange}</Text>
                <Text style={styles.rarityVal}>{row.rarities}</Text>
              </View>
            ))}

            <Text style={styles.foot}>
              Normal battle coins and EXP still apply. Mini boss chest is extra.
            </Text>
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.88}>
            <Text style={styles.closeTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 12, 28, 0.82)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: '#1a2744',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(250, 204, 21, 0.45)',
    padding: 16,
  },
  title: {
    color: '#ffe6a3',
    fontSize: 20,
    fontWeight: '900',
  },
  sub: {
    color: '#b8c9e8',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  scroll: {
    marginTop: 12,
    maxHeight: 420,
  },
  section: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 6,
  },
  infoBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  infoLine: {
    color: '#dbeafe',
    fontSize: 12,
    lineHeight: 17,
  },
  dropRow: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  dropHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dropLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  dropPct: {
    color: '#fde047',
    fontSize: 15,
    fontWeight: '900',
  },
  dropDetail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  rarityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rarityLv: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  rarityVal: {
    color: '#e2e8f0',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  foot: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  closeBtn: {
    marginTop: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeTxt: {
    color: '#1a1208',
    fontWeight: '900',
    fontSize: 15,
  },
});
