import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { subscribeSyncDebug } from '../src/services/syncDebugBus';

/**
 * Temporary production debug strip — remove when cloud sync is stable.
 */
export default function SyncDebugIndicator() {
  const [dbg, setDbg] = useState(null);

  useEffect(() => subscribeSyncDebug(setDbg), []);

  if (!dbg) return null;

  const line = [
    `API ${dbg.apiBase || '?'}`,
    `Socket ${dbg.socketUrl || '?'}`,
    dbg.route ? `${dbg.route}` : '',
    dbg.requestId ? `#${dbg.requestId.slice(-10)}` : '',
    dbg.status || 'idle',
    dbg.httpStatus ? `HTTP ${dbg.httpStatus}` : '',
    dbg.kind ? dbg.kind : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.text} numberOfLines={3}>
        {line}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 6 : 28,
    left: 6,
    right: 6,
    zIndex: 9998,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(20, 24, 40, 0.92)',
    borderWidth: 1,
    borderColor: '#5a6a9a',
  },
  text: {
    color: '#c8d4ff',
    fontSize: 9,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
});
