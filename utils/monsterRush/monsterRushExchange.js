/**
 * Monster Rush Exchange — spend Rush Points for in-game rewards.
 */
import { GEM_STATS, gemDisplayName } from '../../src/gameSystems/gems/gemDefinitions';
import { grantGem } from '../../src/gameSystems/gems/gemInventory';
import { grantPassiveSkillBook } from '../../src/gameSystems/passiveInventory';
import { PASSIVE_SKILLS } from '../../src/gameSystems/passiveSkills';
import { rollMainBattleChestDrop } from '../mainBattleChest';
import { grantGearDropToProfile } from '../gearStorage';
import { applyPetChestDrop } from '../petChest';
import { applyPassiveSkillBookDrop } from '../passiveSkillChest';
import { grantGemByKey } from '../../src/gameSystems/gems/gemInventory';
import { getMonsterRushState } from './monsterRushProgress';

export const RUSH_EXCHANGE_ITEMS = [
  { id: 'coins_1000', name: '1,000 Coins', cost: 50, emoji: '🪙', reward: { type: 'coins', amount: 1000 } },
  { id: 'rare_gem_box', name: 'Rare Gem Box', cost: 120, emoji: '💎', reward: { type: 'gem_box', rarity: 'rare' } },
  { id: 'mini_chest', name: 'Mini Chest', cost: 200, emoji: '📦', reward: { type: 'chest', chestType: 'mini' } },
  { id: 'pet_food_5', name: 'Pet Food x5', cost: 150, emoji: '🍖', reward: { type: 'pet_food', amount: 5 } },
  { id: 'equipment_stone_3', name: 'Gear Boost x3', cost: 180, emoji: '⚒️', reward: { type: 'gear_boost', amount: 3 } },
  { id: 'skill_scroll_1', name: 'Skill Scroll x1', cost: 250, emoji: '📜', reward: { type: 'skill_scroll', amount: 1 } },
];

export function getRushExchangeItem(id) {
  return RUSH_EXCHANGE_ITEMS.find((i) => i.id === id) ?? null;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function grantRushExchangeReward(profile, reward) {
  if (!profile || !reward) return { ok: false, error: 'Invalid reward' };

  switch (reward.type) {
    case 'coins': {
      const amt = Math.max(1, Math.floor(reward.amount || 0));
      profile.coins = (profile.coins ?? 0) + amt;
      return { ok: true, message: `+${amt.toLocaleString()} coins added.` };
    }
    case 'gem_box': {
      const stat = pickRandom(GEM_STATS);
      const rarity = reward.rarity === 'epic' ? 'epic' : 'rare';
      const grant = grantGem(profile, rarity, stat, 1);
      if (!grant.ok) return { ok: false, error: grant.error || 'Could not grant gem' };
      return { ok: true, message: `Received ${gemDisplayName(rarity, stat)}.` };
    }
    case 'chest': {
      const drop = rollMainBattleChestDrop(profile, { enemyLevel: 40 });
      if (drop.kind === 'gold') {
        profile.coins = (profile.coins ?? 0) + drop.amount;
        return { ok: true, message: `Mini chest: +${drop.amount} coins.` };
      }
      if (drop.kind === 'exp') {
        profile.coins = (profile.coins ?? 0) + Math.max(100, Math.floor(drop.amount / 2));
        return { ok: true, message: `Mini chest bonus converted to coins.` };
      }
      if (drop.kind === 'gear' || drop.kind === 'gear_instance') {
        const g = grantGearDropToProfile(profile, 'miniBoss');
        if (g.ok && g.gear) {
          return { ok: true, message: `Received ${g.gear.rarity} ${g.gear.name}.` };
        }
        profile.coins = (profile.coins ?? 0) + 200;
        return { ok: true, message: 'Mini chest: +200 coins.' };
      }
      if (drop.kind === 'skill_book') {
        const grant = applyPassiveSkillBookDrop(profile, drop, 'monster_rush_exchange');
        if (grant.ok) return { ok: true, message: `Skill book: ${drop.label ?? 'granted'}.` };
        profile.coins = (profile.coins ?? 0) + 150;
        return { ok: true, message: 'Duplicate book → +150 coins.' };
      }
      if (drop.kind === 'pet' || drop.kind === 'pet_exp_dust') {
        applyPetChestDrop(profile, drop);
        return { ok: true, message: drop.label ?? 'Pet reward granted.' };
      }
      if (drop.kind === 'gem' && drop.gemKey) {
        grantGemByKey(profile, drop.gemKey, 1);
        return { ok: true, message: drop.gemName ?? 'Epic gem granted.' };
      }
      profile.coins = (profile.coins ?? 0) + 100;
      return { ok: true, message: 'Mini chest: +100 coins.' };
    }
    case 'pet_food': {
      const packs = Math.max(1, Math.floor(reward.amount || 1));
      const dust = packs * 25;
      profile.petExpDust = (profile.petExpDust ?? 0) + dust;
      return { ok: true, message: `+${dust} Pet EXP Dust (×${packs} pet food).` };
    }
    case 'gear_boost': {
      const bonus = Math.max(1, Math.floor(reward.amount || 1)) * 150;
      profile.coins = (profile.coins ?? 0) + bonus;
      return { ok: true, message: `Gear boost converted to +${bonus} coins.` };
    }
    case 'skill_scroll': {
      const count = Math.max(1, Math.floor(reward.amount || 1));
      const skill = pickRandom(Object.values(PASSIVE_SKILLS));
      for (let i = 0; i < count; i += 1) {
        grantPassiveSkillBook(profile, skill.id, 'rare', 'monster_rush_exchange');
      }
      return { ok: true, message: `${count}× Rare ${skill.name} skill book${count > 1 ? 's' : ''}.` };
    }
    default:
      return { ok: false, error: 'Unknown reward type' };
  }
}

export function exchangeRushItem(profile, itemId) {
  const item = getRushExchangeItem(itemId);
  if (!item) return { ok: false, error: 'Unknown exchange item' };
  const mr = getMonsterRushState(profile);
  if (mr.totalRushPoints < item.cost) {
    return { ok: false, error: 'Not enough Rush Points.' };
  }
  const grant = grantRushExchangeReward(profile, item.reward);
  if (!grant.ok) return grant;
  mr.totalRushPoints -= item.cost;
  profile.monsterRush = mr;
  profile.updatedAt = new Date().toISOString();
  return { ok: true, message: grant.message, item, remainingPoints: mr.totalRushPoints };
}
