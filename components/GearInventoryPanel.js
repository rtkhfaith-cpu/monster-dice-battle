import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfirmDialog from './ConfirmDialog';
import {
  filterGearInventory,
  sortGearInventory,
  gearCardSummary,
  gearSellCoinValue,
} from '../src/gameSystems/gear/inventoryGearUtils';
import GearItemDetailModal from './gear/GearItemDetailModal';
import {
  GEM_RARITY_UI,
  GEM_STAT_LABELS,
  gemEmoji,
  gemStatValue,
  parseGemKey,
} from '../src/gameSystems/gems/gemDefinitions';
import {
  GEAR_UI,
  GearIcon,
  gearRarityUi,
  isMythicRarity,
} from './gear/gearUiTheme';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'head', label: 'Head' },
  { id: 'body', label: 'Body' },
  { id: 'weapon', label: 'Weapon' },
  { id: 'hand', label: 'Hand' },
  { id: 'legs', label: 'Legs' },
  { id: 'rare', label: 'Rare' },
  { id: 'epic', label: 'Epic' },
  { id: 'mythic', label: 'Mythic' },
  { id: 'equipped', label: 'Equipped' },
  { id: 'unequipped', label: 'Free' },
  { id: 'sockets', label: 'Sockets' },
];

function socketedGemRows(gear) {
  return (gear?.sockets ?? [])
    .map((socket, index) => {
      const gem = socket?.gem;
      const parsed = gem?.key ? parseGemKey(gem.key) : null;
      if (!gem || !parsed) return null;
      return {
        index,
        gem,
        parsed,
        value: gemStatValue(parsed.rarity, parsed.stat, gem.level ?? 1),
      };
    })
    .filter(Boolean);
}

export default function GearInventoryPanel({
  profile,
  coins,
  onSell,
  onOpenEquip,
  onSocketGem,
  onUnsocketGem,
  fullHeight,
}) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rarity');
  const [mythicSellConfirm, setMythicSellConfirm] = useState(null);
  const [inspectGear, setInspectGear] = useState(null);

  function requestSell(gear) {
    if (!onSell) return;
    if (isMythicRarity(gear.rarity)) {
      setMythicSellConfirm({
        instanceId: gear.instanceId,
        name: gear.name,
        sellCoins: gearSellCoinValue(gear),
      });
      return;
    }
    onSell(gear.instanceId);
  }

  function confirmMythicSell() {
    if (!mythicSellConfirm || !onSell) return;
    onSell(mythicSellConfirm.instanceId);
    setMythicSellConfirm(null);
  }

  const list = useMemo(() => {
    const raw = profile?.gearInventory ?? [];
    const filtered = filterGearInventory(raw, filter);
    return sortGearInventory(filtered, sortBy);
  }, [profile, filter, sortBy]);

  useEffect(() => {
    if (!inspectGear?.instanceId) return;
    const updated = profile?.gearInventory?.find((g) => g.instanceId === inspectGear.instanceId);
    if (updated) setInspectGear(updated);
  }, [profile, inspectGear?.instanceId]);

  return (
    <View style={styles.wrap}>
      <ConfirmDialog
        visible={!!mythicSellConfirm}
        title="Sell mythic gear?"
        message={
          mythicSellConfirm
            ? `Sell ${mythicSellConfirm.name} for 🪙 ${mythicSellConfirm.sellCoins}? This cannot be undone.`
            : ''
        }
        confirmLabel={`Sell · 🪙 ${mythicSellConfirm?.sellCoins ?? ''}`}
        cancelLabel="Keep"
        destructive
        onCancel={() => setMythicSellConfirm(null)}
        onConfirm={confirmMythicSell}
      />
      <View style={styles.hdrRow}>
        <Text style={styles.title}>Gear ({list.length})</Text>
        {onOpenEquip ? (
          <TouchableOpacity style={styles.equipBtn} onPress={onOpenEquip} activeOpacity={0.88}>
            <Text style={styles.equipBtnTxt}>Monsters</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.chip, filter === f.id && styles.chipOn]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.chipTxt, filter === f.id && styles.chipTxtOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        {[
          { id: 'rarity', label: 'Rarity' },
          { id: 'slot', label: 'Type' },
          { id: 'equipped', label: 'Status' },
        ].map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.sortChip, sortBy === s.id && styles.chipOn]}
            onPress={() => setSortBy(s.id)}
          >
            <Text style={[styles.chipTxt, sortBy === s.id && styles.chipTxtOn]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={[styles.list, fullHeight && styles.listFull]}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        {list.length === 0 ? (
          <Text style={styles.muted}>No gear yet. Buy from the shop or earn from chests.</Text>
        ) : (
          list.map((g) => {
            const card = gearCardSummary(g, profile);
            const ui = gearRarityUi(g.rarity);
            const mythic = isMythicRarity(g.rarity);
            const equipped = !!g.equippedToMonsterId;
            const sellCoins = gearSellCoinValue(g);
            const socketedRows = socketedGemRows(g);
            const filledSocketCount = socketedRows.length;
            return (
              <TouchableOpacity
                key={g.instanceId}
                style={[
                  styles.card,
                  { borderColor: ui.border },
                  mythic && styles.cardMythic,
                  equipped && styles.cardEquipped,
                ]}
                onPress={() => setInspectGear(g)}
                activeOpacity={0.88}
              >
                <View style={styles.cardTop}>
                  <View style={styles.cardEmoji}>
                    <GearIcon gear={g} size={28} />
                  </View>
                  <View style={styles.cardMid}>
                    <Text style={[styles.cardName, { color: ui.color }]}>{card.name}</Text>
                    <View style={styles.cardMetaRow}>
                      <View style={[styles.rarityPill, { backgroundColor: ui.chipBg }]}>
                        <Text style={[styles.rarityPillTxt, { color: ui.chipFg }]}>{g.rarity}</Text>
                      </View>
                      <Text style={styles.cardSlot}>{g.slot}</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.cardSet}>{card.setName} Set</Text>
                <Text style={styles.cardStats}>{card.statLines.join(' · ')}</Text>
                <View style={[styles.socketBadge, card.socketCount > 0 ? styles.socketBadgeOn : styles.socketBadgeOff]}>
                  <Text style={[styles.socketBadgeTxt, card.socketCount > 0 ? styles.socketBadgeTxtOn : styles.socketBadgeTxtOff]}>
                    {`Sockets: ${filledSocketCount}/${Math.max(0, card.socketCount ?? 0)} filled`}
                  </Text>
                </View>
                {socketedRows.length > 0 ? (
                  <View style={styles.socketedList}>
                    {socketedRows.map(({ index, gem, parsed, value }) => (
                      <View key={`${g.instanceId}-socket-${index}`} style={styles.socketedPill}>
                        <Text style={styles.socketedEmoji}>{gemEmoji(parsed.stat, parsed.rarity)}</Text>
                        <Text
                          style={[
                            styles.socketedTxt,
                            { color: GEM_RARITY_UI[parsed.rarity]?.color ?? '#fff' },
                          ]}
                        >
                          {GEM_STAT_LABELS[parsed.stat] ?? parsed.stat} Lv {gem.level ?? 1} · +{value}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Text style={[styles.cardEquipped, equipped && styles.cardEquippedOn]}>
                  {equipped
                    ? `Equipped: ${card.equippedMonsterName} · cannot sell`
                    : 'Not equipped'}
                </Text>
                {!equipped ? (
                  <Text style={styles.sellValue}>Sell value: 🪙 {sellCoins}</Text>
                ) : null}
                {onSell && !equipped ? (
                  <TouchableOpacity
                    style={styles.sellBtn}
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      requestSell(g);
                    }}
                  >
                    <Text style={styles.sellTxt}>Sell · 🪙 {sellCoins}</Text>
                  </TouchableOpacity>
                ) : null}
                {(card.socketCount ?? 0) > 0 ? (
                  <Text style={styles.tapHint}>Tap to manage gem sockets</Text>
                ) : (
                  <Text style={styles.tapHint}>Tap for details</Text>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <GearItemDetailModal
        visible={!!inspectGear}
        gear={inspectGear}
        mode="inventory"
        profile={profile}
        coins={coins}
        onSocketGem={onSocketGem}
        onUnsocketGem={onUnsocketGem}
        onClose={() => setInspectGear(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 200 },
  hdrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: GEAR_UI.accent,
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'uppercase',
  },
  equipBtn: {
    backgroundColor: GEAR_UI.tabOn,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GEAR_UI.tabOnBorder,
    borderBottomWidth: 3,
    borderBottomColor: '#4c1d95',
  },
  equipBtnTxt: { color: GEAR_UI.tabTxtOn, fontWeight: '900', fontSize: 11, textTransform: 'uppercase' },
  chipScroll: { maxHeight: 38, marginBottom: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GEAR_UI.tabBorder,
    backgroundColor: GEAR_UI.tab,
    marginRight: 6,
  },
  chipOn: { backgroundColor: GEAR_UI.tabOn, borderColor: GEAR_UI.tabOnBorder },
  chipTxt: { color: GEAR_UI.tabTxt, fontSize: 11, fontWeight: '900' },
  chipTxtOn: { color: GEAR_UI.tabTxtOn },
  sortRow: { flexDirection: 'row', marginBottom: 8, gap: 6 },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: GEAR_UI.tabBorder,
    backgroundColor: 'rgba(14, 28, 52, 0.6)',
  },
  list: { maxHeight: 300 },
  listFull: { flex: 1, maxHeight: undefined },
  muted: { color: GEAR_UI.muted, fontSize: 12, fontWeight: '800', textAlign: 'center', padding: 16, lineHeight: 18 },
  card: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: GEAR_UI.panel,
    borderWidth: 2,
    borderColor: GEAR_UI.panelBorder,
  },
  cardMythic: {
    borderWidth: 3,
    shadowColor: '#e84393',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  cardEquipped: { opacity: 0.92, borderStyle: 'solid' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardEmoji: { width: 40, alignItems: 'center', justifyContent: 'flex-start' },
  cardMid: { flex: 1, minWidth: 0 },
  cardName: { fontWeight: '900', fontSize: 15 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  rarityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  rarityPillTxt: { fontWeight: '900', fontSize: 9, textTransform: 'uppercase' },
  cardSlot: { fontWeight: '800', color: GEAR_UI.sub, fontSize: 11, textTransform: 'capitalize' },
  cardSet: { color: '#c4b5fd', fontSize: 11, marginTop: 6, fontWeight: '800' },
  cardStats: { color: GEAR_UI.statPos, fontSize: 11, marginTop: 4, fontWeight: '800', lineHeight: 16 },
  socketBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  socketBadgeOn: {
    backgroundColor: 'rgba(250, 204, 21, 0.18)',
    borderColor: '#facc15',
  },
  socketBadgeOff: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.45)',
  },
  socketBadgeTxt: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  socketBadgeTxtOn: { color: '#fde68a' },
  socketBadgeTxtOff: { color: GEAR_UI.muted },
  socketedList: {
    marginTop: 6,
    gap: 4,
  },
  socketedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.35)',
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  socketedEmoji: { fontSize: 13 },
  socketedTxt: {
    fontSize: 10,
    fontWeight: '900',
  },
  cardEquipped: { color: GEAR_UI.muted, fontSize: 10, marginTop: 6, fontWeight: '800' },
  cardEquippedOn: { color: '#fcd34d' },
  sellValue: {
    color: GEAR_UI.coins,
    fontSize: 11,
    fontWeight: '900',
    marginTop: 6,
  },
  sellBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: GEAR_UI.btnDanger,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GEAR_UI.btnDangerBorder,
    borderBottomWidth: 3,
    borderBottomColor: '#450a0a',
  },
  sellTxt: { color: '#fecaca', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  tapHint: {
    color: GEAR_UI.accent,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
