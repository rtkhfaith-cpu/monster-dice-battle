import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import {
  GEAR_CATALOG,
  GEAR_CATEGORY_LABELS,
  formatGearBonusLines,
  getGear,
} from '../utils/cosmetics';
import { fighterFromOwned } from '../utils/fighterFromOwned';
import {
  MAX_GEAR_SLOTS,
  getUnlockedSlotCount,
  nextSlotUnlockCost,
  normalizeEquippedSlots,
} from '../utils/gearSlots';
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

function GearShopRow({ g, have, worn, afford, selectedSlot, slotsFull, onBuy, onEquip, onUnequip, type }) {
  const bonusLines = formatGearBonusLines(g);
  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{g.emoji}</Text>
      <View style={styles.mid}>
        <Text style={[styles.name, { fontSize: type.stat }]}>{g.name}</Text>
        <Text style={[styles.slot, { fontSize: type.statSm }]}>
          {GEAR_CATEGORY_LABELS[g.category]} · {g.price} coins
        </Text>
        <Text style={[styles.bonusLine, { fontSize: type.statSm }]}>{bonusLines.join(' · ')}</Text>
        <Text style={[styles.status, { fontSize: type.statSm }]}>
          {worn ? '✓ Equipped' : have ? 'Owned' : 'Not owned'}
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
          <TouchableOpacity
            style={[styles.btn, styles.btnUnequip]}
            onPress={() => {
              const idx = slotsFull.indexOf(g.id);
              onUnequip?.(g.id, idx >= 0 ? idx : undefined);
            }}
          >
            <Text style={[styles.btnTxt, { fontSize: type.btnSm }]}>Remove</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.btn, styles.btnEquip, selectedSlot == null && slotsFull.every(Boolean) && styles.btnOff]}
            disabled={selectedSlot == null && slotsFull.every(Boolean)}
            onPress={() => onEquip?.(g.id)}
          >
            <Text style={[styles.btnTxt, { fontSize: type.btnSm }]}>Equip</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/**
 * Per-monster gear equip + shop (scrollable).
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
  onUnlockSlot,
  onOpenGearMart,
}) {
  const type = useReadableType();
  const ownedSet = useMemo(() => new Set(ownedGearIds || []), [ownedGearIds]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [filterCat, setFilterCat] = useState('all');
  const [tab, setTab] = useState('equip');

  const unlockedSlots = getUnlockedSlotCount(ownedMonster);
  const slots = normalizeEquippedSlots(ownedMonster?.equippedGear, unlockedSlots);
  const unlockCost = nextSlotUnlockCost(ownedMonster);
  const fighter = ownedMonster ? fighterFromOwned(ownedMonster) : null;
  const bonus = fighter?.gearBonuses;
  const base = fighter?.baseStats;
  const total = fighter?.stats;

  const catalog = useMemo(() => {
    if (filterCat === 'all') return GEAR_CATALOG;
    return GEAR_CATALOG.filter((g) => g.category === filterCat);
  }, [filterCat]);

  const ownedCatalog = useMemo(() => GEAR_CATALOG.filter((g) => ownedSet.has(g.id)), [ownedSet]);

  function handleEquip(gearId) {
    if (typeof selectedSlot === 'number') onEquip?.(gearId, selectedSlot);
    else onEquip?.(gearId);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.title, { fontSize: type.section + 4 }]}>Monster Gear</Text>
          <Text style={[styles.coins, { fontSize: type.stat }]}>Coins: {coins ?? 0}</Text>

          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'equip' && styles.tabOn]}
              onPress={() => setTab('equip')}
            >
              <Text style={[styles.tabTxt, tab === 'equip' && styles.tabTxtOn]}>Equip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, tab === 'shop' && styles.tabOn]}
              onPress={() => setTab('shop')}
            >
              <Text style={[styles.tabTxt, tab === 'shop' && styles.tabTxtOn]}>Gear Mart</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {tab === 'equip' ? (
              <>
                {fighter ? (
                  <View style={styles.previewRow}>
                    <MonsterPreview parts={fighter.monsterParts} size={88} mood="happy" />
                    <View style={styles.previewMeta}>
                      <Text style={[styles.monName, { fontSize: type.stat }]}>{fighter.displayName}</Text>
                      <Text style={[styles.slotHint, { fontSize: type.statSm }]}>
                        Tap a slot below, then equip from your owned gear
                      </Text>
                    </View>
                  </View>
                ) : null}

                <Text style={[styles.slotsHdr, { fontSize: type.stat }]}>
                  Gear slots ({unlockedSlots}/{MAX_GEAR_SLOTS})
                </Text>
                <View style={styles.slotGrid}>
                  {Array.from({ length: MAX_GEAR_SLOTS }, (_, i) => {
                    const locked = i >= unlockedSlots;
                    const gearId = slots[i];
                    const g = gearId ? getGear(gearId) : null;
                    const isSelected = selectedSlot === i;
                    const costForThis = i === unlockedSlots ? unlockCost : null;

                    if (locked) {
                      return (
                        <TouchableOpacity
                          key={`slot-${i}`}
                          style={[styles.slotCell, styles.slotLocked]}
                          disabled={!costForThis}
                          onPress={() => costForThis && onUnlockSlot?.()}
                        >
                          <Text style={styles.lockIcon}>🔒</Text>
                          <Text style={styles.slotNum}>Slot {i + 1}</Text>
                          {costForThis ? (
                            <Text style={styles.unlockPrice}>Unlock {costForThis} 🪙</Text>
                          ) : (
                            <Text style={styles.unlockPriceMuted}>Locked</Text>
                          )}
                        </TouchableOpacity>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={`slot-${i}`}
                        style={[
                          styles.slotCell,
                          g ? styles.slotFilled : styles.slotEmpty,
                          isSelected && styles.slotSelected,
                        ]}
                        onPress={() => setSelectedSlot(i)}
                        onLongPress={() => g && onUnequip?.(g.id, i)}
                      >
                        {g ? (
                          <>
                            <Text style={styles.slotEmoji}>{g.emoji}</Text>
                            <Text style={styles.slotGearName} numberOfLines={1}>
                              {g.name}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text style={styles.emptyPlus}>+</Text>
                            <Text style={styles.slotNum}>Slot {i + 1}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {base && total && bonus ? (
                  <View style={styles.statsBox}>
                    <Text style={[styles.statsHdr, { fontSize: type.stat }]}>Battle stats (live)</Text>
                    <StatBlock label="HP" base={base.hp} bonus={bonus.hp} total={total.hp} type={type} />
                    <StatBlock label="MP" base={base.mp} bonus={bonus.mp} total={total.mp} type={type} />
                    <StatBlock
                      label="Attack"
                      base={`${base.attack.min}–${base.attack.max}`}
                      bonus={bonus.attackMin || bonus.attackMax ? `+${bonus.attackMin}/${bonus.attackMax}` : 0}
                      total={`${total.attack.min}–${total.attack.max}`}
                      type={type}
                    />
                  </View>
                ) : null}

                <Text style={styles.sectionHdr}>Your owned gear</Text>
                {ownedCatalog.length === 0 ? (
                  <Text style={styles.emptyShop}>
                    No gear yet. Open the Gear Mart tab or lobby Gear Mart to buy items.
                  </Text>
                ) : (
                  ownedCatalog.map((g) => (
                    <GearShopRow
                      key={g.id}
                      g={g}
                      have
                      worn={slots.includes(g.id)}
                      afford={false}
                      selectedSlot={selectedSlot}
                      slotsFull={slots}
                      onEquip={handleEquip}
                      onUnequip={onUnequip}
                      type={type}
                    />
                  ))
                )}
              </>
            ) : (
              <>
                <Text style={styles.shopHint}>
                  Buy gear with coins. It is added to your profile — equip it on the Equip tab.
                </Text>
                {onOpenGearMart ? (
                  <TouchableOpacity style={styles.openMartBtn} onPress={onOpenGearMart}>
                    <Text style={styles.openMartTxt}>Open full Gear Mart (lobby)</Text>
                  </TouchableOpacity>
                ) : null}
                <View style={styles.filterRow}>
                  {['all', 'stat', 'element', 'fun'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.filterChip, filterCat === cat && styles.filterChipOn]}
                      onPress={() => setFilterCat(cat)}
                    >
                      <Text style={[styles.filterTxt, filterCat === cat && styles.filterTxtOn]}>
                        {cat === 'all' ? 'All' : GEAR_CATEGORY_LABELS[cat]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {catalog.map((g) => (
                  <GearShopRow
                    key={g.id}
                    g={g}
                    have={ownedSet.has(g.id)}
                    worn={slots.includes(g.id)}
                    afford={!ownedSet.has(g.id) && (coins ?? 0) >= g.price}
                    selectedSlot={selectedSlot}
                    slotsFull={slots}
                    onBuy={onBuy}
                    onEquip={handleEquip}
                    onUnequip={onUnequip}
                    type={type}
                  />
                ))}
              </>
            )}
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
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    maxHeight: '92%',
    height: '92%',
    flexDirection: 'column',
  },
  title: { fontWeight: '900', color: '#2d2d44', textAlign: 'center' },
  coins: { textAlign: 'center', fontWeight: '900', color: '#c0392b', marginVertical: 6 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#dfe6e9',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  tabOn: { backgroundColor: '#9b59b6', borderColor: '#6c3483' },
  tabTxt: { fontWeight: '900', fontSize: 13, color: '#636e72' },
  tabTxtOn: { color: '#fff' },
  scroll: {
    flex: 1,
    minHeight: 0,
    ...(Platform.OS === 'web'
      ? { overflowY: 'auto', WebkitOverflowScrolling: 'touch' }
      : {}),
  },
  scrollContent: { paddingBottom: 16 },
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
  slotsHdr: { fontWeight: '900', color: '#512e5f', marginBottom: 8 },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  slotCell: {
    width: '31%',
    minHeight: 80,
    borderRadius: 12,
    borderWidth: 3,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: {
    backgroundColor: 'rgba(142, 68, 173, 0.08)',
    borderColor: '#b8b8d0',
    borderStyle: 'dashed',
  },
  slotFilled: { backgroundColor: '#fff', borderColor: '#27ae60' },
  slotSelected: { borderColor: '#ff9f1c', backgroundColor: 'rgba(255, 159, 28, 0.12)' },
  slotLocked: { backgroundColor: 'rgba(0,0,0,0.12)', borderColor: '#636e72', opacity: 0.9 },
  lockIcon: { fontSize: 20 },
  slotNum: { fontWeight: '800', fontSize: 10, color: '#636e72', marginTop: 2 },
  unlockPrice: { fontWeight: '900', fontSize: 10, color: '#f39c12', marginTop: 4, textAlign: 'center' },
  unlockPriceMuted: { fontWeight: '800', fontSize: 9, color: '#95a5a6', marginTop: 4 },
  slotEmoji: { fontSize: 24 },
  slotGearName: { fontWeight: '900', fontSize: 9, color: '#1a1a2e', textAlign: 'center' },
  emptyPlus: { fontSize: 26, color: '#b2bec3' },
  statsBox: {
    backgroundColor: 'rgba(142, 68, 173, 0.08)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#9b59b6',
    padding: 12,
    marginBottom: 12,
  },
  statsHdr: { fontWeight: '900', color: '#512e5f', marginBottom: 6 },
  statLine: { fontWeight: '700', color: '#2d3436', marginBottom: 4, lineHeight: 22 },
  statLbl: { fontWeight: '900', color: '#1a1a2e' },
  statBonus: { fontWeight: '900', color: '#27ae60' },
  statTotal: { fontWeight: '900', color: '#c0392b' },
  sectionHdr: { fontWeight: '900', fontSize: 14, color: '#512e5f', marginBottom: 8, marginTop: 4 },
  emptyShop: { fontWeight: '700', color: '#636e72', marginBottom: 12, lineHeight: 20 },
  shopHint: { fontWeight: '700', color: '#4a5568', marginBottom: 10, lineHeight: 20 },
  openMartBtn: {
    alignSelf: 'center',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#e8daef',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  openMartTxt: { fontWeight: '800', fontSize: 12, color: '#512e5f' },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#dfe6e9',
    backgroundColor: '#fff',
  },
  filterChipOn: { backgroundColor: '#9b59b6', borderColor: '#6c3483' },
  filterTxt: { fontWeight: '800', fontSize: 12, color: '#636e72' },
  filterTxtOn: { color: '#fff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderColor: '#f0e6ff',
  },
  emoji: { fontSize: 32, width: 44, textAlign: 'center' },
  mid: { flex: 1, paddingHorizontal: 6, minWidth: 0 },
  name: { fontWeight: '900', color: '#1a1a2e' },
  slot: { fontWeight: '800', color: '#636e72', marginTop: 2 },
  bonusLine: { fontWeight: '800', color: '#27ae60', marginTop: 4 },
  status: { fontWeight: '800', color: '#4a5568', marginTop: 4 },
  actions: { minWidth: 88 },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#ff9f1c',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#2d2d44',
  },
  closeTxt: { fontWeight: '900', color: '#1b1b2f' },
});
