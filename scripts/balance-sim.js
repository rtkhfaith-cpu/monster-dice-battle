(async () => {
const { expToNextForLevel } = await import('../src/gameBalance/leveling.js');
const {
  normalCoinsForEnemyLevel,
  normalExpForEnemyLevel,
  ladderExpForEnemyLevel,
  ladderCoinsForEnemyLevel,
} = await import('../src/gameBalance/rewards.js');
const { GEAR_SLOT_UNLOCK_COSTS, SHOP_PRICE_RANGES } = await import('../src/gameBalance/shop.js');
const { dodgeChance } = await import('../src/gameBalance/combat.js');

function battlesToAdvance(level, mode = 'normal') {
  const exp = mode === 'ladder' ? ladderExpForEnemyLevel(level) : normalExpForEnemyLevel(level);
  return Math.ceil(expToNextForLevel(level) / Math.max(1, exp));
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

const ranges = [
  [1, 10],
  [11, 50],
  [51, 70],
  [71, 100],
  [101, 120],
];

console.log('Monster Fight balance simulation');
console.log('--------------------------------');
for (const [from, to] of ranges) {
  const normalBattles = sum(Array.from({ length: to - from + 1 }, (_, i) => battlesToAdvance(from + i, 'normal')));
  const ladderBattles = sum(Array.from({ length: to - from + 1 }, (_, i) => battlesToAdvance(from + i, 'ladder')));
  console.log(`Lv ${from}-${to}: normal ~${normalBattles} wins, ladder ~${ladderBattles} wins`);
}

console.log('\nCoin economy');
for (const lv of [1, 20, 50, 100]) {
  console.log(`Enemy Lv ${lv}: normal ${normalCoinsForEnemyLevel(lv)} coins, ladder ${ladderCoinsForEnemyLevel(lv)} ladder gold`);
}

console.log('\nGear slot costs');
for (const slot of [4, 5, 6]) {
  const cost = GEAR_SLOT_UNLOCK_COSTS[slot];
  const battlesAt20 = Math.ceil(cost / normalCoinsForEnemyLevel(20));
  console.log(`Slot ${slot}: ${cost} coins (~${battlesAt20} Lv20 wins)`);
}

console.log('\nShop ranges');
for (const [rarity, range] of Object.entries(SHOP_PRICE_RANGES)) {
  console.log(`${rarity}: ${range[0]}-${range[1]} coins`);
}

console.log('\nDodge examples');
for (const delta of [-20, 0, 20, 60]) {
  console.log(`Speed delta ${delta}: ${dodgeChance({ attackerSpeed: 50, defenderSpeed: 50 + delta }).toFixed(1)}% physical`);
}
})();
