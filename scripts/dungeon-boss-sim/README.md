# Dungeon boss sim

Headless balance tests for the 3-player vs boss dungeon battle engine.

## Quick start

```bash
npm run sim:dungeons
```

Runs **5 battles** against each boss (Death Knight, Ice Queen, Black Dragon) using the default end-game team:

| Position | Monster | Epic set | Pet |
|----------|---------|----------|-----|
| P1 Tank | bubble_tea_slime | dragon_guard | solar_lion |
| P2 Mid | goldzilla | lifebloom | star_unicorn |
| P3 DPS | sixtyseven_rex | warborn | dragon_wisp |

Loadout: **Lv 100** mythics, **Lv 60** mythic pets, **full epic** 8-piece sets, **3 epic** passive books each.

## CLI options

```bash
npm run sim:dungeons -- --runs=10
npm run sim:dungeons -- --boss=ice_queen
npm run sim:dungeons -- --json
npm run sim:dungeons -- --help
```

## Customize team / levels

Edit `config.js` (`DEFAULT_TEAM`, `DEFAULT_OPTIONS`) or call `runDungeonSimulations()` from your own script:

```javascript
import { runDungeonSimulations } from './scripts/dungeon-boss-sim/runSimulations.js';

const report = runDungeonSimulations({
  runsPerBoss: 10,
  bosses: ['black_dragon'],
  profileOpts: { monsterLevel: 100, petLevel: 60, gearRarity: 'epic' },
});
```

## Files

| File | Purpose |
|------|---------|
| `config.js` | Default team, passives, boss IDs, sim options |
| `buildTestProfile.js` | Creates profile + gear + pets |
| `simFighter.js` | Node-safe fighter builder (no React Native) |
| `runSimulations.js` | Core sim loop + summary |
| `cli.mjs` | Command-line entry |

## Notes

- Uses the same `dungeonBattleEngine.js` as the live game (auto-plays every step until win/lose).
- Passive skill **books are equipped** but the dungeon engine does **not** resolve passive procs yet — only stats from gear, pets, gems, and sets apply.
- Requires **tsx** (installed on demand via `npx` in the npm script).
