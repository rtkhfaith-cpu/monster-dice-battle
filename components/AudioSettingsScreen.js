import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  applyAudioSettings,
  loadAudioSettings,
  describeAudioSettings,
} from '../utils/audioSettings';
import {
  playButton,
  playAttack,
  playCritical,
  playShop,
  startBattleMusic,
  stopBattleMusic,
  unlockAudio,
} from '../utils/audioManager';
import { commitAudioSettingsSave } from '../src/services/syncCoordinator';

function VolSlider({ label, value, onChange }) {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.volRow}>
        {steps.map((v) => (
          <Pressable
            key={v}
            style={[styles.volTick, value >= v - 0.02 && styles.volTickOn]}
            onPress={() => onChange(v)}
          />
        ))}
        <Text style={styles.volPct}>{Math.round(value * 100)}%</Text>
      </View>
    </View>
  );
}

export default function AudioSettingsScreen({ onBack, activeProfileId }) {
  const [draft, setDraft] = useState(() => loadAudioSettings());
  const [savedFlash, setSavedFlash] = useState(false);
  const [testing, setTesting] = useState(null);

  const summary = useMemo(() => describeAudioSettings(draft), [draft]);

  function patch(partial) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setSavedFlash(false);
  }

  async function handleSave() {
    applyAudioSettings(draft);
    setSavedFlash(true);
    await commitAudioSettingsSave(activeProfileId ?? null);
    setTimeout(() => setSavedFlash(false), 2200);
  }

  function handleTest(kind) {
    setTesting(kind);
    unlockAudio();
    if (kind === 'bgm') {
      startBattleMusic();
      setTimeout(() => {
        stopBattleMusic();
        setTesting(null);
      }, 2000);
      return;
    }
    if (kind === 'button') playButton();
    if (kind === 'attack') playAttack();
    if (kind === 'critical') playCritical();
    if (kind === 'shop') playShop();
    setTimeout(() => setTesting(null), 600);
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Back">
          <Text style={styles.backTxt}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Audio Settings</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollInner}>
        <View style={styles.currentBox}>
          <Text style={styles.currentTitle}>Currently saved</Text>
          <Text style={styles.currentLine}>Music: {Math.round(summary.bgmVolume * 100)}%</Text>
          <Text style={styles.currentLine}>SFX: {Math.round(summary.sfxVolume * 100)}%</Text>
          <Text style={styles.currentLine}>{summary.muted ? '🔇 Muted' : '🔊 Sound on'}</Text>
        </View>

        <VolSlider
          label="Music volume"
          value={draft.bgmVolume}
          onChange={(bgmVolume) => patch({ bgmVolume })}
        />
        <VolSlider
          label="Sound effects"
          value={draft.sfxVolume}
          onChange={(sfxVolume) => patch({ sfxVolume })}
        />

        <Pressable style={styles.muteRow} onPress={() => patch({ muted: !draft.muted })}>
          <Text style={styles.muteLabel}>Mute all audio</Text>
          <Text style={styles.muteValue}>{draft.muted ? 'On' : 'Off'}</Text>
        </Pressable>

        <View style={styles.testRow}>
          <Text style={styles.testTitle}>Test sound</Text>
          <View style={styles.testBtns}>
            {[
              { id: 'bgm', label: 'Battle music' },
              { id: 'button', label: 'Button' },
              { id: 'attack', label: 'Attack' },
              { id: 'critical', label: 'Critical' },
              { id: 'shop', label: 'Shop' },
            ].map((t) => (
              <Pressable
                key={t.id}
                style={[styles.testBtn, testing === t.id && styles.testBtnActive]}
                onPress={() => handleTest(t.id)}
              >
                <Text style={styles.testBtnTxt}>{t.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.9}>
          <Text style={styles.saveBtnTxt}>Save & apply</Text>
        </TouchableOpacity>
        {savedFlash ? (
          <Text style={styles.savedMsg}>
            Saved — audio updated{Platform.OS === 'web' ? ' (stored in this browser)' : ''}.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#081324' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#b9843b',
    backgroundColor: 'rgba(13, 24, 44, 0.96)',
  },
  backBtn: {
    marginRight: 12,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.62)',
    backgroundColor: 'rgba(74, 48, 24, 0.72)',
  },
  backTxt: { fontWeight: '900', fontSize: 13, color: '#fff1bc' },
  title: {
    fontWeight: '900',
    fontSize: 20,
    color: '#fff4cf',
    flex: 1,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  scroll: { flex: 1 },
  scrollInner: { padding: 16, paddingBottom: 40, gap: 14 },
  currentBox: {
    backgroundColor: 'rgba(14, 28, 52, 0.9)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#c89546',
    borderBottomWidth: 5,
    borderBottomColor: '#65411d',
    padding: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  currentTitle: { fontWeight: '900', fontSize: 14, color: '#ffe08a', marginBottom: 4, textTransform: 'uppercase' },
  currentLine: { fontWeight: '800', fontSize: 13, color: '#d9f7ff' },
  field: {
    gap: 8,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.38)',
    backgroundColor: 'rgba(14, 28, 52, 0.76)',
    padding: 12,
  },
  fieldLabel: { fontWeight: '900', fontSize: 14, color: '#fff4cf', textTransform: 'uppercase' },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  volTick: {
    flex: 1,
    height: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  volTickOn: { backgroundColor: '#34d399', borderColor: '#b7f7b7' },
  volPct: { width: 44, fontWeight: '900', fontSize: 12, color: '#ffe08a', textAlign: 'right' },
  muteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 28, 52, 0.82)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.42)',
    borderBottomWidth: 5,
    borderBottomColor: '#55361c',
    padding: 14,
  },
  muteLabel: { fontWeight: '900', fontSize: 15, color: '#fff4cf' },
  muteValue: { fontWeight: '900', fontSize: 15, color: '#fca5a5', textTransform: 'uppercase' },
  testRow: { gap: 8 },
  testTitle: { fontWeight: '900', fontSize: 14, color: '#fff4cf', textTransform: 'uppercase' },
  testBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  testBtn: {
    backgroundColor: 'rgba(42, 58, 86, 0.88)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#8b6b3f',
    borderBottomWidth: 4,
    borderBottomColor: '#49311c',
  },
  testBtnActive: { borderColor: '#d8b4fe', backgroundColor: 'rgba(92, 57, 143, 0.96)' },
  testBtnTxt: { fontWeight: '900', fontSize: 13, color: '#f4e3bd' },
  saveBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#efd17a',
    borderBottomWidth: 5,
    borderBottomColor: '#31551f',
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnTxt: { color: '#fff8dd', fontWeight: '900', fontSize: 17, textTransform: 'uppercase', letterSpacing: 0.6 },
  savedMsg: {
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 13,
    color: '#86efac',
  },
});
