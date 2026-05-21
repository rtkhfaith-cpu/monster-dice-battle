import React, { useMemo, useState } from 'react';
import { Image, ImageBackground, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MonsterPreview from './MonsterPreview';
import { RARITY_UI, ROLE_LABELS } from '../utils/monsterTemplates';
import { getLadderMonsterTemplate, LADDER_MONSTER_CATALOG } from '../utils/monsterLadder/ladderMonsterCatalog';
import { LADDER_GEAR_CATALOG } from '../utils/monsterLadder/ladderGearCatalog';
import { getLadderTheme } from '../utils/monsterLadder/ladderLevelThemes';
import { mergeLadderMonsterParts } from '../utils/monsterLadder/ladderProfile';
import { computeLadderBattleStats } from '../utils/monsterLadder/ladderStatsCalc';
import {
  formatStageLabel,
  getCurrentStage,
  getStageKind,
  nextRewardHints,
  stageTypeBanner,
  stageTypeLabel,
} from '../utils/monsterLadder';
import {
  LADDER_CHEST_GOLD_COST,
  LADDER_CHEST_SHARD_COST,
  LADDER_PITY,
  LADDER_RARITY_ORDER,
  LADDER_RARITY_WEIGHTS,
  LADDER_SHARDS_BY_RARITY,
} from '../utils/monsterLadder/ladderConstants';
import { isLadderLevelLockedUntilReset } from '../utils/monsterLadder/ladderDailyReset';
import {
  formatLadderBiweeklyResetHint,
  getNextLadderBiweeklyResetDate,
  LADDER_BIWEEKLY_EPOCH,
} from '../utils/monsterLadder/ladderBiweeklyReset';
import { GAME_ASSETS } from '../utils/gameAssetPaths';
import {
  gameSurfaceDataProps,
  WEB_DECORATIVE_IMAGE_PROPS,
  WEB_GAME_TOUCH_STYLE,
} from '../utils/webGameTouch';
import { formatGearBonusLines } from '../utils/cosmetics';

function opensUntilPityGate(opens, every) {
  const n = Math.max(0, Number(opens) || 0);
  if (!n) return every;
  const mod = n % every;
  return mod === 0 ? every : every - mod;
}

function formatPityLine(label, opens) {
  const epicIn = opensUntilPityGate(opens, LADDER_PITY.epicPlusEvery);
  const legIn = opensUntilPityGate(opens, LADDER_PITY.legendaryPlusEvery);
  const mythIn = opensUntilPityGate(opens, LADDER_PITY.mythicEvery);
  return `${label}: ${opens} opens — Epic+ in ${epicIn}, Legendary+ in ${legIn}, Mythic in ${mythIn}`;
}

/** @param {import('../utils/monsterLadder/ladderProgress').MonsterLadderState} ml */
function formatPitySummary(ml) {
  const gear = ml?.pity?.gearChestsOpened ?? 0;
  const mon = ml?.pity?.monsterChestsOpened ?? 0;
  return `G${gear} E+${opensUntilPityGate(gear, LADDER_PITY.epicPlusEvery)} · M${mon} E+${opensUntilPityGate(mon, LADDER_PITY.epicPlusEvery)}`;
}

const RULE_SECTION = (title) => `—— ${title} ——`;

/** @param {import('../utils/monsterLadder/ladderProgress').MonsterLadderState} ml */
function buildLadderRulesLines(ml) {
  const gearOpens = ml?.pity?.gearChestsOpened ?? 0;
  const monsterOpens = ml?.pity?.monsterChestsOpened ?? 0;
  const gold = ml?.ladderGold ?? 0;
  const shards = ml?.ladderShards ?? 0;
  const gearGoldCost = LADDER_CHEST_GOLD_COST.gear;
  const monShardCost = LADDER_CHEST_SHARD_COST.monster;
  const nextBiweekly = getNextLadderBiweeklyResetDate();
  const rates = LADDER_RARITY_ORDER.map((r) => `${rarityLabel(r)} ${LADDER_RARITY_WEIGHTS[r]}%`).join(', ');
  const dupeShards = LADDER_RARITY_ORDER.map(
    (r) => `${rarityLabel(r)} ${LADDER_SHARDS_BY_RARITY[r]}`,
  ).join(' · ');

  return [
    RULE_SECTION('Daily progress'),
    'Each main level has 10 sub-stages. Win fights to advance. After you clear all 10, that main level locks until 6:00 PM Singapore time — then the next main level unlocks. You can still open stored chests and use Chest Exchange while locked.',

    RULE_SECTION('Boss chests (free)'),
    'Sub 5 Mini Boss: win once per day to earn a Gear Chest (opens immediately). Sub 10 Boss: win once per day to earn a Monster Chest. If you already claimed today, the chest is stored in Chest Exchange until you open it.',

    RULE_SECTION('Biweekly reset (every 2 Sundays)'),
    `Every 2 weeks at Sunday 6:00 PM Singapore, your ladder stage progress resets so you can climb again and earn fresh daily boss chests. First reset: ${LADDER_BIWEEKLY_EPOCH} 6:00 PM. Next reset: ${nextBiweekly} 6:00 PM.`,
    'What resets: main level → 1, sub-level → 1, daily boss chest claims, and “level cleared today” lock.',
    'What you keep: ladder gold, shards, owned ladder monsters & gear, chests in inventory, pity counters, and Chest Collection.',

    RULE_SECTION('Ladder gold'),
    `You earn gold only by winning ladder battles (not from chests). Amount scales with enemy level and boss type; early fights often give 1–3 gold. Your balance: ${gold}.`,
    `Spend gold in Chest Exchange to buy a Gear Chest for ${gearGoldCost} gold. Gear chests drop ladder-exclusive items. Gold is separate from main-game coins.`,

    RULE_SECTION('Ladder shards'),
    `Shards are the currency for Monster Chests. Your balance: ${shards}. Buy a Monster Chest in Chest Exchange for ${monShardCost} shards.`,
    'How to earn shards: opening Gear or Monster chests and getting duplicate ladder gear converts to shards (new gear is kept). Monster duplicates do not give shards yet.',
    `Duplicate gear shards by rarity: ${dupeShards}.`,

    RULE_SECTION('Pity system (bad-luck protection)'),
    'Each chest type has its own pity counter (total chests opened of that type, including free boss chests and bought chests). Pity never resets on the biweekly stage reset.',
    `Normal drop rates per open: ${rates}.`,
    `Guaranteed minimum rarity gates: Epic+ every ${LADDER_PITY.epicPlusEvery} opens, Legendary+ every ${LADDER_PITY.legendaryPlusEvery}, Mythic every ${LADDER_PITY.mythicEvery}. If multiple gates match, the best rarity wins.`,
    formatPityLine('Your gear chest pity', gearOpens),
    formatPityLine('Your monster chest pity', monsterOpens),
    'E+ = opens until next Epic+ guarantee. L+ = Legendary+. M+ = Mythic. Hub bar “Pity” shows gear (G) and monster (M) opens with next Epic+ countdown.',

    RULE_SECTION('Chest Exchange summary'),
    `Gear Chest: ${gearGoldCost} gold · Monster Chest: ${monShardCost} shards. Tap the Shards chest card on the hub to open exchange.`,
  ];
}

function isRuleSectionLine(line) {
  return line.startsWith('——') && line.endsWith('——');
}

function LadderRulesNotice({ mapHint, levelLocked, ml }) {
  const [expanded, setExpanded] = useState(false);
  const rules = useMemo(() => buildLadderRulesLines(ml), [ml]);
  const showMapHint = !levelLocked && !!mapHint;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setExpanded((v) => !v)}
      style={[styles.noticeBar, expanded && styles.noticeBarExpanded, !showMapHint && !expanded && styles.noticeBarCompact]}
    >
      <Text style={styles.noticeRulesLabel}>
        {expanded ? 'Monster Ladder rules ▴' : 'Monster Ladder rules ▾'}
      </Text>
      {!expanded ? (
        showMapHint ? (
          <Text style={styles.noticeText} numberOfLines={2}>
            {mapHint}
          </Text>
        ) : null
      ) : (
        <ScrollView style={styles.noticeRulesScroll} showsVerticalScrollIndicator={false}>
          {showMapHint ? <Text style={styles.noticeHintLine}>{mapHint}</Text> : null}
          {rules.map((line, idx) => (
            <Text
              key={`${idx}-${line.slice(0, 24)}`}
              style={isRuleSectionLine(line) ? styles.noticeRuleTitle : styles.noticeRuleLine}
            >
              {line}
            </Text>
          ))}
        </ScrollView>
      )}
    </TouchableOpacity>
  );
}

const RARITY_TONE = {
  common: '#cbd5e1',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#f59e0b',
  mythic: '#f472b6',
};

function rarityLabel(rarity) {
  return RARITY_UI[rarity]?.label ?? rarity;
}

function rarityPercent(rarity) {
  const total = LADDER_RARITY_ORDER.reduce((sum, r) => sum + (LADDER_RARITY_WEIGHTS[r] ?? 0), 0);
  if (!total) return '0%';
  const pct = ((LADDER_RARITY_WEIGHTS[rarity] ?? 0) / total) * 100;
  return `${Number.isInteger(pct) ? pct : pct.toFixed(1)}%`;
}

function formatStats(stats) {
  if (!stats) return '';
  return `HP ${stats.hp} · MP ${stats.mp} · ATK ${stats.attack.min}-${stats.attack.max} · MAG ${stats.magic.min}-${stats.magic.max} · HIT ${stats.hitRate ?? 92}% · AGI ${stats.agility ?? stats.speed ?? 10}`;
}

function statGrid(stats) {
  if (!stats) return [[], []];
  const range = (r) => `${r?.min ?? 0}-${r?.max ?? 0}`;
  return [
    [
      ['HP', stats.hp],
      ['MP', stats.mp],
      ['ATK', range(stats.attack)],
      ['MAG', range(stats.magic)],
    ],
    [
      ['DEF', range(stats.def)],
      ['HIT', `${stats.hitRate ?? 92}%`],
      ['AGI', stats.agility ?? stats.speed ?? 10],
    ],
  ];
}

function CatalogChip({ item, type, onPress }) {
  const color = RARITY_TONE[item.rarity] ?? '#fff';
  const sub = type === 'gear' ? `${item.slot} gear` : `${item.element} ${item.role}`;
  const monsterParts = type === 'monster' ? mergeLadderMonsterParts(item.id) : null;
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      onPress={() => onPress?.(item, type)}
      style={[styles.catalogChip, type === 'monster' && styles.catalogChipMonster, { borderColor: color }]}
    >
      {type === 'monster' ? (
        <View style={styles.catalogMonsterPortrait}>
          <MonsterPreview parts={monsterParts} size={38} mood="happy" />
          <Text style={styles.catalogTapHint}>Card</Text>
        </View>
      ) : (
        <View style={styles.catalogGearThumb}>
          <Text style={styles.catalogIcon}>{item.emoji}</Text>
          <Text style={styles.catalogTapHint}>Card</Text>
        </View>
      )}
      <View style={styles.catalogCopy}>
        <Text style={styles.catalogName} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.catalogMeta, { color }]} numberOfLines={1}>
          {rarityLabel(item.rarity)} · {sub}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function CatalogByRarity({ items, type, onItemPress }) {
  return LADDER_RARITY_ORDER.map((rarity) => {
    const group = items.filter((item) => item.rarity === rarity);
    if (!group.length) return null;
    return (
      <View key={`${type}-${rarity}`} style={styles.rarityGroup}>
        <View style={styles.rarityGroupHeader}>
          <Text style={[styles.rarityGroupTitle, { color: RARITY_TONE[rarity] ?? '#fff' }]}>
            {rarityLabel(rarity)}
          </Text>
          <Text style={styles.rarityGroupChance}>{rarityPercent(rarity)} drop tier</Text>
        </View>
        <View style={styles.catalogGrid}>
          {group.map((item) => (
            <CatalogChip key={item.id} item={item} type={type} onPress={onItemPress} />
          ))}
        </View>
      </View>
    );
  });
}

function CodexGearCard({ gear, onClose }) {
  if (!gear) return null;
  const ui = RARITY_UI[gear.rarity] ?? RARITY_UI.common;
  const lines = formatGearBonusLines(gear);
  return (
    <View style={styles.codexCardOverlay}>
      <View style={[styles.codexDetailCard, { borderColor: ui.border ?? '#facc15' }]}>
        <TouchableOpacity style={styles.cardClose} onPress={onClose}>
          <Text style={styles.cardCloseTxt}>×</Text>
        </TouchableOpacity>
        <Text style={styles.cardKicker}>Ladder Gear</Text>
        <Text style={styles.codexDetailEmoji}>{gear.emoji}</Text>
        <Text style={styles.cardName}>{gear.name}</Text>
        <View style={styles.cardMetaRow}>
          <Text style={[styles.cardBadge, { backgroundColor: ui.chipBg ?? '#334155', color: ui.chipFg ?? '#fff' }]}>
            {ui.label ?? gear.rarity}
          </Text>
          <Text style={styles.cardRole}>{gear.slot} · Chest drop</Text>
        </View>
        {lines.map((line) => (
          <Text key={line} style={styles.codexDetailLine}>{line}</Text>
        ))}
      </View>
    </View>
  );
}

function CodexMonsterCard({ templateId, onClose }) {
  if (!templateId) return null;
  const t = getLadderMonsterTemplate(templateId);
  if (!t) return null;
  const ui = RARITY_UI[t.rarity] ?? RARITY_UI.common;
  const stats = computeLadderBattleStats(templateId, 1)?.stats;
  return (
    <View style={styles.codexCardOverlay}>
      <View style={[styles.codexDetailCard, { borderColor: ui.border ?? '#facc15' }]}>
        <TouchableOpacity style={styles.cardClose} onPress={onClose}>
          <Text style={styles.cardCloseTxt}>×</Text>
        </TouchableOpacity>
        <Text style={styles.cardKicker}>Ladder Monster</Text>
        <Text style={styles.cardName}>{t.name}</Text>
        <View style={styles.cardArt}>
          <MonsterPreview parts={mergeLadderMonsterParts(templateId)} size={150} mood="happy" />
        </View>
        <View style={styles.cardMetaRow}>
          <Text style={[styles.cardBadge, { backgroundColor: ui.chipBg ?? '#334155', color: ui.chipFg ?? '#fff' }]}>
            {ui.label ?? t.rarity}
          </Text>
          <Text style={styles.cardRole}>{ROLE_LABELS[t.role] ?? t.role}</Text>
          <Text style={styles.cardRole}>{t.element}</Text>
        </View>
        <View style={styles.cardStatsGrid}>
          {statGrid(stats).map((col, colIndex) => (
            <View key={colIndex ? 'right' : 'left'} style={styles.cardStatsCol}>
              {col.map(([label, value]) => (
                <View key={label} style={styles.cardStatRow}>
                  <Text style={styles.cardStatLabel}>{label}</Text>
                  <Text style={styles.cardStatValue}>{value}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function ChestOddsCard({ title, sub, type }) {
  return (
    <View style={[styles.oddsCard, type === 'monster' && styles.oddsCardMonster]}>
      <View style={styles.oddsHeaderRow}>
        <Image
          source={{ uri: GAME_ASSETS.chestClosed }}
          style={styles.oddsChestImg}
          resizeMode="contain"
          {...WEB_DECORATIVE_IMAGE_PROPS}
        />
        <View style={styles.oddsTitleWrap}>
          <Text style={styles.oddsTitle}>{title}</Text>
          <Text style={styles.oddsSub}>{sub}</Text>
        </View>
      </View>
      <View style={styles.oddsRows}>
        {LADDER_RARITY_ORDER.map((rarity) => (
          <View key={rarity} style={styles.oddsRow}>
            <Text style={[styles.oddsRarity, { color: RARITY_TONE[rarity] ?? '#fff' }]}>
              {rarityLabel(rarity)}
            </Text>
            <Text style={styles.oddsPercent}>{rarityPercent(rarity)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.oddsFoot}>
        Pity: Epic+ every {LADDER_PITY.epicPlusEvery}, Legendary+ every {LADDER_PITY.legendaryPlusEvery}, Mythic every {LADDER_PITY.mythicEvery}.
      </Text>
    </View>
  );
}

function RewardsCodexOverlay({ onClose }) {
  const [detailGear, setDetailGear] = useState(null);
  const [detailMonsterId, setDetailMonsterId] = useState(null);

  function handleCatalogPress(item, type) {
    if (type === 'gear') setDetailGear(item);
    else setDetailMonsterId(item.id);
  }

  return (
    <View style={styles.codexBackdrop}>
      <View style={styles.codexPanel}>
        <View style={styles.codexGlow} pointerEvents="none" />
        <View style={styles.codexHeader}>
          <View>
            <Text style={styles.codexKicker}>Monster Ladder</Text>
            <Text style={styles.codexTitle}>Chest Rewards</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.codexClose} activeOpacity={0.86}>
            <Text style={styles.codexCloseTxt}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.codexScroll}>
          <Text style={styles.codexIntro}>
            Beat Sub 5 Mini Bosses for Gear Chests. Beat Sub 10 Bosses for Monster Chests. Duplicates become ladder shards.
          </Text>

          <View style={styles.oddsGrid}>
            <ChestOddsCard title="Gear Chest" sub="Drops ladder-exclusive gear" type="gear" />
            <ChestOddsCard title="Monster Chest" sub="Drops ladder-exclusive monsters" type="monster" />
          </View>

          <View style={styles.shardStrip}>
            {LADDER_RARITY_ORDER.map((rarity) => (
              <View key={rarity} style={styles.shardPill}>
                <Text style={[styles.shardRarity, { color: RARITY_TONE[rarity] ?? '#fff' }]}>{rarityLabel(rarity)}</Text>
                <Text style={styles.shardValue}>{LADDER_SHARDS_BY_RARITY[rarity] ?? 0} shards</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Gear Chest Drops</Text>
          <CatalogByRarity items={LADDER_GEAR_CATALOG} type="gear" onItemPress={handleCatalogPress} />

          <Text style={styles.sectionTitle}>Monster Chest Drops</Text>
          <CatalogByRarity items={LADDER_MONSTER_CATALOG} type="monster" onItemPress={handleCatalogPress} />
        </ScrollView>
        <CodexGearCard gear={detailGear} onClose={() => setDetailGear(null)} />
        <CodexMonsterCard templateId={detailMonsterId} onClose={() => setDetailMonsterId(null)} />
      </View>
    </View>
  );
}

function StageNode({ sub, current, cleared, locked, kind }) {
  const isBoss = kind === 'miniBoss' || kind === 'bigBoss';
  const label = stageTypeLabel(kind);
  return (
    <View
      style={[
        styles.node,
        current && styles.nodeCurrent,
        cleared && styles.nodeCleared,
        locked && styles.nodeLocked,
        isBoss && styles.nodeBoss,
        kind === 'bigBoss' && styles.nodeBigBoss,
      ]}
    >
      <Text style={[styles.nodeTxt, isBoss && styles.nodeTxtBoss]}>{sub}</Text>
      {isBoss ? <Text style={styles.nodeLabel}>{label}</Text> : null}
    </View>
  );
}

function FantasyActionButton({ label, onPress, disabled, variant = 'default' }) {
  return (
    <TouchableOpacity
      activeOpacity={0.86}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        variant === 'primary' && styles.actionButtonPrimary,
        disabled && styles.actionButtonOff,
      ]}
    >
      <Text style={[styles.actionButtonText, variant === 'primary' && styles.actionButtonTextPrimary]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ChestCard({ title, state, type, onPress }) {
  const available = state === 'available';
  const claimed = state === 'claimed';
  const stored = state === 'stored';
  const exchange = state === 'exchange';
  const uri = claimed ? GAME_ASSETS.chestOpen : GAME_ASSETS.chestClosed;
  const body = (
    <>
      <Image source={{ uri }} style={styles.chestImg} resizeMode="contain" {...WEB_DECORATIVE_IMAGE_PROPS} />
      <View style={styles.chestCopy}>
        <Text style={styles.chestTitle}>{title}</Text>
        <Text style={styles.chestState}>{exchange ? 'Open' : state}</Text>
        <Text style={styles.chestSub}>{type}</Text>
      </View>
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={onPress}
        style={[
          styles.chestCard,
          available && styles.chestAvailable,
          claimed && styles.chestClaimed,
          stored && styles.chestExchange,
          exchange && styles.chestExchange,
        ]}
      >
        {body}
      </TouchableOpacity>
    );
  }
  return (
    <View
      style={[
        styles.chestCard,
        available && styles.chestAvailable,
        claimed && styles.chestClaimed,
        stored && styles.chestExchange,
        exchange && styles.chestExchange,
      ]}
    >
      {body}
    </View>
  );
}

function ChestExchangeOverlay({
  visible,
  ladderGold,
  shards,
  chestInventory,
  chestGoldCost,
  chestShardCost,
  onClose,
  onBuyChest,
  onOpenChest,
}) {
  if (!visible) return null;
  const gearGold = chestGoldCost ?? 24;
  const monShards = chestShardCost ?? 72;
  return (
    <View style={styles.exchangeBackdrop}>
      <View style={styles.exchangePanel}>
        <TouchableOpacity style={styles.exchangeClose} onPress={onClose}>
          <Text style={styles.exchangeCloseTxt}>×</Text>
        </TouchableOpacity>
        <Text style={styles.exchangeTitle}>Chest Exchange</Text>
        <Text style={styles.exchangeSub}>Gold {ladderGold ?? 0} · Shards {shards ?? 0}</Text>
        <View style={styles.exchangeRow}>
          <Text style={styles.exchangeRowTitle}>Gear Chest x{chestInventory?.gear ?? 0}</Text>
          <TouchableOpacity
            style={styles.exchangeBtn}
            onPress={() => onOpenChest?.('gear')}
            disabled={(chestInventory?.gear ?? 0) <= 0}
          >
            <Text style={styles.exchangeBtnTxt}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exchangeBtn} onPress={() => onBuyChest?.('gear')}>
            <Text style={styles.exchangeBtnTxt}>Buy {gearGold}g</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.exchangeRow}>
          <Text style={styles.exchangeRowTitle}>Monster Chest x{chestInventory?.monster ?? 0}</Text>
          <TouchableOpacity
            style={styles.exchangeBtn}
            onPress={() => onOpenChest?.('monster')}
            disabled={(chestInventory?.monster ?? 0) <= 0}
          >
            <Text style={styles.exchangeBtnTxt}>Open</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exchangeBtn} onPress={() => onBuyChest?.('monster')}>
            <Text style={styles.exchangeBtnTxt}>Buy {monShards} shards</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.exchangeFoot}>
          Gear chests cost ladder gold from wins. Monster chests cost shards from duplicate gear. Duplicate monsters are kept for future combine.
        </Text>
      </View>
    </View>
  );
}

export default function MonsterLadderHubScreen({
  monsterLadder,
  activeFighter,
  onBack,
  onStartBattle,
  onOpenCollection,
  onOpenGear,
  chestGoldCost,
  chestShardCost,
  onBuyChest,
  onOpenChest,
}) {
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [activeCardOpen, setActiveCardOpen] = useState(false);
  const [chestExchangeOpen, setChestExchangeOpen] = useState(false);
  const ml = monsterLadder;
  const stage = useMemo(() => getCurrentStage(ml), [ml]);
  const theme = useMemo(() => getLadderTheme(stage.mainLevel), [stage.mainLevel]);
  const hints = useMemo(() => nextRewardHints(ml), [ml]);
  const currentKind = getStageKind(stage.subLevel);
  const bossBanner = stageTypeBanner(currentKind);
  const levelLocked = isLadderLevelLockedUntilReset(ml);
  const mapHint =
    levelLocked
      ? 'Level cleared for today. Next level unlocks at 6PM Singapore time.'
      : currentKind === 'miniBoss'
      ? 'Mini Boss now: win for Gear Chest if today is unclaimed'
      : currentKind === 'bigBoss'
        ? 'Boss now: win for Monster Chest if today is unclaimed'
        : hints.subsToMini > 0
          ? `Gear chest in ${hints.subsToMini} fight${hints.subsToMini > 1 ? 's' : ''} (sub 5)`
          : hints.subsToBig > 0
            ? `Monster chest in ${hints.subsToBig} fight${hints.subsToBig > 1 ? 's' : ''} (sub 10)`
            : 'Boss rewards on this row complete';

  const featuredTpl = getLadderMonsterTemplate(theme.featuredMonsterId);

  const canFight = !!activeFighter && !levelLocked;
  const rarity = activeFighter?.rarity ?? 'common';
  const rarityUi = RARITY_UI[rarity] ?? RARITY_UI.common;
  const chestInventory = ml.chestInventory ?? { gear: 0, monster: 0 };
  const gearChestState = ml.gearChestClaimedToday
    ? (chestInventory.gear > 0 ? 'stored' : 'claimed')
    : stage.subLevel >= 5
      ? 'available'
      : 'locked';
  const monsterChestState = ml.monsterChestClaimedToday
    ? (chestInventory.monster > 0 ? 'stored' : 'claimed')
    : stage.subLevel >= 10
      ? 'available'
      : 'locked';
  const bottomStatus = levelLocked
    ? "Today's level complete. Next level unlocks after 6PM Singapore time."
    : canFight
      ? `Ready for Level ${formatStageLabel(stage.mainLevel, stage.subLevel)}`
      : 'Pick a monster on the home screen or in Collection.';

  return (
    <View style={[styles.root, WEB_GAME_TOUCH_STYLE]} {...gameSurfaceDataProps()}>
      <View style={[styles.gameFrame, WEB_GAME_TOUCH_STYLE]} {...gameSurfaceDataProps()}>
        <ImageBackground
          source={{ uri: GAME_ASSETS.monsterLadderBackground }}
          style={styles.backgroundLayer}
          imageStyle={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.uiLayer}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.86}>
              <Text style={styles.backTxt}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRewardsOpen(true)} style={styles.rewardsBtn} activeOpacity={0.86}>
              <Text style={styles.rewardsBtnIcon}>★</Text>
              <Text style={styles.rewardsBtnTxt}>Rewards</Text>
            </TouchableOpacity>

            <LadderRulesNotice mapHint={mapHint} levelLocked={levelLocked} ml={ml} />

            <View style={styles.fighterPanel}>
              <TouchableOpacity
                activeOpacity={0.86}
                disabled={!activeFighter}
                onPress={() => setActiveCardOpen(true)}
                style={[styles.monsterPortrait, styles[`rarity_${rarity}`] || styles.rarity_common]}
              >
                {activeFighter ? (
                  <>
                    <MonsterPreview parts={activeFighter.monsterParts} size={92} mood="happy" />
                    <Text style={styles.portraitTapHint}>Card</Text>
                  </>
                ) : (
                  <Text style={styles.emptyMonster}>?</Text>
                )}
              </TouchableOpacity>
              <View style={styles.fighterInfo}>
                <Text style={styles.fighterName} numberOfLines={1}>
                  {activeFighter?.displayName ?? 'No monster selected'}
                </Text>
                <Text style={styles.fighterMeta}>
                  Lv {activeFighter?.level ?? '—'} · {rarityUi?.label ?? rarity}
                </Text>
                <Text style={styles.fighterRegion} numberOfLines={1}>
                  {featuredTpl?.name ?? 'Ladder'} region
                </Text>
              </View>
              <View style={styles.fighterActions}>
                <FantasyActionButton label="Chest Collection" onPress={onOpenCollection} disabled={!onOpenCollection} />
                <FantasyActionButton label="Monster Gear" onPress={onOpenGear} disabled={!onOpenGear} />
              </View>
            </View>

            <View style={styles.infoPanel}>
              <Text style={styles.infoLevel}>Level {formatStageLabel(stage.mainLevel, stage.subLevel)}</Text>
              <Text style={styles.infoLine}>Region: {theme.name}</Text>
              <Text style={styles.infoLine}>Stage: {bossBanner || stageTypeLabel(currentKind)}</Text>
              <Text style={styles.infoLine}>Rewards: {hints.subsToMini > 0 ? `Gear chest in ${hints.subsToMini}` : hints.subsToBig > 0 ? `Monster chest in ${hints.subsToBig}` : 'Boss rewards ready'}</Text>
              <View style={styles.resourceRow}>
                <Text style={styles.resourceText}>Gold {ml.ladderGold}</Text>
                <Text style={styles.resourceText}>Shards {ml.ladderShards}</Text>
                <Text style={styles.resourceText}>Pity {formatPitySummary(ml)}</Text>
              </View>
            </View>

            <View style={styles.stagePanel}>
              <View style={styles.nodeRow}>
                {Array.from({ length: 10 }, (_, i) => {
                  const sub = i + 1;
                  const kind = getStageKind(sub);
                  return (
                    <StageNode
                      key={sub}
                      sub={sub}
                      kind={kind}
                      current={sub === stage.subLevel && !levelLocked}
                      cleared={sub < stage.subLevel || levelLocked}
                      locked={sub > stage.subLevel}
                    />
                  );
                })}
              </View>
            </View>

            <View style={styles.chestPanel}>
              <ChestCard title="Gear Chest" state={gearChestState} type="Sub 5" />
              <ChestCard title="Monster Chest" state={monsterChestState} type="Sub 10" />
              <ChestCard
                title="Chest Exchange"
                state="exchange"
                type="Shards"
                onPress={() => setChestExchangeOpen(true)}
              />
            </View>

            <View style={styles.bottomPanel}>
              <Text style={styles.bottomStatus} numberOfLines={2}>{bottomStatus}</Text>
              <FantasyActionButton
                label={levelLocked ? 'Locked until 6PM SGT' : bossBanner ? `Start ${stageTypeLabel(currentKind)}` : 'Start Ladder Battle'}
                variant="primary"
                disabled={!canFight}
                onPress={onStartBattle}
              />
            </View>
            {rewardsOpen ? <RewardsCodexOverlay onClose={() => setRewardsOpen(false)} /> : null}
            <ChestExchangeOverlay
              visible={chestExchangeOpen}
              ladderGold={ml.ladderGold}
              shards={ml.ladderShards}
              chestInventory={chestInventory}
              chestGoldCost={chestGoldCost}
              chestShardCost={chestShardCost}
              onClose={() => setChestExchangeOpen(false)}
              onBuyChest={onBuyChest}
              onOpenChest={onOpenChest}
            />
            {activeCardOpen && activeFighter ? (
              <View style={styles.cardOverlay}>
                <View style={[styles.monsterCard, { borderColor: rarityUi?.border ?? '#facc15' }]}>
                  <TouchableOpacity style={styles.cardClose} onPress={() => setActiveCardOpen(false)}>
                    <Text style={styles.cardCloseTxt}>×</Text>
                  </TouchableOpacity>
                  <Text style={styles.cardKicker}>Ladder Monster</Text>
                  <Text style={styles.cardName}>{activeFighter.displayName}</Text>
                  <View style={styles.cardArt}>
                    <MonsterPreview parts={activeFighter.monsterParts} size={170} mood="happy" />
                  </View>
                  <View style={styles.cardMetaRow}>
                    <Text style={[styles.cardBadge, { backgroundColor: rarityUi?.chipBg ?? '#334155', color: rarityUi?.chipFg ?? '#fff' }]}>
                      {rarityUi?.label ?? rarity}
                    </Text>
                    <Text style={styles.cardRole}>{ROLE_LABELS[activeFighter.role] ?? activeFighter.role}</Text>
                    <Text style={styles.cardRole}>Lv {activeFighter.level ?? 1}</Text>
                  </View>
                  <View style={styles.cardStatsGrid}>
                    {statGrid(activeFighter.baseStats || activeFighter.stats).map((col, colIndex) => (
                      <View key={colIndex ? 'right' : 'left'} style={styles.cardStatsCol}>
                        {col.map(([label, value]) => (
                          <View key={label} style={styles.cardStatRow}>
                            <Text style={styles.cardStatLabel}>{label}</Text>
                            <Text style={styles.cardStatValue}>{value}</Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        </ImageBackground>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09051a',
  },
  gameFrame: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#12071d',
    ...(Platform.OS === 'web'
      ? {
          width: 'min(100vw, calc(100dvh * 0.667))',
          height: 'min(100dvh, calc(100vw * 1.5))',
          boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
        }
      : {
          width: '100%',
          aspectRatio: 683 / 1024,
        }),
  },
  backgroundLayer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  uiLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backBtn: {
    position: 'absolute',
    top: '2.2%',
    left: '3.2%',
    minHeight: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 219, 142, 0.55)',
    backgroundColor: 'rgba(22, 8, 38, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backTxt: {
    color: '#ffe7a3',
    fontSize: 12,
    fontWeight: '900',
  },
  rewardsBtn: {
    position: 'absolute',
    top: '2.2%',
    right: '3.2%',
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#facc15',
    backgroundColor: 'rgba(91, 33, 182, 0.86)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    shadowColor: '#facc15',
    shadowOpacity: 0.65,
    shadowRadius: 10,
  },
  rewardsBtnIcon: {
    color: '#fff7ad',
    fontSize: 12,
    fontWeight: '900',
  },
  rewardsBtnTxt: {
    color: '#fff7ed',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  noticeBar: {
    position: 'absolute',
    top: '24.2%',
    left: '22%',
    width: '56%',
    minHeight: '3.2%',
    maxHeight: '3.2%',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(12, 6, 28, 0.55)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.35)',
  },
  noticeBarExpanded: {
    maxHeight: '42%',
    zIndex: 20,
    backgroundColor: 'rgba(12, 6, 28, 0.94)',
  },
  noticeBarCompact: {
    maxHeight: '2.4%',
  },
  noticeRulesLabel: {
    color: '#c4b5fd',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  noticeText: {
    color: '#f5e8ff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  noticeHintLine: {
    color: '#fde68a',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  noticeRulesScroll: {
    flex: 1,
  },
  noticeRuleTitle: {
    color: '#fde68a',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 14,
    marginTop: 6,
    marginBottom: 4,
  },
  noticeRuleLine: {
    color: '#e9e0ff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 13,
    marginBottom: 5,
  },
  fighterPanel: {
    position: 'absolute',
    top: '31%',
    left: '19.5%',
    width: '61%',
    height: '15.8%',
  },
  monsterPortrait: {
    position: 'absolute',
    top: '12%',
    left: '1.5%',
    width: '27%',
    height: '76%',
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(19, 9, 37, 0.5)',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  rarity_common: { borderColor: '#94a3b8' },
  rarity_rare: { borderColor: '#60a5fa' },
  rarity_epic: { borderColor: '#c084fc' },
  rarity_legendary: { borderColor: '#f59e0b' },
  rarity_mythic: { borderColor: '#f472b6' },
  emptyMonster: {
    color: '#dcc8ff',
    fontSize: 32,
    fontWeight: '900',
  },
  portraitTapHint: {
    position: 'absolute',
    bottom: 3,
    color: '#fde68a',
    fontSize: 7,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  fighterInfo: {
    position: 'absolute',
    top: '10%',
    left: '32%',
    right: '3%',
  },
  fighterName: {
    color: '#fff4d8',
    fontSize: 15,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  fighterMeta: {
    color: '#c8b6ff',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  fighterRegion: {
    color: '#a7f3d0',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  fighterActions: {
    position: 'absolute',
    left: '32%',
    right: '4%',
    bottom: '10%',
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    minHeight: 24,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#b88a4b',
    borderBottomWidth: 2,
    borderBottomColor: '#58361c',
    backgroundColor: 'rgba(38, 20, 63, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  actionButtonPrimary: {
    borderColor: '#f7d774',
    borderBottomColor: '#31551f',
    backgroundColor: 'rgba(51, 128, 69, 0.96)',
  },
  actionButtonOff: {
    opacity: 0.45,
  },
  actionButtonText: {
    color: '#ffe7b8',
    fontSize: 7,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  actionButtonTextPrimary: {
    color: '#fff8dd',
    fontSize: 11,
  },
  infoPanel: {
    position: 'absolute',
    top: '49.6%',
    left: '15%',
    width: '70%',
    height: '16.5%',
    paddingHorizontal: '4%',
    paddingVertical: '2.2%',
    justifyContent: 'center',
  },
  infoLevel: {
    color: '#ffffff',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 1,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  infoLine: {
    color: '#d9ccff',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  resourceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  resourceText: {
    color: '#9ff7d0',
    fontSize: 10,
    fontWeight: '900',
  },
  exchangeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 55,
    backgroundColor: 'rgba(4, 2, 14, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5%',
  },
  exchangePanel: {
    width: '92%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#facc15',
    backgroundColor: 'rgba(15, 8, 34, 0.98)',
    padding: 18,
  },
  exchangeClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(127, 29, 29, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exchangeCloseTxt: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  exchangeTitle: { color: '#fff7ad', fontWeight: '900', fontSize: 22, textAlign: 'center' },
  exchangeSub: { color: '#c4b5fd', fontWeight: '900', fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 12 },
  exchangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.35)',
    backgroundColor: 'rgba(25, 13, 42, 0.72)',
  },
  exchangeRowTitle: { flex: 1, color: '#fff3ca', fontSize: 11, fontWeight: '900' },
  exchangeBtn: {
    minHeight: 30,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#facc15',
    backgroundColor: 'rgba(88, 28, 135, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exchangeBtnTxt: { color: '#fff7ad', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  exchangeFoot: { color: '#bfdbfe', fontSize: 10, fontWeight: '800', lineHeight: 14, marginTop: 4 },
  stagePanel: {
    position: 'absolute',
    top: '68.5%',
    left: '12.5%',
    width: '75%',
    height: '8.8%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeRow: {
    width: '94%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  node: {
    width: '8.4%',
    aspectRatio: 0.72,
    borderRadius: 8,
    backgroundColor: 'rgba(38, 30, 54, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#7c6f8f',
  },
  nodeCurrent: {
    backgroundColor: 'rgba(255, 222, 107, 0.98)',
    borderColor: '#fff2a8',
    shadowColor: '#facc15',
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },
  nodeCleared: {
    backgroundColor: 'rgba(41, 137, 88, 0.95)',
    borderColor: '#b7f7b7',
  },
  nodeLocked: {
    opacity: 0.58,
  },
  nodeBoss: {
    borderColor: '#d8b4fe',
    backgroundColor: 'rgba(88, 28, 135, 0.94)',
  },
  nodeBigBoss: {
    borderColor: '#fda4af',
    backgroundColor: 'rgba(127, 29, 29, 0.94)',
  },
  nodeTxt: {
    color: '#f8edff',
    fontSize: 10,
    fontWeight: '900',
  },
  nodeTxtBoss: {
    color: '#fff5c2',
  },
  nodeLabel: {
    width: '100%',
    color: '#fff',
    fontSize: 5,
    fontWeight: '900',
    lineHeight: 7,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  chestPanel: {
    position: 'absolute',
    top: '80.8%',
    left: '11%',
    width: '78%',
    height: '8.4%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 6,
  },
  chestCard: {
    flex: 1,
    minWidth: 0,
    height: '70%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#85634c',
    backgroundColor: 'rgba(25, 13, 42, 0.62)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 4,
  },
  chestAvailable: {
    borderColor: '#fde68a',
    shadowColor: '#facc15',
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  chestClaimed: {
    borderColor: '#86efac',
  },
  chestExchange: {
    borderColor: '#fde68a',
    backgroundColor: 'rgba(88, 28, 135, 0.72)',
  },
  chestImg: {
    width: 24,
    height: 24,
  },
  chestCopy: {
    flex: 1,
    minWidth: 0,
  },
  chestTitle: {
    color: '#fff3ca',
    fontSize: 6,
    fontWeight: '900',
  },
  chestState: {
    color: '#d8b4fe',
    fontSize: 6,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  chestSub: {
    color: '#a7f3d0',
    fontSize: 6,
    fontWeight: '800',
  },
  bottomPanel: {
    position: 'absolute',
    top: '91.8%',
    left: '8%',
    width: '84%',
    height: '6.2%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: '3%',
  },
  bottomStatus: {
    flex: 1.2,
    color: '#e9d5ff',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    backgroundColor: 'rgba(4, 2, 14, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4%',
  },
  monsterCard: {
    width: '78%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    padding: 16,
    alignItems: 'center',
    shadowColor: '#facc15',
    shadowOpacity: 0.55,
    shadowRadius: 18,
  },
  cardClose: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(127, 29, 29, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCloseTxt: { color: '#fff', fontSize: 20, fontWeight: '900', lineHeight: 22 },
  cardKicker: { color: '#fde68a', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  cardName: { color: '#fff4cf', fontWeight: '900', fontSize: 23, textAlign: 'center', marginTop: 3 },
  cardArt: {
    width: '86%',
    minHeight: 190,
    marginVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,224,138,0.32)',
    backgroundColor: 'rgba(7, 17, 32, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  cardBadge: { fontWeight: '900', fontSize: 12, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  cardRole: { color: '#c4b5fd', fontWeight: '900', fontSize: 13, textTransform: 'capitalize' },
  cardStatsGrid: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    marginTop: 4,
  },
  cardStatsCol: {
    flex: 1,
    gap: 5,
  },
  cardStatRow: {
    minHeight: 24,
    borderRadius: 10,
    backgroundColor: 'rgba(134, 239, 172, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.22)',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardStatLabel: { color: '#bbf7d0', fontWeight: '900', fontSize: 11 },
  cardStatValue: { color: '#fff7cc', fontWeight: '900', fontSize: 12 },
  codexBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: 'rgba(4, 2, 14, 0.74)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4%',
  },
  codexPanel: {
    width: '96%',
    height: '88%',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#facc15',
    backgroundColor: 'rgba(15, 8, 34, 0.97)',
    overflow: 'hidden',
    shadowColor: '#facc15',
    shadowOpacity: 0.7,
    shadowRadius: 18,
  },
  codexGlow: {
    position: 'absolute',
    top: -60,
    alignSelf: 'center',
    width: '86%',
    height: 150,
    borderRadius: 999,
    backgroundColor: 'rgba(250, 204, 21, 0.16)',
  },
  codexHeader: {
    minHeight: 68,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250, 204, 21, 0.32)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codexKicker: {
    color: '#c4b5fd',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codexTitle: {
    color: '#fff7ad',
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(250, 204, 21, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  codexClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#fca5a5',
    backgroundColor: 'rgba(127, 29, 29, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codexCloseTxt: {
    color: '#fff',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
  },
  codexScroll: {
    padding: 14,
    paddingBottom: 24,
  },
  codexIntro: {
    color: '#f5e8ff',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
    marginBottom: 10,
  },
  oddsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  oddsCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: 'rgba(67, 56, 202, 0.38)',
    padding: 10,
  },
  oddsCardMonster: {
    borderColor: '#f0abfc',
    backgroundColor: 'rgba(112, 26, 117, 0.34)',
  },
  oddsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  oddsChestImg: {
    width: 34,
    height: 34,
  },
  oddsTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  oddsTitle: {
    color: '#fff7ad',
    fontSize: 13,
    fontWeight: '900',
  },
  oddsSub: {
    color: '#ddd6fe',
    fontSize: 8,
    fontWeight: '800',
  },
  oddsRows: {
    gap: 4,
  },
  oddsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  oddsRarity: {
    fontSize: 9,
    fontWeight: '900',
  },
  oddsPercent: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  oddsFoot: {
    color: '#a7f3d0',
    fontSize: 7,
    fontWeight: '800',
    lineHeight: 10,
    marginTop: 7,
  },
  shardStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  shardPill: {
    flexGrow: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  shardRarity: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  shardValue: {
    color: '#e0f2fe',
    fontSize: 8,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#fff7ad',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  rarityGroup: {
    marginBottom: 10,
  },
  rarityGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 7,
  },
  rarityGroupTitle: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  rarityGroupChance: {
    color: '#e0f2fe',
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  catalogChip: {
    width: '48%',
    minHeight: 44,
    borderRadius: 13,
    borderWidth: 1,
    backgroundColor: 'rgba(30, 20, 54, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 7,
  },
  catalogChipMonster: {
    minHeight: 58,
    backgroundColor: 'rgba(37, 18, 70, 0.92)',
  },
  catalogIcon: {
    width: 22,
    color: '#fff7ad',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  catalogMonsterPortrait: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  catalogCopy: {
    flex: 1,
    minWidth: 0,
  },
  catalogName: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  catalogMeta: {
    fontSize: 8,
    fontWeight: '800',
    marginTop: 1,
    textTransform: 'capitalize',
  },
  catalogStats: {
    color: '#a7f3d0',
    fontSize: 7,
    fontWeight: '800',
    marginTop: 1,
  },
  catalogGearThumb: {
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogTapHint: {
    color: '#fde68a',
    fontSize: 6,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 1,
    letterSpacing: 0.4,
  },
  codexCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: 'rgba(4, 2, 14, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5%',
  },
  codexDetailCard: {
    width: '84%',
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 3,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
    padding: 16,
    alignItems: 'center',
    shadowColor: '#facc15',
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  codexDetailEmoji: {
    fontSize: 48,
    marginVertical: 8,
  },
  codexDetailLine: {
    color: '#bbf7d0',
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
