import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';

function ExpRow({ label, pack }) {
  if (!pack || pack.level == null) return null;
  const pct = Math.min(100, Math.round(((pack.exp ?? 0) / Math.max(1, pack.expToNext ?? 1)) * 100));
  const evolved = pack.evolved
    ? ` · EVOLVED → ${pack.evolutionFormName || pack.nextStage}`
    : '';
  return (
    <View style={styles.expBlock}>
      <Text style={styles.expLbl}>
        {label}: Lv {pack.level}
        {pack.levelsGained ? ` (+${pack.levelsGained})` : ''}
        {evolved}
      </Text>
      <View style={styles.barOuter}>
        <View style={[styles.barInner, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.expTiny}>
        EXP {pack.exp ?? 0}/{pack.expToNext ?? '—'} toward next level
      </Text>
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
  chestBlocked = false,
  ladderGoldTotal,
  ladderShardsTotal,
}) {
  const line =
    monsterLadder
      ? winner === 1
        ? 'The Ladder shifts upward.'
        : winner === 'draw'
          ? 'The Noise holds its breath.'
          : 'Same stage. Adjust and retry.'
      : winner === 'draw'
      ? 'Nobody wins but everybody snacks.'
      : winner === 1
        ? 'Player 1 steals the spotlight!'
        : 'Player 2 rules the living room!';

  const evolveFlash =
    expP1?.evolved || expP2?.evolved ? (
      <Text style={styles.evolve}>EVOLUTION!</Text>
    ) : null;

  return (
    <View style={styles.wrap}>
      {evolveFlash}
      <Text style={styles.boom}>Match Over!</Text>
      <Text style={styles.title}>{funnyTitle}</Text>
      <Text style={styles.sub}>{line}</Text>

      {bonusUnderdog ? <Text style={styles.underdog}>UNDERDOG BONUS! +10 coins · +10 EXP</Text> : null}

      {ladderFloor ? (
        <Text style={styles.ladderMeta}>
          {monsterLadder ? `Level ${ladderFloor}` : `Floor ${ladderFloor}`}
          {ladderRegionName ? ` · ${ladderRegionName}` : ''}
        </Text>
      ) : null}
      {ladderFirstClear && ladderBonusCoins > 0 ? (
        <Text style={styles.ladderBonus}>
          {monsterLadder ? `Ladder gold: +${ladderBonusCoins}` : `First clear bonus: +${ladderBonusCoins} coins`}
        </Text>
      ) : null}
      {monsterLadder && chestDrop ? (
        <Text style={styles.ladderBonus}>
          Chest reward: {chestDrop.duplicate ? 'duplicate converted to shards' : 'new reward found'}
        </Text>
      ) : null}
      {monsterLadder && chestBlocked ? (
        <Text style={styles.ladderMeta}>Daily chest already claimed. Reset is 6PM Singapore.</Text>
      ) : null}

      <Text style={styles.coins}>
        {monsterLadder ? 'Ladder gold earned' : 'Coins banked this match'}:{' '}
        <Text style={styles.coinsStrong}>+{coinsAwarded}</Text>
      </Text>
      <Text style={styles.bank}>
        {monsterLadder
          ? `Ladder bank: ${ladderGoldTotal ?? totalCoins ?? 0} · Shards: ${ladderShardsTotal ?? 0}`
          : `Piggy bank: ${totalCoins ?? 0}`}
      </Text>

      <ExpRow label={monsterLadder ? 'Ladder monster progress' : 'Player 1 progress'} pack={expP1} />
      <ExpRow label="Player 2 progress" pack={expP2} />

      <View style={styles.row}>
        {winner === 'draw' ? (
          <>
            <MonsterPreview parts={player1?.monsterParts} size={120} mood="dizzy" />
            <MonsterPreview parts={player2?.monsterParts} size={120} mood="dizzy" />
          </>
        ) : (
          <MonsterPreview parts={winner === 1 ? player1?.monsterParts : player2?.monsterParts} size={200} mood="happy" />
        )}
      </View>

      {encourageLines.map((ln, i) => (
        <Text key={`enc-${i}`} style={styles.encourage}>
          {ln}
        </Text>
      ))}

      <TouchableOpacity style={styles.primary} onPress={onPlayAgain}>
        <Text style={styles.primaryTxt}>{playAgainLabel}</Text>
      </TouchableOpacity>

      {!hideShopButtons && onOpenMonsterMart ? (
        <TouchableOpacity style={styles.secondary} onPress={onOpenMonsterMart}>
          <Text style={styles.secondaryTxt}>Go to Monster Mart 🛒</Text>
        </TouchableOpacity>
      ) : null}

      {!hideShopButtons && onOpenMonsterGear ? (
        <TouchableOpacity style={styles.tertiary} onPress={onOpenMonsterGear}>
          <Text style={styles.tertiaryTxt}>Monster Gear — look & power</Text>
        </TouchableOpacity>
      ) : null}

      {onBackToHome ? (
        <TouchableOpacity style={styles.ghost} onPress={onBackToHome}>
          <Text style={styles.ghostTxt}>{backToHomeLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  evolve: {
    fontSize: 26,
    fontWeight: '900',
    color: '#e056fd',
    marginBottom: 6,
    textAlign: 'center',
  },
  underdog: {
    fontWeight: '900',
    fontSize: 15,
    color: '#2980b9',
    marginBottom: 10,
    textAlign: 'center',
  },
  ladderMeta: {
    fontWeight: '800',
    fontSize: 14,
    color: '#6c5ce7',
    marginBottom: 6,
    textAlign: 'center',
  },
  ladderBonus: {
    fontWeight: '900',
    fontSize: 15,
    color: '#d35400',
    marginBottom: 8,
    textAlign: 'center',
  },
  boom: {
    fontSize: 16,
    fontWeight: '900',
    color: '#e67e22',
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#8e44ad',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 30,
    paddingHorizontal: 4,
  },
  sub: {
    fontSize: 15,
    fontWeight: '800',
    color: '#566573',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  coins: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2d3436',
    marginBottom: 4,
  },
  coinsStrong: {
    color: '#f39c12',
    fontWeight: '900',
    fontSize: 22,
  },
  bank: {
    fontSize: 14,
    fontWeight: '800',
    color: '#636e72',
    marginBottom: 12,
  },
  expBlock: { width: '100%', marginBottom: 10 },
  expLbl: { fontWeight: '900', fontSize: 17, color: '#1a1a2e', marginBottom: 6, lineHeight: 24 },
  barOuter: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#dfe6e9',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#b2bec3',
  },
  barInner: { height: '100%', backgroundColor: '#8ac926' },
  expTiny: { fontWeight: '800', fontSize: 15, color: '#4a5568', marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  encourage: {
    fontWeight: '800',
    fontSize: 14,
    color: '#273043',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  primary: {
    width: '100%',
    backgroundColor: '#8ac926',
    borderRadius: 16,
    borderWidth: 4,
    borderColor: '#2d2d44',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryTxt: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1b1b2f',
  },
  secondary: {
    width: '100%',
    backgroundColor: '#ffd166',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#2d2d44',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryTxt: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1b1b2f',
  },
  tertiary: {
    width: '100%',
    backgroundColor: '#ffeaa7',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#2d2d44',
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 8,
  },
  tertiaryTxt: { fontWeight: '900', fontSize: 16, color: '#1b1b2f' },
  ghost: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: 4,
  },
  ghostTxt: { fontWeight: '900', fontSize: 15, color: '#576574', textDecorationLine: 'underline' },
});
