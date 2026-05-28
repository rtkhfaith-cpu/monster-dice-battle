import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { chestDropTitle } from '../utils/mainBattleChest';
import { computeBattleStats } from '../utils/statsCalc';
import { computeLadderBattleStats } from '../utils/monsterLadder/ladderStatsCalc';
import { clampMergeTier, scaleStatsByMergeTier } from '../utils/mergeSystem';

function resolveStatsAtLevel(player, level) {
  const templateId = player?.monsterTemplateId;
  if (!templateId || !level) return null;
  const built = player?.isLadderMonster
    ? computeLadderBattleStats(templateId, level)
    : computeBattleStats(templateId, level);
  if (!built?.stats) return null;
  const mergeTier = clampMergeTier(player?.mergeTier);
  const merged = scaleStatsByMergeTier(built.stats, mergeTier);
  if (player?.stats && player.level === level) return player.stats;
  return merged;
}

function rangeLabel(range) {
  if (!range) return '—';
  return `${range.min}-${range.max}`;
}

function rangeDelta(prev, cur) {
  if (!prev || !cur) return 0;
  const dMin = cur.min - prev.min;
  const dMax = cur.max - prev.max;
  if (dMin === dMax) return dMin;
  return Math.max(dMin, dMax);
}

function formatBonus(delta, showBonus) {
  if (!showBonus || !delta || delta <= 0) return '';
  return ` (+${delta})`;
}

function FighterCard({ fighter, label, mood, portraitSize }) {
  if (!fighter?.monsterParts) return null;
  return (
    <View style={styles.fighterCard}>
      <Text style={styles.fighterLabel} numberOfLines={1}>{label}</Text>
      <MonsterPreview parts={fighter.monsterParts} size={portraitSize} mood={mood} />
      <Text style={styles.fighterName} numberOfLines={1}>
        {fighter.displayName || 'Monster'}
      </Text>
      <Text style={styles.fighterLv}>Lv {fighter.level ?? 1}</Text>
    </View>
  );
}

function StatCell({ label, value, bonus }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statKey}>{label}</Text>
      <Text style={styles.statVal} numberOfLines={1}>
        {value}
        {bonus ? <Text style={styles.statBonus}>{bonus}</Text> : null}
      </Text>
    </View>
  );
}

function MonsterStatsPanel({ player, expPack }) {
  const level = expPack?.level ?? player?.level ?? 1;
  const prevLevel = expPack?.prevLevel ?? Math.max(1, level - (expPack?.levelsGained ?? 0));
  const levelsGained = expPack?.levelsGained ?? 0;
  const leveledUp = levelsGained > 0;

  const { currentStats, prevStats } = useMemo(() => {
    const recalcCur = resolveStatsAtLevel(player, level);
    const recalcPrev = leveledUp ? resolveStatsAtLevel(player, prevLevel) : null;
    const cur = leveledUp ? recalcCur : (player?.stats ?? recalcCur);
    const prev = leveledUp ? recalcPrev : null;
    return { currentStats: cur, prevStats: prev };
  }, [player, level, prevLevel, leveledUp]);

  if (!currentStats) return null;

  const showBonus = leveledUp && !!prevStats;

  const rows = [
    { key: 'HP', value: String(currentStats.hp), bonus: formatBonus(currentStats.hp - (prevStats?.hp ?? currentStats.hp), showBonus) },
    { key: 'MP', value: String(currentStats.mp), bonus: formatBonus(currentStats.mp - (prevStats?.mp ?? currentStats.mp), showBonus) },
    { key: 'ATK', value: rangeLabel(currentStats.attack), bonus: formatBonus(rangeDelta(prevStats?.attack, currentStats.attack), showBonus) },
    { key: 'MAG', value: rangeLabel(currentStats.magic), bonus: formatBonus(rangeDelta(prevStats?.magic, currentStats.magic), showBonus) },
    { key: 'DEF', value: rangeLabel(currentStats.def), bonus: formatBonus(rangeDelta(prevStats?.def, currentStats.def), showBonus) },
    { key: 'HIT RATE', value: String(Math.round(currentStats.hitRate ?? 0)), bonus: formatBonus((currentStats.hitRate ?? 0) - (prevStats?.hitRate ?? currentStats.hitRate ?? 0), showBonus) },
    { key: 'AGI', value: String(currentStats.agility ?? currentStats.speed ?? 10), bonus: formatBonus((currentStats.agility ?? currentStats.speed ?? 10) - (prevStats?.agility ?? prevStats?.speed ?? currentStats.agility ?? 10), showBonus) },
  ];

  return (
    <View style={styles.statsPanel}>
      <View style={styles.statsPanelHeader}>
        <Text style={styles.statsPanelTitle}>Current stats</Text>
        <Text style={styles.statsPanelLevel}>
          Lv {level}
          {leveledUp ? <Text style={styles.levelUpTag}> · LEVEL UP!</Text> : null}
        </Text>
      </View>
      <ScrollView
        style={styles.statsScroll}
        contentContainerStyle={styles.statGrid}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {rows.map((row) => (
          <StatCell key={row.key} label={row.key} value={row.value} bonus={row.bonus} />
        ))}
      </ScrollView>
    </View>
  );
}

function RewardsFooter({
  coinsAwarded,
  totalCoins,
  monsterLadder,
  ladderGoldTotal,
  ladderShardsTotal,
  expPack,
}) {
  const expDelta = expPack?.expDelta ?? 0;
  const exp = expPack?.exp ?? 0;
  const expToNext = expPack?.expToNext ?? 1;
  const expPct = Math.min(100, Math.round((exp / Math.max(1, expToNext)) * 100));
  const expRemaining = Math.max(0, expToNext - exp);

  return (
    <View style={styles.rewardsFooter}>
      <View style={styles.coinsBlock}>
        <Text style={styles.coinsLbl}>{monsterLadder ? 'Ladder gold' : 'Coins'}</Text>
        <Text style={styles.coinsStrong}>+{coinsAwarded}</Text>
        <Text style={styles.bank} numberOfLines={1}>
          {monsterLadder
            ? `Bank ${ladderGoldTotal ?? totalCoins ?? 0} · Shards ${ladderShardsTotal ?? 0}`
            : `Total ${totalCoins ?? 0}🪙`}
        </Text>
      </View>
      {expPack ? (
        <View style={styles.expBlock}>
          <Text style={styles.expGain}>
            EXP {expDelta >= 0 ? '+' : ''}
            {expDelta}
          </Text>
          <Text style={styles.expProgress} numberOfLines={2}>
            {exp} / {expToNext} to next level
            {expRemaining > 0 ? ` · ${expRemaining} left` : ''}
          </Text>
          <View style={styles.barOuter}>
            <View style={[styles.barInner, { width: `${expPct}%` }]} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function RewardScreen({
  winner,
  coinsAwarded = 0,
  bonusUnderdog = false,
  expP1,
  funnyTitle,
  player1,
  player2,
  totalCoins,
  encourageLines = [],
  onPlayAgain,
  onOpenMonsterGear,
  onOpenMonsterMart,
  onBackToHome,
  playAgainLabel = 'Play Again',
  backToHomeLabel = 'Back to Home',
  hideShopButtons = false,
  ladderBonusCoins = 0,
  ladderFirstClear = false,
  ladderFloor,
  ladderRegionName,
  monsterLadder = false,
  chestDrop = null,
  mainChestDrop = null,
  chestBlocked = false,
  ladderGoldTotal,
  ladderShardsTotal,
  onlineResult = false,
  onlineWon = false,
}) {
  const { width } = useWindowDimensions();
  const portraitSize = Math.min(112, Math.max(88, Math.round(width * 0.22)));

  const line = useMemo(() => {
    if (onlineResult) {
      if (winner === 'draw') return 'Both monsters still standing.';
      return onlineWon ? 'Arena victory!' : 'Train up and rematch.';
    }
    if (monsterLadder) {
      if (winner === 1) return 'Ladder advances.';
      if (winner === 'draw') return 'Stalemate on the climb.';
      return 'Same stage — try again.';
    }
    if (winner === 'draw') return 'Peace treaty signed.';
    if (winner === 1) return 'Victory!';
    return 'Defeat this round.';
  }, [monsterLadder, onlineResult, onlineWon, winner]);

  const extras = [];
  if (bonusUnderdog) extras.push('Underdog +10🪙 +10 EXP');
  if (ladderFloor) {
    extras.push(
      `${monsterLadder ? 'Lv' : 'Floor'} ${ladderFloor}${ladderRegionName ? ` · ${ladderRegionName}` : ''}`,
    );
  }
  if (ladderFirstClear && ladderBonusCoins > 0) {
    extras.push(`+${ladderBonusCoins} ladder gold`);
  }
  if (monsterLadder && chestDrop) {
    const chestLabel =
      chestDrop.kind === 'pet'
        ? 'Mythic pet'
        : chestDrop.kind === 'pet_exp_dust'
          ? 'Pet EXP dust'
          : chestDrop.kind === 'gear'
            ? 'Gear'
            : 'Monster';
    extras.push(`${chestLabel} chest${chestDrop.duplicate ? ' (duplicate)' : ''}`);
  }
  if (monsterLadder && chestBlocked) extras.push('Daily chest claimed');
  if (!monsterLadder && mainChestDrop) {
    extras.push(`Chest: ${chestDropTitle(mainChestDrop)}`);
  }
  const extraLine = extras.join(' · ');
  const tipLine = encourageLines?.[0] ?? '';

  const heroFighter = player1;
  const heroLabel = monsterLadder
    ? (heroFighter?.isLadderMonster ? 'Ladder monster' : 'Climber')
    : 'Your monster';
  const enemyLabel = monsterLadder ? 'Stage foe' : 'Enemy';

  const p1Mood =
    winner === 'draw'
      ? 'dizzy'
      : onlineResult
        ? onlineWon
          ? 'happy'
          : 'dizzy'
        : winner === 1
          ? 'happy'
          : 'dizzy';
  const p2Mood =
    winner === 'draw' ? 'dizzy' : winner === 2 ? 'happy' : 'dizzy';

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {expP1?.evolved ? <Text style={styles.evolve}>EVOLUTION!</Text> : null}
        <Text style={styles.boom}>{monsterLadder ? 'Ladder' : 'Battle'} Result</Text>
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>
          {funnyTitle}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>{line}</Text>
        {extraLine ? <Text style={styles.extra} numberOfLines={2}>{extraLine}</Text> : null}
      </View>

      <View style={styles.body}>
        <View style={styles.vsRow}>
          <FighterCard
            fighter={heroFighter}
            label={heroLabel}
            mood={p1Mood}
            portraitSize={portraitSize}
          />
          <Text style={styles.vsBadge}>VS</Text>
          {player2?.monsterParts && !onlineResult ? (
            <FighterCard
              fighter={player2}
              label={enemyLabel}
              mood={p2Mood}
              portraitSize={portraitSize}
            />
          ) : (
            <View style={styles.fighterCardPlaceholder} />
          )}
        </View>

        <MonsterStatsPanel player={heroFighter} expPack={expP1} />

        <RewardsFooter
          coinsAwarded={coinsAwarded}
          totalCoins={totalCoins}
          monsterLadder={monsterLadder}
          ladderGoldTotal={ladderGoldTotal}
          ladderShardsTotal={ladderShardsTotal}
          expPack={expP1}
        />

        {tipLine ? <Text style={styles.tip} numberOfLines={2}>{tipLine}</Text> : null}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primary} onPress={onPlayAgain}>
          <Text style={styles.primaryTxt}>{playAgainLabel}</Text>
        </TouchableOpacity>

        {!hideShopButtons && (onOpenMonsterMart || onOpenMonsterGear) ? (
          <View style={styles.shopRow}>
            {onOpenMonsterMart ? (
              <TouchableOpacity style={styles.shopBtn} onPress={onOpenMonsterMart}>
                <Text style={styles.shopBtnTxt}>Mart</Text>
              </TouchableOpacity>
            ) : null}
            {onOpenMonsterGear ? (
              <TouchableOpacity style={styles.shopBtn} onPress={onOpenMonsterGear}>
                <Text style={styles.shopBtnTxt}>Gear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {onBackToHome ? (
          <TouchableOpacity style={styles.ghost} onPress={onBackToHome}>
            <Text style={styles.ghostTxt}>{backToHomeLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.42)',
    borderBottomWidth: 4,
    borderBottomColor: '#5f3a1b',
    backgroundColor: 'rgba(12, 24, 45, 0.94)',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
    flexShrink: 0,
  },
  evolve: {
    fontSize: 14,
    fontWeight: '900',
    color: '#f0abfc',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  boom: {
    fontSize: 11,
    fontWeight: '900',
    color: '#fcd34d',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 19,
    fontWeight: '900',
    color: '#fff4cf',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  sub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#bfdbfe',
    textAlign: 'center',
    marginTop: 2,
  },
  extra: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fde68a',
    textAlign: 'center',
    marginTop: 3,
    lineHeight: 13,
  },
  body: {
    flex: 1,
    minHeight: 0,
    gap: 8,
  },
  vsRow: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.35)',
    backgroundColor: 'rgba(7, 17, 32, 0.55)',
  },
  vsBadge: {
    fontSize: 16,
    fontWeight: '900',
    color: '#fde68a',
    letterSpacing: 1,
  },
  fighterCard: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    gap: 2,
  },
  fighterCardPlaceholder: {
    flex: 1,
  },
  fighterLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fighterName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff4cf',
    textAlign: 'center',
  },
  fighterLv: {
    fontSize: 11,
    fontWeight: '800',
    color: '#bfdbfe',
  },
  statsPanel: {
    flex: 1,
    flexShrink: 1,
    minHeight: 0,
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
  },
  statsScroll: {
    flex: 1,
    minHeight: 0,
  },
  statsPanelHeader: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  statsPanelTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffe6a3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsPanelLevel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#bfdbfe',
  },
  levelUpTag: {
    color: '#86efac',
    fontWeight: '900',
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 2,
  },
  statCell: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  statKey: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  statVal: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '800',
    color: '#fff8e5',
  },
  statBonus: {
    color: '#86efac',
    fontWeight: '900',
  },
  rewardsFooter: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.4)',
    backgroundColor: 'rgba(7, 17, 32, 0.78)',
    padding: 10,
    marginTop: 2,
  },
  coinsBlock: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.12)',
    paddingRight: 8,
  },
  coinsLbl: {
    fontSize: 10,
    fontWeight: '900',
    color: '#d9f7ff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coinsStrong: {
    color: '#fcd34d',
    fontWeight: '900',
    fontSize: 26,
    lineHeight: 28,
    marginTop: 2,
  },
  bank: {
    fontSize: 11,
    fontWeight: '800',
    color: '#86efac',
    marginTop: 2,
    textAlign: 'center',
  },
  expBlock: {
    flex: 1.2,
    minWidth: 0,
    justifyContent: 'center',
    paddingLeft: 4,
  },
  expGain: {
    fontWeight: '900',
    fontSize: 14,
    color: '#fde68a',
  },
  expProgress: {
    fontWeight: '800',
    fontSize: 11,
    color: '#bfdbfe',
    marginTop: 4,
    marginBottom: 6,
    lineHeight: 14,
  },
  barOuter: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    backgroundColor: '#34d399',
  },
  tip: {
    flexShrink: 0,
    fontWeight: '800',
    fontSize: 10,
    color: '#dbeafe',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    flexShrink: 0,
    marginTop: 8,
    gap: 5,
  },
  primary: {
    width: '100%',
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efd17a',
    borderBottomWidth: 3,
    borderBottomColor: '#31551f',
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryTxt: {
    fontSize: 14,
    fontWeight: '900',
    color: '#fff8dd',
    textTransform: 'uppercase',
  },
  shopRow: {
    flexDirection: 'row',
    gap: 6,
  },
  shopBtn: {
    flex: 1,
    backgroundColor: 'rgba(237, 210, 155, 0.94)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#b9843b',
    borderBottomWidth: 3,
    borderBottomColor: '#68401f',
    paddingVertical: 8,
    alignItems: 'center',
  },
  shopBtnTxt: {
    fontSize: 12,
    fontWeight: '900',
    color: '#5c3618',
    textTransform: 'uppercase',
  },
  ghost: {
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ghostTxt: {
    fontWeight: '900',
    fontSize: 11,
    color: '#ffe08a',
    textTransform: 'uppercase',
  },
});
