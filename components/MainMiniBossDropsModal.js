import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MAIN_MINI_BOSS_CHANCE, MAIN_MINI_BOSS_STAT_MULT } from '../utils/mainBattleChest';

const TOPICS = [
  {
    id: 'mini_boss',
    label: 'Mini Boss',
    lines: [
      `Spawn rule: main CPU battles can roll mini boss at ${Math.round(MAIN_MINI_BOSS_CHANCE * 100)}% chance.`,
      `Power rule: mini boss stats are scaled to about ${MAIN_MINI_BOSS_STAT_MULT}x normal CPU tuning.`,
      'Win reward: mini boss chest opens before result screen and adds extra rewards on top of normal coins/EXP.',
      'Lose/Flee rule: next main CPU battle is forced normal (mini boss skip for one battle).',
      'Chest outcomes include gear instance, passive book, pet/dust, and coin/EXP bonus paths.',
    ],
  },
  {
    id: 'monster_ladder',
    label: 'Monster Ladder',
    lines: [
      'Structure: each level has sub-stages with mini boss at sub 5 and big boss at sub 10.',
      'Progression: winning advances stage; losses can stall or push retry flow based on current state.',
      'Currencies: ladder gold (battle reward) and ladder shards (used for monster chest exchange).',
      'Chests: gear chest and monster chest use ladder chest inventory + pity counters.',
      'Drops from gear chests are integrated into the new gear instance system (rolled stats and sockets).',
    ],
  },
  {
    id: 'monster_rescue',
    label: 'Monster Rescue',
    lines: [
      'Mode: rescue stages are separate progression from main CPU and ladder loops.',
      'Rewards: clear rewards include coins/EXP and can trigger rescue chest openings on boss checkpoints.',
      'Integration: rescue chest open path reuses ladder chest open logic for consistent reward behavior.',
      'Purpose: provides alternate pacing for account growth outside pure battle grinding.',
      'Result: you can grow roster/resources while diversifying game loop.',
    ],
  },
  {
    id: 'pet_system',
    label: 'Pet System',
    lines: [
      'Equip model: one pet can be equipped to a monster; effects are bound to that fighter in battle.',
      'Stats: pets add base bonuses (HP/ATK/DEF/SPD) and can provide combat modifiers (crit/dodge/utility).',
      'Growth: pets level through pet EXP systems and improve derived pet bonus output.',
      'Sources: pet drops and pet EXP dust are granted by chest/reward systems (mini boss, ladder, spin, etc.).',
      'UI behavior: pet bonuses are separated from base monster stats so players can see contribution clearly.',
    ],
  },
  {
    id: 'skill_book_system',
    label: 'Skill Book System',
    lines: [
      'Inventory: passive books are collected as instances, then equipped to specific monsters.',
      'Slots: each monster has limited passive slots, so not all books can be active at once.',
      'Combat: equipped passives are resolved by passive resolver during turns/attacks.',
      'Balance: rarity and effect type determine power and fit for build strategy.',
      'Decision layer: book loadout is a major lever for PvE consistency and boss matchup prep.',
    ],
  },
  {
    id: 'equip_system',
    label: 'Equip System',
    lines: [
      'Item model: gear is instance-based (not static IDs), each piece has rolled stat values.',
      'Rarity bands: rare/epic/mythic govern stat line count, ranges, and potential sockets.',
      'Set logic: full set bonus activates only when matching set pieces occupy required slots.',
      'Battle-active lines: HP, Attack, Defense, Speed/Agility, Crit, Dodge, HitRate.',
      'Source flow: shop purchases and chest drops both feed the same inventory/equip pipeline.',
    ],
  },
  {
    id: 'battle_system',
    label: 'Battle System',
    lines: [
      'Core resolution: attacks compare attacker output vs defender mitigation using stat + skill context.',
      'Turn flow: battle loop processes action selection, passive/pet triggers, status ticks, and KO checks.',
      'Hit/Dodge rule: HitRate is flat and offsets Dodge directly; it is not a standalone hit percentage.',
      'Dodge formula: final dodge chance uses defender Dodge minus attacker HitRate, then clamps to allowed range.',
      'Final outcome: skills, passives, pets, crit rolls, and status effects are layered into each turn result.',
    ],
  },
  {
    id: 'gemming_system',
    label: 'Gemming System',
    lines: [
      'Socket roll: socket count is rolled on acquisition based on item rarity band.',
      'Shop rule: socket count is hidden before purchase; revealed only after item is owned.',
      'Purchase rule: socket result is random per purchase, even for same-day repeated buys.',
      'Inventory clarity: owned items show explicit `Socket: 0/1/2` display.',
      'Future path: gem insertion will consume these sockets as build customization slots.',
    ],
  },
  {
    id: 'multiplayer',
    label: 'Multiplayer',
    lines: [
      'Session flow: create/join room, lock players, then run synchronized battle session.',
      'Authority: multiplayer resolves through shared/socket-driven state paths, not solo local-only loop.',
      'Combat parity: core battle math is mirrored to keep multiplayer behavior consistent with local rules.',
      'Rewards/progression: result handling is separated from main CPU mini boss and ladder chest triggers.',
      'Purpose: competitive mode without inheriting every PvE reward event.',
    ],
  },
  {
    id: 'daily_spin',
    label: 'Daily Spin',
    lines: [
      'Availability: daily spin is time-gated and tracked by reward-day key/claim timestamp.',
      'Segments: wheel includes coins, shards, gear chest, monster chest, mythic outcome, and high coin jackpots.',
      'Chest segments: chest results are opened through chest open logic, not placeholder rewards.',
      'Bonus hooks: spin flow can attach bonus gear, pet, or passive book grants.',
      'Result persistence: claim writes directly into profile resources and inventories.',
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
