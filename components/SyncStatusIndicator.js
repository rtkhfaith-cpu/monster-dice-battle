import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { subscribeSaveStatus } from '../src/services/saveStatusBus';

const LABELS = {
  idle: null,
  local_saved: 'Saved locally ✓',
  cloud_synced: 'Cloud synced ✓',
  cloud_failed: 'Cloud sync failed',
  player_created: 'Player created ✓',
  player_deleted: 'Player deleted ✓',
  cloud_delete_failed: 'Player deleted on this device. Cloud delete failed.',
};

export default function SyncStatusIndicator() {
  const [status, setStatus] = useState('idle');

  useEffect(() => subscribeSaveStatus(setStatus), []);

  const label = LABELS[status];
  if (!label) return null;

  const isCloudOk = status === 'cloud_synced';
  const isCloudFail = status === 'cloud_failed';

  return (
    <View
      style={[
        styles.wrap,
        isCloudOk && styles.ok,
        isCloudFail && styles.fail,
        status === 'local_saved' && styles.local,
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 8 : 44,
    right: 10,
    zIndex: 9999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 36, 56, 0.88)',
    borderWidth: 2,
    borderColor: '#4a5578',
  },
  local: {
    borderColor: '#74b9ff',
  },
  ok: {
    borderColor: '#2ecc71',
    backgroundColor: 'rgba(26, 58, 42, 0.92)',
  },
  fail: {
    borderColor: '#ff6b6b',
    backgroundColor: 'rgba(58, 26, 26, 0.92)',
  },
  text: {
    color: '#fffef8',
    fontSize: 11,
    fontWeight: '800',
  },
});
