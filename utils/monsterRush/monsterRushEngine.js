/**
 * Monster Rush endless runner — pattern spawning, platforms, gaps, hazards.
 */
import { MONSTER_RUSH_PHYSICS, rushSpeedForDistance } from './monsterRushConfig';
import { obstacleTypeDef, hazardHitbox } from './monsterRushObstacles';
import { coinOffsetsForPatternItem } from './monsterRushCoinPatterns';
import {
  pickValidatedPattern,
  patternChainSpacing,
  rhythmPhase,
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
  if (anchor === 'ceiling') return 0;
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
    lastSpawnDebug: null,
    wasOnGround: true,
    shakeMs: 0,
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
const RUNWAY_SEC = 1.15;
/** How far past the right screen edge patterns may be planned. */
const SPAWN_HORIZON_SEC = 2.0;
/** First hazard appears this far past the right edge (~1s preview). */
const FIRST_PATTERN_AHEAD_SEC = 0.85;

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
  state.safeMsRemaining = 2600;
  const lead = runwayPx(state.speed);
  state.spawnCooldownPx = lead;
  state.lastPatternEndX = state.gameWidth + 48;
  state.patternsSpawned = 0;
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

function spawnPattern(state, pattern, phase = 'single') {
  const chain = patternChainSpacing(state.scrollPx, phase);
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
      });
    }
  }

  state.lastPatternEndX = baseX + pattern.width;
  state.spawnCooldownPx = pattern.recovery ?? 140;
  state.patternsSpawned = (state.patternsSpawned ?? 0) + 1;

  if (state.lastPatternId === pattern.id) {
    state.repeatPatternStreak += 1;
  } else {
    state.lastPatternId = pattern.id;
    state.repeatPatternStreak = 1;
  }
  state.lastPatternDifficulty = pattern.tier === 'hard' ? 3 : pattern.tier === 'medium' ? 2 : 1;
}

function trySpawnPattern(state) {
  if (state.spawnCooldownPx > 0) return;
  const hasWorld = state.hazards.length > 0
    || state.platforms.length > 0
    || state.gaps.length > 0;
  const horizon = spawnHorizonPx(state);
  if (hasWorld && state.lastPatternEndX > horizon + 80) return;

  if (hasWorld && state.lastPatternEndX < horizon) state.lastPatternEndX = horizon;

  const phase = rhythmPhase(state.scrollPx, state.rhythmIndex ?? 0);
  const { pattern, debug } = pickValidatedPattern(state.scrollPx, {
    lastPatternId: state.lastPatternId,
    repeatStreak: state.repeatPatternStreak,
    rhythmIndex: state.rhythmIndex ?? 0,
    gameHeight: state.gameHeight,
    distanceM: state.distanceM,
  });
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

const MAX_PARTICLES = 12;
const MAX_HAZARDS = 14;
const MAX_PLATFORMS = 8;
const MAX_GAPS = 5;
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

export function tickMonsterRush(state, dtMs) {
  if (state.awaitingStart || state.isPaused || state.isGameOver) return state;

  const dtScale = Math.min(2.5, dtMs / 16.67);
  state.elapsedMs += dtMs;
  if (state.shakeMs > 0) state.shakeMs -= dtMs;

  state.speed = rushSpeedForDistance(state.distanceM);
  const movePx = scrollPxPerFrame(state.speed, dtMs);
  state.scrollPx += movePx;
  state.distanceM = Math.floor(state.scrollPx / 10);
  state.rushPointsThisRun = Math.floor(state.distanceM / 10) + state.coinsCollected;

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
  trySpawnPattern(state);

  if (state.safeMsRemaining > 0) {
    state.safeMsRemaining = Math.max(0, state.safeMsRemaining - dtMs);
  }

  const pBox = playerCollisionBox(state);
  const hazards = state.hazards;
  for (let i = 0; i < hazards.length; i += 1) {
    const h = hazards[i];
    if (state.safeMsRemaining > 0) break;
    if (h.x > state.gameWidth + 20) continue;
    if (rectsOverlap(pBox, hazardHitbox(h))) {
      state.isGameOver = true;
      state.isRunning = false;
      state.shakeMs = 480;
      return state;
    }
  }

  for (let i = state.coins.length - 1; i >= 0; i -= 1) {
    const coin = state.coins[i];
    if (rectsOverlap(pBox, coin)) {
      state.coinsCollected += 1;
      state.rushPointsThisRun = Math.floor(state.distanceM / 10) + state.coinsCollected;
      if (state.particles.length < 4) addParticle(state, coin.x, coin.y, '+1', 280);
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
