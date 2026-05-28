# Stats System Report

## 1. Executive Summary

The current stat system is layered and mostly centralized after the gear overhaul:

- Monsters start from template base stats plus level/rarity/evolution scaling.
- Gear adds flat stats (and set bonuses/modifiers) on top of monster stats.
- Pets add base stats (`hp/atk/def/spd`) into final stats, plus separate combat-only modifiers (pet crit/dodge, skill triggers).
- Skill books (passive books) do not rewrite base stats; they add passive combat effects during battle.
- Final fighter package is built before battle and contains `stats`, `gearBonuses`, `gearModifiers`, `petBonuses`, `petCombatModifiers`, and `equippedPassives`.
- Battle then applies runtime effects (connect/miss, dodge, crit, passives, pet triggers, status effects, DoT).

Mode consistency:

- **Single-player combat modes** (1vCPU + Ladder combat + mini-boss) use the client battle resolver path (`BattleScreen` -> `resolveAttackWithPassives`).
- **Multiplayer** uses server battle engine (`server/battleEngine.js` + `server/battleDamage.js` + server passive/pet handlers), which mirrors core formulas but has some server-specific ordering/details.
- **Monster Rescue** is a bubble minigame path, not the monster-vs-monster stat combat resolver.

---

## 2. Complete Stat List

| Stat Name | Display Name | Type | Source | What It Does | Shown as %? | Capped? |
|----------|--------------|------|--------|--------------|------------|---------|
| `hp` | HP | Flat stat | Monster base/level + gear + pet + set % | Health pool | No | No hard final cap found |
| `mp` | MP | Flat stat | Monster base/level + `battleMpPool` | Magic skill resource | No | `battleMpPool` range by formula |
| `attack` | ATK | Range stat (`min/max`) | Monster base/level + gear + set % | Physical damage base | No | No hard final cap found |
| `magic` | MAG | Range stat (`min/max`) | Monster base/level + gear-derived | Magic damage base | No | No hard final cap found |
| `def` | DEF | Range stat (`min/max`) | Monster base/level + gear + set % | Physical mitigation input | No | No hard final cap found |
| `magicDef` | MDEF | Range stat (`min/max`) | Monster base/level + gear-derived | Magic mitigation input | No | No hard final cap found |
| `agility` / `speed` | AGI / SPD | Flat stat | Monster base/level + gear + pet | Connect/miss roll, fallback legacy dodge inputs | No | No global hard cap found |
| `critPct` | Crit | Percent-like battle stat | Monster base + level + gear + set + passives + pet mod | Crit chance | Yes | Soft caps in some paths (`55` base calc, passive cap `60`) |
| `dodge` | Dodge | Flat stat | Monster base + level + gear | Used in dodge formula vs hitRate | Usually shown number | Dodge chance clamped to 0–60 |
| `dodgePct` | Dodge (compat) | Compatibility mirror | Synced to `dodge` in new paths | Backward compatibility with old fields | Mixed | Legacy fallback path 3–25 only if flat dodge missing |
| `hitRate` | HitRate / Hit Rate | Flat stat | Monster base + level + rarity + gear | Offsets defender dodge only | No | Indirect via dodge clamp (0–60 result) |
| `healPower` | Heal | Combat modifier channel | Gear | Intended healing modifier channel | No | No cap found; currently mostly scaffold |
| `firePower` | Fire | Combat modifier channel | Gear | Fire modifier channel | No | No cap found; partial usage |
| `poisonPower` | Poison | Combat modifier channel | Gear | Poison modifier channel | No | No cap found; currently mostly scaffold |
| `skillPower` | Skill | Combat modifier channel | Gear | Skill damage modifier channel | No | No cap found; currently mostly scaffold |
| `damageReductionPct` | (set/buff DR) | Percent modifier | Mythic tank set + gear modifiers | Final damage reduction | Usually hidden | No explicit global cap found |
| `healPowerPct` | (set heal%) | Percent modifier | Set bonus | Healing boost channel | Hidden | No explicit global cap found |
| `poisonDamagePct` / `poisonChancePct` | (set poison mods) | Percent modifier | Set bonus | Poison damage/chance modifiers | Hidden | No explicit global cap found |
| `fireDamagePct` / `burnChancePct` | (set fire mods) | Percent modifier | Set bonus | Fire/burn modifiers | Hidden | No explicit global cap found |
| `petCritBonusPct` | Pet Crit+ | Combat-only modifier | Pet skills snapshot | Extra crit chance roll support | Yes (chip) | Beyond player caps per design comment |
| `petDodgeBonusPct` | Pet Dodge+ | Combat-only modifier | Pet skills snapshot | Adds dodge chance in resolver | Yes (chip) | Beyond player caps per design comment |
| Connect chance (`attackHitChance`) | (not shown directly) | Internal % roll | Agility-based formula | First avoid roll before dodge | No direct UI | Clamped 76–98 in current implementation |

Real stat vs combat-only:

- Real stat examples: `hp`, `attack`, `def`, `dodge`, `hitRate`.
- Combat-only modifier examples: passive procs, pet crit/dodge bonus, set effect percentages.

## 2A. Stat Activation Audit Matrix (Design-Critical)

Legend:

- **Fully active in battle**: directly affects resolved battle outcome in current implementation.
- **Combat modifier only**: not a base stat, but changes runtime combat behavior.
- **Displayed/scaffolded**: stored/rolled/displayed, but not fully consumed in current battle math.
- **Legacy/compat only**: present for compatibility/fallback paths.

| Stat / Effect | Status Category | Source | Displayed In UI | Affects Final Stats Package (`fighter.stats`)? | Affects Actual Battle Outcome Now? | Consumed In (exact current path) | Player Should Care Right Now? |
|---|---|---|---|---|---|---|---|
| HP | Fully active in battle | Monster base/level, gear, pet, set% | Yes (multiple cards/panels) | Yes | Yes | `computeBattleStats`, `battleStatCalculator`, `passiveResolver`, `battleDamage` | Yes |
| MP | Fully active in battle | Monster base/level via `battleMpPool` | Yes | Yes | Yes (magic skill usage) | `statsCalc`, `monsterSkills` (`canAffordSkill`), battle resolvers | Yes |
| Attack (range) | Fully active in battle | Monster base/level + gear + set% | Yes | Yes | Yes | `battleStatCalculator`, `passiveResolver`, `battleDamage` | Yes |
| Magic (range) | Fully active in battle | Monster base/level (+ partial from gear attack mapping) | Yes | Yes | Yes | `battleStatCalculator`, `passiveResolver`, `battleDamage` | Yes |
| Defense (range) | Fully active in battle | Monster base/level + gear + set% | Yes | Yes | Yes | `battleStatCalculator`, `passiveResolver`, `battleDamage` | Yes |
| Magic Defense (range) | Fully active in battle | Monster base/level (+ partial from gear defense mapping) | Yes | Yes | Yes | `battleStatCalculator`, `passiveResolver`, `battleDamage` | Yes |
| Speed / Agility | Fully active in battle | Monster base/level + gear + pet | Yes | Yes | Yes (connect roll, turn-adjacent logic) | `battleLogic.attackHitChance`, `passiveResolver.attackHitChance`, server equivalents | Yes |
| Crit (`critPct`) | Fully active in battle | Monster + gear + set + passives + pet mod | Yes (`%`) | Yes | Yes | `passiveResolver.effectiveCritChance`, `battleDamage`, pet crit bonus checks | Yes |
| Dodge (flat) | Fully active in battle | Monster + gear (pet dodge is separate modifier) | Yes | Yes | Yes | `combat.dodgeChance` via `battleLogic`/`passiveResolver`/`server/battleDamage` | Yes |
| HitRate (flat) | Fully active in battle | Monster + gear | Yes (number, no `%`) | Yes | Yes (offsets dodge only) | `combat.dodgeChance` callers (`attackerHitRate`) | Yes |
| HealPower | Displayed/scaffolded but not fully used yet | Gear lines + set channels | Yes (gear/stat chips) | In `gearModifiers`, not core stat | **Partially/indirectly only** | Stored in `battleStatCalculator.gearModifiers`; no unified direct resolver use | Low–Medium (currently confusing) |
| FirePower | Displayed/scaffolded but not fully used yet (partial) | Gear lines + set fire channels | Yes | In `gearModifiers` | **Partial** | `battleLogic.ladderEffectPct` legacy compatibility path uses `firePower` contribution | Medium (works partially, not fully consistent) |
| PoisonPower | Displayed/scaffolded but not fully used yet | Gear lines + set poison channels | Yes | In `gearModifiers` | **Not fully wired** | Stored in `gearModifiers`; no clear unified damage/DoT scalar application | Low (currently misleading if overemphasized) |
| SkillPower | Displayed/scaffolded but not fully used yet | Gear lines | Yes | In `gearModifiers` | **Not meaningfully wired** | Stored only (`battleStatCalculator`), not used in main damage formulas | Low (currently mostly non-impactful) |
| Pet Crit+ (`petCritBonusPct`) | Active only as combat modifier | Pet skill snapshot (`crit_boost`) | Yes (separate chip) | No (modifier bundle) | Yes | `petCombat.getPetCritBonus`, used in `passiveResolver` and server flow | Yes |
| Pet Dodge+ (`petDodgeBonusPct`) | Active only as combat modifier | Pet skill snapshot (`dodge_boost`) | Yes (separate chip) | No (modifier bundle) | Yes | `petCombat.getPetDodgeBonus`, `passiveResolver.rollDodge`, server dodge checks | Yes |
| Set bonus: `hpPct/defensePct/attackPct/critFlat` | Fully active in battle | Exact `setId` full set | Partly (set hint, indirect stat changes) | Yes | Yes | `gearSets.applyGearSetBonusToStats` | Yes |
| Set bonus: `damageReductionPct` | Active only as combat modifier (plus attached stat field) | Mythic tank set path | Not always explicit | Attached on stats/modifiers | Yes | Applied in `battleLogic` damage reduction and server analogs | Yes |
| Set bonus: `healPowerPct/regenHpPerTurn/poisonDamagePct/poisonChancePct/fireDamagePct/burnChancePct` | Active only as combat modifier (incomplete usage breadth) | Set combat modifiers | Mostly indirect | Not base core stats | **Partial by channel** | Built in `gearSets.buildSetCombatModifiers`; only some channels clearly consumed | Medium |
| Passive skill book effects | Active only as combat modifier | Equipped passive books | Not all directly shown as stats | No (runtime effects) | Yes | `passiveResolver.resolveAttackWithPassives`, `resolveStartOfTurnPassives` | Yes |
| Active monster skill effects | Fully active in battle | Monster skill set (`physical`/`magic`) | Skill names/MP costs shown | No direct persistent stat | Yes | `monsterSkills`, battle resolver strike execution | Yes |
| `dodgePct` compatibility field | Legacy/compatibility only (mirrored) | Synced from `dodge` | Sometimes shown in older contexts | Mirrored alongside dodge | Yes only as compatibility read path | read fallbacks in dodge helpers | Medium (for legacy safety) |
| Legacy agility dodge fallback (3–25) | Legacy/compatibility only | Missing flat dodge payloads | Not directly | No | No in normal path | `combat.dodgeChance` and `server/battleDamage` fallback branch | Low in normal play |

### Direct callout on scaffolded stats (requested)

- `skillPower`: currently rolled/stored/displayed, but no strong unified application in main damage formulas.
- `healPower`: currently represented in gear/set modifiers, but not fully implemented as a consistent healing scalar across all healing systems.
- `poisonPower`: currently represented, but not fully wired as a consistent DoT strength scalar in main resolver paths.
- `firePower`: partially used through a compatibility bridge (`ladderEffectPct`), but not yet a clean, fully unified stat channel.

Design implication: these four can cause player expectation mismatch unless either fully wired or clearly labeled/hidden.

---

## 3. Monster Base Stats

Base data location:

- `utils/monsterTemplates.js` (main roster templates)
- `utils/monsterLadder/ladderMonsterCatalog.js` (ladder catalog)

Computation:

- `utils/statsCalc.js` (`computeBattleStats`)
- `utils/monsterLadder/ladderStatsCalc.js` (`computeLadderBattleStats`)

### Monster Base Stat Table

| Monster Stat | Comes From | Level Scaling? | Natural Cap? | Notes |
|-------------|------------|----------------|--------------|------|
| HP/MP | template `baseStats` + role growth + rarity flat + evolution tier | Yes | No explicit natural max table | MP finalized by `battleMpPool` |
| ATK/MAG ranges | template + growth steps + rarity + evolution | Yes | No explicit hard cap | Range kept valid via clampRange |
| DEF/MDEF ranges | template + growth + rarity | Yes | No explicit hard cap | Mitigation uses formulas, not direct % |
| Crit | template `critical` + growth + rarity + evolution | Yes | Base stat calc clamps 4–55 | Combat passives/pet can push effective chance |
| Dodge | template `dodge` + growth + rarity + evolution | Yes | No hard final cap in final package | Used as flat dodge stat |
| HitRate | optional template `hit` + growth + speed term + rarity + evolution | Yes | No hard base % cap now | Flat stat, not % |
| Agility/Speed | role speed + growth + rarity + evolution | Yes | No global hard cap | Feeds connect/miss and fallback |

Natural cap meaning in this report:

- “Natural cap” = bounds applied during base monster stat building before gear/pet finalization.
- Current code mostly uses clamp for crit and helper clamps for ranges, but does **not** enforce hard natural maxima for final combat stats like HP/ATK/DEF/dodge/hitRate.
- Final stats can exceed “natural” base values after gear/pets.

---

## 4. Equipment / Gear Stats

System files:

- `src/gameSystems/gear/gearDefinitions.js`
- `src/gameSystems/gear/gearConstants.js`
- `src/gameSystems/gear/gearGenerator.js`
- `src/gameSystems/gear/inventoryGearUtils.js`
- `src/gameSystems/gear/battleStatCalculator.js`
- `src/gameSystems/gear/gearSets.js`

### Core gear behaviors

1. Gear is equipped per monster.
2. Gear instances are unique (`instanceId`).
3. Same template can exist in multiple instances.
4. Equipped gear remains in inventory and is linked via `equippedToMonsterId`.
5. Stats are rolled at instance generation from allowed stat pool by rarity.
6. Sockets exist structurally and are rolled by rarity, but gem effects are not fully featured in this audit scope.
7. Full set bonus uses **exact `setId`**, not build type.

### Gear slots

| Slot | Number Equipped | Notes |
|------|-----------------|-------|
| Head | 1 | Single slot |
| Body | 1 | Single slot |
| Weapon | 2 | Array slot |
| Hand | 2 | Array slot |
| Legs | 2 | Array slot |

### Gear rarity

| Rarity | Stat Lines | Sockets | Obtainable From | Shop? |
|--------|------------|---------|-----------------|-------|
| Rare | 1 | 0 | Drops/chests/shop pools | Yes |
| Epic | 2 | 0–1 | Drops/chests/shop pools | Yes |
| Mythic | 3 | 1–2 | Drops/chests/special reward pools | No (shop excludes mythic) |

### 15-set / 120-template structure

Implemented in `gearDefinitions.js`:

- Rare: 5 sets x 8 pieces = 40 templates
- Epic: 5 sets x 8 pieces = 40 templates
- Mythic: 5 sets x 8 pieces = 40 templates
- Total: 15 sets, 120 templates

### Set list by rarity/build

| Rarity | Set Name | Build Type | Bonus (short) | Pieces |
|--------|----------|------------|---------------|--------|
| Rare | Iron Guard | tank | HP% + DEF% | 8 |
| Rare | Wild Fang | attack | ATK% + crit flat | 8 |
| Rare | Meadow Bloom | recovery | heal% + regen | 8 |
| Rare | Toxic Bite | poison | poison dmg/chance | 8 |
| Rare | Ember Paw | fire | fire dmg/chance | 8 |
| Epic | Dragon Guard | tank | HP% + DEF% | 8 |
| Epic | Warborn | attack | ATK% + crit flat | 8 |
| Epic | Lifebloom | recovery | heal% + regen | 8 |
| Epic | Venomfang | poison | poison dmg/chance | 8 |
| Epic | Flameheart | fire | fire dmg/chance | 8 |
| Mythic | Celestial Guardian | tank | HP% + DEF% + DR% | 8 |
| Mythic | Titan Berserker | attack | ATK% + crit flat | 8 |
| Mythic | Eternal Bloom | recovery | heal% + regen | 8 |
| Mythic | Abyss Venom | poison | poison dmg/chance | 8 |
| Mythic | Inferno King | fire | fire dmg/chance | 8 |

Exact-set confirmation:

- Full set detection requires all main categories from same `setId`.
- Mixed `setId`s do not activate full bonus.

---

## 5. Pet Stats and Pet Effects

System files:

- `src/gameSystems/pets.js`
- `src/gameSystems/petInventory.js`
- `src/gameSystems/petBonuses.js`
- `src/gameSystems/petSkills.js`
- `src/gameSystems/petCombat.js`

### Pet behavior summary

- Pets provide two kinds of effects:
  1. Final-stat adds (`hp/atk/def/spd`) via `applyPetStatBonuses`.
  2. Combat-only modifiers/effects via pet skills and `petCombatModifiers`.

- Pet rarity affects base stats and skill effect tiers.
- Pet level affects base stat values (`calculatePetStats`), not skill tier scaling.

### Pet effect table

| Pet Bonus / Effect | Adds to Final Stat? | Combat-only Modifier? | Shown in UI? | Affects Battle? | Notes |
|--------------------|---------------------|------------------------|--------------|-----------------|------|
| Pet HP | Yes | No | Yes | Yes | Added before battle |
| Pet ATK | Yes | No | Yes | Yes | Added to attack range |
| Pet DEF | Yes | No | Yes | Yes | Added to defense range |
| Pet SPD | Yes | No | Yes | Yes | Added to agility/speed |
| Pet Crit+ | No | Yes (`petCritBonusPct`) | Yes (separate chip) | Yes | Extra crit support roll |
| Pet Dodge+ | No | Yes (`petDodgeBonusPct`) | Yes (separate chip) | Yes | Extra dodge chance add |
| Pet HitRate | No direct stat found | N/A | No | No direct implementation found | |
| Pet Fire/Poison direct stat | No direct stat found | Via skill procs | Skill-level UI descriptions | Yes | Triggered procs in combat |
| Heal skill | No | Yes | Skill descriptions | Yes | Start-of-turn heal |
| Shield skill | No | Yes | Skill descriptions | Yes | Damage absorb |
| Cleanse/energy/counter | No | Yes | Skill descriptions | Yes | Runtime battle behavior |
| Lucky coins | No | Yes (`coinBonusPct`) | Not core stat panel | Reward path | Economy modifier |

Pet bonuses across modes:

- Present in fighter package for local battle paths.
- Server multiplayer also has pet combat handling in server engine path.
- Monster Rescue does not use monster-vs-monster pet combat stats.

---

## 6. Skill Books / Skills

### Two skill systems exist

1. **Monster active skills** (`utils/monsterSkills.js`)
   - Manual/AI-selected actions in battle (`physical` + `magic` list).
   - Affect damage/status directly per use.

2. **Passive skill books** (`src/gameSystems/passiveSkills.js` + `passiveInventory.js`)
   - Equip as passive effects on eligible monsters.
   - Trigger automatically during battle in `passiveResolver`.

### Skill book behavior

- Books are inventory items (`passiveSkillBooksOwned`) and are consumed when equipped.
- Equipped passives live on monster (`equippedPassives`).
- Slot limits by monster rarity:
  - common/rare: 0
  - epic: 1
  - legendary: 2
  - mythic: 3

### Skill / skill-book effects table

| Skill / Skill Book | Type | Stat Modified | Battle Effect | Passive or Active | Stacks With Gear/Pet? | Notes |
|--------------------|------|---------------|---------------|-------------------|-----------------------|------|
| Monster physical/magic skills | Active | None persistent | Damage, element, optional status | Active | Yes | MP-cost for magic |
| Blood Drain | Passive book | None persistent | Heal on hit (% max HP) | Passive | Yes | Runtime effect |
| Mirror Shell | Passive book | None persistent | Reflect damage | Passive | Yes | Runtime effect |
| Regeneration Aura | Passive book | None persistent | Start-turn heal | Passive | Yes | Runtime effect |
| Toxic Fang | Passive book | None persistent | Poison DoT proc | Passive | Yes | Chance-based |
| Inferno Curse | Passive book | None persistent | Burn + heal reduction proc | Passive | Yes | Chance-based |
| Phantom Step | Passive book | None persistent | Dodge bonus % | Passive | Yes | Added in dodge roll stage |
| Fatal Instinct | Passive book | None persistent | Crit chance bonus % | Passive | Yes | Runtime chance boost |
| Rage Core | Passive book | None persistent | Low-HP attack boost | Passive | Yes | Runtime multiplier |
| Iron Guard | Passive book | None persistent | Crit damage reduction | Passive | Yes | Defensive runtime effect |
| Mana Barrier | Passive book | None persistent | First-hit damage reduction | Passive | Yes | One-time barrier behavior |

Permanent stat increase from books:

- Not a permanent base-stat rewrite system in current implementation.
- Effects are runtime passive mechanics.

---

## 7. Final Stat Calculation Flow

Actual implemented order (main roster path):

| Step | System | What Happens | File / Function |
|------|--------|--------------|-----------------|
| 1 | Monster base | Build base + level + rarity + evolution stats | `utils/statsCalc.js` / `computeBattleStats` |
| 2 | Merge layer | Merge tier scales base stats | `utils/fighterFromOwned.js` / `scaleStatsByMergeTier` |
| 3 | Gear flats | Apply flat gear stat lines to stats | `src/gameSystems/gear/battleStatCalculator.js` / `applyFlatGearToStats` |
| 4 | Set bonus stats | Apply set %/flat stat effects | `gearSets.js` / `applyGearSetBonusToStats` |
| 5 | Set + gear combat mods | Build non-core combat modifier bundle | `battleStatCalculator.js` / `gearModifiers` |
| 6 | Pet base stats | Add pet `hp/atk/def/spd` into stats | `petBonuses.js` / `applyPetStatBonuses` |
| 7 | Pet combat mods | Attach pet crit/dodge/coin/skills modifiers | `petBonuses.js` / `buildPetCombatModifiers` |
| 8 | Runtime battle layer | Apply connect, dodge, crit, passives, pet triggers, status/DoT | `passiveResolver.js` / server equivalents |

Caps:

- Some caps occur during base assembly (example `critPct` base clamp in calc).
- Final package after gear/pets generally does not apply broad hard caps for core stats.
- Dodge chance output is clamped at formula stage (0–60).

---

## 8. HitRate and Dodge System

Current active model:

```text
rawDodgeChance = defender.dodge - attacker.hitRate
finalDodgeChance = clamp(rawDodgeChance, 0, 60)
```

Confirmed properties:

1. HitRate is flat, not a % stat.
2. HitRate is displayed as number (no `%`) in updated UI components.
3. HitRate offsets dodge only.
4. HitRate does not modify agility connect/miss roll.
5. Dodge chance uses flat formula above.
6. Clamp range is 0–60.
7. Mini-boss still applies 0.75 multiplier where relevant.
8. Legacy 3–25 fallback only executes when flat dodge is missing.

Example:

- Defender Dodge = 35
- Attacker HitRate = 12
- Final Dodge = 23%
- Mini-boss: `23 * 0.75 = 17.25%`

Deterministic verification (`npm run verify:hitrate`):

| Battle Mode | Formula Result | Observed Result | Notes |
|------------|----------------|----------------|-------|
| 1vCPU / BattleScreen | 23.000% | 22.963% | |
| Monster Ladder | 23.000% | 22.963% | |
| Monster Rescue | 23.000% | 22.963% | Rescue does not use this combat path; row from verifier baseline |
| Monster Quest | 23.000% | 22.963% | Quest combat route currently Ladder combat route |
| Mini-boss | 17.250% | 17.139% | 0.75 multiplier |
| Multiplayer server | 23.000% | 22.963% | |

Script availability:

- `npm run verify:hitrate` is configured and working.

---

## 9. Connect / Miss / Accuracy System

There is a separate connect/miss layer before dodge:

- Function: `attackHitChance`
- Current formula behavior: agility delta + magic bonus, clamped to ~76–98 range.
- HitRate is intentionally excluded.

Order:

1. Connect/miss roll
2. If connect succeeds, dodge roll (flat dodge-hitRate model)

| System | Formula / Logic | Stats Used | UI Display | Notes |
|--------|-----------------|------------|------------|------|
| Connect/Miss | Agility-based chance (clamped) | attacker/defender agility/speed; magic bonus | Not shown directly | Runs first |
| Dodge | `clamp(defender.dodge - attacker.hitRate, 0, 60)` (+ boss/pet/passive modifiers) | defender dodge, attacker hitRate, contextual modifiers | Partially shown via Dodge/HitRate stats | Runs after connect |

---

## 10. Damage Calculation

Main combat damage:

- Physical and magic use separate stat pairs.
- Defense mitigation uses formulas/scalars, not pure subtraction.
- Random variance applies.
- Crit/weak multipliers apply.
- Final damage floors to minimum positive value in main strike paths.

| Damage Component | Source | Formula / Logic | Notes |
|------------------|--------|-----------------|------|
| Physical base | attacker ATK range | resolver formula with defense scalar | `passiveResolver` / `battleLogic` |
| Magic base | attacker MAG range | resolver formula with magic defense scalar + element multiplier | |
| Defense mitigation | defender DEF/MDEF | ratio/scalar-based reduction | |
| Variance | combat balance | random multiplier band | |
| Crit | crit chance | multiply by crit multiplier | |
| Weak hit | random weak chance | reduced multiplier | |
| Set/gear DR | set modifier / gear modifier | post-calc damage reduction % | path-dependent |
| Passives | passive books | barrier, anti-crit, reflect, regen, etc. | runtime |
| Pet effects | pet combat system | dodge bonus, crit bonus, shield, counter, DoTs | runtime |
| DoT status | poison/burn | periodic HP loss by % logic | runtime status system |

Mode differences:

- Single-player uses client resolver path.
- Multiplayer server applies similar formulas but has server-side ordering (extra phantom/pet dodge checks, server passive resolver).

---

## 11. Crit System

Crit behavior:

1. Crit is percentage-like chance stat (`critPct`).
2. UI usually shows crit with `%`.
3. Crit chance comes from base stats + gear + passive/pet runtime boosts.
4. Base stat calculator clamps initial crit range; passive caps also defined.
5. Pet crit bonus is separate combat modifier that can act beyond base caps intent.
6. Crit damage multiplier is handled in combat balance/resolver.
7. Skills/passives can affect crit chance or crit damage handling.
8. Set bonuses can add crit flat (`critFlat`) on qualifying sets.

Crit vs HitRate:

- Crit: offensive chance for damage multiplier.
- HitRate: flat dodge counter-stat only.

---

## 12. Fire, Poison, Healing, and SkillPower

| Special Stat | Used For | Flat or % | Sources | Capped? | Battle Effect | Notes |
|--------------|----------|-----------|---------|---------|---------------|------|
| `firePower` | Fire damage channel | Flat stat | Gear lines | No explicit cap | Partial wiring in compatibility path | Not fully unified in all formulas |
| `poisonPower` | Poison channel | Flat stat | Gear lines | No explicit cap | Mostly scaffold in current formulas | Displayed in UI chips |
| `healPower` | Healing channel | Flat stat | Gear lines | No explicit cap | Mostly scaffold in current formulas | Set `healPowerPct` exists |
| `skillPower` | Generic skill channel | Flat stat | Gear lines | No explicit cap | Currently mostly scaffold | Displayed in UI chips |

Additional % channels from sets:

- `healPowerPct`, `poisonDamagePct`, `poisonChancePct`, `fireDamagePct`, `burnChancePct`, `regenHpPerTurn`

Design note:

- Some channels are implemented in data/model/UI but not fully consumed in final damage/heal formulas yet.

---

## 13. Set Bonus System

| Set Name | Rarity | Build Type | Activation Rule | Bonus | Applies To |
|----------|--------|------------|-----------------|-------|------------|
| Iron Guard | Rare | tank | Full main categories, exact `setId` | HP% + DEF% | final stats |
| Wild Fang | Rare | attack | same | ATK% + crit flat | final stats |
| Meadow Bloom | Rare | recovery | same | heal% + regen | combat modifiers |
| Toxic Bite | Rare | poison | same | poison dmg/chance | combat modifiers |
| Ember Paw | Rare | fire | same | fire dmg/chance | combat modifiers |
| Dragon Guard | Epic | tank | same | HP% + DEF% | final stats |
| Warborn | Epic | attack | same | ATK% + crit flat | final stats |
| Lifebloom | Epic | recovery | same | heal% + regen | combat modifiers |
| Venomfang | Epic | poison | same | poison dmg/chance | combat modifiers |
| Flameheart | Epic | fire | same | fire dmg/chance | combat modifiers |
| Celestial Guardian | Mythic | tank | same | HP% + DEF% + DR% | stats + combat |
| Titan Berserker | Mythic | attack | same | ATK% + crit flat | final stats |
| Eternal Bloom | Mythic | recovery | same | heal% + regen | combat modifiers |
| Abyss Venom | Mythic | poison | same | poison dmg/chance | combat modifiers |
| Inferno King | Mythic | fire | same | fire dmg/chance | combat modifiers |

Behavior notes:

- Multiple set bonuses are not concurrently applied by current active-set detection; one active set is selected.
- Unequipping/changing pieces updates active set detection and related bonuses.

---

## 14. Battle Mode Coverage

| Battle Mode | Uses Central Final Stats? | Uses Gear? | Uses Pets? | Uses Skill Books / Skills? | Uses HitRate/Dodge Helper? | Notes |
|-------------|---------------------------|------------|------------|-----------------------------|-----------------------------|------|
| 1vCPU | Yes (`fighterFromOwned` package) | Yes | Yes | Yes | Yes | `BattleScreen` local resolver |
| Multiplayer | Yes (server snapshot built from fighters) | Yes | Yes | Yes | Yes (server equivalent) | server path has own engine/order |
| Monster Ladder | Yes | Yes | Yes | Yes | Yes | Uses battle screen combat path |
| Monster Rescue | N/A (not monster-vs-monster combat) | N/A | N/A | N/A | N/A | Bubble shooter quest mode |
| Monster Quest | Uses quest hub routing: Ladder/Rescue | Depends on chosen quest | Depends | Depends | Depends | “Quest” is menu umbrella, not separate stat engine |
| Mini-boss | Yes | Yes | Yes | Yes | Yes | extra dodge multiplier branch |
| Future boss / placeholder | Partial/varies | Varies | Varies | Varies | Varies | check per feature branch |

---

## 15. UI Display Review

| UI Screen / Component | Stats Shown | Uses Final Stats? | Shows Gear Bonus? | Shows Pet Bonus? | Shows Set Bonus? | Issues |
|-----------------------|-------------|-------------------|-------------------|------------------|------------------|--------|
| `MonsterFinalStatsPanel` | HP/ATK/DEF/SPD/Crit/Dodge/HitRate + power chips | Yes | Yes | Yes (base + pet combat chips) | Yes (set hint) | Good clarity now |
| `MonsterStatCardOverlay` | Core stats + Crit% + Dodge + Hit Rate | Yes | Indirect note | Not explicit chips | No | Good HitRate wording |
| `PlayerBattleCard` modal | Attack/Crit/Hit/Dodge | Runtime fighter stats | No | No dedicated split | No | Compact only |
| `RewardScreen` stat panel | HP/MP/ATK/MAG/DEF/HIT RATE/AGI | Recomputed base level bundle | Not direct | Not direct | Not direct | Primarily level-up baseline view |
| `StatRoller` | HP/MP/Atk/Magic/Def/MDef/Crit/Dodge | Rolled stat bundle | No | No | No | Legacy-style helper panel |
| `MonsterLadderHubScreen` | Compact stat strings/grid | Built fighter stats | Not per-line | No explicit split | Some set context elsewhere | Good HitRate label |
| `MonsterMarketModal` | Compact stat string | Base template level stats | No | No | No | Purchase preview context |
| `MonsterLadderCollectionScreen` | Compact stat string | Ladder fighter | No | No | No | Collection summary |

Potential mismatch risk:

- Some UI screens show compact summaries and not full modifier decomposition; battle still applies additional runtime effects (passives, pet triggers, statuses).

---

## 16. Caps and Limits

| Stat / System | Cap / Limit | Applies Before Gear/Pet? | Applies After Gear/Pet? | Notes |
|---------------|-------------|---------------------------|--------------------------|------|
| Dodge chance output | 0–60 | N/A | Yes (at roll formula output) | core HitRate/Dodge clamp |
| Legacy dodge fallback | 3–25 | Only fallback | Not normal path | only when flat dodge missing |
| Connect chance | 76–98 | During roll | During roll | separate from dodge |
| Base `critPct` in stats calc | 4–55 | Yes | No strict final cap in all paths | passives define own caps too |
| Passive caps (`PASSIVE_CAPS`) | various (e.g. dodge 40, crit 60) | runtime | runtime | passive subsystem constraints |
| Gear sockets | rare 0 / epic <=1 / mythic <=2 | generation/normalize | N/A | structural inventory limit |
| Passive slots by monster rarity | 0/1/2/3 | equip-time | N/A | common/rare cannot equip passives |
| Pet level | max 60 | pet growth | N/A | pet stat progression bound |

Can gear/pet exceed natural monster caps?

- **Yes, in normal final stat package behavior** for most core stats (HP/ATK/DEF/dodge/hitRate/speed), since final layers are additive/scaling and not hard-clamped to original natural template maxima.

---

## 17. Known Legacy Fallbacks

| Legacy Logic | File | When It Triggers | Still Used In Normal Gameplay? | Safe To Remove Later? |
|--------------|------|------------------|--------------------------------|-----------------------|
| 3–25 agility dodge fallback | `src/gameBalance/combat.js`, `server/battleDamage.js` | Only when flat dodge missing | No (normal fighters include flat dodge) | Likely yes after full migration confidence |
| `dodgePct` compatibility mirror | stats builders/finalizer | compatibility with old consumers | Yes (as mirror) | Maybe later after full cleanup |
| Old resolver helpers (`resolveDiceBattleDamage`, `resolveNormalHit`, etc.) | `utils/battleLogic.js` | specific/legacy callers only | Not core main battle path | Evaluate call graph before removal |
| Ladder legacy effect hook comments | `utils/battleLogic.js` | compatibility path | Partial | Review before removal |
| Old gear references in legacy files | various older components/utilities | display/backward compatibility | Some remain | cleanup candidate |

---

## 18. Design Issues / Risk Areas

1. Dual avoidance layers (connect roll + dodge roll) can make misses feel high if not clearly messaged.
2. Crit stacking from base + gear + passives + pet can spike burst balance.
3. Healing + regen + shields + barrier passives can lengthen fights significantly.
4. Fire/poison/heal/skill power channels are partially scaffolded, which can confuse expectations if shown but not fully impactful.
5. Mixed local/server implementations require ongoing parity checks to avoid divergence.
6. Rescue being non-combat under “Quest” umbrella can create player expectation mismatch about stats relevance.
7. Some compact UI views underrepresent runtime modifiers (passive/pet/status effects).

### 18A. Design Risk / Player Confusion Audit (Requested)

Highest confusion risk comes from stats that are visible in loot/UI but not consistently meaningful in battle formulas.

| Stat / Channel | What Player Sees | Current Reality | Confusion Risk | Recommendation Option |
|---|---|---|---|---|
| `skillPower` | Appears on gear and stat chips | Stored/displayed but not clearly consumed in core damage formula | Very High | **Option A** (wire now) or **Option B** (hide until active) |
| `healPower` | Appears on gear and set context | Exists in modifier data model; not fully unified across healing outcomes | High | **Option A** preferred |
| `poisonPower` | Appears on gear/stat chips | Stored/displayed; no clear unified DoT scaling path in main resolver | High | **Option A** or **Option B** |
| `firePower` | Appears on gear/stat chips | Partially used via compatibility mapping; not cleanly unified | Medium-High | **Option A** (finish wiring) |
| Set poison/fire/heal modifier channels | Set names imply strong effect identity | Channel coverage varies by resolver path | Medium | **Option A** for consistency |
| Quest umbrella wording | “Quest” suggests one combat system | Includes Rescue (non-combat bubble mode) + Ladder combat | Medium | Clarify mode distinction in UI text/tooltips |

### 18B. Option Guidance (A/B/C) Per Scaffolded Stat

| Stat | Option A: Fully Wire Now | Option B: Hide Until Implemented | Option C: Label as Future/Scaffolded |
|---|---|---|---|
| `skillPower` | Add direct multiplier in skill damage path (client + server parity) | Remove from roll pools and UI chips temporarily | Keep visible but mark “future” (least ideal) |
| `healPower` | Apply to all healing sources (skills/passives/pet heals) with clear formula | Hide from rolls/UI if not affecting outcomes | Visible with disclaimer |
| `poisonPower` | Apply to poison DoT magnitude/proc scaling in resolver | Hide from rolls/UI | Visible with disclaimer |
| `firePower` | Replace compatibility-only usage with explicit fire/burn formula integration | Hide if incomplete | Visible with caveat |

Recommended design direction:

- For production clarity, prefer **A or B**.
- **C** is acceptable only short-term during active implementation sprint; long-term it erodes player trust in stat readability.

---

## 19. Recommended Next Steps

### Must fix now

- Keep running `npm run verify:hitrate` after combat stat changes.
- Add a short in-game tooltip clarifying connect vs dodge split (to reduce confusion).
- Confirm each displayed special stat is either active in combat or labeled as upcoming.

### Should improve soon

- Unify fire/poison/heal/skill modifier channels into explicit resolver formulas (or hide until active).
- Add detailed stat breakdown tooltip (base + gear + pet + set + passive).
- Add automated parity tests comparing client and server combat outcomes.

### Can improve later

- Build a designer stat simulator panel for tuning and balance experiments.
- Add richer battle logs exposing which layer caused avoid/crit/reduction.
- Plan legacy cleanup once telemetry confirms no old payload reliance.

---

## 19A. Player-Facing Active Stats

After the current cleanup pass, player-facing gear/stat presentation should focus on battle-proven active stats.

### Safe to show to players now

- HP
- Attack
- Defense
- Speed / Agility
- Crit
- Dodge
- HitRate

These now map directly to active battle outcomes in current formulas.

### Not safe to present as normal rolled gear stats right now

- HealPower
- FirePower
- PoisonPower
- SkillPower

Reason:

- These channels exist internally for future systems, but are not all fully and consistently consumed in current battle formulas.
- Showing them as normal “power” lines can mislead players about immediate combat impact.

Implementation direction reflected in code/report:

- Keep future channels internally for later expansion.
- Prevent them from normal player-facing gear rolls and stat-line displays until they are fully wired.

## Boss Summary

1. **Most important stats now:** HP, attack/magic, defense/magicDef, crit, dodge, and hitRate.
2. **Gear impact:** Gear is the main way to push final stats beyond monster natural baselines; set bonuses add major extra effects.
3. **Pet impact:** Pets add real stats (HP/ATK/DEF/SPD) plus separate combat modifiers (especially pet crit/dodge and trigger skills).
4. **Skill book impact:** Skill books are passive combat engines (heals, reflects, dodge/crit boosts, DoTs, barrier), not simple permanent base-stat edits.
5. **HitRate vs Dodge:** HitRate is a flat counter-stat against dodge only, not general accuracy. Dodge chance is `clamp(dodge - hitRate, 0, 60)`.
6. **Balance watch points:** Crit stacking, dual avoid layers, sustain stacking (heal/regen/shield/barrier), and partially wired special-stat channels.

