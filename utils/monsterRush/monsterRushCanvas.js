import { MONSTER_RUSH_PHYSICS } from './monsterRushConfig';
import { MONSTER_RUSH_DEBUG, hazardHitbox } from './monsterRushObstacles';
import { getJumpMetricsForDebug } from './monsterRushLevelRules';
import { drawRunnerImageCover } from './monsterRushRunnerImage';

let _debugJumpMetrics;
function debugJumpMetrics() {
  if (!_debugJumpMetrics) _debugJumpMetrics = getJumpMetricsForDebug();
  return _debugJumpMetrics;
}

/**
 * Draw one Monster Rush frame to a 2D canvas (web performance path).
 * Kept light for mobile Chrome — no emoji text, minimal paths.
 */
export function drawMonsterRushFrame(ctx, state, opts = {}) {
  if (!ctx || !state) return;

  const w = state.gameWidth;
  const h = state.gameHeight;
  const scrollOffset = opts.scrollOffset ?? (state.scrollPx % (w + 160));
  const groundH = Math.max(32, Math.round(h * 0.14));
  const ps = MONSTER_RUSH_PHYSICS.playerSize;
  const simpleBg = opts.simpleBg === true;
  const shakeX = state.shakeMs > 0 ? (state.shakeMs % 8) - 4 : 0;
  const shakeY = state.shakeMs > 0 ? ((state.shakeMs * 1.3) % 6) - 3 : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(0, 0, w, h);

  const hillY = state.groundSurfaceY - groundH - 8;
  if (simpleBg) {
    ctx.fillStyle = 'rgba(34,197,94,0.42)';
    ctx.fillRect(-scrollOffset, hillY + 22, w + 140, 30);
  } else {
    ctx.fillStyle = 'rgba(34,197,94,0.45)';
    ctx.fillRect(-scrollOffset, hillY + 18, w * 2 + 120, 36);
    ctx.fillStyle = 'rgba(22,163,74,0.35)';
    ctx.fillRect(-scrollOffset * 1.35, hillY + 32, w * 2 + 120, 24);
  }

  drawGroundWithGaps(ctx, state, w, groundH);

  const platforms = state.platforms ?? [];
  for (let i = 0; i < platforms.length; i += 1) {
    drawPlatform(ctx, platforms[i]);
  }

  const hazards = state.hazards ?? [];
  for (let i = 0; i < hazards.length; i += 1) {
    const hz = hazards[i];
    if (hz.x + hz.width < -8 || hz.x > w + 40) continue;
    drawHazard(ctx, hz);
    if (MONSTER_RUSH_DEBUG) drawHitbox(ctx, hazardHitbox(hz));
  }

  const coins = state.coins ?? [];
  for (let i = 0; i < coins.length; i += 1) {
    const coin = coins[i];
    if (coin.x + coin.width < -8 || coin.x > w + 30) continue;
    drawCoin(ctx, coin);
  }

  const px = state.player.x;
  const py = state.player.y;

  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(px, py, ps, ps);
  ctx.strokeStyle = '#f7c948';
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 1, py + 1, ps - 2, ps - 2);

  const img = opts.monsterImg;
  if (img?.complete && img.naturalWidth > 0) {
    const pad = 3;
    const inner = ps - pad * 2;
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + pad, py + pad, inner, inner);
    ctx.clip();
    drawRunnerImageCover(ctx, img, px + pad, py + pad, inner);
    ctx.restore();
  } else {
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e293b';
    ctx.fillText('👾', px + ps / 2, py + ps / 2);
  }

  if (MONSTER_RUSH_DEBUG) {
    const { collisionSize, playerSize: psz } = MONSTER_RUSH_PHYSICS;
    const pad = (psz - collisionSize) / 2;
    drawHitbox(ctx, {
      x: px + pad,
      y: py + pad,
      width: collisionSize,
      height: collisionSize,
    });
  }

  if (state.awaitingStart) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#fff4cf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tap to start', w / 2, h / 2);
  } else if (state.isPaused) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Paused', w / 2, h / 2);
  }

  ctx.restore();
}

function drawCoin(ctx, coin) {
  const cx = coin.x + 13;
  const cy = coin.y + 13;
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGroundWithGaps(ctx, state, w, groundH) {
  const y = state.groundSurfaceY;
  const gaps = state.gaps ?? [];

  if (gaps.length === 0) {
    ctx.fillStyle = '#92400e';
    ctx.fillRect(0, y, w, groundH);
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(0, y, w, 4);
    return;
  }

  let cursor = 0;
  ctx.fillStyle = '#92400e';
  for (let i = 0; i < gaps.length; i += 1) {
    const gap = gaps[i];
    if (gap.x + gap.width < 0) continue;
    if (gap.x > w) break;
    const gx = Math.max(0, gap.x);
    if (gx > cursor) ctx.fillRect(cursor, y, gx - cursor, groundH);
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(gx, y, gap.width, groundH + 16);
    ctx.fillStyle = '#92400e';
    cursor = gx + gap.width;
  }
  if (cursor < w) ctx.fillRect(cursor, y, w - cursor, groundH);

  ctx.fillStyle = '#fde68a';
  ctx.fillRect(0, y, w, 4);
}

function drawPlatform(ctx, plat) {
  ctx.fillStyle = plat.color || '#86efac';
  ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
  ctx.fillStyle = '#bbf7d0';
  ctx.fillRect(plat.x, plat.y, plat.width, 4);
  ctx.strokeStyle = plat.stroke || '#15803d';
  ctx.lineWidth = 2;
  ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
}

function drawHazard(ctx, hz) {
  if (hz.shape === 'spike' || hz.shape === 'ceiling_spike') {
    drawSpike(ctx, hz);
    return;
  }
  if (hz.shape === 'fire') {
    ctx.fillStyle = hz.color || '#ea580c';
    ctx.fillRect(hz.x, hz.y + hz.height * 0.35, hz.width, hz.height * 0.65);
    ctx.beginPath();
    ctx.moveTo(hz.x + hz.width * 0.2, hz.y + hz.height * 0.4);
    ctx.lineTo(hz.x + hz.width * 0.5, hz.y);
    ctx.lineTo(hz.x + hz.width * 0.8, hz.y + hz.height * 0.4);
    ctx.closePath();
    ctx.fill();
    return;
  }
  ctx.fillStyle = hz.color || '#78716c';
  ctx.fillRect(hz.x, hz.y, hz.width, hz.height);
  ctx.strokeStyle = hz.stroke || '#44403c';
  ctx.lineWidth = 1;
  ctx.strokeRect(hz.x, hz.y, hz.width, hz.height);
}

function drawSpike(ctx, hz) {
  const { x, y, width: wd, height: ht } = hz;
  const down = hz.shape !== 'ceiling_spike';
  ctx.fillStyle = hz.color || '#dc2626';
  ctx.beginPath();
  if (down) {
    ctx.moveTo(x + wd / 2, y);
    ctx.lineTo(x + wd, y + ht);
    ctx.lineTo(x, y + ht);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + wd, y);
    ctx.lineTo(x + wd / 2, y + ht);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHitbox(ctx, box) {
  ctx.strokeStyle = 'rgba(239,68,68,0.75)';
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
}

function drawDebugHud(ctx, state, w) {
  const jm = debugJumpMetrics();
  const dbg = state.lastSpawnDebug;
  const chainGap = Math.max(0, Math.round(state.lastPatternEndX - state.gameWidth));
  const lines = [
    `jump H:${Math.round(jm.peakHeight)}px  dist:${Math.round(jm.maxJumpDistance)}px`,
    `scroll:${Math.round(jm.scrollPxPerSec)}px/s  chain:${chainGap}px`,
    dbg
      ? `pattern:${dbg.patternId} [${dbg.tier}/${dbg.phase}] ok:${dbg.passed}`
      : 'pattern:—',
  ];
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(4, 4, Math.min(w - 8, 320), lines.length * 14 + 8);
  ctx.fillStyle = '#fef08a';
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], 8, 8 + i * 14);
  }
}
