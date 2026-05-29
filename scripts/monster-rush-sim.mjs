/**
 * Headless Monster Rush sim — jump-on-start survival & time-to-first-death.
 * Run: npx tsx scripts/monster-rush-sim.mjs
 */

const rushEngine = await import('../utils/monsterRush/monsterRushEngine.js');
const rushObstacles = await import('../utils/monsterRush/monsterRushObstacles.js');
const rushConfig = await import('../utils/monsterRush/monsterRushConfig.js');

const {
  createMonsterRushRun,
  startMonsterRushRun,
  jumpMonsterRush,
  tickMonsterRush,
} = rushEngine;
const { hazardHitbox } = rushObstacles;
const { MONSTER_RUSH_PHYSICS } = rushConfig;

const DT = 16.67;
const WIDTHS = [390, 640, 800];
const HEIGHT = 360;
const TRIALS = 80;

function playerBox(state) {
  const { collisionSize, playerSize } = MONSTER_RUSH_PHYSICS;
  const pad = (playerSize - collisionSize) / 2;
  return {
    x: state.player.x + pad,
    y: state.player.y + pad,
    w: collisionSize,
    h: collisionSize,
  };
}

function runTrial(gameWidth, strategy) {
  const state = createMonsterRushRun({ gameWidth, gameHeight: HEIGHT });
  startMonsterRushRun(state);
  jumpMonsterRush(state);

  let frames = 0;
  let deathReason = null;
  let deathFrame = null;
  let firstHazardNear = null;

  while (!state.isGameOver && frames < 6000) {
    frames += 1;
    if (strategy === 'hold' && state.player.isOnGround && frames % 45 === 0) {
      jumpMonsterRush(state);
    }
    if (strategy === 'start_only' && frames === 1) {
      jumpMonsterRush(state);
    }

    const prevOver = state.isGameOver;
    tickMonsterRush(state, DT);

    if (!deathReason && state.isGameOver && !prevOver) {
      deathFrame = frames;
      const p = playerBox(state);
      for (const h of state.hazards) {
        const hb = hazardHitbox(h);
        const overlap =
          p.x < hb.x + hb.width
          && p.x + p.w > hb.x
          && p.y < hb.y + hb.height
          && p.y + p.h > hb.y;
        if (overlap && h.x < gameWidth + 40) {
          deathReason = `hazard:${h.typeId}@${Math.round(h.x)}`;
          break;
        }
      }
      if (!deathReason && state.player.y > state.groundSurfaceY + 50) {
        deathReason = 'pit_fall';
      }
      if (!deathReason) deathReason = 'unknown';
    }

    if (!firstHazardNear) {
      for (const h of state.hazards) {
        if (h.x < gameWidth && h.x + h.width > MONSTER_RUSH_PHYSICS.playerX) {
          firstHazardNear = {
            frame: frames,
            type: h.typeId,
            x: Math.round(h.x),
            distM: state.distanceM,
          };
          break;
        }
      }
    }
  }

  return {
    frames,
    distanceM: state.distanceM,
    deathFrame,
    deathReason,
    firstHazardNear,
    survived: !state.isGameOver,
  };
}

function summarize(label, results) {
  const deaths = results.filter((r) => r.deathFrame != null);
  const avgDeathFrame = deaths.length
    ? deaths.reduce((s, r) => s + r.deathFrame, 0) / deaths.length
    : null;
  const avgDist = results.reduce((s, r) => s + r.distanceM, 0) / results.length;
  const under2s = deaths.filter((r) => r.deathFrame < 120).length;
  const reasons = {};
  for (const r of deaths) {
    const key = r.deathReason?.split('@')[0] ?? 'unknown';
    reasons[key] = (reasons[key] ?? 0) + 1;
  }
  console.log(`\n${label}`);
  console.log(`  trials: ${results.length}, deaths: ${deaths.length}, survived: ${results.length - deaths.length}`);
  console.log(`  avg distance: ${avgDist.toFixed(1)}m`);
  if (avgDeathFrame != null) {
    console.log(`  avg death frame: ${avgDeathFrame.toFixed(0)} (${(avgDeathFrame * DT / 1000).toFixed(2)}s)`);
    console.log(`  deaths under 2s: ${under2s}/${deaths.length}`);
  }
  console.log(`  death reasons: ${JSON.stringify(reasons)}`);
  const near = results.map((r) => r.firstHazardNear?.frame).filter(Boolean);
  if (near.length) {
    console.log(`  first hazard near player: avg frame ${(near.reduce((a, b) => a + b, 0) / near.length).toFixed(0)}`);
  }
}

console.log('=== Monster Rush jump survival sim ===');

let fail = false;
for (const w of WIDTHS) {
  const startOnly = [];
  const hold = [];
  for (let i = 0; i < TRIALS; i += 1) {
    startOnly.push(runTrial(w, 'start_only'));
    hold.push(runTrial(w, 'hold'));
  }
  summarize(`width=${w} strategy=jump_on_start_only`, startOnly);
  summarize(`width=${w} strategy=jump_every_45f_on_ground`, hold);

  const early = startOnly.filter((r) => r.deathFrame != null && r.deathFrame < 120);
  if (early.length > TRIALS * 0.35) fail = true;
}

if (fail) console.log('\nFAIL: jump-on-start still dies too fast on many trials');
else console.log('\nPASS: jump-on-start survives long enough to react');

process.exit(fail ? 1 : 0);
