import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LOBBY } from '../utils/gameTheme';
import { normalizePlayerKey } from '../utils/playerKey';

const KEY_INPUT_PROPS = {
  keyboardType: 'number-pad',
  maxLength: 4,
  secureTextEntry: true,
  autoComplete: 'off',
  autoCorrect: false,
  textContentType: 'none',
  importantForAutofill: 'no',
  inputMode: 'numeric',
};

/**
 * Player Key entry — unlock, migrate, or delete confirmation.
 * @param {{
 *   visible: boolean,
 *   mode: 'unlock'|'migrate'|'delete'|'login',
 *   playerName?: string,
 *   error?: string|null,
 *   busy?: boolean,
 *   onCancel: () => void,
 *   onSubmit: (payload: { key: string, confirmKey?: string }) => void,
 * }} props
 */
export default function PlayerKeyModal({
  visible,
  mode,
  playerName = 'Player',
  error = null,
  busy = false,
  onCancel,
  onSubmit,
}) {
  const [key, setKey] = useState('');
  const [confirmKey, setConfirmKey] = useState('');

  useEffect(() => {
    if (visible) {
      setKey('');
      setConfirmKey('');
    }
  }, [visible, mode, playerName]);

  const needsConfirm = mode === 'migrate';

  const title =
    mode === 'delete'
      ? `Delete ${playerName}`
      : mode === 'migrate'
        ? 'Create Player Key'
        : mode === 'login'
          ? `Enter key for ${playerName}`
          : playerName;

  const subtitle =
    mode === 'delete'
      ? 'Enter the 4-digit Player Key to confirm deletion.'
      : mode === 'migrate'
        ? 'Create a 4-digit Player Key for this player.'
        : mode === 'login'
          ? 'Enter the 4-digit Player Key for this player.'
          : 'Enter your 4-digit Player Key to open this player.';

  const hint =
    mode === 'migrate'
      ? 'Choose a 4-digit key. You need this to open or delete this player later.'
      : mode === 'unlock'
        ? 'You need this key to open this player.'
        : null;

  function handleSubmit() {
    if (busy) return;
    onSubmit?.({
      key: normalizePlayerKey(key),
      confirmKey: needsConfirm ? normalizePlayerKey(confirmKey) : undefined,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.sheet} onPress={(e) => e?.stopPropagation?.()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}

          <Text style={styles.fieldLbl}>4-digit Player Key</Text>
          <TextInput
            style={styles.keyInput}
            value={key}
            onChangeText={(t) => setKey(normalizePlayerKey(t))}
            placeholder="••••"
            placeholderTextColor="#95a5a6"
            editable={!busy}
            returnKeyType={needsConfirm ? 'next' : 'done'}
            onSubmitEditing={needsConfirm ? undefined : handleSubmit}
            {...KEY_INPUT_PROPS}
          />

          {needsConfirm ? (
            <>
              <Text style={[styles.fieldLbl, styles.fieldLblSpaced]}>Confirm Player Key</Text>
              <TextInput
                style={styles.keyInput}
                value={confirmKey}
                onChangeText={(t) => setConfirmKey(normalizePlayerKey(t))}
                placeholder="••••"
                placeholderTextColor="#95a5a6"
                editable={!busy}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                {...KEY_INPUT_PROPS}
              />
            </>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, mode === 'delete' && styles.deleteBtn, busy && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={busy}
              activeOpacity={0.85}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.primaryBtnTxt, mode === 'delete' && styles.primaryBtnTxtLight]}>
                  {mode === 'delete'
                    ? 'Delete Player'
                    : mode === 'migrate'
                      ? 'Save Key'
                      : mode === 'login'
                        ? 'Load Player'
                        : 'Unlock'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: LOBBY.panelBorder,
    padding: 18,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    fontWeight: '900',
    fontSize: 20,
    color: LOBBY.textStrong,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontWeight: '700',
    fontSize: 15,
    color: LOBBY.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 8,
  },
  hint: {
    fontWeight: '700',
    fontSize: 13,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  fieldLbl: {
    fontWeight: '900',
    fontSize: 14,
    color: LOBBY.textStrong,
    marginBottom: 6,
  },
  fieldLblSpaced: { marginTop: 10 },
  keyInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#2d2d44',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontWeight: '800',
    fontSize: 18,
    color: '#1b1b2f',
    minHeight: 52,
    letterSpacing: 6,
    textAlign: 'center',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  error: {
    marginTop: 10,
    fontWeight: '800',
    fontSize: 14,
    color: '#c0392b',
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: LOBBY.cardBorder,
    backgroundColor: LOBBY.chip,
    alignItems: 'center',
  },
  cancelBtnTxt: { fontWeight: '900', fontSize: 16, color: LOBBY.textStrong },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2d2d44',
    backgroundColor: '#48cae4',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  deleteBtn: {
    backgroundColor: '#e74c3c',
    borderColor: '#922b21',
  },
  btnDisabled: { opacity: 0.65 },
  primaryBtnTxt: { fontWeight: '900', fontSize: 16, color: '#1b1b2f' },
  primaryBtnTxtLight: { color: '#fff' },
});
