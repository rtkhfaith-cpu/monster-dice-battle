import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { calculatePetStats } from '../src/gameSystems/pets';
import { describePetSkill } from '../src/gameSystems/petSkills';
import {
  formatBookLabel,
  getPassiveDescription,
} from '../src/gameSystems/passiveInventory';
import GearInventoryPanel from './GearInventoryPanel';
import { GEAR_UI, gearModalStyles, gearRarityUi } from './gear/gearUiTheme';

const TABS = [
  { id: 'gear', label: 'Gear' },
  { id: 'pets', label: 'Pets' },
  { id: 'books', label: 'Skill books' },
];

const PET_RARITY = { rare: '#60a5fa', epic: '#c084fc', mythic: '#f472b6' };
const BOOK_RARITY = { rare: '#60a5fa', epic: '#c084fc', legendary: '#fbbf24', mythic: '#f472b6' };

function monsterDisplayName(ownedMonsters, monsterId) {
  const om = ownedMonsters?.find((m) => m.id === monsterId);
  if (!om) return 'another monster';
  return om.nickname || om.templateId;
}

/**
 * Player stash — full gear / pet / skill book inventory (not the equip layout).
 */
export default function PlayerInventoryScreen({
  visible,
  profile,
  coins,
  onClose,
  onSell,
  onOpenEquip,
}) {
  const [tab, setTab] = useState('gear');

  const pets = profile?.ownedPets ?? [];
  const books = profile?.passiveSkillBooksOwned ?? [];
  const ownedMonsters = profile?.ownedMonsters ?? [];

  const petRows = useMemo(
    () => [...pets].sort((a, b) => (b.level ?? 1) - (a.level ?? 1)),
    [pets],
  );

  const bookRows = useMemo(
    () => [...books].sort((a, b) => a.skillName?.localeCompare(b.skillName ?? '') ?? 0),
    [books],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={gearModalStyles.backdrop}>
        <View style={[gearModalStyles.card, styles.card]}>
          <Text style={gearModalStyles.title}>Inventory</Text>
          {typeof coins === 'number' ? (
            <Text style={gearModalStyles.coins}>🪙 {coins}</Text>
          ) : null}
          <Text style={gearModalStyles.sub}>
            Everything you own — equip items from the Equip Gear screen.
          </Text>

          <View style={styles.tabRow}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabBtn, tab === t.id && styles.tabOn]}
                onPress={() => setTab(t.id)}
              >
                <Text style={[styles.tabTxt, tab === t.id && styles.tabTxtOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.body}>
            {tab === 'gear' ? (
              <GearInventoryPanel
                profile={profile}
                onSell={onSell}
                onOpenEquip={onOpenEquip}
                fullHeight
              />
            ) : null}

            {tab === 'pets' ? (
              <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {petRows.length === 0 ? (
                  <Text style={styles.muted}>No pets yet. Get pets from the Gear Mart.</Text>
                ) : (
                  petRows.map((p) => {
                    const stats = calculatePetStats({ rarity: p.rarity, level: p.level });
                    const equippedOn = p.equippedToMonsterId
                      ? monsterDisplayName(ownedMonsters, p.equippedToMonsterId)
                      : null;
                    return (
                      <View key={p.instanceId} style={styles.row}>
                        <Text style={styles.rowEmoji}>{p.emoji}</Text>
                        <View style={styles.rowBody}>
                          <Text style={[styles.rowName, { color: PET_RARITY[p.rarity] }]}>
                            {p.name} · Lv {p.level}
                          </Text>
                          <Text style={styles.rowMeta}>
                            HP+{stats.hp} ATK+{stats.atk} · {(p.skills || [])
                              .map((s) => describePetSkill(s, p.rarity))
                              .join(' · ')}
                          </Text>
                          <Text style={[styles.rowStatus, equippedOn && styles.rowStatusOn]}>
                            {equippedOn ? `Equipped on ${equippedOn}` : 'In stash'}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            ) : null}

            {tab === 'books' ? (
              <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {bookRows.length === 0 ? (
                  <Text style={styles.muted}>
                    No skill books in stash. Buy from the shop or earn from chests.
                  </Text>
                ) : (
                  bookRows.map((book) => {
                    const ui = gearRarityUi(book.rarity);
                    const equippedOn = book.equippedToMonsterId
                      ? monsterDisplayName(ownedMonsters, book.equippedToMonsterId)
                      : null;
                    return (
                      <View
                        key={book.instanceId}
                        style={[styles.row, { borderColor: ui.border }]}
                      >
                        <View style={styles.rowBody}>
                          <Text style={[styles.rowName, { color: ui.color }]}>
                            {formatBookLabel(book)}
                          </Text>
                          <Text style={styles.rowMeta}>
                            {getPassiveDescription(book.skillId, book.rarity)}
                          </Text>
                          <Text style={[styles.rowStatus, equippedOn && styles.rowStatusOn]}>
                            {equippedOn ? `Held for ${equippedOn}` : 'Ready to equip'}
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            ) : null}
          </View>

          <TouchableOpacity style={gearModalStyles.closeBtn} onPress={onClose}>
            <Text style={gearModalStyles.closeTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    maxHeight: '92%',
    height: '92%',
    paddingTop: Platform.OS === 'ios' ? 14 : 10,
  },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GEAR_UI.tabBorder,
    backgroundColor: GEAR_UI.tab,
    alignItems: 'center',
  },
  tabOn: { backgroundColor: GEAR_UI.tabOn, borderColor: GEAR_UI.tabOnBorder },
  tabTxt: { fontWeight: '900', fontSize: 12, color: GEAR_UI.tabTxt },
  tabTxtOn: { color: GEAR_UI.tabTxtOn },
  body: { flex: 1, minHeight: 0 },
  list: { flex: 1 },
  muted: { color: GEAR_UI.muted, fontSize: 12, fontWeight: '800', textAlign: 'center', padding: 16, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: GEAR_UI.panelBorder,
    backgroundColor: GEAR_UI.panel,
    gap: 8,
  },
  rowEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  rowBody: { flex: 1, minWidth: 0 },
  rowName: { fontWeight: '900', fontSize: 14 },
  rowMeta: { color: GEAR_UI.sub, fontSize: 11, fontWeight: '800', marginTop: 4, lineHeight: 16 },
  rowStatus: { color: GEAR_UI.muted, fontSize: 10, fontWeight: '800', marginTop: 6 },
  rowStatusOn: { color: GEAR_UI.accent },
});
