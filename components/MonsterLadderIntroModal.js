import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ART, gamePanelStyle } from '../utils/artDirection';

export default function MonsterLadderIntroModal({ visible, onContinue }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onContinue}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>PROJECT ASCENT</Text>
          <Text style={styles.title}>The Noise has noticed you.</Text>
          <Text style={styles.body}>
            Your resonance has reached the Monster Ladder — a separate world of corrupted elites,
            ladder-only monsters, and chests that never touch the normal shops.
          </Text>
          <Text style={styles.quote}>
            “Entering Monster Ladder is entering a different world.”
          </Text>
          <TouchableOpacity style={styles.btn} onPress={onContinue} activeOpacity={0.9}>
            <Text style={styles.btnTxt}>Claim tutorial chest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 14, 28, 0.88)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    padding: 22,
    borderRadius: 16,
    ...gamePanelStyle('#6c5ce7'),
    gap: 12,
  },
  kicker: {
    fontWeight: '900',
    fontSize: 12,
    color: '#a29bfe',
    letterSpacing: 2,
    textAlign: 'center',
  },
  title: {
    fontWeight: '900',
    fontSize: 22,
    color: ART.textInk,
    textAlign: 'center',
    lineHeight: 28,
  },
  body: {
    fontWeight: '700',
    fontSize: 14,
    color: ART.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  quote: {
    fontWeight: '800',
    fontSize: 13,
    color: '#6c5ce7',
    textAlign: 'center',
    fontStyle: 'italic',
    marginVertical: 4,
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#6c5ce7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4834d4',
  },
  btnTxt: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
