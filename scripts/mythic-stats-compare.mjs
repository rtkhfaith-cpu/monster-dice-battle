import { computeBattleStats, powerScoreFromBundle } from '../utils/statsCalc.js';
import { computeLadderBattleStats } from '../utils/monsterLadder/ladderStatsCalc.js';

const MYTHICS = [
  { id: 'bubble_tea_slime', name: 'Bubble Tea Slime', role: 'Tank', src: 'Shop' },
  { id: 'sixtyseven_rex', name: '67-Rex', role: 'Bruiser', src: 'Shop' },
  { id: 'goldzilla', name: 'Goldzilla', role: 'Balanced', src: 'Shop' },
  { id: 'algorithm_angel', name: 'Algorithm Angel', role: 'Healer', src: 'Ladder' },
  { id: 'core_feed_beast', name: 'Core Feed Beast', role: 'Magic nuker', src: 'Ladder' },
];

const mid = (r) => Math.round((r.min + r.max) / 2);

function statsAt(id, lv, src) {
  const built = src === 'Shop' ? computeBattleStats(id, lv) : computeLadderBattleStats(id, lv);
  const s = built.stats;
  return {
    hp: s.hp,
    mp: s.mp,
    atk: mid(s.attack),
    mag: mid(s.magic),
    def: mid(s.def),
    mdef: mid(s.magicDef),
    crit: s.critPct,
    dodge: s.dodge ?? s.dodgePct,
    agi: s.agility ?? s.speed,
    hit: s.hitRate,
    power: Math.round(powerScoreFromBundle(s)),
  };
}

for (const lv of [1, 30, 50]) {
  console.log(`\n--- Level ${lv} (computed battle stats) ---`);
  const rows = MYTHICS.map((m) => ({ ...m, ...statsAt(m.id, lv, m.src) }))
    .sort((a, b) => b.power - a.power);
  console.table(
    rows.map(({ name, role, src, hp, mp, atk, mag, def, mdef, crit, dodge, agi, hit, power }) => ({
      name,
      role,
      src,
      hp,
      mp,
      atk,
      mag,
      def,
      mdef,
      crit,
      dodge,
      agi,
      hit,
      power,
    })),
  );
}
