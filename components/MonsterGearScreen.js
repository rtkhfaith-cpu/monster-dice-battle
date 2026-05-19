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

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'attack', label: 'Attack' },
  { id: 'magic', label: 'Magic' },
  { id: 'defense', label: 'Defense' },
  { id: 'speed', label: 'Speed' },
  { id: 'element', label: 'Element' },
  { id: 'utility', label: 'Utility' },
];

function gearMatchesFilter(g, filter) {
  if (filter === 'all') return true;
  const b = g.bonuses || {};
  if (filter === 'attack') return !!(b.attackMin || b.attackMax || b.critPct);
  if (filter === 'magic') return !!(b.magicMin || b.magicMax || b.mp || b.magicDefMin || b.magicDefMax);
  if (filter === 'defense') return !!(b.hp || b.defMin || b.defMax || b.magicDefMin || b.magicDefMax);
  if (filter === 'speed') return !!(b.dodgePct || b.agility || b.hitRate);
  if (filter === 'element') return !!g.element;
  if (filter === 'utility') return !!b.expPct || g.category === 'fun';
  return true;
}

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

function GearShopRow({ g, have, worn, afford, selectedSlot, slotsFull, onBuy, onEquip, onUnequip, onDetails, type }) {
  const bonusLines = formatGearBonusLines(g);
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.emojiCard} onPress={() => onDetails?.(g)} activeOpacity={0.86}>
        <Text style={styles.emoji}>{g.emoji}</Text>
        <Text style={styles.tapHint}>Details</Text>
      </TouchableOpacity>
      <View style={styles.mid}>
        <Text style={[styles.name, { fontSize: type.stat }]}>{g.name}</Text>
        <Text style={[styles.slot, { fontSize: type.statSm }]}>
          {GEAR_CATEGORY_LABELS[g.category] ?? g.category ?? 'Ladder'} · {g.ladderExclusive ? 'Chest reward' : `${g.price} coins`}
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
  const [detailGear, setDetailGear] = useState(null);

  const unlockedSlots = getUnlockedSlotCount(ownedMonster);
  const slots = normalizeEquippedSlots(ownedMonster?.equippedGear, unlockedSlots);
  const unlockCost = nextSlotUnlockCost(ownedMonster);
  const fighter = ownedMonster ? fighterFromOwned(ownedMonster) : null;
  const bonus = fighter?.gearBonuses;
  const base = fighter?.baseStats;
  const total = fighter?.stats;

  const catalog = useMemo(() => {
    return GEAR_CATALOG.filter((g) => gearMatchesFilter(g, filterCat));
  }, [filterCat]);

  const ownedCatalog = useMemo(
    () => (ownedGearIds || []).map((id) => getGear(id)).filter(Boolean),
    [ownedGearIds],
  );

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
                      onDetails={setDetailGear}
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
                  {FILTERS.map((filter) => (
                    <TouchableOpacity
                      key={filter.id}
                      style={[styles.filterChip, filterCat === filter.id && styles.filterChipOn]}
                      onPress={() => setFilterCat(filter.id)}
                    >
                      <Text style={[styles.filterTxt, filterCat === filter.id && styles.filterTxtOn]}>
                        {filter.label}
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
                    onDetails={setDetailGear}
                    type={type}
                  />
                ))}
              </>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={[styles.closeTxt, { fontSize: type.btn }]}>Done</Text>
          </TouchableOpacity>
          {detailGear ? (
            <View style={styles.detailOverlay}>
              <View style={styles.detailCard}>
                <TouchableOpacity style={styles.detailClose} onPress={() => setDetailGear(null)}>
                  <Text style={styles.detailCloseTxt}>×</Text>
                </TouchableOpacity>
                <Text style={styles.detailEmoji}>{detailGear.emoji}</Text>
                <Text style={styles.detailName}>{detailGear.name}</Text>
                <Text style={styles.detailMeta}>
                  {GEAR_CATEGORY_LABELS[detailGear.category] ?? detailGear.category} · {detailGear.ladderExclusive ? 'Chest reward' : `${detailGear.price} coins`}
                </Text>
                {formatGearBonusLines(detailGear).map((line) => (
                  <Text key={line} style={styles.detailLine}>{line}</Text>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.72)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#0b1830',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 2,
    borderColor: '#b9843b',
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    maxHeight: '92%',
    height: '92%',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  title: {
    fontWeight: '900',
    color: '#fff4cf',
    textAlign: 'center',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  coins: { textAlign: 'center', fontWeight: '900', color: '#fcd34d', marginVertical: 6 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.35)',
    backgroundColor: 'rgba(42, 58, 86, 0.86)',
    alignItems: 'center',
  },
  tabOn: { backgroundColor: 'rgba(92, 57, 143, 0.96)', borderColor: '#d8b4fe' },
  tabTxt: { fontWeight: '900', fontSize: 13, color: '#f4e3bd' },
  tabTxtOn: { color: '#fff8dd' },
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
    backgroundColor: 'rgba(14, 28, 52, 0.82)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.28)',
    padding: 10,
    marginBottom: 10,
  },
  previewMeta: { flex: 1, marginLeft: 8 },
  monName: { fontWeight: '900', color: '#fff4cf' },
  slotHint: { fontWeight: '800', color: '#bfdbfe', marginTop: 4 },
  slotsHdr: { fontWeight: '900', color: '#ffe08a', marginBottom: 8, textTransform: 'uppercase' },
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
    borderWidth: 2,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,224,138,0.32)',
    borderStyle: 'dashed',
  },
  slotFilled: { backgroundColor: 'rgba(18, 53, 40, 0.72)', borderColor: '#86efac' },
  slotSelected: { borderColor: '#fcd34d', backgroundColor: 'rgba(255, 224, 138, 0.16)' },
  slotLocked: { backgroundColor: 'rgba(0,0,0,0.24)', borderColor: '#475569', opacity: 0.9 },
  lockIcon: { fontSize: 20 },
  slotNum: { fontWeight: '900', fontSize: 10, color: '#cbd5e1', marginTop: 2 },
  unlockPrice: { fontWeight: '900', fontSize: 10, color: '#fcd34d', marginTop: 4, textAlign: 'center' },
  unlockPriceMuted: { fontWeight: '800', fontSize: 9, color: '#94a3b8', marginTop: 4 },
  slotEmoji: { fontSize: 24 },
  slotGearName: { fontWeight: '900', fontSize: 9, color: '#fff4cf', textAlign: 'center' },
  emptyPlus: { fontSize: 26, color: '#64748b' },
  statsBox: {
    backgroundColor: 'rgba(7, 17, 32, 0.72)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.35)',
    padding: 12,
    marginBottom: 12,
  },
  statsHdr: { fontWeight: '900', color: '#ffe08a', marginBottom: 6, textTransform: 'uppercase' },
  statLine: { fontWeight: '800', color: '#d9f7ff', marginBottom: 4, lineHeight: 22 },
  statLbl: { fontWeight: '900', color: '#fff4cf' },
  statBonus: { fontWeight: '900', color: '#86efac' },
  statTotal: { fontWeight: '900', color: '#fcd34d' },
  sectionHdr: { fontWeight: '900', fontSize: 14, color: '#ffe08a', marginBottom: 8, marginTop: 4, textTransform: 'uppercase' },
  emptyShop: { fontWeight: '800', color: '#bfdbfe', marginBottom: 12, lineHeight: 20 },
  shopHint: { fontWeight: '800', color: '#bfdbfe', marginBottom: 10, lineHeight: 20 },
  openMartBtn: {
    alignSelf: 'center',
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(92, 57, 143, 0.96)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d8b4fe',
  },
  openMartTxt: { fontWeight: '900', fontSize: 12, color: '#fff8dd', textTransform: 'uppercase' },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.35)',
    backgroundColor: 'rgba(42, 58, 86, 0.86)',
  },
  filterChipOn: { backgroundColor: 'rgba(92, 57, 143, 0.96)', borderColor: '#d8b4fe' },
  filterTxt: { fontWeight: '900', fontSize: 12, color: '#f4e3bd' },
  filterTxtOn: { color: '#fff8dd' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.22)',
    backgroundColor: 'rgba(14, 28, 52, 0.82)',
    marginBottom: 8,
  },
  emojiCard: { width: 54, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 32, textAlign: 'center' },
  tapHint: { color: '#fde68a', fontWeight: '900', fontSize: 8, textTransform: 'uppercase', marginTop: 1 },
  mid: { flex: 1, paddingHorizontal: 6, minWidth: 0 },
  name: { fontWeight: '900', color: '#fff4cf' },
  slot: { fontWeight: '800', color: '#c4b5fd', marginTop: 2 },
  bonusLine: { fontWeight: '800', color: '#86efac', marginTop: 4 },
  status: { fontWeight: '900', color: '#fcd34d', marginTop: 4 },
  actions: { minWidth: 88 },
  btn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnBuy: { backgroundColor: 'rgba(48, 129, 66, 0.96)', borderColor: '#efd17a', borderBottomWidth: 4, borderBottomColor: '#31551f' },
  btnEquip: { backgroundColor: 'rgba(37, 99, 235, 0.88)', borderColor: '#bfdbfe', borderBottomWidth: 4, borderBottomColor: '#1e3a8a' },
  btnUnequip: { backgroundColor: 'rgba(127, 29, 29, 0.84)', borderColor: '#fecaca', borderBottomWidth: 4, borderBottomColor: '#450a0a' },
  btnOff: { opacity: 0.4 },
  btnTxt: { fontWeight: '900', color: '#fff8dd', textTransform: 'uppercase' },
  closeBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: 'rgba(74, 48, 24, 0.84)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.62)',
  },
  closeTxt: { fontWeight: '900', color: '#fff1bc', textTransform: 'uppercase' },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  detailCard: {
    width: '90%',
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#facc15',
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    padding: 18,
    alignItems: 'center',
  },
  detailClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(127, 29, 29, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseTxt: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  detailEmoji: { fontSize: 54, marginBottom: 4 },
  detailName: { color: '#fff4cf', fontWeight: '900', fontSize: 22, textAlign: 'center' },
  detailMeta: { color: '#c4b5fd', fontWeight: '900', fontSize: 13, marginTop: 4, marginBottom: 10 },
  detailLine: {
    alignSelf: 'stretch',
    color: '#bbf7d0',
    fontWeight: '900',
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(134, 239, 172, 0.1)',
  },
});
