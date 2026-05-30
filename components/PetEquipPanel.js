import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { calculatePetStats } from '../src/gameSystems/pets';
import { PET_MAX_LEVEL } from '../src/gameSystems/petExp';
import { describePetSkill } from '../src/gameSystems/petSkills';
import { petEquippedToMonster } from '../src/gameSystems/petInventory';

const RARITY_COLORS = { rare: '#60a5fa', epic: '#c084fc', mythic: '#f472b6' };

const DUST_PER_USE = 50;
const EXP_PER_DUST = 8;

export default function PetEquipPanel({
  profile,
  monsterId,
  monsterName = 'Monster',
  onEquip,
  onUnequip,
  onSpendDust,
}) {
  const [filter, setFilter] = useState('all');
  const owned = profile?.ownedPets ?? [];
  const equipped = petEquippedToMonster(profile, monsterId);
  const dustTotal = profile?.petExpDust ?? 0;
  const canSpendDust = dustTotal >= DUST_PER_USE && !!equipped;

  const rows = useMemo(() => {
    return owned.map((p) => {
      const stats = calculatePetStats({ rarity: p.rarity, level: p.level });
      const equippedElsewhere =
        p.equippedToMonsterId && p.equippedToMonsterId !== monsterId
          ? p.equippedToMonsterId
          : null;
      return {
        ...p,
        stats,
        equippedElsewhere,
        skillText: (p.skills || []).map((s) => describePetSkill(s, p.rarity)).join(' · '),
      };
    });
  }, [owned, monsterId]);

  const filtered = rows.filter((r) => filter === 'all' || r.rarity === filter);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Pets for {monsterName}</Text>
      <Text style={styles.dustLine}>Pet EXP dust: {dustTotal}</Text>
      {equipped ? (
        <View style={styles.equippedBox}>
          <View style={styles.equippedCol}>
            <Text style={styles.equippedTxt}>
              Equipped: {equipped.emoji} {equipped.name} · Lv {equipped.level}
            </Text>
            {canSpendDust ? (
              <TouchableOpacity
                style={styles.dustBtn}
                onPress={() => onSpendDust?.(equipped.instanceId, DUST_PER_USE)}
              >
                <Text style={styles.dustBtnTxt}>
                  Use {DUST_PER_USE} dust (+{DUST_PER_USE * EXP_PER_DUST} EXP)
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={styles.unequipBtn} onPress={() => onUnequip?.()}>
            <Text style={styles.unequipTxt}>Unequip</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.none}>No pet equipped</Text>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {['all', 'rare', 'epic', 'mythic'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipOn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipTxt, filter === f && styles.chipTxtOn]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.list} nestedScrollEnabled>
        {filtered.length === 0 ? (
          <Text style={styles.empty}>No pets owned. Buy pets in Shop → Pets tab.</Text>
        ) : (
          filtered.map((row) => {
            const isEquippedHere = row.equippedToMonsterId === monsterId;
            const busyElsewhere = !!row.equippedElsewhere && !isEquippedHere;
            return (
              <View key={row.instanceId} style={styles.row}>
                <Text style={styles.emoji}>{row.emoji}</Text>
                <View style={styles.mid}>
                  <Text style={styles.name}>{row.name}</Text>
                  <Text style={[styles.rarity, { color: RARITY_COLORS[row.rarity] }]}>
                    {row.rarity} · Lv {row.level}/{PET_MAX_LEVEL}
                  </Text>
                  <Text style={styles.statLine}>
                    HP +{row.stats.hp} · ATK +{row.stats.atk} · DEF +{row.stats.def} · SPD +{row.stats.spd}
                  </Text>
                  <Text style={styles.skills}>{row.skillText}</Text>
                  {busyElsewhere ? (
                    <Text style={styles.busy}>Equipped on another monster</Text>
                  ) : null}
                  {!isEquippedHere ? (
                    <TouchableOpacity
                      style={[styles.equipBtn, busyElsewhere && styles.equipBtnSwap]}
                      onPress={() => onEquip?.(row.instanceId)}
                    >
                      <Text style={styles.equipTxt}>{busyElsewhere ? 'Swap here' : 'Equip'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.here}>Equipped here</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 220 },
  title: { fontWeight: '900', fontSize: 15, color: '#f1f5f9', marginBottom: 8 },
  dustLine: { color: '#c4b5fd', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  equippedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  equippedCol: { flex: 1, marginRight: 8 },
  equippedTxt: { color: '#86efac', fontWeight: '700', fontSize: 12 },
  dustBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#6d28d9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  dustBtnTxt: { color: '#ede9fe', fontWeight: '800', fontSize: 10 },
  unequipBtn: { backgroundColor: '#475569', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  unequipTxt: { color: '#f8fafc', fontWeight: '800', fontSize: 11 },
  none: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
  filterScroll: { maxHeight: 36, marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(30,41,59,0.8)',
    marginRight: 6,
  },
  chipOn: { backgroundColor: '#334155' },
  chipTxt: { color: '#94a3b8', fontWeight: '700', fontSize: 11, textTransform: 'capitalize' },
  chipTxtOn: { color: '#f8fafc' },
  list: { flex: 1 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(148,163,184,0.12)' },
  emoji: { fontSize: 28, width: 40 },
  mid: { flex: 1 },
  name: { fontWeight: '900', color: '#f1f5f9', fontSize: 14 },
  rarity: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statLine: { fontSize: 10, color: '#cbd5e1', marginTop: 2 },
  skills: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  busy: { fontSize: 10, color: '#fbbf24', marginTop: 4 },
  equipBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  equipBtnSwap: { backgroundColor: '#b45309' },
  equipTxt: { color: '#fff', fontWeight: '800', fontSize: 11 },
  here: { color: '#4ade80', fontWeight: '800', fontSize: 11, marginTop: 6 },
  empty: { color: '#94a3b8', fontSize: 13, padding: 16, textAlign: 'center' },
});
