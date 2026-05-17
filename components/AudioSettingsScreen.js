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
import { ART } from '../utils/artDirection';
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
  root: { flex: 1, backgroundColor: ART.skyTop },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: ART.panelBorder,
    backgroundColor: ART.panelFill,
  },
  backBtn: { marginRight: 12, paddingVertical: 6, paddingHorizontal: 4 },
  backTxt: { fontWeight: '800', fontSize: 15, color: '#0984e3' },
  title: { fontWeight: '900', fontSize: 20, color: ART.textInk, flex: 1 },
  scroll: { flex: 1 },
  scrollInner: { padding: 16, paddingBottom: 40, gap: 14 },
  currentBox: {
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderRadius: ART.radiusMd,
    borderWidth: 2,
    borderColor: '#27ae60',
    padding: 12,
    gap: 4,
  },
  currentTitle: { fontWeight: '900', fontSize: 14, color: '#1e8449', marginBottom: 4 },
  currentLine: { fontWeight: '700', fontSize: 13, color: ART.textInk },
  field: { gap: 6 },
  fieldLabel: { fontWeight: '800', fontSize: 14, color: ART.textInk },
  volRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  volTick: {
    flex: 1,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dfe6e9',
  },
  volTickOn: { backgroundColor: ART.panelAccent },
  volPct: { width: 44, fontWeight: '800', fontSize: 12, color: ART.textInk, textAlign: 'right' },
  muteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ART.panelFill,
    borderRadius: ART.radiusMd,
    borderWidth: 2,
    borderColor: ART.panelBorder,
    padding: 14,
  },
  muteLabel: { fontWeight: '800', fontSize: 15, color: ART.textInk },
  muteValue: { fontWeight: '900', fontSize: 15, color: ART.danger },
  testRow: { gap: 8 },
  testTitle: { fontWeight: '800', fontSize: 14, color: ART.textInk },
  testBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  testBtn: {
    backgroundColor: '#ecf0f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#bdc3c7',
  },
  testBtnActive: { borderColor: ART.panelAccent, backgroundColor: 'rgba(230, 126, 34, 0.2)' },
  testBtnTxt: { fontWeight: '800', fontSize: 13, color: ART.textInk },
  saveBtn: {
    marginTop: 8,
    backgroundColor: ART.btnFight,
    borderRadius: ART.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnTxt: { color: '#fff', fontWeight: '900', fontSize: 17 },
  savedMsg: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 13,
    color: '#27ae60',
  },
});
