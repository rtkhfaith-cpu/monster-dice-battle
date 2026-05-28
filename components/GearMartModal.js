import React, { useMemo, useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { buildGearShopCatalog } from '../src/gameSystems/gear/gearGenerator';
import { GEAR_STAT_LINE_COUNT } from '../src/gameSystems/gear/gearConstants';
import PassiveSkillBookShop from './PassiveSkillBookShop';
import PetShop from './PetShop';
import {
  GEAR_UI,
  SET_EMOJI,
  SLOT_ICONS,
  gearModalStyles,
  gearRarityUi,
} from './gear/gearUiTheme';

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

  const catalog = useMemo(() => buildGearShopCatalog(profileId), [profileId]);
  const offers = rarityTab === 'epic' ? catalog.epicOffers : catalog.rareOffers;
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
                Each purchase rolls unique stats. Mythic gear only drops from chests & events.
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
                {offers.map((o) => {
                  const afford = (coins ?? 0) >= o.price;
                  const ui = gearRarityUi(o.rarity);
                  return (
                    <View key={`${o.gearId}_${o.rarity}`} style={[gearModalStyles.row, { borderColor: ui.border }]}>
                      <View style={styles.emojiCol}>
                        <Text style={styles.emoji}>{SET_EMOJI[o.set] ?? SLOT_ICONS[o.slot] ?? '⚔️'}</Text>
                        <Text style={styles.tapHint}>Set</Text>
                      </View>
                      <View style={styles.mid}>
                        <Text style={[styles.name, { color: ui.color }]}>{o.name}</Text>
                        <Text style={styles.meta}>
                          {o.rarity} · {o.slot} · {o.setName}
                        </Text>
                        <Text style={styles.bonus}>
                          {GEAR_STAT_LINE_COUNT[o.rarity]} rolled stat lines
                          {o.maxSockets ? ` · up to ${o.maxSockets} socket` : ''}
                        </Text>
                        <Text style={styles.price}>🪙 {o.price}</Text>
                      </View>
                      <TouchableOpacity
                        style={[gearModalStyles.btnBuy, !afford && gearModalStyles.btnOff]}
                        disabled={!afford}
                        onPress={() => onBuy?.(o.gearId, o.rarity, o.price)}
                      >
                        <Text style={gearModalStyles.btnBuyTxt}>Buy</Text>
                      </TouchableOpacity>
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
    </Modal>
  );
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
  name: { fontWeight: '900', fontSize: 15, color: GEAR_UI.title },
  meta: { fontWeight: '800', color: '#c4b5fd', fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
  bonus: { fontWeight: '800', color: GEAR_UI.statPos, fontSize: 11, marginTop: 4 },
  price: { fontWeight: '900', color: GEAR_UI.coins, marginTop: 6, fontSize: 14 },
});
