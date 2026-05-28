/**
 * Shared visual tokens for gear inventory, equipment, and shop UI.
 * Matches MonsterGearScreen / Gear Mart gold-purple arcade style.
 */
import { Platform, StyleSheet } from 'react-native';
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

export const SLOT_ICONS = {
  head: '🪖',
  body: '🦺',
  weapon: '⚔️',
  hand: '🧤',
  legs: '👢',
};

export const SET_EMOJI = {
  guardian: '🛡️',
  berserker: '⚔️',
  lifebloom: '🌿',
  venomfang: '🐍',
  flameheart: '🔥',
};

export function isMythicRarity(rarity) {
  return rarity === 'mythic';
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
