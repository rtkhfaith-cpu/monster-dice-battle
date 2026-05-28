/**
 * Shared visual tokens for gear inventory, equipment, and shop UI.
 * Matches MonsterGearScreen / Gear Mart gold-purple arcade style.
 */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { gearRarityUi, gearRarityColor } from '../../utils/gearRarityUi';

export { gearRarityUi, gearRarityColor };

export const GEAR_UI = {
  backdrop: 'rgba(3, 7, 18, 0.72)',
  card: '#0b1830',
  cardBorder: '#b9843b',
  title: '#fff4cf',
  titleShadow: 'rgba(0,0,0,0.75)',
  coins: '#fcd34d',
  sub: '#bfdbfe',
  muted: '#94a3b8',
  accent: '#ffe08a',
  accentSoft: 'rgba(255,224,138,0.28)',
  panel: 'rgba(14, 28, 52, 0.82)',
  panelBorder: 'rgba(255,224,138,0.22)',
  panelDeep: 'rgba(7, 17, 32, 0.72)',
  tab: 'rgba(42, 58, 86, 0.86)',
  tabBorder: 'rgba(255,224,138,0.35)',
  tabOn: 'rgba(92, 57, 143, 0.96)',
  tabOnBorder: '#d8b4fe',
  tabTxt: '#f4e3bd',
  tabTxtOn: '#fff8dd',
  statPos: '#86efac',
  statNeg: '#f87171',
  setActive: 'rgba(92, 57, 143, 0.55)',
  setActiveBorder: '#d8b4fe',
  picker: 'rgba(10, 22, 42, 0.96)',
  pickerBorder: '#fcd34d',
  btnPrimary: 'rgba(48, 129, 66, 0.96)',
  btnPrimaryEdge: '#31551f',
  btnPrimaryBorder: '#efd17a',
  btnSecondary: 'rgba(42, 58, 86, 0.96)',
  btnSecondaryBorder: 'rgba(255,224,138,0.45)',
  btnDanger: 'rgba(127, 29, 29, 0.84)',
  btnDangerBorder: '#fecaca',
  slotEmptyBg: 'rgba(255,255,255,0.05)',
  slotEmptyBorder: 'rgba(255,224,138,0.32)',
  slotFilledBg: 'rgba(18, 53, 40, 0.72)',
  slotFilledBorder: '#86efac',
  slotSelected: 'rgba(255, 224, 138, 0.12)',
};

/**
 * One default icon per equipment slot — slot clarity is the primary visual cue.
 * `emojiForGear` uses these as the base icon, then refines by name keyword.
 */
export const SLOT_ICONS = {
  head: '🪖', // headgear default
  body: '🦺', // body armor / vest default
  weapon: '⚔️', // weapon default
  hand: '🧤', // gloves default
  legs: '🥾', // boots default
};

/**
 * Per-slot name-keyword refinements — chosen so the icon still clearly
 * communicates the equipment slot first, then adds a hint of variant.
 *
 * Order matters: first match wins per slot.
 */
const SLOT_NAME_OVERRIDES = {
  head: [
    { re: /\bcrown\b/i, emoji: '👑' },
    { re: /\bmask\b/i, emoji: '🎭' },
    { re: /\b(helm|helmet|horn|cap)\b/i, emoji: '🪖' },
  ],
  body: [
    { re: /\brobe\b/i, emoji: '🧥' },
    { re: /\b(mail|plate)\b/i, emoji: '🛡️' },
    { re: /\b(armor|guard|hide|vest)\b/i, emoji: '🦺' },
  ],
  weapon: [
    { re: /\b(staff|wand)\b/i, emoji: '🪄' },
    { re: /\b(axe|cleaver|maul)\b/i, emoji: '🪓' },
    { re: /\bhammer\b/i, emoji: '🔨' },
    { re: /\b(dagger|needle|spear|fang|stinger|pike|point)\b/i, emoji: '🗡️' },
    { re: /\b(blade|sword)\b/i, emoji: '⚔️' },
  ],
  hand: [
    { re: /\b(claws?|talons?)\b/i, emoji: '🐾' },
    { re: /\b(gauntlets?|fists?|grip)\b/i, emoji: '🦾' },
    { re: /\b(gloves?|wraps?)\b/i, emoji: '🧤' },
  ],
  legs: [
    { re: /\b(greaves|leggings)\b/i, emoji: '🦿' },
    { re: /\b(boots?|treads|striders|steps|soles|sandals?)\b/i, emoji: '🥾' },
  ],
};

/**
 * Build-type theme palette — used for the small colored corner chip on gear cards.
 *
 *   tank      → blue ring
 *   attack    → red ring
 *   recovery  → green ring (leaf)
 *   poison    → violet ring
 *   fire      → orange ring
 *
 * Slot always remains the main icon; the chip is a secondary theme cue.
 */
export const BUILD_THEME = {
  tank:     { label: 'Tank',     emoji: '🛡',  ring: '#3b82f6', bg: 'rgba(30, 58, 138, 0.95)',  text: '#bfdbfe' },
  attack:   { label: 'Attack',   emoji: '⚔',  ring: '#ef4444', bg: 'rgba(127, 29, 29, 0.95)',  text: '#fecaca' },
  recovery: { label: 'Recovery', emoji: '🌿', ring: '#22c55e', bg: 'rgba(20, 83, 45, 0.95)',   text: '#bbf7d0' },
  poison:   { label: 'Poison',   emoji: '☠',  ring: '#a855f7', bg: 'rgba(76, 29, 149, 0.95)',  text: '#ddd6fe' },
  fire:     { label: 'Fire',     emoji: '🔥', ring: '#f97316', bg: 'rgba(124, 45, 18, 0.95)',  text: '#fed7aa' },
};

/**
 * Back-compat alias — same emoji symbols, sourced from `BUILD_THEME`.
 * Prefer `BUILD_THEME[buildType]` for full styling.
 */
export const BUILD_TYPE_EMOJI = Object.fromEntries(
  Object.entries(BUILD_THEME).map(([k, v]) => [k, v.emoji]),
);

/** @deprecated Use emojiForGear — kept for legacy setId keys */
export const SET_EMOJI = { ...BUILD_TYPE_EMOJI };

/**
 * Primary gear icon — based on equipment slot first, then refined by name keyword.
 * Build/theme NEVER overrides the slot icon. Use `gearBuildBadge` for theme.
 */
export function emojiForGear(gearOrOffer) {
  if (!gearOrOffer) return '⚔️';
  const slot = gearOrOffer.slot;
  const name = gearOrOffer.name ?? '';
  const overrides = SLOT_NAME_OVERRIDES[slot];
  if (overrides) {
    for (const { re, emoji } of overrides) {
      if (re.test(name)) return emoji;
    }
  }
  if (slot && SLOT_ICONS[slot]) return SLOT_ICONS[slot];
  return '⚔️';
}

/** Small secondary build-theme badge (e.g. ☠ for poison) — corner overlay only. */
export function gearBuildBadge(buildType) {
  return BUILD_THEME[buildType]?.emoji ?? null;
}

/** Full theme entry for a build type, or null. */
export function gearBuildTheme(buildType) {
  return BUILD_THEME[buildType] ?? null;
}

export function isMythicRarity(rarity) {
  return rarity === 'mythic';
}

/**
 * Shared icon component for gear cards/slots.
 *
 * Renders the slot-based main emoji with an optional small colored
 * build-theme chip in the top-right corner:
 *   - tank → blue, attack → red, recovery → green, poison → violet, fire → orange.
 *
 * The chip is purely a secondary theme cue; slot clarity is preserved by
 * the main icon underneath.
 */
export function GearIcon({ gear, size = 32, showBadge = true }) {
  if (!gear) {
    return <Text style={{ fontSize: size }}>◆</Text>;
  }
  const main = emojiForGear(gear);
  const theme = showBadge ? gearBuildTheme(gear.buildType) : null;
  const containerSize = Math.round(size * 1.3);
  const chipFont = Math.max(9, Math.round(size * 0.4));
  const chipBox = Math.max(16, Math.round(chipFont * 1.7));
  return (
    <View
      style={{
        width: containerSize,
        height: containerSize,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size, lineHeight: size + 2 }}>{main}</Text>
      {theme ? (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: chipBox,
            height: chipBox,
            paddingHorizontal: 2,
            borderRadius: chipBox / 2,
            backgroundColor: theme.bg,
            borderWidth: 1.5,
            borderColor: theme.ring,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: theme.ring,
            shadowOpacity: 0.55,
            shadowRadius: 3,
          }}
        >
          <Text
            style={{
              fontSize: chipFont,
              lineHeight: chipFont + 1,
              color: theme.text,
            }}
          >
            {theme.emoji}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Inline pill used in detail panels / labels — shows the colored chip plus
 * the build-type word. Renders as a single horizontal pill.
 */
export function GearBuildPill({ buildType, size = 11 }) {
  const theme = gearBuildTheme(buildType);
  if (!theme) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingVertical: 3,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: theme.bg,
        borderWidth: 1,
        borderColor: theme.ring,
      }}
    >
      <Text style={{ fontSize: size, marginRight: 4, color: theme.text }}>
        {theme.emoji}
      </Text>
      <Text
        style={{
          fontSize: size,
          fontWeight: '900',
          letterSpacing: 0.5,
          color: theme.text,
          textTransform: 'uppercase',
        }}
      >
        {theme.label}
      </Text>
    </View>
  );
}

export const gearModalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: GEAR_UI.backdrop,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: GEAR_UI.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 2,
    borderColor: GEAR_UI.cardBorder,
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    maxHeight: '94%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  title: {
    fontWeight: '900',
    color: GEAR_UI.title,
    textAlign: 'center',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontSize: 20,
    textShadowColor: GEAR_UI.titleShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  coins: {
    textAlign: 'center',
    fontWeight: '900',
    color: GEAR_UI.coins,
    marginVertical: 6,
    fontSize: 15,
  },
  sub: { color: GEAR_UI.sub, fontSize: 12, textAlign: 'center', marginBottom: 8, lineHeight: 18 },
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
  chipTxt: { fontWeight: '900', fontSize: 11, color: GEAR_UI.tabTxt },
  chipTxtOn: { color: GEAR_UI.tabTxtOn },
  closeBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: GEAR_UI.btnSecondary,
    borderWidth: 1,
    borderColor: GEAR_UI.btnSecondaryBorder,
    borderBottomWidth: 4,
    borderBottomColor: '#1e293b',
    minWidth: 140,
    alignItems: 'center',
  },
  closeTxt: { fontWeight: '900', color: GEAR_UI.tabTxtOn, fontSize: 15, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GEAR_UI.panelBorder,
    backgroundColor: GEAR_UI.panel,
    marginBottom: 8,
  },
  btnBuy: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: GEAR_UI.btnPrimary,
    borderWidth: 1,
    borderColor: GEAR_UI.btnPrimaryBorder,
    borderBottomWidth: 4,
    borderBottomColor: GEAR_UI.btnPrimaryEdge,
    minWidth: 72,
    alignItems: 'center',
  },
  btnBuyTxt: { fontWeight: '900', color: GEAR_UI.tabTxtOn, fontSize: 12, textTransform: 'uppercase' },
  btnOff: { opacity: 0.4 },
});
