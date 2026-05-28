import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from '../MonsterPreview';
import { getBattleRoster } from '../../utils/rosterInventory';
import {
  dungeonRoleForOwned,
  dungeonRoleLabel,
  DUNGEON_ROLE_COLORS,
  hasCorrectDungeonFormation,
  monsterPower,
  estimateTeamPower,
} from '../../utils/dungeon/dungeonRoles';

const POSITION_INFO = {
  1: { title: 'Tanker', sub: 'Front', desc: 'Absorbs most single-target attacks; takes reduced damage.' },
  2: { title: 'Healer / Support', sub: 'Middle', desc: 'Pet skills here can support the whole team.' },
  3: { title: 'Damager', sub: 'Back', desc: 'Focuses on dealing damage to the boss.' },
};

export default function DungeonTeamSelectScreen({ boss, profile, onBack, onStart }) {
  const roster = useMemo(() => getBattleRoster(profile), [profile]);
  const [slots, setSlots] = useState({ 1: null, 2: null, 3: null });
  const [activeSlot, setActiveSlot] = useState(1);
  const [showFormation, setShowFormation] = useState(false);

  const assignedIds = Object.values(slots).filter(Boolean);
  const allFilled = assignedIds.length === 3;

  function placeMonster(ownedId) {
    setSlots((prev) => {
      const next = { ...prev };
      // remove if already placed somewhere
      for (const pos of [1, 2, 3]) if (next[pos] === ownedId) next[pos] = null;
      next[activeSlot] = ownedId;
      return next;
    });
    setActiveSlot((cur) => {
      const order = [1, 2, 3];
      const updated = { ...slots, [cur]: ownedId };
      const nextEmpty = order.find((p) => !updated[p]);
      return nextEmpty ?? cur;
    });
  }

  function clearSlot(pos) {
    setSlots((prev) => ({ ...prev, [pos]: null }));
    setActiveSlot(pos);
  }

  const teamOwned = [1, 2, 3].map((pos) => roster.find((m) => m.id === slots[pos]) ?? null);
  const roles = teamOwned.map((m) => (m ? dungeonRoleForOwned(m) : null));
  const formationCorrect = allFilled && hasCorrectDungeonFormation(roles[0], roles[1], roles[2]);
  const teamPower = estimateTeamPower(teamOwned.filter(Boolean), profile);
  const underPowered = teamPower < (boss?.recommendedPower ?? 0);

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{boss?.name}</Text>
        <View style={{ width: 56 }} />
      </View>
      <Text style={styles.subtitle}>Pick exactly 3 monsters and place them into positions.</Text>

      <View style={styles.slotRow}>
        {[1, 2, 3].map((pos) => {
          const m = teamOwned[pos - 1];
          const role = roles[pos - 1];
          const on = activeSlot === pos;
          const info = POSITION_INFO[pos];
          return (
            <TouchableOpacity
              key={pos}
              style={[styles.slot, on && styles.slotActive]}
              onPress={() => setActiveSlot(pos)}
              activeOpacity={0.9}
            >
              <Text style={styles.slotPos}>{pos}</Text>
              <Text style={styles.slotTitle}>{info.title}</Text>
              <Text style={styles.slotSub}>{info.sub}</Text>
              {m ? (
                <>
                  <MonsterPreview parts={m.monsterParts} size={36} mood="happy" />
                  <Text style={styles.slotMonName} numberOfLines={1}>{m.nickname || m.templateId}</Text>
                  <Text style={[styles.slotRole, { color: DUNGEON_ROLE_COLORS[role] }]}>{dungeonRoleLabel(role)}</Text>
                  <TouchableOpacity style={styles.slotClear} onPress={() => clearSlot(pos)}>
                    <Text style={styles.slotClearTxt}>Remove</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.slotEmpty}>Tap a monster →</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.powerRow}>
        <Text style={styles.powerTxt}>
          Team power: <Text style={{ color: underPowered ? '#f87171' : '#86efac' }}>{Math.round(teamPower).toLocaleString()}</Text>
          {'  '}/ {boss?.recommendedPower?.toLocaleString()}
        </Text>
        {formationCorrect ? <Text style={styles.formationGood}>✓ Correct formation bonus active</Text> : null}
      </View>

      <Text style={styles.sectionLbl}>Your monsters (tap to place in slot {activeSlot})</Text>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {roster.length === 0 ? (
          <Text style={styles.muted}>No monsters available.</Text>
        ) : (
          roster.map((m) => {
            const role = dungeonRoleForOwned(m);
            const placedPos = [1, 2, 3].find((p) => slots[p] === m.id);
            const power = monsterPower(m, profile);
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.monsterRow, placedPos && styles.monsterRowPlaced]}
                onPress={() => placeMonster(m.id)}
                activeOpacity={0.88}
              >
                <MonsterPreview parts={m.monsterParts} size={40} mood="happy" />
                <View style={styles.monsterInfo}>
                  <Text style={styles.monsterName} numberOfLines={1}>{m.nickname || m.templateId}</Text>
                  <Text style={styles.monsterMeta}>Lv {m.level ?? 1} · Power {Math.round(power).toLocaleString()}</Text>
                  <Text style={[styles.monsterRole, { color: DUNGEON_ROLE_COLORS[role] }]}>{dungeonRoleLabel(role)}</Text>
                </View>
                {placedPos ? <Text style={styles.placedBadge}>P{placedPos}</Text> : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.startBtn, !allFilled && styles.startBtnOff]}
        disabled={!allFilled}
        onPress={() => setShowFormation(true)}
        activeOpacity={0.9}
      >
        <Text style={styles.startTxt}>{allFilled ? 'Continue' : `Select ${3 - assignedIds.length} more`}</Text>
      </TouchableOpacity>

      <Modal visible={showFormation} transparent animationType="fade" onRequestClose={() => setShowFormation(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Dungeon Battle Formation</Text>

              <Text style={styles.modalPos}>Position 1: Tanker</Text>
              <Text style={styles.modalBody}>The front monster absorbs most single-target boss attacks and receives damage reduction.</Text>

              <Text style={styles.modalPos}>Position 2: Healer / Support</Text>
              <Text style={styles.modalBody}>The middle monster supports the team. Pet skills equipped here can affect all your monsters during dungeon battles.</Text>

              <Text style={styles.modalPos}>Position 3: Damager</Text>
              <Text style={styles.modalBody}>The back monster focuses on dealing damage to the boss.</Text>

              <Text style={styles.modalWarn}>
                Warning: Bosses can use Stun, Freeze, Burn, Debuffs, and AOE attacks. AOE attacks hit all monsters regardless of position. Choose your formation carefully.
              </Text>

              {underPowered ? (
                <Text style={styles.modalPowerWarn}>
                  Warning: Your team power is below the recommended level. This dungeon boss may be extremely difficult.
                </Text>
              ) : null}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowFormation(false)}>
                  <Text style={styles.modalCancelTxt}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalStart}
                  onPress={() => {
                    setShowFormation(false);
                    onStart?.([1, 2, 3].map((pos) => ({ ownedId: slots[pos], position: pos })));
                  }}
                >
                  <Text style={styles.modalStartTxt}>Start Battle</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, paddingHorizontal: 12, paddingTop: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { color: '#ffe08a', fontWeight: '900', fontSize: 14, minWidth: 56 },
  title: { color: '#fff4cf', fontWeight: '900', fontSize: 18 },
  subtitle: { color: '#bfdbfe', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  slotRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  slot: {
    flex: 1,
    minHeight: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.3)',
    backgroundColor: 'rgba(10,18,36,0.8)',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 3,
  },
  slotActive: { borderColor: '#fcd34d', backgroundColor: 'rgba(92,57,143,0.4)' },
  slotPos: { color: '#fcd34d', fontWeight: '900', fontSize: 16 },
  slotTitle: { color: '#fff4cf', fontWeight: '900', fontSize: 10, textAlign: 'center' },
  slotSub: { color: '#94a3b8', fontWeight: '800', fontSize: 8, marginBottom: 4 },
  slotMonName: { color: '#e2e8f0', fontWeight: '800', fontSize: 9, marginTop: 2, maxWidth: 80, textAlign: 'center' },
  slotRole: { fontWeight: '900', fontSize: 9, marginTop: 1 },
  slotClear: { marginTop: 4, backgroundColor: 'rgba(127,29,29,0.8)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  slotClearTxt: { color: '#fecaca', fontWeight: '900', fontSize: 8 },
  slotEmpty: { color: '#64748b', fontWeight: '800', fontSize: 9, marginTop: 16, textAlign: 'center' },
  powerRow: { marginTop: 10, alignItems: 'center' },
  powerTxt: { color: '#e2e8f0', fontWeight: '900', fontSize: 12 },
  formationGood: { color: '#86efac', fontWeight: '900', fontSize: 11, marginTop: 4 },
  sectionLbl: { color: '#ffe08a', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', marginTop: 10, marginBottom: 6 },
  list: { flex: 1 },
  listContent: { paddingBottom: 12 },
  muted: { color: '#94a3b8', fontWeight: '800', textAlign: 'center', padding: 16 },
  monsterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.22)',
    backgroundColor: 'rgba(14,28,52,0.8)',
    marginBottom: 6,
  },
  monsterRowPlaced: { borderColor: '#86efac', backgroundColor: 'rgba(18,53,40,0.55)' },
  monsterInfo: { flex: 1, minWidth: 0 },
  monsterName: { color: '#fff4cf', fontWeight: '900', fontSize: 13 },
  monsterMeta: { color: '#bfdbfe', fontWeight: '800', fontSize: 10, marginTop: 2 },
  monsterRole: { fontWeight: '900', fontSize: 10, marginTop: 2 },
  placedBadge: { color: '#fcd34d', fontWeight: '900', fontSize: 14 },
  startBtn: {
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(48,129,66,0.96)',
    borderWidth: 1,
    borderColor: '#efd17a',
    borderBottomWidth: 4,
    borderBottomColor: '#31551f',
  },
  startBtnOff: { backgroundColor: 'rgba(51,65,85,0.7)', borderColor: 'rgba(148,163,184,0.4)', borderBottomColor: '#1e293b' },
  startTxt: { color: '#fff8dd', fontWeight: '900', fontSize: 15, textTransform: 'uppercase' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(4,6,18,0.85)', justifyContent: 'center', padding: 18 },
  modalCard: {
    backgroundColor: '#15203a',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#c28a3a',
    padding: 18,
    maxHeight: '86%',
  },
  modalTitle: { color: '#ffe6a3', fontWeight: '900', fontSize: 18, textAlign: 'center', marginBottom: 12 },
  modalPos: { color: '#fcd34d', fontWeight: '900', fontSize: 13, marginTop: 10 },
  modalBody: { color: '#dbeafe', fontWeight: '700', fontSize: 12, marginTop: 3, lineHeight: 17 },
  modalWarn: { color: '#fca5a5', fontWeight: '800', fontSize: 12, marginTop: 14, lineHeight: 17 },
  modalPowerWarn: {
    color: '#fde68a',
    fontWeight: '900',
    fontSize: 12,
    marginTop: 12,
    lineHeight: 17,
    backgroundColor: 'rgba(120,83,12,0.3)',
    borderRadius: 8,
    padding: 8,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(42,58,86,0.96)', borderWidth: 1, borderColor: 'rgba(255,224,138,0.45)' },
  modalCancelTxt: { color: '#f4e3bd', fontWeight: '900', fontSize: 13 },
  modalStart: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(48,129,66,0.96)', borderWidth: 1, borderColor: '#efd17a' },
  modalStartTxt: { color: '#fff8dd', fontWeight: '900', fontSize: 13, textTransform: 'uppercase' },
});
