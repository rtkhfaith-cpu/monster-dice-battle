import { MONSTER_RUSH_PHYSICS } from './monsterRushConfig';
import { MONSTER_RUSH_DEBUG, hazardHitbox } from './monsterRushObstacles';

/**
 * Draw one Monster Rush frame to a 2D canvas (web performance path).
 */
export function drawMonsterRushFrame(ctx, state, opts = {}) {
  if (!ctx || !state) return;

  const w = state.gameWidth;
  const h = state.gameHeight;
  const scrollOffset = opts.scrollOffset ?? (state.scrollPx * 0.15) % 200;
  const groundH = Math.max(32, Math.round(h * 0.14));
  const ps = MONSTER_RUSH_PHYSICS.playerSize;
  const shakeX = state.shakeMs > 0 ? (Math.random() - 0.5) * 8 : 0;
  const shakeY = state.shakeMs > 0 ? (Math.random() - 0.5) * 6 : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.clearRect(-20, -20, w + 40, h + 40);

  ctx.fillStyle = '#7dd3fc';
  ctx.fillRect(0, 0, w, h);

  if (state.distanceM >= 1500) {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const lx = ((scrollOffset * 2 + i * 90) % (w + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(lx, 40 + i * 12);
      ctx.lineTo(lx + 50, 40 + i * 12);
      ctx.stroke();
    }
  }

  const hillY = state.groundSurfaceY - groundH - 8;
  ctx.fillStyle = 'rgba(34,197,94,0.45)';
  ctx.beginPath();
  ctx.ellipse(-scrollOffset + w * 0.3, hillY + 30, w * 0.55, 36, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(22,163,74,0.35)';
  ctx.beginPath();
  ctx.ellipse(-scrollOffset * 1.4 + w * 0.6, hillY + 44, w * 0.45, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  drawGroundWithGaps(ctx, state, w, groundH);

  for (const plat of state.platforms ?? []) {
    drawPlatform(ctx, plat);
  }

  for (const hz of state.hazards ?? []) {
    drawHazard(ctx, hz);
    if (MONSTER_RUSH_DEBUG) drawHitbox(ctx, hazardHitbox(hz));
  }

  for (const coin of state.coins ?? []) {
    ctx.font = '18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🪙', coin.x + 13, coin.y + 13);
  }

  for (const p of state.particles ?? []) {
    ctx.globalAlpha = Math.max(0, p.life / 400);
    ctx.font = p.text === '·' ? 'bold 16px system-ui' : 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = p.text === '·' ? '#d6d3d1' : '#fde047';
    ctx.textAlign = 'center';
    ctx.fillText(p.text || '+1', p.x, p.y);
    ctx.globalAlpha = 1;
  }

  const px = state.player.x;
  const py = state.player.y;
  const rot = state.player.isOnGround ? 0 : -0.14;

  ctx.save();
  ctx.translate(px + ps / 2, py + ps / 2);
  ctx.rotate(rot);
  ctx.translate(-ps / 2, -ps / 2);

  roundRect(ctx, 0, 0, ps, ps, 8);
  ctx.fillStyle = '#fef3c7';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f7c948';
  ctx.stroke();

  const img = opts.monsterImg;
  if (img?.complete && img.naturalWidth > 0) {
    const pad = 3;
    ctx.save();
    roundRect(ctx, pad, pad, ps - pad * 2, ps - pad * 2, 6);
    ctx.clip();
    ctx.drawImage(img, pad, pad, ps - pad * 2, ps - pad * 2);
    ctx.restore();
  } else {
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👾', ps / 2, ps / 2);
  }
  ctx.restore();

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
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#fff4cf';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tap · click · Space to start', w / 2, h / 2);
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillStyle = '#bfdbfe';
    ctx.fillText('Hold to jump', w / 2, h / 2 + 28);
  } else if (state.isPaused) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Paused', w / 2, h / 2);
  }

  ctx.restore();
}

function drawGroundWithGaps(ctx, state, w, groundH) {
  const y = state.groundSurfaceY;
  const gaps = [...(state.gaps ?? [])].sort((a, b) => a.x - b.x);
  let cursor = 0;

  ctx.fillStyle = '#92400e';
  for (const gap of gaps) {
    const gx = Math.max(0, gap.x);
    if (gx > cursor) {
      ctx.fillRect(cursor, y, gx - cursor, groundH);
    }
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(gx, y, gap.width, groundH + 24);
    ctx.fillStyle = '#92400e';
    cursor = gx + gap.width;
  }
  if (cursor < w) ctx.fillRect(cursor, y, w - cursor, groundH);

  ctx.fillStyle = '#fde68a';
  ctx.fillRect(0, y, w, 4);
}

function drawPlatform(ctx, plat) {
  ctx.fillStyle = plat.color || '#65a30d';
  roundRect(ctx, plat.x, plat.y, plat.width, plat.height, 4);
  ctx.fill();
  ctx.strokeStyle = plat.stroke || '#3f6212';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(134,239,172,0.45)';
  ctx.fillRect(plat.x + 4, plat.y + 3, plat.width - 8, 4);
}

function drawHazard(ctx, hz) {
  switch (hz.shape) {
    case 'spike':
    case 'ceiling_spike':
      drawSpike(ctx, hz);
      break;
    case 'top_barrier':
      drawTopBarrier(ctx, hz);
      break;
    case 'fire':
      drawBlock(ctx, hz, '🔥');
      break;
    case 'ice':
      drawBlock(ctx, hz, '❄');
      break;
    case 'rock':
      drawBlock(ctx, hz, null, true);
      break;
    case 'pillar':
      drawPillar(ctx, hz);
      break;
    default:
      drawBlock(ctx, hz, null);
  }
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
  ctx.strokeStyle = hz.stroke || '#991b1b';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawTopBarrier(ctx, hz) {
  ctx.fillStyle = hz.color || '#7c3aed';
  roundRect(ctx, hz.x, hz.y, hz.width, hz.height, 6);
  ctx.fill();
  ctx.strokeStyle = hz.stroke || '#4c1d95';
  ctx.lineWidth = 2;
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    const sx = hz.x + 8 + i * 14;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.moveTo(sx + 6, hz.y + hz.height - 4);
    ctx.lineTo(sx + 12, hz.y + hz.height - 18);
    ctx.lineTo(sx, hz.y + hz.height - 18);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPillar(ctx, hz) {
  ctx.fillStyle = hz.color || '#57534e';
  roundRect(ctx, hz.x, hz.y, hz.width, hz.height, 6);
  ctx.fill();
  ctx.strokeStyle = hz.stroke || '#292524';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBlock(ctx, hz, emoji, round = false) {
  ctx.fillStyle = hz.color || '#78716c';
  if (round) {
    ctx.beginPath();
    ctx.ellipse(hz.x + hz.width / 2, hz.y + hz.height / 2, hz.width / 2, hz.height / 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    roundRect(ctx, hz.x, hz.y, hz.width, hz.height, 8);
    ctx.fill();
  }
  ctx.strokeStyle = hz.stroke || '#44403c';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (emoji) {
    ctx.font = 'bold 14px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(emoji, hz.x + hz.width / 2, hz.y + hz.height / 2 + 2);
  }
}

function drawHitbox(ctx, box) {
  ctx.strokeStyle = 'rgba(239,68,68,0.75)';
  ctx.lineWidth = 1;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
