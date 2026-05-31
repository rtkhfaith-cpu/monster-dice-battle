/**
 * Monster Rush endless runner — pattern spawning, platforms, gaps, hazards.
 */
import { MONSTER_RUSH_PHYSICS, rushSpeedForDistance, rushThemeForDistance, MONSTER_RUSH_CEILING, RUSH_OBSTACLE_DENSITY } from './monsterRushConfig';
import { obstacleTypeDef, resolveHazardHitbox } from './monsterRushObstacles';
import { coinOffsetsForPatternItem } from './monsterRushCoinPatterns';
import {
  pickValidatedPattern,
  patternChainSpacing,
  pickRhythmPhase,
  makeRunRng,
  RECENT_PATTERN_CAP,
} from './monsterRushLevelGenerator';
import { scrollPxPerFrame, scrollPxPerSecond } from './monsterRushLevelRules';

let entitySeq = 0;
function nextId(prefix) {
  entitySeq += 1;
  return `${prefix}_${entitySeq}`;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function resolveItemY(state, item, def) {
  const g = state.groundSurfaceY;
  const h = item.height ?? def.height ?? 40;
  const anchor = item.y ?? def.anchor ?? 'ground';
  const ceilingY = state.ceilingThickness ?? MONSTER_RUSH_CEILING.thickness;
  if (anchor === 'ceiling') return ceilingY;
  if (typeof anchor === 'string' && anchor.startsWith('ground_minus_')) {
    const n = parseInt(anchor.replace('ground_minus_', ''), 10) || 0;
    return g - n - h;
  }
  return g - h;
}

function groundSurfaceForHeight(gameHeight) {
  return gameHeight - Math.max(40, Math.round(gameHeight * 0.1));
}

export function createMonsterRushRun({ gameWidth, gameHeight }) {
  const { playerSize, playerX } = MONSTER_RUSH_PHYSICS;
  const groundSurfaceY = groundSurfaceForHeight(gameHeight);
  const groundY = groundSurfaceY - playerSize;

  return {
    gameWidth,
    gameHeight,
    groundSurfaceY,
    ceilingThickness: MONSTER_RUSH_CEILING.thickness,
    awaitingStart: true,
    isRunning: false,
    isPaused: false,
    isGameOver: false,
    distanceM: 0,
    scrollPx: 0,
    coinsCollected: 0,
    rushPointsThisRun: 0,
    speed: MONSTER_RUSH_PHYSICS.baseSpeed,
    elapsedMs: 0,
    hazards: [],
    platforms: [],
    gaps: [],
    coins: [],
    particles: [],
    spawnCooldownPx: 48,
    lastPatternEndX: gameWidth + 36,
    lastPatternId: '',
    repeatPatternStreak: 0,
    lastPatternDifficulty: 1,
    rhythmIndex: 0,
    patternsSpawned: 0,
    runSeed: (Math.random() * 0xffffffff) >>> 0,
    runRng: null,
    recentPatternIds: [],
    lastRhythmPhase: '',
    lastSpawnDebug: null,
    coinStreak: 0,
    coinStreakBonus: 0,
    activeTheme: 'grass',
    wasOnGround: true,
    shakeMs: 0,
    /** Px until next random single-hurdle spawn. */
    randomHurdleCooldownPx: 90,
    /** No hazard damage until this reaches 0 (ms). */
    safeMsRemaining: 0,
    player: {
      x: playerX,
      y: groundY,
      width: playerSize,
      height: playerSize,
      velocityY: 0,
      isOnGround: true,
    },
  };
}

/** Seconds of scroll before first pattern spawn (invincibility is separate). */
const RUNWAY_SEC = 0.65;
/** How far past the right screen edge patterns may be planned. */
const SPAWN_HORIZON_SEC = 2.0;
/** First hazard appears this far past the right edge. */
const FIRST_PATTERN_AHEAD_SEC = 0.55;

function runwayPx(speedStat) {
  return Math.max(180, Math.floor(scrollPxPerSecond(speedStat) * RUNWAY_SEC));
}

function spawnHorizonPx(state) {
  return state.gameWidth + scrollPxPerSecond(state.speed) * SPAWN_HORIZON_SEC;
}

function firstPatternBaseX(state) {
  return state.gameWidth + Math.floor(scrollPxPerSecond(state.speed) * FIRST_PATTERN_AHEAD_SEC);
}

export function startMonsterRushRun(state) {
  if (!state || state.isGameOver) return false;
  if (!state.awaitingStart && state.isRunning) return true;
  state.awaitingStart = false;
  state.isRunning = true;
  state.isPaused = false;
  state.safeMsRemaining = 1800;
  state.runRng = makeRunRng(state.runSeed);
  state.recentPatternIds = [];
  state.lastRhythmPhase = '';
  const lead = runwayPx(state.speed);
  state.spawnCooldownPx = lead;
  state.lastPatternEndX = state.gameWidth + 48;
  state.patternsSpawned = 0;
  state.randomHurdleCooldownPx = lead + 120;
  return true;
}

/** Resize playfield when the arena layout changes (keeps runner on the ground). */
export function resizeMonsterRushRun(state, gameWidth, gameHeight) {
  if (!state) return;
  const { playerSize } = MONSTER_RUSH_PHYSICS;
  const prevGroundY = state.groundSurfaceY - playerSize;
  const onGround = state.player.isOnGround && Math.abs(state.player.y - prevGroundY) < 12;

  state.gameWidth = gameWidth;
  state.gameHeight = gameHeight;
  state.groundSurfaceY = groundSurfaceForHeight(gameHeight);
  const groundY = state.groundSurfaceY - playerSize;

  if (onGround) {
    state.player.y = groundY;
    state.player.velocityY = 0;
  }
}

export function jumpMonsterRush(state) {
  if (state.awaitingStart) startMonsterRushRun(state);
  if (state.awaitingStart || state.isPaused || state.isGameOver) return false;
  if (!state.player.isOnGround) return false;
  state.player.velocityY = MONSTER_RUSH_PHYSICS.jumpVelocity;
  state.player.isOnGround = false;
  return true;
}

function playerCollisionBox(state) {
  const { collisionSize, playerSize } = MONSTER_RUSH_PHYSICS;
  const pad = (playerSize - collisionSize) / 2;
  return {
    x: state.player.x + pad,
    y: state.player.y + pad,
    width: collisionSize,
    height: collisionSize,
  };
}

function spawnCoin(state, x, y) {
  state.coins.push({
    id: nextId('coin'),
    x,
    y: Math.max(20, y),
    width: 26,
    height: 26,
    spin: Math.random() * Math.PI,
  });
}

function spawnPatternCoins(state, baseX, item) {
  const offsets = coinOffsetsForPatternItem(item);
  if (!offsets) return;
  for (const off of offsets) {
    spawnCoin(state, baseX + off.x, state.groundSurfaceY - off.yOffset);
  }
}

function pushHazard(state, item) {
  const def = obstacleTypeDef(item.type);
  const w = item.width ?? def.width ?? 40;
  const h = item.height ?? def.height ?? 40;
  const x = item.x;
  const y = typeof item.y === 'number' ? item.y : resolveItemY(state, item, def);
  if (!def.hazard) return;
  state.hazards.push({
    id: nextId('hz'),
    typeId: item.type,
    x,
    y,
    width: w,
    height: h,
    shape: def.shape,
    color: def.color,
    stroke: def.stroke,
    hitScale: def.hitScale,
    anchorCeiling: def.anchor === 'ceiling' || item.y === 'ceiling',
  });
}

/** Random single hurdles between pattern chains — keeps runs unpredictable. */
const RANDOM_HURDLE_POOL = [
  { type: 'spike', weight: 28 },
  { type: 'low_block', weight: 22 },
  { type: 'rock', weight: 18 },
  { type: 'tall_block', weight: 14 },
  { type: 'fire_trap', weight: 10 },
  { type: 'ice_block', weight: 8 },
  { type: 'floating_barrier', weight: 8, y: 'ground_minus_52' },
  { type: 'top_barrier', weight: 6, y: 'ceiling', minScrollPx: 350 },
  { type: 'top_spike', weight: 5, y: 'ceiling', minScrollPx: 500 },
];

function pickRandomHurdleType(scrollPx, rng) {
  const pool = RANDOM_HURDLE_POOL.filter((e) => (e.minScrollPx ?? 0) <= scrollPx);
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return pool[0];
}

function trySpawnRandomHurdle(state) {
  if (state.safeMsRemaining > 0) return;
  if ((state.randomHurdleCooldownPx ?? 0) > 0) return;
  const rng = state.runRng ?? Math.random;
  const pick = pickRandomHurdleType(state.scrollPx, rng);
  if (!pick) return;

  const ahead = 180 + Math.floor(rng() * 160);
  const x = state.gameWidth + ahead;
  const item = {
    type: pick.type,
    x,
    y: pick.y ?? 'ground',
    width: pick.width,
    height: pick.height,
  };
  pushHazard(state, item);

  const gap = (95 + rng() * 115) / RUSH_OBSTACLE_DENSITY;
  state.randomHurdleCooldownPx = Math.max(65, Math.floor(gap));
}

function spawnPattern(state, pattern, phase = 'single') {
  const rng = state.runRng ?? Math.random;
  const chain = patternChainSpacing(state.scrollPx, phase, rng);
  const horizon = spawnHorizonPx(state);
  const hasWorld = state.hazards.length > 0
    || state.platforms.length > 0
    || state.gaps.length > 0;
  const baseX = hasWorld
    ? Math.max(horizon, state.lastPatternEndX + chain)
    : firstPatternBaseX(state);

  for (const item of pattern.items) {
    if (item.type === 'gap') {
      const gapW = item.width ?? 90;
      state.gaps.push({
        id: nextId('gap'),
        x: baseX + item.x,
        width: gapW,
      });
      continue;
    }

    if (item.type === 'coin_arc') {
      spawnPatternCoins(state, baseX + (item.x ?? 0), item);
      continue;
    }

    const def = obstacleTypeDef(item.type);
    const w = item.width ?? def.width ?? 40;
    const h = item.height ?? def.height ?? 40;
    const x = baseX + item.x;
    const y = resolveItemY(state, item, def);

    if (def.platform) {
      state.platforms.push({
        id: nextId('plat'),
        typeId: item.type,
        x,
        y,
        width: w,
        height: h,
        shape: def.shape,
        color: def.color,
        stroke: def.stroke,
      });
    } else if (def.hazard) {
      pushHazard(state, {
        type: item.type,
        x,
        y,
        width: w,
        height: h,
      });
    }
  }

  state.lastPatternEndX = baseX + pattern.width;
  state.spawnCooldownPx = Math.floor((pattern.recovery ?? 140) / RUSH_OBSTACLE_DENSITY);
  state.patternsSpawned = (state.patternsSpawned ?? 0) + 1;

  if (state.lastPatternId === pattern.id) {
    state.repeatPatternStreak += 1;
  } else {
    state.lastPatternId = pattern.id;
    state.repeatPatternStreak = 1;
    const recent = state.recentPatternIds ?? [];
    state.recentPatternIds = [pattern.id, ...recent.filter((id) => id !== pattern.id)]
      .slice(0, RECENT_PATTERN_CAP);
  }
  state.lastPatternDifficulty = pattern.tier === 'hard' ? 3 : pattern.tier === 'medium' ? 2 : 1;
}

function trySpawnPattern(state) {
  if (state.spawnCooldownPx > 0) return;
  const hasWorld = state.hazards.length > 0
    || state.platforms.length > 0
    || state.gaps.length > 0;
  const horizon = spawnHorizonPx(state);
  if (hasWorld && state.lastPatternEndX > horizon + 40) return;

  if (hasWorld && state.lastPatternEndX < horizon) state.lastPatternEndX = horizon;

  const rng = state.runRng ?? Math.random;
  const phase = pickRhythmPhase(state.scrollPx, rng, state.lastRhythmPhase ?? '');
  const { pattern, debug } = pickValidatedPattern(state.scrollPx, {
    lastPatternId: state.lastPatternId,
    repeatStreak: state.repeatPatternStreak,
    rhythmIndex: state.rhythmIndex ?? 0,
    gameHeight: state.gameHeight,
    distanceM: state.distanceM,
    patternsSpawned: state.patternsSpawned ?? 0,
    phase,
    rng,
    recentPatternIds: state.recentPatternIds ?? [],
    lastRhythmPhase: state.lastRhythmPhase ?? '',
  });
  state.lastRhythmPhase = phase;
  state.rhythmIndex = (state.rhythmIndex ?? 0) + 1;
  state.lastSpawnDebug = debug;

  spawnPattern(state, pattern, phase);
}

function playerOverGap(state) {
  const cx = state.player.x + state.player.width * 0.5;
  for (const gap of state.gaps) {
    if (cx >= gap.x + 6 && cx <= gap.x + gap.width - 6) return true;
  }
  return false;
}

function tryLandPlatforms(state, dtScale) {
  const p = state.player;
  const feet = p.y + p.height;
  const prevFeet = feet - p.velocityY * dtScale;
  if (p.velocityY < -0.5) return false;

  let landed = false;
  for (const plat of state.platforms) {
    const top = plat.y;
    const overlapX = p.x + p.width > plat.x + 6 && p.x < plat.x + plat.width - 6;
    if (!overlapX) continue;
    if (feet >= top - 2 && prevFeet <= top + 14 && p.y + p.height >= top - 8) {
      p.y = top - p.height;
      p.velocityY = 0;
      p.isOnGround = true;
      landed = true;
    }
  }
  return landed;
}

function applyGroundAndGaps(state, dtScale) {
  const { playerSize } = MONSTER_RUSH_PHYSICS;
  const groundY = state.groundSurfaceY - playerSize;
  const p = state.player;

  if (tryLandPlatforms(state, dtScale)) return;

  if (!playerOverGap(state)) {
    if (p.y >= groundY) {
      p.y = groundY;
      p.velocityY = 0;
      p.isOnGround = true;
    } else {
      p.isOnGround = false;
    }
  } else {
    p.isOnGround = false;
    if (p.y > state.groundSurfaceY + 72) {
      state.isGameOver = true;
      state.isRunning = false;
      state.shakeMs = 420;
    }
  }
}

const MAX_PARTICLES = 10;
const MAX_HAZARDS = 32;
const MAX_PLATFORMS = 8;
const MAX_GAPS = 7;
const MAX_COINS = 10;
const CULL_BEHIND = 96;
/** Keep entities this far past the right screen edge (spawn buffer). */
const CULL_AHEAD_SCREEN = 520;

function cullEntities(state) {
  const maxX = state.gameWidth + CULL_AHEAD_SCREEN;
  const minX = -CULL_BEHIND;
  state.hazards = state.hazards.filter((h) => h.x + h.width > minX && h.x < maxX);
  state.platforms = state.platforms.filter((p) => p.x + p.width > minX && p.x < maxX);
  state.gaps = state.gaps.filter((g) => g.x + g.width > minX && g.x < maxX);
  state.coins = state.coins.filter((c) => c.x + c.width > minX && c.x < maxX);
  if (state.hazards.length > MAX_HAZARDS) state.hazards.splice(0, state.hazards.length - MAX_HAZARDS);
  if (state.platforms.length > MAX_PLATFORMS) state.platforms.splice(0, state.platforms.length - MAX_PLATFORMS);
  if (state.gaps.length > MAX_GAPS) state.gaps.splice(0, state.gaps.length - MAX_GAPS);
  if (state.coins.length > MAX_COINS) state.coins.splice(0, state.coins.length - MAX_COINS);
}

function addParticle(state, x, y, text, life = 400) {
  if (state.particles.length >= MAX_PARTICLES) {
    state.particles.shift();
  }
  state.particles.push({
    id: nextId('pt'),
    x,
    y,
    vx: (Math.random() - 0.5) * 2,
    vy: -2 - Math.random(),
    life,
    text,
  });
}

function recalcRushPoints(state) {
  state.rushPointsThisRun =
    Math.floor(state.distanceM / 10) + state.coinsCollected + (state.coinStreakBonus ?? 0);
}

export function tickMonsterRush(state, dtMs) {
  if (state.awaitingStart || state.isPaused || state.isGameOver) return state;

  const dtScale = Math.min(2.5, dtMs / 16.67);
  state.elapsedMs += dtMs;
  if (state.shakeMs > 0) state.shakeMs -= dtMs;

  state.speed = rushSpeedForDistance(state.distanceM);
  const theme = rushThemeForDistance(state.distanceM);
  state.activeTheme = theme.id;
  const themeMult = theme.speedMultiplier ?? 1;
  const movePx = scrollPxPerFrame(state.speed, dtMs) * themeMult;
  state.scrollPx += movePx;
  state.distanceM = Math.floor(state.scrollPx / 10);
  recalcRushPoints(state);

  const { gravity, playerSize } = MONSTER_RUSH_PHYSICS;
  const p = state.player;

  p.velocityY += gravity * dtScale;
  p.y += p.velocityY * dtScale;

  applyGroundAndGaps(state, dtScale);

  const landedNow = p.isOnGround;
  state.wasOnGround = landedNow;

  for (const h of state.hazards) h.x -= movePx;
  for (const plat of state.platforms) plat.x -= movePx;
  for (const gap of state.gaps) gap.x -= movePx;
  for (const coin of state.coins) coin.x -= movePx;

  state.lastPatternEndX -= movePx;
  cullEntities(state);

  state.particles = state.particles.filter((pt) => pt.life > 0);
  for (const pt of state.particles) {
    pt.life -= dtMs;
    pt.x += pt.vx * dtScale;
    pt.y += pt.vy * dtScale;
  }

  state.spawnCooldownPx = Math.max(0, state.spawnCooldownPx - movePx);
  state.randomHurdleCooldownPx = Math.max(0, (state.randomHurdleCooldownPx ?? 0) - movePx);
  trySpawnRandomHurdle(state);
  trySpawnPattern(state);

  if (state.safeMsRemaining > 0) {
    state.safeMsRemaining = Math.max(0, state.safeMsRemaining - dtMs);
  }

  const pBox = playerCollisionBox(state);
  const hazards = state.hazards;
  const pRight = pBox.x + pBox.width;
  for (let i = 0; i < hazards.length; i += 1) {
    const h = hazards[i];
    if (state.safeMsRemaining > 0) continue;
    if (h.x + h.width < pBox.x - 4) continue;
    if (h.x > pBox.x + pBox.width + 4) continue;
    const box = resolveHazardHitbox(h, state.ceilingThickness);
    if (rectsOverlap(pBox, box)) {
      state.isGameOver = true;
      state.isRunning = false;
      state.shakeMs = 480;
      return state;
    }
  }

  for (let i = state.coins.length - 1; i >= 0; i -= 1) {
    const coin = state.coins[i];
    if (coin.x > pRight + 40) continue;
    if (rectsOverlap(pBox, coin)) {
      state.coinsCollected += 1;
      state.coinStreak = (state.coinStreak ?? 0) + 1;
      if (state.coinStreak >= 5 && state.coinStreak % 5 === 0) {
        state.coinStreakBonus = (state.coinStreakBonus ?? 0) + 1;
        if (state.particles.length < 4) addParticle(state, coin.x, coin.y - 8, 'STREAK!', 420);
      } else if (state.particles.length < 4) {
        addParticle(state, coin.x, coin.y, '+1', 280);
      }
      recalcRushPoints(state);
      state.coins.splice(i, 1);
    }
  }

  return state;
}

export function togglePauseMonsterRush(state) {
  if (state.isGameOver) return state;
  state.isPaused = !state.isPaused;
  return state;
}

/** Legacy alias for canvas that iterated obstacles */
export function getRenderObstacles(state) {
  return state.hazards ?? [];
}
