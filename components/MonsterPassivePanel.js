import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  canEquipPassive,
  listUnequippedBooks,
  monsterEquippedPassives,
} from '../src/gameSystems/passiveInventory';
import {
  getPassiveDescription,
  getPassiveSkillDef,
  passiveSlotLimitForRarity,
} from '../src/gameSystems/passiveSkills';
import { getMonsterTemplate } from '../utils/monsterTemplates';
import { getLadderMonsterTemplate } from '../utils/monsterLadder/ladderMonsterCatalog';

const RARITY_COLOR = {
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
  mythic: '#f472b6',
};

export default function MonsterPassivePanel({
  monster,
  profile,
  onEquipBook,
  onRemovePassive,
  onOpenSkillShop,
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const tpl = getMonsterTemplate(monster?.templateId) ?? getLadderMonsterTemplate(monster?.templateId);
  const rarity = tpl?.rarity ?? 'common';
  const limit = passiveSlotLimitForRarity(rarity);
  const equipped = monsterEquippedPassives(monster);
  const books = useMemo(() => listUnequippedBooks(profile), [profile]);

  if (limit <= 0) {
    return (
      <View style={styles.box}>
        <Text style={styles.title}>Passive Skills</Text>
        <Text style={styles.muted}>
          {rarity} monsters cannot equip passives. Epic+ unlock slots (Epic 1, Legendary 2, Mythic/Ultra Mythic 3).
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Passive Skills</Text>
      <Text style={styles.slots}>
        Passive Slots: {equipped.length}/{limit}
      </Text>

      {equipped.map((p) => {
        const def = getPassiveSkillDef(p.skillId);
        return (
          <View key={p.skillId} style={styles.equippedRow}>
            <View style={styles.equippedMid}>
              <Text style={[styles.skillName, { color: RARITY_COLOR[p.rarity] ?? '#e2e8f0' }]}>
                {def?.name ?? p.skillId} ({p.rarity})
              </Text>
              <Text style={styles.desc}>{getPassiveDescription(p.skillId, p.rarity)}</Text>
            </View>
            <TouchableOpacity style={styles.removeBtn} onPress={() => onRemovePassive?.(p.skillId)}>
              <Text style={styles.removeTxt}>Remove</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {equipped.length < limit ? (
        <TouchableOpacity style={styles.equipBtn} onPress={() => setPickerOpen(!pickerOpen)}>
          <Text style={styles.equipTxt}>{pickerOpen ? 'Hide books' : 'Equip passive book'}</Text>
        </TouchableOpacity>
      ) : null}

      {pickerOpen ? (
        <ScrollView style={styles.picker} nestedScrollEnabled>
          {books.length === 0 ? (
            <Text style={styles.muted}>No skill books in inventory. Open Gear & Skill Shop or earn from chests.</Text>
          ) : (
            books.map((book) => {
              const check = canEquipPassive(monster, book, equipped);
              const def = getPassiveSkillDef(book.skillId);
              return (
                <TouchableOpacity
                  key={book.instanceId}
                  style={[styles.bookRow, !check.ok && styles.bookRowOff]}
                  disabled={!check.ok}
                  onPress={() => {
                    onEquipBook?.(book.instanceId);
                    setPickerOpen(false);
                  }}
                >
                  <Text style={[styles.bookName, { color: RARITY_COLOR[book.rarity] }]}>
                    {def?.name ?? book.skillName} ({book.rarity})
                  </Text>
                  <Text style={styles.desc}>{getPassiveDescription(book.skillId, book.rarity)}</Text>
                  {!check.ok ? <Text style={styles.err}>{check.error}</Text> : null}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      ) : null}

      <TouchableOpacity style={styles.linkBtn} onPress={onOpenSkillShop}>
        <Text style={styles.linkTxt}>Open Gear & Skill Shop</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  title: { color: '#f8fafc', fontWeight: '800', fontSize: 16, marginBottom: 4 },
  slots: { color: '#a5b4fc', fontWeight: '700', fontSize: 13, marginBottom: 10 },
  muted: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  equippedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(30,41,59,0.6)',
  },
  equippedMid: { flex: 1 },
  skillName: { fontWeight: '700', fontSize: 14 },
  desc: { color: '#94a3b8', fontSize: 11, marginTop: 4 },
  removeBtn: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#7f1d1d', borderRadius: 8 },
  removeTxt: { color: '#fecaca', fontSize: 11, fontWeight: '700' },
  equipBtn: {
    marginTop: 8,
    backgroundColor: '#4f46e5',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  equipTxt: { color: '#fff', fontWeight: '700' },
  picker: { maxHeight: 180, marginTop: 8 },
  bookRow: {
    padding: 10,
    marginBottom: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(51,65,85,0.5)',
  },
  bookRowOff: { opacity: 0.5 },
  bookName: { fontWeight: '700', fontSize: 13 },
  err: { color: '#f87171', fontSize: 10, marginTop: 4 },
  linkBtn: { marginTop: 10, alignItems: 'center' },
  linkTxt: { color: '#818cf8', fontSize: 12, fontWeight: '600' },
});
