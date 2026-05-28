import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MAIN_MINI_BOSS_CHANCE, MAIN_MINI_BOSS_STAT_MULT } from '../utils/mainBattleChest';

const TOPICS = [
  {
    id: 'mini_boss',
    label: 'Mini Boss',
    lines: [
      `Appears in main CPU battles with ${Math.round(MAIN_MINI_BOSS_CHANCE * 100)}% chance.`,
      `Mini boss power is about ${MAIN_MINI_BOSS_STAT_MULT}x a normal CPU opponent.`,
      'Winning grants a chest reward on top of normal battle rewards.',
    ],
  },
  {
    id: 'monster_ladder',
    label: 'Monster Ladder',
    lines: [
      'Progress through staged fights with mini boss and big boss checkpoints.',
      'Earn ladder gold and shards for chest exchange and progression rewards.',
      'Ladder has its own reward cadence and chest rules.',
    ],
  },
  {
    id: 'monster_rescue',
    label: 'Monster Rescue',
    lines: [
      'Stage-based rescue mode with its own reward pacing.',
      'Clears can grant chest rewards and progression materials.',
      'Designed as an alternate progression path outside standard battle loops.',
    ],
  },
  {
    id: 'pet_system',
    label: 'Pet System',
    lines: [
      'Pets add stat bonuses and combat modifiers to equipped monsters.',
      'Pets can level up and provide different utility depending on rarity/skills.',
      'Pet drops and pet EXP dust come from reward systems and chests.',
    ],
  },
  {
    id: 'skill_book_system',
    label: 'Skill Book System',
    lines: [
      'Passive skill books are collected, then equipped per monster.',
      'Books grant passive combat effects through passive resolver logic.',
      'Slot limits apply, so loadout decisions matter.',
    ],
  },
  {
    id: 'equip_system',
    label: 'Equip System',
    lines: [
      'Gear uses per-piece instances with rolled stats and rarity.',
      'Set bonuses activate when matching set pieces are equipped together.',
      'Core active gear stats include HP, Attack, Defense, Speed, Crit, Dodge, HitRate.',
    ],
  },
  {
    id: 'battle_system',
    label: 'Battle System',
    lines: [
      'Battle uses core stats: HP, Attack/Magic, Defense, Agility/Speed, Crit, Dodge, HitRate.',
      'HitRate is a flat stat and offsets Dodge directly (not a percent stat by itself).',
      'Final dodge chance is derived from defender Dodge minus attacker HitRate, then clamped.',
      'Damage and turn outcomes also include skills, passives, pets, and status effects.',
    ],
  },
  {
    id: 'gemming_system',
    label: 'Gemming System',
    lines: [
      'Socket count is rolled on acquired gear and visible in inventory.',
      'Shop hides socket count before purchase; sockets are revealed after buy/drop.',
      'Socket-ready gear is intended for future gem insertion progression.',
    ],
  },
  {
    id: 'multiplayer',
    label: 'Multiplayer',
    lines: [
      'Real-time battle mode with separate room/lobby flow.',
      'Uses synchronized battle state and server-side battle resolution paths.',
      'Progression and rewards are handled separately from solo CPU loops.',
    ],
  },
  {
    id: 'daily_spin',
    label: 'Daily Spin',
    lines: [
      'Daily reward wheel gives coins, shards, chest rewards, and jackpots.',
      'Some outcomes can include bonus systems such as gear/pet/book grants.',
      'Spin claims are time-gated and tracked per reward day.',
    ],
  },
];

export default function MainMiniBossDropsModal({ visible, onClose }) {
  const [topicId, setTopicId] = useState(TOPICS[0].id);
  const activeTopic = useMemo(
    () => TOPICS.find((t) => t.id === topicId) ?? TOPICS[0],
    [topicId],
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Game Info</Text>
          <Text style={styles.sub}>
            Select a topic to view a quick system explanation.
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.topicRow}
            contentContainerStyle={styles.topicRowContent}
          >
            {TOPICS.map((topic) => {
              const on = topic.id === activeTopic.id;
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[styles.topicChip, on && styles.topicChipOn]}
                  onPress={() => setTopicId(topic.id)}
                  activeOpacity={0.86}
                >
                  <Text style={[styles.topicChipTxt, on && styles.topicChipTxtOn]}>{topic.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.section}>{activeTopic.label}</Text>
            <View style={styles.infoBox}>
              {activeTopic.lines.map((line) => (
                <Text key={line} style={styles.infoLine}>
                  • {line}
                </Text>
              ))}
            </View>
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
    marginTop: 8,
    maxHeight: 420,
  },
  topicRow: {
    marginTop: 10,
    maxHeight: 44,
  },
  topicRowContent: {
    paddingRight: 4,
    gap: 8,
  },
  topicChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  topicChipOn: {
    borderColor: 'rgba(250, 204, 21, 0.65)',
    backgroundColor: 'rgba(88, 28, 135, 0.6)',
  },
  topicChipTxt: {
    color: '#cbd5e1',
    fontWeight: '800',
    fontSize: 12,
  },
  topicChipTxtOn: {
    color: '#fff7ad',
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
