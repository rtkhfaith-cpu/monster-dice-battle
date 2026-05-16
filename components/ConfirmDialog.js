import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LOBBY } from '../utils/gameTheme';

/**
 * Cross-platform confirm dialog (Alert.alert is unreliable on web).
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onCancel,
  onConfirm,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onCancel}>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTap}
          onPress={busy ? undefined : onCancel}
          activeOpacity={1}
          accessibilityLabel="Close dialog"
        />
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelTxt}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.confirmDestructive, busy && styles.btnOff]}
              onPress={onConfirm}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={[styles.confirmTxt, destructive && styles.confirmTxtLight]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: LOBBY.panelBorder,
    padding: 20,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    zIndex: 2,
  },
  title: {
    fontWeight: '900',
    fontSize: 20,
    color: LOBBY.textStrong,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontWeight: '700',
    fontSize: 15,
    color: LOBBY.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: LOBBY.cardBorder,
    backgroundColor: LOBBY.chip,
    alignItems: 'center',
  },
  cancelTxt: { fontWeight: '900', fontSize: 16, color: LOBBY.textStrong },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2d2d44',
    backgroundColor: '#48cae4',
    alignItems: 'center',
  },
  confirmDestructive: {
    backgroundColor: '#e74c3c',
    borderColor: '#922b21',
  },
  btnOff: { opacity: 0.6 },
  confirmTxt: { fontWeight: '900', fontSize: 16, color: '#1b1b2f' },
  confirmTxtLight: { color: '#fff' },
});
