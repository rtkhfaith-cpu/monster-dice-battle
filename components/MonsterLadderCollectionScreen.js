import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import MonsterStatCardOverlay from './MonsterStatCardOverlay';
import { RARITY_UI, getMonsterTemplate } from '../utils/monsterTemplates';
import { getLadderMonsterTemplate } from '../utils/monsterLadder/ladderMonsterCatalog';
import { fighterForLadderBattle } from '../utils/monsterLadder/ladderFighters';

function formatStats(stats) {
  if (!stats) return '';
  return `HP ${stats.hp} · MP ${stats.mp} · ATK ${stats.attack.min}-${stats.attack.max} · MAG ${stats.magic.min}-${stats.magic.max} · HIT ${stats.hitRate ?? 92}% · AGI ${stats.agility ?? stats.speed ?? 10}`;
}

export default function MonsterLadderCollectionScreen({
  visible,
  profile,
  ownedMonsters,
  activeMonsterId,
  onClose,
  onSelectActive,
}) {
  const [cardMonster, setCardMonster] = useState(null);
  const cardFighter = cardMonster && profile ? fighterForLadderBattle(cardMonster, profile) : null;
  const cardTemplate =
    cardMonster
      ? getLadderMonsterTemplate(cardMonster.templateId) ?? getMonsterTemplate(cardMonster.templateId)
      : null;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Ladder collection</Text>
          <Text style={styles.sub}>Pick any monster you own — home roster or ladder exclusives.</Text>
          <ScrollView style={styles.list} contentContainerStyle={styles.listInner}>
            {ownedMonsters.length === 0 ? (
              <Text style={styles.empty}>No monsters yet. Buy or earn monsters on the home screen, or win ladder chests.</Text>
            ) : (
              ownedMonsters.map((om) => {
                const f = profile ? fighterForLadderBattle(om, profile) : null;
                const t = getLadderMonsterTemplate(om.templateId) ?? getMonsterTemplate(om.templateId);
                const active = om.id === activeMonsterId;
                return (
                  <TouchableOpacity
                    key={om.id}
                    style={[styles.row, active && styles.rowOn]}
                    onPress={() => onSelectActive(om.id)}
                  >
                    {f ? (
                      <TouchableOpacity
                        activeOpacity={0.86}
                        onPress={() => setCardMonster(om)}
                        style={styles.monsterThumb}
                      >
                        <MonsterPreview parts={f.monsterParts} size={52} mood="happy" />
                        <Text style={styles.tapHint}>Card</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.fallback}>?</Text>
                    )}
                    <View style={styles.meta}>
                      <Text style={styles.name}>{om.nickname || t?.name}</Text>
                      <Text style={styles.lv}>
                        Lv {om.level} · {RARITY_UI[t?.rarity]?.label ?? t?.rarity}
                      </Text>
                      <Text style={styles.stats} numberOfLines={2}>{formatStats(f?.stats || f?.baseStats)}</Text>
                    </View>
                    {active ? <Text style={styles.badge}>ACTIVE</Text> : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>Done</Text>
          </TouchableOpacity>
          {cardFighter ? (
            <MonsterStatCardOverlay
              fighter={{ ...cardFighter, displayName: cardMonster.nickname || cardTemplate?.name || cardFighter.displayName }}
              kicker="Ladder Monster"
              mergeTier={cardMonster.mergeTier ?? 0}
              selected={cardMonster.id === activeMonsterId}
              onClose={() => setCardMonster(null)}
              primaryAction={
                cardMonster.id === activeMonsterId
                  ? undefined
                  : {
                      label: 'Set active',
                      onPress: () => {
                        onSelectActive(cardMonster.id);
                        setCardMonster(null);
                      },
                    }
              }
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '78%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  title: { fontWeight: '900', fontSize: 20, color: '#1a1a2e' },
  sub: { fontWeight: '700', fontSize: 12, color: '#636e72', marginBottom: 10 },
  list: { maxHeight: 360 },
  listInner: { gap: 8, paddingBottom: 8 },
  empty: { fontWeight: '800', fontSize: 14, color: '#636e72', textAlign: 'center', padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dfe6e9',
  },
  rowOn: { borderColor: '#6c5ce7', borderWidth: 2, backgroundColor: 'rgba(108,92,231,0.08)' },
  monsterThumb: {
    width: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(108,92,231,0.08)',
    paddingVertical: 3,
  },
  tapHint: { color: '#6c5ce7', fontWeight: '900', fontSize: 8, marginTop: 1, textTransform: 'uppercase' },
  fallback: { fontSize: 32, width: 52, textAlign: 'center' },
  meta: { flex: 1 },
  name: { fontWeight: '900', fontSize: 15, color: '#1a1a2e' },
  lv: { fontWeight: '700', fontSize: 12, color: '#636e72', marginTop: 2 },
  stats: { fontWeight: '800', fontSize: 11, color: '#2563eb', marginTop: 3, lineHeight: 14 },
  badge: {
    fontWeight: '900',
    fontSize: 10,
    color: '#6c5ce7',
    backgroundColor: '#ede7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  closeBtn: {
    marginTop: 10,
    backgroundColor: '#6c5ce7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
