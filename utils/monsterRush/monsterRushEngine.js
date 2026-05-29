/**
 * Monster Rush endless runner — pattern spawning, platforms, gaps, hazards.
 */
import { MONSTER_RUSH_PHYSICS, rushSpeedForDistance, rushDifficultyTier } from './monsterRushConfig';
import { obstacleTypeDef, hazardHitbox } from './monsterRushObstacles';
import {
  pickPattern,
  patternSpacingPx,
  coinOffsetsForPatternItem,
} from './monsterRushPatterns';

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
    spawnCooldownPx: 280,
    lastPatternEndX: 0,
    lastPatternId: '',
    repeatPatternStreak: 0,
    lastPatternDifficulty: 1,
    wasOnGround: true,
    shakeMs: 0,
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

export function startMonsterRushRun(state) {
  if (!state || state.isGameOver) return false;
  if (!state.awaitingStart && state.isRunning) return true;
  state.awaitingStart = false;
  state.isRunning = true;
  state.isPaused = false;
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
  if (!state.isRunning || state.isPaused || state.isGameOver) return false;
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

function spawnPattern(state, pattern) {
  const tier = rushDifficultyTier(state.distanceM);
  const spacing = patternSpacingPx(tier);
  const baseX = Math.max(
    state.gameWidth + 60,
    state.lastPatternEndX + spacing,
  );

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
  state.spawnCooldownPx = (pattern.recovery ?? 120) + spacing * 0.35;

  if (state.lastPatternId === pattern.id) {
    state.repeatPatternStreak += 1;
  } else {
    state.lastPatternId = pattern.id;
    state.repeatPatternStreak = 1;
  }
  state.lastPatternDifficulty = pattern.difficulty;
}

function trySpawnPattern(state) {
  if (state.spawnCooldownPx > 0) return;
  const pattern = pickPattern(state.distanceM, {
    lastPatternId: state.lastPatternId,
    repeatStreak: state.repeatPatternStreak,
    lastDifficulty: state.lastPatternDifficulty,
  });
  spawnPattern(state, pattern);
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

const MAX_PARTICLES = 20;
const MAX_HAZARDS = 18;

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
  if (!state.isRunning || state.isPaused || state.isGameOver) return state;

  const dtScale = Math.min(2.5, dtMs / 16.67);
  state.elapsedMs += dtMs;
  if (state.shakeMs > 0) state.shakeMs -= dtMs;

  state.speed = rushSpeedForDistance(state.distanceM);
  const movePx = state.speed * dtScale * 2.2;
  state.scrollPx += movePx;
  state.distanceM = Math.floor(state.scrollPx / 10);
  state.rushPointsThisRun = Math.floor(state.distanceM / 10) + state.coinsCollected;

  const { gravity, playerSize } = MONSTER_RUSH_PHYSICS;
  const p = state.player;

  p.velocityY += gravity * dtScale;
  p.y += p.velocityY * dtScale;

  applyGroundAndGaps(state, dtScale);

  const landedNow = p.isOnGround;
  if (landedNow && !state.wasOnGround && p.velocityY === 0) {
    addParticle(state, p.x + playerSize / 2, p.y + playerSize, '·', 220);
  }
  state.wasOnGround = landedNow;

  for (const h of state.hazards) h.x -= movePx;
  for (const plat of state.platforms) plat.x -= movePx;
  for (const gap of state.gaps) gap.x -= movePx;
  for (const coin of state.coins) {
    coin.x -= movePx;
    coin.spin += 0.12 * dtScale;
  }

  state.hazards = state.hazards.filter((h) => h.x + h.width > -50);
  if (state.hazards.length > MAX_HAZARDS) {
    state.hazards.splice(0, state.hazards.length - MAX_HAZARDS);
  }
  state.platforms = state.platforms.filter((pl) => pl.x + pl.width > -50);
  state.gaps = state.gaps.filter((g) => g.x + g.width > -50);
  state.coins = state.coins.filter((c) => c.x + c.width > -20);

  state.particles = state.particles.filter((pt) => pt.life > 0);
  for (const pt of state.particles) {
    pt.life -= dtMs;
    pt.x += pt.vx * dtScale;
    pt.y += pt.vy * dtScale;
  }

  if (state.hazards.length) {
    state.lastPatternEndX = Math.max(
      state.lastPatternEndX,
      Math.max(...state.hazards.map((h) => h.x + h.width)),
    );
  }

  state.spawnCooldownPx = Math.max(0, state.spawnCooldownPx - movePx);
  trySpawnPattern(state);

  const pBox = playerCollisionBox(state);
  for (const h of state.hazards) {
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
      addParticle(coin.x, coin.y, '+1', 350);
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
