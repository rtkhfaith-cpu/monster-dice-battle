import React from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatGearStatLines } from '../../src/gameSystems/gear/gearGenerator';
import { GEAR_SET_BONUSES } from '../../src/gameSystems/gear/gearSets';
import GearGemSocketPanel from '../GearGemSocketPanel';
import {
  GEAR_UI,
  GearBuildPill,
  GearIcon,
  gearRarityUi,
  isMythicRarity,
} from './gearUiTheme';

/**
 * Shared detail panel for a single gear piece.
 *
 * Always emphasises the INDIVIDUAL piece first; set name and bonus appear as
 * supporting info so players understand the piece — not the set — is the
 * unit they buy / receive / equip.
 *
 * Works in three contexts:
 *   - shop preview      (mode="shop")     → shows price + Buy
 *   - reward result     (mode="reward")   → Close
 *   - inventory inspect (mode="inventory") → Close (or Equip if onEquip)
 */
export default function GearItemDetailModal({
  visible,
  gear,
  mode = 'shop',
  price,
  affordable = true,
  onBuy,
  onEquip,
  onClose,
  profile,
  coins,
  onSocketGem,
  onUnsocketGem,
}) {
  if (!visible || !gear) return null;
  const rarity = gear.rarity;
  const ui = gearRarityUi(rarity);
  const mythic = isMythicRarity(rarity);
  const stats = gear.previewStats ?? gear.stats ?? [];
  const sockets = gear.previewSockets ?? gear.sockets ?? [];
  const showSockets = mode !== 'shop';
  const statLines = formatGearStatLines(stats);
  const setBonus = GEAR_SET_BONUSES[gear.setId] ?? null;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, mythic && styles.cardMythic, { borderColor: ui.border }]}>
          <TouchableOpacity
            style={styles.close}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeTxt}>×</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <GearIcon gear={gear} size={48} />
          </View>
          <Text style={[styles.name, { color: ui.color }]} numberOfLines={2}>
            {gear.name}
          </Text>
          <Text style={styles.meta}>
            <Text style={[styles.metaRarity, { color: ui.color }]}>
              {rarity?.toUpperCase()}
            </Text>
            {' · '}
            <Text style={styles.metaPart}>{capitalize(gear.slot)}</Text>
            {' · '}
            <Text style={styles.metaPart}>{gear.setName}</Text>
          </Text>

          <View style={styles.buildRow}>
            <GearBuildPill buildType={gear.buildType} size={11} />
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionTitle}>Stats</Text>
            {statLines.length === 0 ? (
              <Text style={styles.muted}>No stats rolled.</Text>
            ) : (
              statLines.map((line) => (
                <Text key={line} style={styles.statLine}>
                  {line}
                </Text>
              ))
            )}

            {showSockets && sockets.length > 0 && profile ? (
              <>
                <Text style={styles.sectionTitle}>Gem sockets</Text>
                <Text style={styles.socketHint}>Tap a socket to insert or remove a gem.</Text>
                <GearGemSocketPanel
                  profile={profile}
                  coins={coins}
                  gearFilter={gear.instanceId}
                  onSocket={(gearId, socketIndex, gemKey) =>
                    onSocketGem?.(gearId, socketIndex, gemKey)
                  }
                  onUnsocket={(gearId, socketIndex) =>
                    onUnsocketGem?.(gearId, socketIndex)
                  }
                  compact
                />
              </>
            ) : null}
            {showSockets && sockets.length === 0 ? (
              <>
                <Text style={styles.sectionTitle}>Sockets</Text>
                <Text style={styles.muted}>This piece has no gem sockets.</Text>
              </>
            ) : null}

            {setBonus ? (
              <>
                <Text style={styles.sectionTitle}>Full set bonus</Text>
                <Text style={styles.setName}>{setBonus.name}</Text>
                <Text style={styles.setDesc}>{setBonus.description}</Text>
                <Text style={styles.setHint}>
                  Activates only when head, body, weapon, hand and legs from this set are equipped together.
                </Text>
              </>
            ) : null}

            {mode === 'shop' ? (
              <>
                <Text style={styles.sectionTitle}>Price</Text>
                <Text style={styles.price}>🪙 {price ?? gear.price ?? 0}</Text>
                <Text style={styles.previewHint}>
                  Socket count is hidden until purchase.
                </Text>
              </>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose} activeOpacity={0.86}>
              <Text style={styles.btnCancelTxt}>Close</Text>
            </TouchableOpacity>
            {mode === 'shop' && onBuy ? (
              <TouchableOpacity
                style={[styles.btnPrimary, !affordable && styles.btnOff]}
                disabled={!affordable}
                onPress={onBuy}
                activeOpacity={0.86}
              >
                <Text style={styles.btnPrimaryTxt}>{affordable ? 'Buy' : 'Not enough'}</Text>
              </TouchableOpacity>
            ) : null}
            {mode !== 'shop' && onEquip ? (
              <TouchableOpacity style={styles.btnPrimary} onPress={onEquip} activeOpacity={0.86}>
                <Text style={styles.btnPrimaryTxt}>Equip</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: GEAR_UI.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '88%',
    backgroundColor: GEAR_UI.card,
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cardMythic: { shadowColor: '#e84393', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },
  close: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(127, 29, 29, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTxt: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 20 },
  iconWrap: { marginTop: 4, marginBottom: 6, alignItems: 'center' },
  name: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    fontWeight: '800',
    color: GEAR_UI.sub,
    textAlign: 'center',
    marginBottom: 6,
  },
  metaRarity: { fontWeight: '900', textTransform: 'uppercase' },
  metaPart: { color: '#c4b5fd' },
  buildRow: { marginBottom: 10, alignItems: 'center' },
  scroll: { alignSelf: 'stretch', maxHeight: 260 },
  scrollContent: { paddingBottom: 8 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: GEAR_UI.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 10,
    marginBottom: 4,
  },
  statLine: { fontSize: 13, fontWeight: '800', color: GEAR_UI.statPos, marginVertical: 2 },
  socketHint: { fontSize: 11, fontWeight: '800', color: GEAR_UI.muted, marginBottom: 6, lineHeight: 15 },
  muted: { fontSize: 12, fontWeight: '800', color: GEAR_UI.muted, fontStyle: 'italic' },
  setName: { fontSize: 13, fontWeight: '900', color: GEAR_UI.title, marginTop: 2 },
  setDesc: { fontSize: 12, fontWeight: '800', color: '#c4b5fd', marginTop: 2, lineHeight: 16 },
  setHint: { fontSize: 10, fontWeight: '700', color: GEAR_UI.muted, marginTop: 4, lineHeight: 14 },
  price: { fontSize: 16, fontWeight: '900', color: GEAR_UI.coins, marginTop: 2 },
  previewHint: { fontSize: 10, fontWeight: '700', color: GEAR_UI.muted, marginTop: 6, lineHeight: 14 },
  actions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: GEAR_UI.btnSecondary,
    borderWidth: 1,
    borderColor: GEAR_UI.btnSecondaryBorder,
    alignItems: 'center',
  },
  btnCancelTxt: { color: GEAR_UI.tabTxtOn, fontWeight: '900', fontSize: 13 },
  btnPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: GEAR_UI.btnPrimary,
    borderWidth: 1,
    borderColor: GEAR_UI.btnPrimaryBorder,
    borderBottomWidth: 4,
    borderBottomColor: GEAR_UI.btnPrimaryEdge,
    alignItems: 'center',
  },
  btnPrimaryTxt: { color: GEAR_UI.tabTxtOn, fontWeight: '900', fontSize: 13 },
  btnOff: { opacity: 0.45 },
  __platform: Platform.OS === 'ios' ? {} : {},
});
