import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { chestDropTitle } from '../utils/mainBattleChest';
import { applyGearBonuses } from '../utils/gearStats';
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
  const gearIds = player?.equippedGear ?? [];
  return applyGearBonuses(merged, gearIds).stats;
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

function StatLine({ label, value, bonus, compact }) {
  return (
    <View style={[styles.statLine, compact && styles.statLineCompact]}>
      <Text style={[styles.statKey, compact && styles.statKeyCompact]}>{label}</Text>
      <Text style={[styles.statVal, compact && styles.statValCompact]} numberOfLines={1}>
        {value}
        {bonus ? <Text style={styles.statBonus}>{bonus}</Text> : null}
      </Text>
    </View>
  );
}

function MonsterBattleSummary({ player, expPack, compact }) {
  const level = expPack?.level ?? player?.level ?? 1;
  const prevLevel = expPack?.prevLevel ?? Math.max(1, level - (expPack?.levelsGained ?? 0));
  const levelsGained = expPack?.levelsGained ?? 0;
  const leveledUp = levelsGained > 0;
  const expDelta = expPack?.expDelta ?? 0;
  const exp = expPack?.exp ?? player?.battleExp ?? 0;
  const expToNext = expPack?.expToNext ?? player?.battleExpToNext ?? 1;
  const expPct = Math.min(100, Math.round((exp / Math.max(1, expToNext)) * 100));
  const expRemaining = Math.max(0, expToNext - exp);

  const { currentStats, prevStats } = useMemo(() => {
    const cur = resolveStatsAtLevel(player, level) ?? player?.stats ?? null;
    const prev = leveledUp ? resolveStatsAtLevel(player, prevLevel) : null;
    return { currentStats: cur, prevStats: prev };
  }, [player, level, prevLevel, leveledUp]);

  if (!currentStats && !expPack) return null;

  const showBonus = leveledUp && !!prevStats;

  const lines = currentStats
    ? [
        {
          key: 'HP',
          value: String(currentStats.hp),
          bonus: formatBonus(currentStats.hp - (prevStats?.hp ?? currentStats.hp), showBonus),
        },
        {
          key: 'MP',
          value: String(currentStats.mp),
          bonus: formatBonus(currentStats.mp - (prevStats?.mp ?? currentStats.mp), showBonus),
        },
        {
          key: 'ATK',
          value: rangeLabel(currentStats.attack),
          bonus: formatBonus(rangeDelta(prevStats?.attack, currentStats.attack), showBonus),
        },
        {
          key: 'MAG',
          value: rangeLabel(currentStats.magic),
          bonus: formatBonus(rangeDelta(prevStats?.magic, currentStats.magic), showBonus),
        },
        {
          key: 'DEF',
          value: rangeLabel(currentStats.def),
          bonus: formatBonus(rangeDelta(prevStats?.def, currentStats.def), showBonus),
        },
        {
          key: 'HIT',
          value: `${currentStats.hitRate ?? 90}%`,
          bonus: formatBonus(
            (currentStats.hitRate ?? 90) - (prevStats?.hitRate ?? currentStats.hitRate ?? 90),
            showBonus,
          ),
        },
        {
          key: 'AGI',
          value: String(currentStats.agility ?? currentStats.speed ?? 10),
          bonus: formatBonus(
            (currentStats.agility ?? currentStats.speed ?? 10)
              - (prevStats?.agility ?? prevStats?.speed ?? currentStats.agility ?? 10),
            showBonus,
          ),
        },
      ]
    : [];

  return (
    <View style={[styles.monsterPanel, compact && styles.monsterPanelCompact]}>
      <View style={styles.monsterPanelHeader}>
        <Text style={[styles.monsterName, compact && styles.monsterNameCompact]} numberOfLines={1}>
          {player?.displayName || 'Monster'}
        </Text>
        <Text style={[styles.monsterLevel, compact && styles.monsterLevelCompact]}>
          Lv {level}
          {leveledUp ? (
            <Text style={styles.levelUpTag}> · LEVEL UP!</Text>
          ) : null}
        </Text>
      </View>

      {lines.length > 0 ? (
        <View style={styles.statGrid}>
          {lines.map((row) => (
            <StatLine
              key={row.key}
              label={row.key}
              value={row.value}
              bonus={row.bonus}
              compact={compact}
            />
          ))}
        </View>
      ) : null}

      {expPack ? (
        <View style={styles.expSection}>
          <Text style={[styles.expGain, compact && styles.expGainCompact]}>
            EXP {expDelta >= 0 ? '+' : ''}
            {expDelta}
          </Text>
          <Text style={[styles.expProgress, compact && styles.expProgressCompact]} numberOfLines={1}>
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
  const { height } = useWindowDimensions();
  const compact = height < 720;
  const portraitSize = compact ? 80 : 96;
  const dualPortraitSize = compact ? 58 : 66;

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
    extras.push(
      `${chestDrop.kind === 'gear' ? 'Gear' : 'Monster'} chest${chestDrop.duplicate ? ' (shards)' : ''}`,
    );
  }
  if (monsterLadder && chestBlocked) extras.push('Daily chest claimed');
  if (!monsterLadder && mainChestDrop) {
    extras.push(`Chest: ${chestDropTitle(mainChestDrop)}`);
  }
  const extraLine = extras.join(' · ');
  const tipLine = encourageLines?.[0] ?? '';

  const displayPlayer = player1;

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={styles.header}>
        {expP1?.evolved ? (
          <Text style={styles.evolve}>EVOLUTION!</Text>
        ) : null}
        <Text style={styles.boom}>{monsterLadder ? 'Ladder' : 'Battle'} Result</Text>
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72}>
          {funnyTitle}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {line}
        </Text>
        {extraLine ? (
          <Text style={styles.extra} numberOfLines={2}>
            {extraLine}
          </Text>
        ) : null}
      </View>

      <View style={styles.mainRow}>
        <View style={styles.portraitCol}>
          {onlineResult ? (
            <MonsterPreview
              parts={player1?.monsterParts}
              size={portraitSize}
              mood={onlineWon ? 'happy' : 'dizzy'}
            />
          ) : winner === 'draw' ? (
            <View style={styles.dualPortrait}>
              <MonsterPreview parts={player1?.monsterParts} size={dualPortraitSize} mood="dizzy" />
              <MonsterPreview parts={player2?.monsterParts} size={dualPortraitSize} mood="dizzy" />
            </View>
          ) : (
            <MonsterPreview
              parts={(winner === 1 ? player1 : player2)?.monsterParts}
              size={portraitSize}
              mood="happy"
            />
          )}
        </View>

        <View style={styles.detailsCol}>
          <View style={styles.rewardPanel}>
            <Text style={styles.coinsLbl}>
              {monsterLadder ? 'Ladder gold' : 'Coins'}
            </Text>
            <Text style={styles.coinsStrong}>+{coinsAwarded}</Text>
            <Text style={styles.bank} numberOfLines={1}>
              {monsterLadder
                ? `Bank ${ladderGoldTotal ?? totalCoins ?? 0} · Shards ${ladderShardsTotal ?? 0}`
                : `Total ${totalCoins ?? 0}🪙`}
            </Text>
          </View>
          <MonsterBattleSummary player={displayPlayer} expPack={expP1} compact={compact} />
          {tipLine ? (
            <Text style={styles.tip} numberOfLines={1}>
              {tipLine}
            </Text>
          ) : null}
        </View>
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
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rootCompact: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 4,
  },
  evolve: {
    fontSize: 13,
    fontWeight: '900',
    color: '#f0abfc',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  boom: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fcd34d',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff4cf',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 20,
    paddingHorizontal: 4,
  },
  sub: {
    fontSize: 11,
    fontWeight: '800',
    color: '#bfdbfe',
    textAlign: 'center',
    marginTop: 2,
  },
  extra: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fde68a',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 12,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    minHeight: 0,
    marginBottom: 4,
  },
  portraitCol: {
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualPortrait: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  detailsCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-start',
    gap: 4,
  },
  rewardPanel: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.45)',
    backgroundColor: 'rgba(7, 17, 32, 0.75)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  coinsLbl: {
    fontSize: 8,
    fontWeight: '900',
    color: '#d9f7ff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coinsStrong: {
    color: '#fcd34d',
    fontWeight: '900',
    fontSize: 20,
    lineHeight: 22,
  },
  bank: {
    fontSize: 9,
    fontWeight: '800',
    color: '#86efac',
    marginTop: 1,
  },
  monsterPanel: {
    flex: 1,
    minHeight: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  monsterPanelCompact: {
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  monsterPanelHeader: {
    marginBottom: 4,
  },
  monsterName: {
    fontWeight: '900',
    fontSize: 11,
    color: '#fff4cf',
  },
  monsterNameCompact: {
    fontSize: 10,
  },
  monsterLevel: {
    fontWeight: '800',
    fontSize: 10,
    color: '#bfdbfe',
    marginTop: 1,
  },
  monsterLevelCompact: {
    fontSize: 9,
  },
  levelUpTag: {
    color: '#86efac',
    fontWeight: '900',
  },
  statGrid: {
    gap: 2,
    marginBottom: 4,
  },
  statLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  statLineCompact: {
    gap: 2,
  },
  statKey: {
    width: 32,
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  statKeyCompact: {
    width: 28,
    fontSize: 8,
  },
  statVal: {
    flex: 1,
    textAlign: 'right',
    fontSize: 9,
    fontWeight: '800',
    color: '#fff8e5',
  },
  statValCompact: {
    fontSize: 8,
  },
  statBonus: {
    color: '#86efac',
    fontWeight: '900',
  },
  expSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 4,
    marginTop: 2,
  },
  expGain: {
    fontWeight: '900',
    fontSize: 10,
    color: '#fde68a',
  },
  expGainCompact: {
    fontSize: 9,
  },
  expProgress: {
    fontWeight: '800',
    fontSize: 9,
    color: '#bfdbfe',
    marginTop: 2,
    marginBottom: 3,
  },
  expProgressCompact: {
    fontSize: 8,
  },
  barOuter: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    backgroundColor: '#34d399',
  },
  tip: {
    fontWeight: '800',
    fontSize: 8,
    color: '#dbeafe',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
    gap: 4,
  },
  primary: {
    width: '100%',
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#efd17a',
    borderBottomWidth: 3,
    borderBottomColor: '#31551f',
    paddingVertical: 9,
    alignItems: 'center',
  },
  primaryTxt: {
    fontSize: 13,
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
    paddingVertical: 7,
    alignItems: 'center',
  },
  shopBtnTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#5c3618',
    textTransform: 'uppercase',
  },
  ghost: {
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.3)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  ghostTxt: {
    fontWeight: '900',
    fontSize: 10,
    color: '#ffe08a',
    textTransform: 'uppercase',
  },
});
