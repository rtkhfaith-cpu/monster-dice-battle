import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MonsterRushGameView from './MonsterRushGameView';
import MonsterPreview from '../MonsterPreview';
import { getOwnedRoster } from '../../utils/rosterInventory';
import { getMonsterTemplate } from '../../utils/monsterTemplates';
import { getLadderMonsterTemplate } from '../../utils/monsterLadder/ladderMonsterCatalog';
import { getMonsterImageAsset } from '../../utils/monsterImageAssets';
import { getMonsterRushState } from '../../utils/monsterRush/monsterRushProgress';
import { RUSH_EXCHANGE_ITEMS } from '../../utils/monsterRush/monsterRushExchange';
import { MONSTER_RUSH_PHYSICS } from '../../utils/monsterRush/monsterRushConfig';
import {
  activateMonsterRushWebLayout,
  deactivateMonsterRushWebLayout,
} from '../../utils/monsterRush/monsterRushWebLayout';
import { WEB_DECORATIVE_IMAGE_PROPS } from '../../utils/webGameTouch';

const RARITY_COLOR = {
  common: '#94a3b8',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
  mythic: '#f472b6',
};

const PREVIEW_SIZE = MONSTER_RUSH_PHYSICS.playerSize;

function MonsterBoxPreview({ templateId }) {
  const asset = getMonsterImageAsset(templateId);
  return (
    <View style={styles.previewBox}>
      {asset?.path ? (
        <Image
          source={{ uri: asset.path }}
          style={styles.previewImg}
          resizeMode="cover"
          {...WEB_DECORATIVE_IMAGE_PROPS}
        />
      ) : (
        <MonsterPreview parts={{ templateId }} size={22} mood="happy" />
      )}
    </View>
  );
}

/**
 * Monster Rush — Endless Quest orchestrator.
 * Views: hub | select | game | over | exchange
 */
export default function MonsterRushScreen({
  profile,
  onBack,
  onRunComplete,
  onExchange,
}) {
  const [view, setView] = useState('hub');
  const [selectedMonsterId, setSelectedMonsterId] = useState(null);
  const [runKey, setRunKey] = useState(0);
  const [lastRun, setLastRun] = useState(null);
  const [arenaSize, setArenaSize] = useState({ w: 0, h: 0 });

  const rushState = useMemo(() => getMonsterRushState(profile), [profile]);
  const roster = useMemo(() => getOwnedRoster(profile), [profile]);
  const selectedMonster = roster.find((m) => m.id === selectedMonsterId) ?? null;

  useEffect(() => {
    activateMonsterRushWebLayout();
    return () => deactivateMonsterRushWebLayout();
  }, []);

  function tplMeta(templateId) {
    return getMonsterTemplate(templateId) ?? getLadderMonsterTemplate(templateId);
  }

  function handleGameOver(summary) {
    const result = onRunComplete?.({
      ...summary,
      selectedMonsterId,
    }) ?? {};
    setLastRun({ ...summary, ...result });
    setView('over');
  }

  const onArenaLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setArenaSize({ w: Math.floor(width), h: Math.floor(height) });
    }
  };

  if (view === 'game' && selectedMonster) {
    return (
      <View style={styles.gameRoot}>
        <View style={styles.arenaHost} onLayout={onArenaLayout}>
          {arenaSize.w > 0 && arenaSize.h > 0 ? (
            <MonsterRushGameView
              key={runKey}
              templateId={selectedMonster.templateId}
              gameWidth={arenaSize.w}
              gameHeight={arenaSize.h}
              onGameOver={handleGameOver}
              onQuit={() => setView('hub')}
            />
          ) : null}
        </View>
      </View>
    );
  }

  if (view === 'over' && lastRun) {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.overContent}>
          <Text style={styles.overTitle}>Run Failed</Text>
          <Text style={styles.overSub}>Your monster hit an obstacle!</Text>
          <View style={styles.statCard}>
            <Text style={styles.statLine}>Distance: {lastRun.distanceM}m</Text>
            <Text style={styles.statLine}>Coins: {lastRun.coinsCollected}</Text>
            <Text style={styles.statLine}>Rush Points earned: +{lastRun.rushPointsThisRun}</Text>
            {lastRun.newBestDistance ? <Text style={styles.newRecord}>🏆 New best distance!</Text> : null}
            <Text style={styles.statLine}>
              Total Rush Points: {lastRun.totalRushPoints ?? rushState.totalRushPoints}
            </Text>
          </View>
          <Text style={styles.overHint}>
            Use your monsters to earn more Rush Points and exchange them for useful items.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => { setRunKey((k) => k + 1); setView('game'); }}>
            <Text style={styles.primaryBtnTxt}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setView('select')}>
            <Text style={styles.secondaryBtnTxt}>Change Monster</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setView('hub')}>
            <Text style={styles.secondaryBtnTxt}>Back to Menu</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (view === 'exchange') {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setView('hub')}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Rush Exchange</Text>
          <Text style={styles.ptsBadge}>⚡ {rushState.totalRushPoints}</Text>
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {RUSH_EXCHANGE_ITEMS.map((item) => {
            const canAfford = rushState.totalRushPoints >= item.cost;
            return (
              <View key={item.id} style={styles.exchangeRow}>
                <Text style={styles.exchangeEmoji}>{item.emoji}</Text>
                <View style={styles.exchangeBody}>
                  <Text style={styles.exchangeName}>{item.name}</Text>
                  <Text style={styles.exchangeCost}>⚡ {item.cost} Rush Points</Text>
                </View>
                <TouchableOpacity
                  style={[styles.exchangeBtn, !canAfford && styles.exchangeBtnOff]}
                  disabled={!canAfford}
                  onPress={() => onExchange?.(item.id)}
                >
                  <Text style={styles.exchangeBtnTxt}>Exchange</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  if (view === 'select') {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setView('hub')}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Select Monster</Text>
          <View style={{ width: 48 }} />
        </View>
        {selectedMonster ? (
          <View style={styles.selectedPreview}>
            <Text style={styles.selectedLbl}>Runner preview</Text>
            <MonsterBoxPreview templateId={selectedMonster.templateId} />
            <Text style={styles.selectedName}>{selectedMonster.nickname || selectedMonster.templateId}</Text>
          </View>
        ) : null}
        <ScrollView style={styles.list} contentContainerStyle={styles.grid}>
          {roster.map((m) => {
            const tpl = tplMeta(m.templateId);
            const rarity = tpl?.rarity ?? 'common';
            const on = m.id === selectedMonsterId;
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.monCard, on && styles.monCardOn, { borderColor: RARITY_COLOR[rarity] ?? '#94a3b8' }]}
                onPress={() => setSelectedMonsterId(m.id)}
              >
                <MonsterPreview parts={m.monsterParts} size={36} mood="happy" />
                <Text style={styles.monName} numberOfLines={1}>{m.nickname || m.templateId}</Text>
                <Text style={[styles.monMeta, { color: RARITY_COLOR[rarity] }]}>
                  {rarity} · Lv {m.level ?? 1}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity
          style={[styles.primaryBtn, !selectedMonsterId && styles.btnOff]}
          disabled={!selectedMonsterId}
          onPress={() => { setRunKey((k) => k + 1); setArenaSize({ w: 0, h: 0 }); setView('game'); }}
        >
          <Text style={styles.primaryBtnTxt}>Start Run</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>← Quests</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Monster Rush</Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={styles.hubContent}>
        <Text style={styles.kicker}>Endless Quest</Text>
        <Text style={styles.hubSub}>
          Select one monster and survive as long as you can. Tap, click, or press Spacebar to jump.
          Avoid obstacles and collect coins to earn Rush Points.
        </Text>

        <View style={styles.statCard}>
          <Text style={styles.statLine}>⚡ Total Rush Points: {rushState.totalRushPoints}</Text>
          <Text style={styles.statLine}>🏁 Best distance: {rushState.bestDistance}m</Text>
          <Text style={styles.statLine}>🪙 Best coins: {rushState.bestCoins}</Text>
          <Text style={styles.statLine}>Runs played: {rushState.totalRuns}</Text>
        </View>

        <View style={styles.demoBox}>
          <MonsterBoxPreview templateId={roster[0]?.templateId ?? 'bubble_tea_slime'} />
          <Text style={styles.demoCaption}>Small runner box — monster face crops in (partial view OK)</Text>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => setView('select')}>
          <Text style={styles.primaryBtnTxt}>Select Monster & Start</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setView('exchange')}>
          <Text style={styles.secondaryBtnTxt}>Rush Exchange Shop</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  gameRoot: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    backgroundColor: '#0c1224',
    ...(Platform.OS === 'web'
      ? { height: '100%', maxHeight: '100dvh' }
      : {}),
  },
  arenaHost: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  root: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    ...(Platform.OS === 'web'
      ? { height: '100%', maxHeight: '100dvh' }
      : {}),
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  back: { color: '#ffe08a', fontWeight: '900', fontSize: 13, minWidth: 72 },
  title: { color: '#fff4cf', fontWeight: '900', fontSize: 18, textTransform: 'uppercase' },
  ptsBadge: { color: '#fde047', fontWeight: '900', fontSize: 12, minWidth: 72, textAlign: 'right' },
  kicker: { color: '#fcd34d', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', textAlign: 'center' },
  hubSub: { color: '#bfdbfe', fontWeight: '700', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 8 },
  hubContent: { paddingBottom: 24, alignItems: 'center' },
  statCard: {
    width: '100%',
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.45)',
    backgroundColor: 'rgba(12,20,40,0.88)',
    gap: 6,
  },
  statLine: { color: '#e2e8f0', fontWeight: '800', fontSize: 13 },
  demoBox: { alignItems: 'center', marginVertical: 16 },
  demoCaption: { color: '#94a3b8', fontWeight: '700', fontSize: 10, marginTop: 8, textAlign: 'center' },
  previewBox: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#f7c948',
    backgroundColor: '#fef3c7',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { boxShadow: '0 3px 0 #92400e, 0 6px 12px rgba(0,0,0,0.25)' } : {}),
  },
  previewImg: { width: '110%', height: '110%' },
  primaryBtn: {
    width: '100%',
    marginTop: 10,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(48,129,66,0.96)',
    borderWidth: 2,
    borderColor: '#efd17a',
  },
  primaryBtnTxt: { color: '#fff8dd', fontWeight: '900', fontSize: 14, textTransform: 'uppercase' },
  secondaryBtn: {
    width: '100%',
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(30,58,95,0.85)',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  secondaryBtnTxt: { color: '#e0f2fe', fontWeight: '900', fontSize: 12, textTransform: 'uppercase' },
  btnOff: { opacity: 0.45 },
  list: { flex: 1 },
  listContent: { paddingBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 12 },
  monCard: {
    width: '31%',
    minWidth: 96,
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'rgba(12,20,40,0.85)',
    alignItems: 'center',
  },
  monCardOn: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: '#4ade80' },
  monName: { color: '#fff4cf', fontWeight: '800', fontSize: 9, marginTop: 4, maxWidth: 90, textAlign: 'center' },
  monMeta: { fontWeight: '900', fontSize: 8, marginTop: 2, textTransform: 'capitalize' },
  selectedPreview: { alignItems: 'center', marginBottom: 10 },
  selectedLbl: { color: '#fcd34d', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', marginBottom: 6 },
  selectedName: { color: '#fff4cf', fontWeight: '900', fontSize: 13, marginTop: 6 },
  overContent: { paddingBottom: 24, alignItems: 'center' },
  overTitle: { color: '#f87171', fontWeight: '900', fontSize: 26, textTransform: 'uppercase', marginTop: 12 },
  overSub: { color: '#bfdbfe', fontWeight: '800', fontSize: 13, marginTop: 6 },
  newRecord: { color: '#fde047', fontWeight: '900', fontSize: 14, marginTop: 4 },
  overHint: { color: '#94a3b8', fontWeight: '700', fontSize: 11, textAlign: 'center', marginVertical: 12, lineHeight: 16 },
  exchangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.4)',
    backgroundColor: 'rgba(12,20,40,0.88)',
  },
  exchangeEmoji: { fontSize: 28 },
  exchangeBody: { flex: 1 },
  exchangeName: { color: '#fff4cf', fontWeight: '900', fontSize: 13 },
  exchangeCost: { color: '#fde047', fontWeight: '800', fontSize: 11, marginTop: 2 },
  exchangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(92,57,143,0.95)',
    borderWidth: 1,
    borderColor: '#d8b4fe',
  },
  exchangeBtnOff: { opacity: 0.4 },
  exchangeBtnTxt: { color: '#fff8dd', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' },
});
