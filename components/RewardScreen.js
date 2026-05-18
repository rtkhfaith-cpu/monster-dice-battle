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
  onlineResult = false,
  onlineWon = false,
}) {
  const line =
    onlineResult
      ? winner === 'draw'
        ? 'Both monsters are still standing.'
        : onlineWon
          ? 'Your monster ruled the arena!'
          : 'Your monster fought hard. Train up and try again.'
    : monsterLadder
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
      <View style={styles.glowOrb} pointerEvents="none" />
      {evolveFlash}
      <Text style={styles.boom}>{monsterLadder ? 'Ladder Result' : 'Battle Result'}</Text>
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
          {chestDrop.kind === 'gear' ? 'Gear Chest' : 'Monster Chest'} reward:{' '}
          {chestDrop.duplicate ? 'duplicate converted to shards' : 'new reward found'}
        </Text>
      ) : null}
      {monsterLadder && chestBlocked ? (
        <Text style={styles.ladderMeta}>Daily chest already claimed. Reset is 6PM Singapore.</Text>
      ) : null}

      <View style={styles.rewardPanel}>
        <Text style={styles.coins}>
          {monsterLadder ? 'Ladder gold earned' : 'Coins banked this match'}
        </Text>
        <Text style={styles.coinsStrong}>+{coinsAwarded}</Text>
        <Text style={styles.bank}>
          {monsterLadder
            ? `Ladder bank: ${ladderGoldTotal ?? totalCoins ?? 0} · Shards: ${ladderShardsTotal ?? 0}`
            : `Piggy bank: ${totalCoins ?? 0}`}
        </Text>
      </View>

      <ExpRow label={monsterLadder ? 'Ladder monster progress' : 'Player 1 progress'} pack={expP1} />
      <ExpRow label="Player 2 progress" pack={expP2} />

      <View style={styles.row}>
        {onlineResult ? (
          <MonsterPreview parts={player1?.monsterParts} size={200} mood={onlineWon ? 'happy' : 'dizzy'} />
        ) : winner === 'draw' ? (
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
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.42)',
    borderBottomWidth: 5,
    borderBottomColor: '#5f3a1b',
    backgroundColor: 'rgba(12, 24, 45, 0.92)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  glowOrb: {
    position: 'absolute',
    top: -80,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(96, 165, 250, 0.16)',
  },
  evolve: {
    fontSize: 24,
    fontWeight: '900',
    color: '#f0abfc',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  underdog: {
    fontWeight: '900',
    fontSize: 13,
    color: '#93c5fd',
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  ladderMeta: {
    fontWeight: '900',
    fontSize: 12,
    color: '#c4b5fd',
    marginBottom: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  ladderBonus: {
    fontWeight: '900',
    fontSize: 13,
    color: '#fbbf24',
    marginBottom: 8,
    textAlign: 'center',
  },
  boom: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fcd34d',
    marginBottom: 4,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 25,
    fontWeight: '900',
    color: '#fff4cf',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 30,
    paddingHorizontal: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 5,
  },
  sub: {
    fontSize: 13,
    fontWeight: '900',
    color: '#bfdbfe',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 19,
  },
  rewardPanel: {
    width: '100%',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,224,138,0.5)',
    backgroundColor: 'rgba(7, 17, 32, 0.7)',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  coins: {
    fontSize: 12,
    fontWeight: '900',
    color: '#d9f7ff',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  coinsStrong: {
    color: '#fcd34d',
    fontWeight: '900',
    fontSize: 28,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  bank: {
    fontSize: 12,
    fontWeight: '900',
    color: '#86efac',
    marginTop: 2,
  },
  expBlock: {
    width: '100%',
    marginBottom: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 9,
  },
  expLbl: { fontWeight: '900', fontSize: 13, color: '#fff4cf', marginBottom: 6, lineHeight: 18 },
  barOuter: {
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.3)',
  },
  barInner: { height: '100%', backgroundColor: '#34d399' },
  expTiny: { fontWeight: '800', fontSize: 11, color: '#bfdbfe', marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  encourage: {
    fontWeight: '900',
    fontSize: 12,
    color: '#dbeafe',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  primary: {
    width: '100%',
    backgroundColor: 'rgba(48, 129, 66, 0.96)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#efd17a',
    borderBottomWidth: 5,
    borderBottomColor: '#31551f',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryTxt: {
    fontSize: 17,
    fontWeight: '900',
    color: '#fff8dd',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  secondary: {
    width: '100%',
    backgroundColor: 'rgba(237, 210, 155, 0.94)',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#b9843b',
    borderBottomWidth: 4,
    borderBottomColor: '#68401f',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryTxt: {
    fontSize: 18,
    fontWeight: '900',
    color: '#5c3618',
    textTransform: 'uppercase',
  },
  tertiary: {
    width: '100%',
    backgroundColor: 'rgba(42, 58, 86, 0.9)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8b6b3f',
    borderBottomWidth: 4,
    borderBottomColor: '#49311c',
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 8,
  },
  tertiaryTxt: { fontWeight: '900', fontSize: 15, color: '#f4e3bd', textTransform: 'uppercase' },
  ghost: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    marginTop: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.35)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  ghostTxt: { fontWeight: '900', fontSize: 13, color: '#ffe08a', textTransform: 'uppercase' },
});
