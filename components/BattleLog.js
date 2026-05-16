import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Compact battle log — latest lines only, fixed height for single-screen layout. */
export default function BattleLog({ lines, maxLines = 2, compact = true }) {
  const tail = lines.slice(-maxLines);

  return (
    <View style={[styles.box, compact && styles.boxCompact]}>
      {!compact ? <Text style={styles.title}>Battle log</Text> : null}
      {tail.length === 0 ? (
        <Text style={styles.muted} numberOfLines={1}>
          Waiting for battle…
        </Text>
      ) : (
        tail.map((line, i) => (
          <Text key={`${i}-${line}`} style={styles.line} numberOfLines={compact ? 2 : 3}>
            {line}
          </Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#fffef8',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#48cae4',
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
  },
  boxCompact: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    maxHeight: 52,
    overflow: 'hidden',
  },
  title: {
    fontWeight: '900',
    color: '#1a1a2e',
    marginBottom: 4,
    fontSize: 15,
  },
  line: {
    fontWeight: '800',
    color: '#1a1a2e',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 1,
  },
  muted: {
    fontWeight: '700',
    color: '#4a5568',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
