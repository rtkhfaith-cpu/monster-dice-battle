# Monster Stat System Reference

This document explains the live stat system for monsters, gear, pets, and passive skill books, plus how they combine in battle.

## 1) Core Monster Stats

Monster templates define base stats in `utils/monsterTemplates.js`:

- `hp`, `mp`
- `attackMin`, `attackMax`
- `magicMin`, `magicMax`
- `defMin`, `defMax`
- `magicDefMin`, `magicDefMax`
- `critical` (becomes `critPct`)
- `dodge` (flat dodge stat used by dodge formula)
- `speed` (role default fallback if not present)
- optional `hit` (flat hitRate base)

Level scaling is built in `utils/statsCalc.js`:

- Range stats become battle ranges: `attack`, `magic`, `def`, `magicDef`
- Final core battle stats include:
  - `hp`, `mp`
  - `attack`, `magic`, `def`, `magicDef` (min/max ranges)
  - `critPct`
  - `dodge` (flat)
  - `dodgePct` (kept synced to `dodge` for compatibility)
  - `hitRate` (flat counter-stat vs dodge)
  - `agility`/`speed`

## 2) Gear Stats (Flat Additive Layer)

Gear stat types are in `src/gameSystems/gear/gearConstants.js`:

- `attack`, `defense`, `hp`, `speed`, `crit`, `dodge`, `hitRate`
- `healPower`, `firePower`, `poisonPower`, `skillPower`

Final gear application is in `src/gameSystems/gear/battleStatCalculator.js`:

- `hp` -> adds to `stats.hp`
- `attack` -> adds to physical range, and partially to magic range
- `defense` -> adds to defense range, and partially to magic defense range
- `speed` -> adds to `speed` and `agility`
- `crit` -> adds to `critPct`
- `dodge` -> adds to `dodge` (and syncs `dodgePct = dodge`)
- `hitRate` -> adds to flat `hitRate`

Important:

- Gear + pet stats are applied in final battle package with no old hard cap on dodge/hit.
- Set bonuses are exact `setId` match and applied by `src/gameSystems/gear/gearSets.js`.

## 3) Gear Set Bonus Stats

Set bonus effects can include:

- Direct stat scaling: `hpPct`, `defensePct`, `attackPct`, `critFlat`
- Combat modifiers: `healPowerPct`, `regenHpPerTurn`, `poisonDamagePct`, `poisonChancePct`, `fireDamagePct`, `burnChancePct`, `damageReductionPct`

Set detection/application:

- `detectActiveGearSet()`
- `applyGearSetBonusToStats()`
- `buildSetCombatModifiers()`

## 4) Pet Stats and Pet Combat Modifiers

Pet definitions and base growth are in `src/gameSystems/pets.js`:

- Base stat contribution fields: `hp`, `atk`, `def`, `spd`
- Pet level scales these stats (up to max level)

Final stat integration:

- `applyPetStatBonuses()` in `src/gameSystems/petBonuses.js`
- Adds pet base stats directly into monster final stats:
  - `hp`, `attack`, `def`, `agility/speed`

Separate combat-only pet modifiers:

- Built by `buildPetCombatModifiers()`
- Includes:
  - `petCritBonusPct`
  - `petDodgeBonusPct`
  - `coinBonusPct`
  - skill list

Pet battle logic (`src/gameSystems/petCombat.js`) applies:

- `petCritBonusPct` as extra crit roll support
- `petDodgeBonusPct` as extra dodge chance support
- trigger skills (heal, poison, burn, shield, cleanse, counter, MP restore)

UI visibility:

- `components/gear/equipment/MonsterFinalStatsPanel.js` shows:
  - final core stats
  - gear bonus chips (Heal/Fire/Poison/Skill)
  - pet stat bonuses (`HP/ATK/DEF/SPD`)
  - separate pet combat chips (`Pet Crit+`, `Pet Dodge+`)

## 5) Passive Skill Books ("Skill Books")

Passive book definitions are in `src/gameSystems/passiveSkills.js`.

Book system fields:

- `skillId`, `name`, `effectType`, `trigger`, rarity scaling
- per-rarity effects (rare/epic/legendary/mythic)

Inventory/equip flow is in `src/gameSystems/passiveInventory.js`:

- Books live in `profile.passiveSkillBooksOwned`
- Equipping consumes book into monster `equippedPassives`
- Slot limits by monster rarity:
  - common/rare: 0
  - epic: 1
  - legendary: 2
  - mythic: 3

Passive battle resolution is in `src/gameSystems/passiveResolver.js`:

- Examples:
  - heal on hit, reflect, regen
  - poison/burn procs
  - dodge/crit bonuses
  - rage/anti-crit/barrier logic

## 6) Active Monster Skills (non-book)

Per-monster active skills are in `utils/monsterSkills.js`:

- One physical + 2-3 magic skills
- Skill fields: `power`, `mpCost`, `element`, optional status proc
- These are used in attack resolution and status application.

## 7) HitRate vs Dodge (Current Intended Active Model)

Shared formula (normal path):

`finalDodgeChance = clamp(defender.dodge - attacker.hitRate, 0, 60)`

Implemented in:

- `src/gameBalance/combat.js` (`dodgeChance`)
- used by:
  - `utils/battleLogic.js`
  - `src/gameSystems/passiveResolver.js`
  - `server/battleDamage.js` (multiplayer)

Design split:

- connect/miss roll: agility-based only (`attackHitChance`)
- dodge roll: flat dodge-hitRate model above

Notes:

- mini-boss/big-boss multipliers are applied after base dodge chance where applicable
- legacy 3-25 agility fallback exists only for old/incomplete payloads missing flat dodge

## 8) End-to-End Stat Pipeline

1. Monster template base + growth -> `computeBattleStats()`
2. Merge tier scaling -> `fighterFromOwned()`
3. Gear flats -> `computeFinalBattleStats()`
4. Set bonus stats + set combat modifiers
5. Pet base stats -> final fighter stats
6. Pet combat-only modifiers attached separately
7. Passive books and pet skills resolved during combat actions/turns

Final runtime fighter package includes:

- `stats` (actual battle stats)
- `gearBonuses`
- `gearModifiers`
- `petBonuses`
- `petCombatModifiers`
- `equippedPassives`

## 9) Current Implementation Notes (Important)

These are present in data/UI, but not all are fully consumed in current combat formulas yet:

- `skillPower` (currently stored/displayed in gear modifiers, not yet applied in direct damage math)
- `healPower` and `poisonPower` (stored/displayed and available for extension; current battle resolver paths do not apply them as direct scalar terms yet)

`firePower` is partially wired via compatibility path in `utils/battleLogic.js` (`ladderEffectPct`).

So today:

- Core stat combat is fully active for monster/gear/pet/passive interactions listed above.
- Some advanced gear modifier channels are scaffolded and visible, but not all are currently hooked into final damage/heal status formulas.

