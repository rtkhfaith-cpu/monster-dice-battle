import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
            {cancelLabel ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onCancel}
                disabled={busy}
                activeOpacity={0.85}
              >
                <Text style={styles.cancelTxt}>{cancelLabel}</Text>
              </TouchableOpacity>
            ) : null}
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
    backgroundColor: 'rgba(5, 8, 18, 0.72)',
  },
  sheet: {
    backgroundColor: 'rgba(20, 25, 45, 0.96)',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#c28a3a',
    borderBottomWidth: 6,
    borderBottomColor: '#6f421b',
    padding: 20,
    maxWidth: 400,
    width: '78%',
    alignSelf: 'center',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 18,
  },
  title: {
    fontWeight: '900',
    fontSize: 20,
    color: '#ffe7a3',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  message: {
    fontWeight: '700',
    fontSize: 15,
    color: '#f8ead0',
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
    borderColor: '#8b6f3e',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  cancelTxt: { fontWeight: '900', fontSize: 16, color: '#f8ead0' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#73d7a5',
    borderBottomWidth: 5,
    borderBottomColor: '#184332',
    backgroundColor: '#2f6f57',
    alignItems: 'center',
  },
  confirmDestructive: {
    backgroundColor: '#8f3f32',
    borderColor: '#f0a45f',
    borderBottomColor: '#522116',
  },
  btnOff: { opacity: 0.6 },
  confirmTxt: { fontWeight: '900', fontSize: 16, color: '#effff5' },
  confirmTxtLight: { color: '#fff' },
});
