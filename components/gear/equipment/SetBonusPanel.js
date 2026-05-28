import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GEAR_UI } from '../gearUiTheme';

export default function SetBonusPanel({ setBonus, progress }) {
  if (setBonus) {
    return (
      <View style={styles.active}>
        <Text style={styles.activeTitle}>✨ {setBonus.name}</Text>
        <Text style={styles.activeDesc}>{setBonus.description}</Text>
      </View>
    );
  }

  if (progress) {
    return (
      <View style={styles.progress}>
        <Text style={styles.progressTxt}>{progress}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  active: {
    backgroundColor: GEAR_UI.setActive,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GEAR_UI.setActiveBorder,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  activeTitle: { color: '#fff8dd', fontWeight: '900', fontSize: 12 },
  activeDesc: { color: '#c4b5fd', fontSize: 11, marginTop: 3, fontWeight: '800' },
  progress: {
    backgroundColor: GEAR_UI.panel,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GEAR_UI.panelBorder,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  progressTxt: { color: GEAR_UI.muted, fontSize: 10, fontWeight: '800', textAlign: 'center' },
});
