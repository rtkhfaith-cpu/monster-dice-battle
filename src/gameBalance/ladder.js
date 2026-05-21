export const LADDER_BALANCE = {
  /** High EXP, low ladder Gold (see rewards.js ladder payouts). */
  expMultiplier: 4,
  coinMultiplier: 0.12,
  dailyResetTimeZone: 'Asia/Singapore',
  dailyResetHour: 18,
  /** Biweekly stage reset — first period starts this Sunday 6pm SG. */
  biweeklyEpochSunday: '2026-05-24',
  biweeklyPeriodDays: 14,
  chestRates: {
    common: 50,
    rare: 30,
    epic: 15,
    legendary: 4,
    mythic: 1,
  },
  pity: {
    epicPlusEvery: 30,
    legendaryPlusEvery: 80,
    mythicEvery: 200,
  },
  duplicateShards: {
    common: 5,
    rare: 15,
    epic: 50,
    legendary: 150,
    mythic: 500,
  },
  /** Chest Exchange: gear chest bought with ladder gold, monster chest with shards. */
  chestGoldCost: { gear: 24 },
  chestShardCost: { monster: 72 },
};
