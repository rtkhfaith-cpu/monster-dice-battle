import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Choose cloud vs device save when both diverged.
 */
export default function SaveConflictModal({
  visible,
  title = 'Save conflict',
  message,
  busy = false,
  onCancel,
  onUseCloud,
  onUseDevice,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTap}
          onPress={busy ? undefined : onCancel}
          activeOpacity={1}
          accessibilityLabel="Close"
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {busy ? <ActivityIndicator color="#facc15" style={styles.spinner} /> : null}
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.btnOff]}
            onPress={onUseCloud}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryTxt}>Use cloud save</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, busy && styles.btnOff]}
            onPress={onUseDevice}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryTxt}>Use this device</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={busy} activeOpacity={0.85}>
            <Text style={styles.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 8, 18, 0.78)',
  },
  sheet: {
    backgroundColor: 'rgba(20, 25, 45, 0.96)',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#c28a3a',
    padding: 20,
    maxWidth: 420,
    width: '92%',
    alignSelf: 'center',
    zIndex: 2,
  },
  title: {
    fontWeight: '900',
    fontSize: 20,
    color: '#ffe7a3',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontWeight: '700',
    fontSize: 13,
    color: '#f8ead0',
    lineHeight: 19,
    marginBottom: 16,
  },
  spinner: {
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  secondaryBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
    marginBottom: 8,
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  primaryTxt: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
    textAlign: 'center',
  },
  secondaryTxt: {
    color: '#e0f2fe',
    fontWeight: '900',
    fontSize: 15,
    textAlign: 'center',
  },
  cancelTxt: {
    color: '#94a3b8',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'center',
  },
  btnOff: {
    opacity: 0.5,
  },
});
