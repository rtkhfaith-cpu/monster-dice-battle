/**
 * Shared arcade battle dock styles — sourced from ART tokens.
 */
import { Platform, StyleSheet } from 'react-native';
import { ART, arcadeButtonDepth } from './artDirection';

const edge = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((n >> 16) & 0xff) - 28);
  const g = Math.max(0, ((n >> 8) & 0xff) - 28);
  const b = Math.max(0, (n & 0xff) - 28);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export function createBattleDockStyles() {
  const fightEdge = edge(ART.btnFight);
  const magicEdge = edge(ART.btnMagic);
  const runEdge = edge(ART.btnRun);

  return StyleSheet.create({
    actionDock: {
      backgroundColor: ART.dock,
      borderTopWidth: 4,
      borderTopColor: ART.dockEdge,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: Platform.OS === 'web' ? 14 : 12,
    },
    actionDockMobile: {
      paddingHorizontal: 8,
      paddingTop: 6,
      paddingBottom: Platform.OS === 'web' ? 12 : 10,
    },
    menuRow: {
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
    },
    menuRowMobile: { gap: 8, flexWrap: 'nowrap' },
    arcadeBtn: { flex: 1, minWidth: 76, borderRadius: ART.radiusMd, paddingBottom: 5, overflow: 'visible' },
    arcadeBtnMobile: { minWidth: 0, flex: 1, maxWidth: '33.33%' },
    arcadeBtnPressed: { paddingBottom: 1, transform: [{ translateY: 4 }] },
    btnFace: {
      minHeight: 50,
      borderRadius: ART.radiusMd - 2,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 6,
      elevation: 8,
    },
    btnFaceMobile: { minHeight: 46, borderRadius: 10, borderWidth: 2, paddingHorizontal: 2 },
    arcadeBtnTxt: { fontWeight: '900', fontSize: 15, letterSpacing: 0.4, color: '#fff' },
    arcadeBtnTxtMobile: { fontSize: 13, letterSpacing: 0 },
    btnShine: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '44%',
      backgroundColor: ART.highlight,
      opacity: 0.35,
      borderTopLeftRadius: ART.radiusMd - 2,
      borderTopRightRadius: ART.radiusMd - 2,
    },
    fightOuter: { ...arcadeButtonDepth(ART.btnFight, fightEdge), flex: 1, shadowColor: ART.btnFight, shadowOpacity: 0.55, shadowRadius: 10 },
    fightFace: {
      backgroundColor: ART.btnFight,
      borderColor: fightEdge,
      borderBottomWidth: 5,
      borderBottomColor: edge(fightEdge),
    },
    fightTxt: { color: '#fff8f6', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    magicOuter: { ...arcadeButtonDepth(ART.btnMagic, magicEdge), flex: 1, shadowColor: ART.btnMagic, shadowOpacity: 0.5, shadowRadius: 8 },
    magicFace: {
      backgroundColor: ART.btnMagic,
      borderColor: magicEdge,
      borderBottomWidth: 5,
      borderBottomColor: edge(magicEdge),
    },
    magicTxt: { color: '#f8f0ff' },
    runOuter: { ...arcadeButtonDepth(ART.btnRun, runEdge), flex: 1 },
    runFace: {
      backgroundColor: ART.btnRun,
      borderColor: '#95a5b8',
      borderBottomWidth: 4,
      borderBottomColor: '#7f8c9d',
    },
    runTxt: { color: '#2d3a4a' },
    magicPanel: { gap: 6 },
    magicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    magicBackBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: ART.radiusSm,
    },
    magicBackTxt: { color: '#dfe6e9', fontWeight: '800', fontSize: 13 },
    magicMp: { color: ART.mp, fontWeight: '900', fontSize: 14 },
    skillList: { gap: 6 },
    skillBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(123, 108, 246, 0.35)',
      borderWidth: 2,
      borderColor: ART.mp,
      borderRadius: ART.radiusMd,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 4,
      borderBottomColor: '#4834d4',
    },
    skillBtnPressed: { opacity: 0.9, transform: [{ translateY: 2 }] },
    skillBtnDisabled: { opacity: 0.38, borderColor: '#636e72' },
    skillEmoji: { fontSize: 22 },
    skillTextCol: { flex: 1, minWidth: 0 },
    skillName: { fontWeight: '900', fontSize: 15, color: '#fff' },
    skillMeta: { fontWeight: '700', fontSize: 12, color: '#dfe6e9', marginTop: 2 },
  });
}
