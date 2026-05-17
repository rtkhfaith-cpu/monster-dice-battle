import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ART } from '../utils/artDirection';
import { loadAudioSettings, applyAudioSettings } from '../utils/audioSettings';
import { isAudioMuted } from '../utils/audioManager';

function VolRow({ label, value, onChange }) {
  const pct = Math.round(value * 100);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.track}>
        {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
          <Pressable
            key={v}
            style={[styles.tick, value >= v - 0.05 && styles.tickOn]}
            onPress={() => onChange(v)}
          />
        ))}
      </View>
      <Text style={styles.pct}>{pct}%</Text>
    </View>
  );
}

/**
 * Mute + volume sheet for battle screens.
 */
export default function BattleAudioControls({ muted, onToggleMute }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadAudioSettings());

  function patch(patch) {
    const next = applyAudioSettings(patch);
    setSettings(next);
  }

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.iconBtn} onPress={onToggleMute} accessibilityLabel="Mute">
        <Text style={styles.iconTxt}>{muted ? '🔇' : '🔊'}</Text>
      </Pressable>
      <Pressable style={styles.iconBtn} onPress={() => setOpen(true)} accessibilityLabel="Audio settings">
        <Text style={styles.iconTxt}>🎚</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
            <Text style={styles.title}>Audio</Text>
            <VolRow label="Music" value={settings.bgm} onChange={(bgm) => patch({ bgm })} />
            <VolRow label="SFX" value={settings.sfx} onChange={(sfx) => patch({ sfx })} />
            <VolRow label="UI" value={settings.ui} onChange={(ui) => patch({ ui })} />
            <VolRow label="Impacts" value={settings.impact} onChange={(impact) => patch({ impact })} />
            <Pressable
              style={styles.muteRow}
              onPress={() => {
                const m = !isAudioMuted();
                applyAudioSettings({ muted: m });
                onToggleMute?.();
                setSettings(loadAudioSettings());
              }}
            >
              <Text style={styles.muteTxt}>{settings.muted ? 'Unmute all' : 'Mute all'}</Text>
            </Pressable>
            <Pressable style={styles.doneBtn} onPress={() => setOpen(false)}>
              <Text style={styles.doneTxt}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    backgroundColor: 'rgba(26, 26, 46, 0.75)',
    borderWidth: 2,
    borderColor: ART.panelAccent,
    borderRadius: ART.radiusSm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconTxt: { fontSize: 16 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: ART.panelFill,
    borderRadius: ART.radiusLg,
    borderWidth: 3,
    borderColor: ART.panelBorder,
    padding: 18,
    gap: 12,
  },
  title: { fontWeight: '900', fontSize: 18, color: ART.textInk, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { width: 64, fontWeight: '800', fontSize: 13, color: ART.textMuted },
  track: { flex: 1, flexDirection: 'row', gap: 4 },
  tick: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dfe6e9',
  },
  tickOn: { backgroundColor: ART.panelAccent },
  pct: { width: 40, fontWeight: '800', fontSize: 12, color: ART.textInk, textAlign: 'right' },
  muteRow: {
    marginTop: 4,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#e8eef4',
  },
  muteTxt: { fontWeight: '800', color: ART.danger },
  doneBtn: {
    backgroundColor: ART.btnFight,
    borderRadius: ART.radiusMd,
    paddingVertical: 12,
    alignItems: 'center',
  },
  doneTxt: { color: '#fff', fontWeight: '900', fontSize: 15 },
});
