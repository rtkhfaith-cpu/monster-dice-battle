import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview, { MONSTER_PALETTE, partMax, SPECIES_LABELS } from './MonsterPreview';
import { randomVariant } from '../utils/random';

const PART_ROWS = [
  ['species', 'Species'],
  ['body', 'Body'],
  ['head', 'Head'],
  ['eyes', 'Eyes'],
  ['mouth', 'Mouth'],
  ['horn', 'Horn'],
  ['tail', 'Tail'],
  ['hands', 'Hands'],
  ['legs', 'Legs'],
];

export default function MonsterCreator({
  title,
  subtitle,
  fighter,
  onChangeMonsterPart,
  onConfirmMonster,
  confirmLabel = 'Confirm Monster',
  children,
}) {
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.screenSubtitle}>{subtitle}</Text>
      <MonsterPreview parts={fighter.monsterParts} size={264} />
      <View style={styles.partDeck}>
        {PART_ROWS.map(([key, human]) => (
          <View key={key} style={styles.partRow}>
            <Text style={styles.partCaption}>
              {human}
              {key === 'species' ? ` · ${SPECIES_LABELS[(fighter.monsterParts.species ?? 0) % SPECIES_LABELS.length]}` : ''}
            </Text>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.secondaryBtn}
              onPress={() => onChangeMonsterPart(key)}
            >
              <Text style={styles.secondaryTxt}>Change {human}</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.partRow}>
          <Text style={styles.partCaption}>Colour</Text>
          <TouchableOpacity activeOpacity={0.88} style={styles.secondaryBtn} onPress={() => onChangeMonsterPart('colorIdx')}>
            <Text style={styles.secondaryTxt}>Change Colour</Text>
          </TouchableOpacity>
        </View>
      </View>
      {children}
      <TouchableOpacity style={styles.heroBtn} activeOpacity={0.9} onPress={onConfirmMonster}>
        <Text style={styles.heroBtnTxt}>{confirmLabel}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

export function rerollMonsterPart(prev, field) {
  const mp = prev.monsterParts;
  const nextParts = { ...mp };
  if (field === 'colorIdx') {
    nextParts.colorIdx = randomVariant(MONSTER_PALETTE.length - 1, mp.colorIdx);
  } else {
    const maxIdx = partMax(field);
    nextParts[field] = randomVariant(maxIdx, mp[field]);
  }
  return { ...prev, monsterParts: nextParts };
}

const styles = StyleSheet.create({
  screenTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    color: '#273043',
    marginBottom: 4,
    marginTop: 4,
  },
  screenSubtitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#56607d',
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  partDeck: {
    marginTop: 6,
    width: '100%',
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(173,216,230,0.35)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#118ab255',
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: '100%',
    marginBottom: 8,
  },
  partCaption: {
    fontWeight: '800',
    fontSize: 17,
    color: '#2d4265',
    flexShrink: 1,
  },
  secondaryBtn: {
    backgroundColor: '#ffadad',
    borderRadius: 11,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
    borderColor: '#2d2d44',
  },
  secondaryTxt: {
    fontWeight: '800',
    fontSize: 14,
    color: '#2d2d44',
  },
  heroBtn: {
    marginTop: 18,
    marginBottom: 12,
    backgroundColor: '#8ac926',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#2d2d44',
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 0,
    elevation: 2,
  },
  heroBtnTxt: {
    fontSize: 21,
    fontWeight: '900',
    color: '#1b1b2f',
  },
});
