import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RARITY_UI } from '../utils/monsterTemplates';
import { getLadderGear, LADDER_GEAR_CATALOG } from '../utils/monsterLadder/ladderGearCatalog';
import { getLadderMonsterTemplate } from '../utils/monsterLadder/ladderMonsterCatalog';

function GearChip({ gearId, ownedCount = 1, onPress }) {
  const gear = getLadderGear(gearId);
  if (!gear) return null;
  const ui = RARITY_UI[gear.rarity] ?? RARITY_UI.common;
  return (
    <TouchableOpacity style={[styles.equippedChip, { borderColor: ui.border }]} onPress={onPress}>
      <Text style={styles.equippedEmoji}>{gear.emoji}</Text>
      <View style={styles.equippedMeta}>
        <Text style={styles.equippedName}>{gear.name}</Text>
        <Text style={styles.equippedSub}>{gear.slot} · owned x{ownedCount} · tap to remove</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MonsterLadderGearScreen({
  visible,
  monsterLadder,
  onClose,
  onEquip,
  onUnequip,
}) {
  const active = monsterLadder?.ownedMonsters?.find((m) => m.id === monsterLadder.activeMonsterId);
  const ownedCounts = useMemo(() => {
    const counts = {};
    for (const id of monsterLadder?.ownedGear || []) counts[id] = (counts[id] ?? 0) + 1;
    return counts;
  }, [monsterLadder?.ownedGear]);
  const ownedSet = useMemo(() => new Set(Object.keys(ownedCounts)), [ownedCounts]);
  const equipped = Array.isArray(active?.equippedLadderGear) ? active.equippedLadderGear : [];
  const available = LADDER_GEAR_CATALOG.filter((g) => ownedSet.has(g.id) && !equipped.includes(g.id));
  const template = active ? getLadderMonsterTemplate(active.templateId) : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Ladder Gear</Text>
          <Text style={styles.sub}>
            {active ? `${active.nickname || template?.name} · Lv ${active.level}` : 'Equip a ladder monster first'}
          </Text>

          <Text style={styles.sectionTitle}>Equipped</Text>
          <View style={styles.equippedBox}>
            {active && equipped.length > 0 ? (
              equipped.map((id) => (
                <GearChip key={id} gearId={id} ownedCount={ownedCounts[id] ?? 1} onPress={() => onUnequip(active.id, id)} />
              ))
            ) : (
              <Text style={styles.empty}>No ladder gear equipped.</Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>Owned ladder gear</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
            {!active ? (
              <Text style={styles.empty}>Pick a ladder monster in the collection first.</Text>
            ) : available.length === 0 ? (
              <Text style={styles.empty}>Open gear chests at mini bosses to find ladder gear.</Text>
            ) : (
              available.map((gear) => {
                const ui = RARITY_UI[gear.rarity] ?? RARITY_UI.common;
                return (
                  <TouchableOpacity
                    key={gear.id}
                    style={[styles.row, { borderColor: ui.border }]}
                    onPress={() => onEquip(active.id, gear.id)}
                  >
                    <Text style={styles.gearEmoji}>{gear.emoji}</Text>
                    <View style={styles.meta}>
                      <Text style={styles.name}>{gear.name}</Text>
                      <Text style={styles.detail}>
                        {ui.label} · {gear.slot} · owned x{ownedCounts[gear.id] ?? 1}
                      </Text>
                    </View>
                    <Text style={styles.equipTxt}>Equip</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '82%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  title: { fontWeight: '900', fontSize: 20, color: '#1a1a2e' },
  sub: { fontWeight: '700', fontSize: 12, color: '#636e72', marginTop: 2 },
  sectionTitle: {
    fontWeight: '900',
    fontSize: 12,
    color: '#6c5ce7',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  equippedBox: { gap: 8 },
  equippedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    gap: 10,
    backgroundColor: 'rgba(108,92,231,0.06)',
  },
  equippedEmoji: { fontSize: 26 },
  equippedMeta: { flex: 1 },
  equippedName: { fontWeight: '900', fontSize: 14, color: '#1a1a2e' },
  equippedSub: { fontWeight: '700', fontSize: 11, color: '#636e72', marginTop: 2 },
  list: { maxHeight: 330 },
  listInner: { gap: 8, paddingBottom: 8 },
  empty: { fontWeight: '800', fontSize: 13, color: '#636e72', textAlign: 'center', padding: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  gearEmoji: { fontSize: 28, width: 34, textAlign: 'center' },
  meta: { flex: 1 },
  name: { fontWeight: '900', fontSize: 14, color: '#1a1a2e' },
  detail: { fontWeight: '700', fontSize: 11, color: '#636e72', marginTop: 2 },
  equipTxt: { fontWeight: '900', fontSize: 12, color: '#6c5ce7' },
  closeBtn: {
    marginTop: 10,
    backgroundColor: '#6c5ce7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
