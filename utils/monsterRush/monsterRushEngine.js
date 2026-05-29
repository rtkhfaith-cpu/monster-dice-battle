/**
 * Monster Rush endless runner — pure game logic (no React).
 */
import {
  MONSTER_RUSH_PHYSICS,
  rushSpeedForDistance,
  rushDifficultyTier,
  obstaclePoolForTier,
  spawnIntervalMsForTier,
  obstacleDefById,
} from './monsterRushConfig';

let entitySeq = 0;
function nextId(prefix) {
  entitySeq += 1;
  return `${prefix}_${entitySeq}`;
}

export function createMonsterRushRun({ gameWidth, gameHeight }) {
  const { playerSize, playerX } = MONSTER_RUSH_PHYSICS;
  const groundSurfaceY = gameHeight - 40;
  const groundY = groundSurfaceY - playerSize;

  return {
    gameWidth,
    gameHeight,
    groundSurfaceY,
    isRunning: true,
    isPaused: false,
    isGameOver: false,
    distanceM: 0,
    scrollPx: 0,
    coinsCollected: 0,
    rushPointsThisRun: 0,
    speed: MONSTER_RUSH_PHYSICS.baseSpeed,
    elapsedMs: 0,
    obstacles: [],
    coins: [],
    particles: [],
    spawnTimerMs: 0,
    nextSpawnMs: 2000,
    lastObstacleRight: 0,
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

export function jumpMonsterRush(state) {
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

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function pickObstacleType(tier) {
  const pool = obstaclePoolForTier(tier);
  return pool[Math.floor(Math.random() * pool.length)];
}

function scheduleNextSpawn(state) {
  const tier = rushDifficultyTier(state.distanceM);
  const { min, max } = spawnIntervalMsForTier(tier);
  state.nextSpawnMs = min + Math.random() * (max - min);
  state.spawnTimerMs = 0;
}

function spawnObstacle(state) {
  const tier = rushDifficultyTier(state.distanceM);
  const typeId = pickObstacleType(tier);
  const def = obstacleDefById(typeId);
  const minGap = tier <= 0 ? 140 : tier === 1 ? 120 : 100;
  const startX = Math.max(state.gameWidth + 20, state.lastObstacleRight + minGap);

  const obs = {
    id: nextId('obs'),
    typeId: def.id,
    x: startX,
    y: state.groundSurfaceY - def.height,
    width: def.width,
    height: def.height,
    emoji: def.emoji,
    color: def.color,
  };
  state.obstacles.push(obs);
  state.lastObstacleRight = startX + def.width;

  if (Math.random() < 0.35 + tier * 0.05) {
    spawnCoin(state, startX + def.width * 0.3, state.player.y - 36 - Math.random() * 28);
  }
}

function spawnCoin(state, x, y) {
  state.coins.push({
    id: nextId('coin'),
    x,
    y: Math.max(24, y),
    width: 28,
    height: 28,
    spin: Math.random() * Math.PI,
  });
}

function maybeSpawnCoin(state) {
  if (Math.random() > 0.004) return;
  spawnCoin(
    state,
    state.gameWidth + 40 + Math.random() * 80,
    state.player.y - 20 - Math.random() * 50,
  );
}

export function tickMonsterRush(state, dtMs) {
  if (!state.isRunning || state.isPaused || state.isGameOver) return state;

  const dtScale = Math.min(2.5, dtMs / 16.67);
  state.elapsedMs += dtMs;

  state.speed = rushSpeedForDistance(state.distanceM);
  const movePx = state.speed * dtScale * 2.2;
  state.scrollPx += movePx;
  state.distanceM = Math.floor(state.scrollPx / 10);
  state.rushPointsThisRun = Math.floor(state.distanceM / 10) + state.coinsCollected;

  const { gravity, playerSize } = MONSTER_RUSH_PHYSICS;
  const groundY = state.groundSurfaceY - playerSize;
  state.player.velocityY += gravity * dtScale;
  state.player.y += state.player.velocityY * dtScale;
  if (state.player.y >= groundY) {
    state.player.y = groundY;
    state.player.velocityY = 0;
    state.player.isOnGround = true;
  } else {
    state.player.isOnGround = false;
  }

  for (const obs of state.obstacles) obs.x -= movePx;
  for (const coin of state.coins) {
    coin.x -= movePx;
    coin.spin += 0.12 * dtScale;
  }

  state.obstacles = state.obstacles.filter((o) => o.x + o.width > -40);
  state.coins = state.coins.filter((c) => c.x + c.width > -20);
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const p of state.particles) {
    p.life -= dtMs;
    p.x += p.vx * dtScale;
    p.y += p.vy * dtScale;
  }

  if (state.obstacles.length) {
    state.lastObstacleRight = Math.max(...state.obstacles.map((o) => o.x + o.width));
  } else {
    state.lastObstacleRight = 0;
  }

  state.spawnTimerMs += dtMs;
  if (state.spawnTimerMs >= state.nextSpawnMs) {
    spawnObstacle(state);
    scheduleNextSpawn(state);
  }
  maybeSpawnCoin(state);

  const pBox = playerCollisionBox(state);
  for (const obs of state.obstacles) {
    if (rectsOverlap(pBox, obs)) {
      state.isGameOver = true;
      state.isRunning = false;
      return state;
    }
  }

  for (let i = state.coins.length - 1; i >= 0; i -= 1) {
    const coin = state.coins[i];
    if (rectsOverlap(pBox, coin)) {
      state.coinsCollected += 1;
      state.rushPointsThisRun = Math.floor(state.distanceM / 10) + state.coinsCollected;
      state.particles.push({
        id: nextId('pt'),
        x: coin.x,
        y: coin.y,
        vx: 0,
        vy: -2,
        life: 400,
        text: '+1',
      });
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
