import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import {
  GEAR_CATALOG,
  GEAR_SLOT_LABELS,
  formatGearBonusLines,
  getEquippedInSlot,
} from '../utils/cosmetics';
import { fighterFromOwned } from '../utils/fighterFromOwned';
import { useReadableType } from '../utils/readableType';

function StatBlock({ label, base, bonus, total, type }) {
  const showBonus = bonus > 0;
  return (
    <Text style={[styles.statLine, { fontSize: type.statSm }]}>
      <Text style={styles.statLbl}>{label}: </Text>
      {base}
      {showBonus ? <Text style={styles.statBonus}> (+{bonus})</Text> : null}
      <Text style={styles.statTotal}> = {total}</Text>
    </Text>
  );
}

/**
 * Buy / equip gear for one owned monster. Gear changes look + small power bonuses.
 */
export default function MonsterGearScreen({
  visible,
  onClose,
  coins,
  ownedGearIds,
  ownedMonster,
  onBuy,
  onEquip,
  onUnequip,
}) {
  const type = useReadableType();
  const ownedSet = useMemo(() => new Set(ownedGearIds || []), [ownedGearIds]);
  const equipped = ownedMonster?.equippedGear || [];
  const fighter = ownedMonster ? fighterFromOwned(ownedMonster) : null;

  const bonus = fighter?.gearBonuses;
  const base = fighter?.baseStats;
  const total = fighter?.stats;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.title, { fontSize: type.section + 4 }]}>Monster Gear</Text>
          <Text style={[styles.sub, { fontSize: type.body }]}>
            Gear changes how your monster looks and adds small power bonuses. One item per slot.
          </Text>
          <Text style={[styles.coins, { fontSize: type.stat }]}>Coins: {coins ?? 0}</Text>

          {fighter ? (
            <View style={styles.previewRow}>
              <MonsterPreview parts={fighter.monsterParts} size={100} mood="happy" />
              <View style={styles.previewMeta}>
                <Text style={[styles.monName, { fontSize: type.stat }]}>{fighter.displayName}</Text>
                <Text style={[styles.slotHint, { fontSize: type.statSm }]}>Equipped gear shows on your monster</Text>
              </View>
            </View>
          ) : null}

          {base && total && bonus ? (
            <View style={styles.statsBox}>
              <Text style={[styles.statsHdr, { fontSize: type.stat }]}>Battle stats</Text>
              <StatBlock label="HP" base={base.hp} bonus={bonus.hp} total={total.hp} type={type} />
              <StatBlock label="MP" base={base.mp} bonus={bonus.mp} total={total.mp} type={type} />
              <StatBlock
                label="Attack"
                base={`${base.attack.min}–${base.attack.max}`}
                bonus={bonus.attackMin || bonus.attackMax ? `+${bonus.attackMin}/${bonus.attackMax}` : 0}
                total={`${total.attack.min}–${total.attack.max}`}
                type={type}
              />
              <StatBlock label="Crit %" base={base.critPct} bonus={bonus.critPct} total={total.critPct} type={type} />
              <StatBlock label="Dodge %" base={base.dodgePct} bonus={bonus.dodgePct} total={total.dodgePct} type={type} />
              {bonus.expPct ? (
                <Text style={[styles.expNote, { fontSize: type.statSm }]}>+{bonus.expPct}% EXP from gear after battles</Text>
              ) : null}
            </View>
          ) : null}

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {GEAR_CATALOG.map((g) => {
              const have = ownedSet.has(g.id);
              const worn = equipped.includes(g.id);
              const slotTaken = getEquippedInSlot(equipped, g.slot);
              const afford = !have && (coins ?? 0) >= g.price;
              const bonusLines = formatGearBonusLines(g);

              return (
                <View key={g.id} style={styles.row}>
                  <Text style={styles.emoji}>{g.emoji}</Text>
                  <View style={styles.mid}>
                    <Text style={[styles.name, { fontSize: type.stat }]}>{g.name}</Text>
                    <Text style={[styles.slot, { fontSize: type.statSm }]}>
                      {GEAR_SLOT_LABELS[g.slot]} slot · {g.price} coins
                    </Text>
                    <Text style={[styles.bonusLine, { fontSize: type.statSm }]}>{bonusLines.join(' · ')}</Text>
                    <Text style={[styles.status, { fontSize: type.statSm }]}>
                      {worn ? '✓ Equipped on this monster' : have ? 'Owned' : 'Not owned'}
                      {!worn && have && slotTaken && slotTaken !== g.id ? ' · another item in this slot' : ''}
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    {!have ? (
                      <TouchableOpacity
                        style={[styles.btn, styles.btnBuy, !afford && styles.btnOff]}
                        disabled={!afford}
                        onPress={() => onBuy?.(g.id)}
                      >
                        <Text style={[styles.btnTxt, { fontSize: type.btnSm }]}>Buy</Text>
                      </TouchableOpacity>
                    ) : worn ? (
                      <TouchableOpacity style={[styles.btn, styles.btnUnequip]} onPress={() => onUnequip?.(g.id)}>
                        <Text style={[styles.btnTxt, { fontSize: type.btnSm }]}>Remove</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={[styles.btn, styles.btnEquip]} onPress={() => onEquip?.(g.id)}>
                        <Text style={[styles.btnTxt, { fontSize: type.btnSm }]}>Equip</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeTxt, { fontSize: type.btn }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff8f2',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 4,
    borderColor: '#9b59b6',
    padding: 16,
    maxHeight: '92%',
  },
  title: { fontWeight: '900', color: '#2d2d44', textAlign: 'center' },
  sub: { textAlign: 'center', fontWeight: '700', color: '#4a5568', marginTop: 6, lineHeight: 22 },
  coins: { textAlign: 'center', fontWeight: '900', color: '#c0392b', marginVertical: 8 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#dfe6e9',
    padding: 10,
    marginBottom: 10,
  },
  previewMeta: { flex: 1, marginLeft: 8 },
  monName: { fontWeight: '900', color: '#1a1a2e' },
  slotHint: { fontWeight: '700', color: '#636e72', marginTop: 4 },
  statsBox: {
    backgroundColor: 'rgba(142, 68, 173, 0.08)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#9b59b6',
    padding: 12,
    marginBottom: 10,
  },
  statsHdr: { fontWeight: '900', color: '#512e5f', marginBottom: 6 },
  statLine: { fontWeight: '700', color: '#2d3436', marginBottom: 4, lineHeight: 22 },
  statLbl: { fontWeight: '900', color: '#1a1a2e' },
  statBonus: { fontWeight: '900', color: '#27ae60' },
  statTotal: { fontWeight: '900', color: '#c0392b' },
  expNote: { fontWeight: '800', color: '#6c3483', marginTop: 4 },
  list: { maxHeight: 340 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderColor: '#f0e6ff',
  },
  emoji: { fontSize: 32, width: 44, textAlign: 'center' },
  mid: { flex: 1, paddingHorizontal: 6 },
  name: { fontWeight: '900', color: '#1a1a2e' },
  slot: { fontWeight: '800', color: '#636e72', marginTop: 2 },
  bonusLine: { fontWeight: '800', color: '#27ae60', marginTop: 4 },
  status: { fontWeight: '800', color: '#4a5568', marginTop: 4 },
  actions: { minWidth: 88 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
    alignItems: 'center',
  },
  btnBuy: { backgroundColor: '#8ac926' },
  btnEquip: { backgroundColor: '#48cae4' },
  btnUnequip: { backgroundColor: '#dfe6e9' },
  btnOff: { opacity: 0.4 },
  btnTxt: { fontWeight: '900', color: '#1b1b2f' },
  closeBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: '#ff9f1c',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#2d2d44',
  },
  closeTxt: { fontWeight: '900', color: '#1b1b2f' },
});
