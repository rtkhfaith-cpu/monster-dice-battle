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
  BGM_TRACK_OPTIONS,
  DICE_TRACK_OPTIONS,
  ATTACK_TRACK_OPTIONS,
  CRITICAL_TRACK_OPTIONS,
  SUPER_TRACK_OPTIONS,
  labelForField,
} from '../utils/audioCatalog';
import {
  applyAudioSettings,
  loadAudioSettings,
  describeAudioSettings,
} from '../utils/audioSettings';
import { unlockBattleAudio, startBattleMusic, stopBattleMusic } from '../utils/battleAudio';
import { playGameSfx } from '../utils/gameSfx';
import { commitAudioSettingsSave } from '../src/services/syncCoordinator';

function TrackDropdown({ label, field, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value) || options[0];

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.dropdown} onPress={() => setOpen((v) => !v)}>
        <Text style={styles.dropdownValue} numberOfLines={1}>
          {selected.label}
        </Text>
        <Text style={styles.dropdownCaret}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open ? (
        <View style={styles.optionList}>
          {options.map((opt) => {
            const active = opt.id === value;
            return (
              <Pressable
                key={opt.id}
                style={[styles.optionRow, active && styles.optionRowActive]}
                onPress={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                <Text style={[styles.optionTxt, active && styles.optionTxtActive]}>{opt.label}</Text>
                {active ? <Text style={styles.check}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/**
 * Full audio settings — track picks persist in localStorage and cloud save.
 */
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
    unlockBattleAudio();
    if (kind === 'bgm') {
      startBattleMusic();
      setTimeout(() => {
        stopBattleMusic();
        setTesting(null);
      }, 1800);
      return;
    }
    const map = {
      dice: 'button',
      attack: 'attack',
      critical: 'critical',
      super: 'critical',
    };
    playGameSfx(map[kind] || 'attack', 1);
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
          <Text style={styles.currentLine}>Music: {summary.bgmTrackLabel}</Text>
          <Text style={styles.currentLine}>Dice: {summary.diceTrackLabel}</Text>
          <Text style={styles.currentLine}>Attack: {summary.attackTrackLabel}</Text>
          <Text style={styles.currentLine}>Critical: {summary.criticalTrackLabel}</Text>
          <Text style={styles.currentLine}>Super: {summary.superTrackLabel}</Text>
          <Text style={styles.currentLine}>{summary.muted ? '🔇 Muted' : '🔊 Sound on'}</Text>
        </View>

        <View style={styles.previewBox}>
          <Text style={styles.previewTitle}>Draft (not saved yet)</Text>
          <Text style={styles.previewLine}>{labelForField('bgmTrack', draft.bgmTrack)}</Text>
          <Text style={styles.previewLine}>{labelForField('diceTrack', draft.diceTrack)}</Text>
          <Text style={styles.previewLine}>{labelForField('attackTrack', draft.attackTrack)}</Text>
          <Text style={styles.previewLine}>{labelForField('criticalTrack', draft.criticalTrack)}</Text>
          <Text style={styles.previewLine}>{labelForField('superTrack', draft.superTrack)}</Text>
        </View>

        <TrackDropdown
          label="Background Music"
          field="bgmTrack"
          value={draft.bgmTrack}
          options={BGM_TRACK_OPTIONS}
          onChange={(bgmTrack) => patch({ bgmTrack })}
        />
        <TrackDropdown
          label="Dice Sound"
          field="diceTrack"
          value={draft.diceTrack}
          options={DICE_TRACK_OPTIONS}
          onChange={(diceTrack) => patch({ diceTrack })}
        />
        <TrackDropdown
          label="Attack Sound"
          field="attackTrack"
          value={draft.attackTrack}
          options={ATTACK_TRACK_OPTIONS}
          onChange={(attackTrack) => patch({ attackTrack })}
        />
        <TrackDropdown
          label="Critical Sound"
          field="criticalTrack"
          value={draft.criticalTrack}
          options={CRITICAL_TRACK_OPTIONS}
          onChange={(criticalTrack) => patch({ criticalTrack })}
        />
        <TrackDropdown
          label="Super Power Sound"
          field="superTrack"
          value={draft.superTrack}
          options={SUPER_TRACK_OPTIONS}
          onChange={(superTrack) => patch({ superTrack })}
        />

        <Pressable style={styles.muteRow} onPress={() => patch({ muted: !draft.muted })}>
          <Text style={styles.muteLabel}>Mute all audio</Text>
          <Text style={styles.muteValue}>{draft.muted ? 'On' : 'Off'}</Text>
        </Pressable>

        <View style={styles.testRow}>
          <Text style={styles.testTitle}>Test sound</Text>
          <View style={styles.testBtns}>
            {[
              { id: 'bgm', label: 'Music' },
              { id: 'dice', label: 'Dice' },
              { id: 'attack', label: 'Attack' },
              { id: 'critical', label: 'Crit' },
              { id: 'super', label: 'Super' },
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
          <Text style={styles.savedMsg}>Saved — audio updated{Platform.OS === 'web' ? ' (stored in this browser)' : ''}.</Text>
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
  previewBox: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: ART.radiusMd,
    borderWidth: 2,
    borderColor: '#3498db',
    padding: 12,
    gap: 2,
  },
  previewTitle: { fontWeight: '900', fontSize: 13, color: '#2471a3', marginBottom: 4 },
  previewLine: { fontWeight: '600', fontSize: 12, color: ART.textMuted },
  field: { gap: 6 },
  fieldLabel: { fontWeight: '800', fontSize: 14, color: ART.textInk },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: ART.panelBorder,
    borderRadius: ART.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  dropdownValue: { flex: 1, fontWeight: '700', fontSize: 14, color: ART.textInk },
  dropdownCaret: { fontSize: 12, color: ART.textMuted, marginLeft: 8 },
  optionList: {
    borderWidth: 2,
    borderColor: ART.panelBorder,
    borderRadius: ART.radiusSm,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  optionRowActive: { backgroundColor: 'rgba(230, 126, 34, 0.15)' },
  optionTxt: { flex: 1, fontWeight: '600', fontSize: 14, color: ART.textInk },
  optionTxtActive: { fontWeight: '900', color: '#d35400' },
  check: { fontWeight: '900', color: '#27ae60', fontSize: 16 },
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
