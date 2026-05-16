import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COSMETIC_CATALOG, MAX_EQUIPPED } from '../utils/cosmetics';

export default function CosmeticSelector({ ownedIds, equippedIds, onEquippedChange }) {
  const owned = new Set(ownedIds || []);
  const equipped = equippedIds || [];

  function toggle(id) {
    if (!owned.has(id)) return;
    const has = equipped.includes(id);
    let next = has ? equipped.filter((x) => x !== id) : [...equipped, id];
    next = next.slice(0, MAX_EQUIPPED);
    onEquippedChange?.(next);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.hdr}>Cosmetics (tap up to {MAX_EQUIPPED})</Text>
      <View style={styles.row}>
        {COSMETIC_CATALOG.map((c) => {
          const own = owned.has(c.id);
          const on = equipped.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, !own && styles.chipLocked, on && styles.chipOn]}
              onPress={() => toggle(c.id)}
              disabled={!own}
            >
              <Text style={styles.chipTxt}>
                {c.emoji} {own ? (on ? '✓' : '') : '🔒'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(250,220,255,0.5)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#9b59b6',
  },
  hdr: {
    fontWeight: '900',
    fontSize: 15,
    color: '#512e5f',
    marginBottom: 8,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2d2d44',
    backgroundColor: '#fff',
    margin: 3,
  },
  chipLocked: { opacity: 0.45 },
  chipOn: { backgroundColor: '#ffeaa7', borderColor: '#d35400' },
  chipTxt: { fontSize: 13, fontWeight: '800', color: '#1b1b2f' },
});
