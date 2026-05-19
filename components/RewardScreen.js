import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { chestDropSubtitle, chestDropTitle } from '../utils/mainBattleChest';

function ExpRowCompact({ label, pack }) {
  if (!pack || pack.level == null) return null;
  const pct = Math.min(100, Math.round(((pack.exp ?? 0) / Math.max(1, pack.expToNext ?? 1)) * 100));
  const evolved = pack.evolved
    ? ` · EVOLVED ${pack.evolutionFormName || pack.nextStage || ''}`
    : '';
  return (
    <View style={styles.expBlock}>
      <Text style={styles.expLbl} numberOfLines={1}>
        {label} Lv{pack.level}
        {pack.levelsGained ? ` (+${pack.levelsGained})` : ''}
        {evolved}
      </Text>
      <View style={styles.barOuter}>
        <View style={[styles.barInner, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

export default function RewardScreen({
  winner,
  coinsAwarded = 0,
  bonusUnderdog = false,
  expP1,
  expP2,
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
  const portraitSize = compact ? 88 : 104;
  const dualPortraitSize = compact ? 64 : 72;

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

  const showP2Exp = !!expP2?.level && !monsterLadder && !onlineResult;

  return (
    <View style={[styles.root, compact && styles.rootCompact]}>
      <View style={styles.header}>
        {expP1?.evolved || expP2?.evolved ? (
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
          <ExpRowCompact
            label={monsterLadder ? 'Climber' : 'You'}
            pack={expP1}
          />
          {showP2Exp ? <ExpRowCompact label="Rival" pack={expP2} /> : null}
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
    marginBottom: 6,
  },
  evolve: {
    fontSize: 14,
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
    fontSize: 18,
    fontWeight: '900',
    color: '#fff4cf',
    textAlign: 'center',
    marginTop: 2,
    lineHeight: 22,
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
    marginTop: 3,
    lineHeight: 12,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 0,
    marginBottom: 6,
  },
  portraitCol: {
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dualPortrait: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
  },
  detailsCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 5,
  },
  rewardPanel: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.45)',
    backgroundColor: 'rgba(7, 17, 32, 0.75)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  coinsLbl: {
    fontSize: 9,
    fontWeight: '900',
    color: '#d9f7ff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coinsStrong: {
    color: '#fcd34d',
    fontWeight: '900',
    fontSize: 22,
    lineHeight: 24,
  },
  bank: {
    fontSize: 10,
    fontWeight: '800',
    color: '#86efac',
    marginTop: 1,
  },
  expBlock: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 7,
    paddingVertical: 5,
  },
  expLbl: {
    fontWeight: '800',
    fontSize: 10,
    color: '#fff4cf',
    marginBottom: 4,
  },
  barOuter: {
    height: 7,
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
    fontSize: 9,
    color: '#dbeafe',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  actions: {
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
