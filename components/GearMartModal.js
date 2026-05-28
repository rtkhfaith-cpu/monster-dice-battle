import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { buildGearShopCatalog, formatGearStatLines } from '../src/gameSystems/gear/gearGenerator';
import { GEAR_TEMPLATE_LIST } from '../src/gameSystems/gear/gearDefinitions';
import PassiveSkillBookShop from './PassiveSkillBookShop';
import PetShop from './PetShop';
import {
  GEAR_UI,
  GearBuildPill,
  GearIcon,
  gearModalStyles,
  gearRarityUi,
} from './gear/gearUiTheme';
import GearItemDetailModal from './gear/GearItemDetailModal';

/** Stable set order based on gear definitions (rare sets first, then epic). */
const SET_ORDER_INDEX = (() => {
  const map = {};
  let i = 0;
  for (const tpl of GEAR_TEMPLATE_LIST) {
    if (map[tpl.setId] === undefined) map[tpl.setId] = i++;
  }
  return map;
})();

const SLOT_ORDER_INDEX = { head: 0, body: 1, weapon: 2, hand: 3, legs: 4 };

function groupOffersBySet(offers) {
  if (!offers?.length) return [];
  const bySet = new Map();
  for (const o of offers) {
    if (!bySet.has(o.setId)) {
      bySet.set(o.setId, {
        setId: o.setId,
        setName: o.setName,
        buildType: o.buildType,
        rarity: o.rarity,
        items: [],
      });
    }
    bySet.get(o.setId).items.push(o);
  }
  const groups = [...bySet.values()];
  for (const g of groups) {
    g.items.sort((a, b) => {
      const sa = SLOT_ORDER_INDEX[a.slot] ?? 9;
      const sb = SLOT_ORDER_INDEX[b.slot] ?? 9;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name);
    });
  }
  groups.sort((a, b) => (SET_ORDER_INDEX[a.setId] ?? 99) - (SET_ORDER_INDEX[b.setId] ?? 99));
  return groups;
}

/**
 * Gear & Skill Shop — matches Monster Gear / lobby modal styling.
 */
export default function GearMartModal({
  visible,
  coins,
  profileId,
  profile,
  onClose,
  onBuy,
  onBuyPassiveBook,
  onBuyPet,
}) {
  const [shopTab, setShopTab] = useState('gear');
  const [rarityTab, setRarityTab] = useState('rare');
  const [detailOffer, setDetailOffer] = useState(null);

  const catalog = useMemo(() => buildGearShopCatalog(profileId), [profileId]);
  const offers = rarityTab === 'epic' ? catalog.epicOffers : catalog.rareOffers;
  const groupedOffers = useMemo(() => groupOffersBySet(offers), [offers]);

  function handleBuyOffer(offer) {
    onBuy?.(offer.gearId, offer.rarity, offer.price, offer.offerSeed);
    setDetailOffer(null);
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={gearModalStyles.backdrop}>
        <View style={gearModalStyles.card}>
          <Text style={gearModalStyles.title}>Shop</Text>
          <Text style={gearModalStyles.sub}>Gear · Passive skill books · Pets</Text>
          <Text style={gearModalStyles.coins}>🪙 {coins ?? 0} coins</Text>

          <View style={styles.tabRow}>
            {[
              { id: 'gear', label: 'Gear' },
              { id: 'skills', label: 'Skills' },
              { id: 'pets', label: 'Pets' },
            ].map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.shopTab, shopTab === t.id && styles.shopTabOn]}
                onPress={() => setShopTab(t.id)}
              >
                <Text style={[styles.shopTabTxt, shopTab === t.id && styles.shopTabTxtOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {shopTab === 'skills' ? (
            <PassiveSkillBookShop
              coins={coins}
              profileId={profileId}
              profile={profile}
              onBuy={onBuyPassiveBook}
            />
          ) : null}

          {shopTab === 'pets' ? <PetShop coins={coins} onBuy={onBuyPet} /> : null}

          {shopTab === 'gear' ? (
            <>
              <Text style={gearModalStyles.sub}>
                Each listing is one gear piece. Set name is shown for reference — full set bonus only activates when matching pieces are equipped together. Tap a piece to view full details.
              </Text>
              <View style={styles.rarityRow}>
                {['rare', 'epic'].map((r) => {
                  const ui = gearRarityUi(r);
                  const on = rarityTab === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.rarityChip,
                        on && { backgroundColor: ui.chipBg, borderColor: ui.border },
                      ]}
                      onPress={() => setRarityTab(r)}
                    >
                      <Text style={[styles.rarityChipTxt, on && { color: ui.chipFg }]}>{r}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                {groupedOffers.map((group) => {
                  const setUi = gearRarityUi(group.rarity);
                  return (
                    <View key={group.setId} style={styles.setGroup}>
                      <View style={[styles.setHeader, { borderColor: setUi.border }]}>
                        <View style={styles.setHeaderText}>
                          <Text style={[styles.setHeaderName, { color: setUi.color }]} numberOfLines={1}>
                            {group.setName}
                          </Text>
                          <Text style={styles.setHeaderMeta}>
                            {group.items.length} piece{group.items.length === 1 ? '' : 's'} available
                          </Text>
                        </View>
                        <GearBuildPill buildType={group.buildType} size={10} />
                      </View>
                      {group.items.map((o) => {
                        const afford = (coins ?? 0) >= o.price;
                        const ui = gearRarityUi(o.rarity);
                        const statLines = formatGearStatLines(o.previewStats);
                        const socketCount = o.previewSockets?.length ?? 0;
                        return (
                          <TouchableOpacity
                            key={`${o.gearId}_${o.rarity}`}
                            activeOpacity={0.86}
                            onPress={() => setDetailOffer(o)}
                            style={[gearModalStyles.row, styles.itemRow, { borderColor: ui.border }]}
                          >
                            <View style={styles.emojiCol}>
                              <GearIcon gear={o} size={30} />
                              <Text style={styles.tapHint} numberOfLines={1}>{o.slot}</Text>
                            </View>
                            <View style={styles.mid}>
                              <Text style={[styles.name, { color: ui.color }]} numberOfLines={1}>
                                {o.name}
                              </Text>
                              <Text style={styles.meta} numberOfLines={1}>
                                <Text style={{ color: ui.color, fontWeight: '900' }}>{o.rarity}</Text>
                                {` · ${capitalizeWord(o.slot)}`}
                              </Text>
                              {statLines.length > 0 ? (
                                <Text style={styles.bonus} numberOfLines={2}>
                                  {statLines.join(' · ')}
                                  {socketCount > 0 ? ` · ◇ ${socketCount}` : ''}
                                </Text>
                              ) : null}
                              <Text style={styles.price}>🪙 {o.price}</Text>
                            </View>
                            <View style={styles.actionsCol}>
                              <TouchableOpacity
                                style={styles.viewBtn}
                                onPress={() => setDetailOffer(o)}
                                activeOpacity={0.86}
                              >
                                <Text style={styles.viewTxt}>View</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[gearModalStyles.btnBuy, !afford && gearModalStyles.btnOff]}
                                disabled={!afford}
                                onPress={() => handleBuyOffer(o)}
                                activeOpacity={0.86}
                              >
                                <Text style={gearModalStyles.btnBuyTxt}>Buy</Text>
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          <TouchableOpacity style={gearModalStyles.closeBtn} onPress={onClose}>
            <Text style={gearModalStyles.closeTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
      <GearItemDetailModal
        visible={!!detailOffer}
        gear={detailOffer}
        mode="shop"
        price={detailOffer?.price}
        affordable={detailOffer ? (coins ?? 0) >= detailOffer.price : false}
        onBuy={detailOffer ? () => handleBuyOffer(detailOffer) : undefined}
        onClose={() => setDetailOffer(null)}
      />
    </Modal>
  );
}

function capitalizeWord(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  shopTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GEAR_UI.tabBorder,
    backgroundColor: GEAR_UI.tab,
    alignItems: 'center',
  },
  shopTabOn: { backgroundColor: GEAR_UI.tabOn, borderColor: GEAR_UI.tabOnBorder },
  shopTabTxt: { fontWeight: '900', fontSize: 13, color: GEAR_UI.tabTxt },
  shopTabTxtOn: { color: GEAR_UI.tabTxtOn },
  rarityRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  rarityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GEAR_UI.tabBorder,
    backgroundColor: GEAR_UI.tab,
    alignItems: 'center',
  },
  rarityChipTxt: {
    fontWeight: '900',
    fontSize: 13,
    textTransform: 'capitalize',
    color: GEAR_UI.tabTxt,
  },
  list: { flex: 1, minHeight: 120 },
  listContent: { paddingBottom: 12 },
  setGroup: {
    marginBottom: 14,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: GEAR_UI.panelDeep,
    marginBottom: 6,
  },
  setHeaderText: { flex: 1, minWidth: 0 },
  setHeaderName: {
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  setHeaderMeta: {
    fontWeight: '800',
    fontSize: 10,
    color: GEAR_UI.muted,
    marginTop: 2,
  },
  itemRow: { marginBottom: 6 },
  emojiCol: { width: 52, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 32 },
  tapHint: {
    color: GEAR_UI.coins,
    fontWeight: '900',
    fontSize: 8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  mid: { flex: 1, paddingHorizontal: 8, minWidth: 0 },
  name: { fontWeight: '900', fontSize: 14, color: GEAR_UI.title },
  meta: { fontWeight: '800', color: '#c4b5fd', fontSize: 11, marginTop: 2 },
  bonus: { fontWeight: '800', color: GEAR_UI.statPos, fontSize: 11, marginTop: 4, lineHeight: 14 },
  price: { fontWeight: '900', color: GEAR_UI.coins, marginTop: 6, fontSize: 14 },
  actionsCol: { alignItems: 'stretch', justifyContent: 'center', gap: 6 },
  viewBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: GEAR_UI.btnSecondary,
    borderWidth: 1,
    borderColor: GEAR_UI.btnSecondaryBorder,
    alignItems: 'center',
    minWidth: 64,
  },
  viewTxt: { color: GEAR_UI.tabTxtOn, fontWeight: '900', fontSize: 11 },
});
