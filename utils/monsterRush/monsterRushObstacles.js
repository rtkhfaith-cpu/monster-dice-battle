/**
 * Monster Rush obstacle / platform type definitions.
 * hazard: kills on overlap · platform: safe to land on top · gap: missing floor
 */

export const MONSTER_RUSH_DEBUG = false;

/** @typedef {'spike'|'low_block'|'tall_block'|'double_block'|'floating_barrier'|'tall_pillar'|'rock'|'fire_trap'|'ice_block'|'platform'|'step_platform'|'top_barrier'|'top_spike'|'bottom_pillar'|'top_pillar'|'gap'} RushEntityType */

export const OBSTACLE_TYPES = {
  spike: {
    width: 36,
    height: 42,
    shape: 'spike',
    color: '#dc2626',
    stroke: '#991b1b',
    hazard: true,
    hitScale: 0.82,
  },
  low_block: {
    width: 44,
    height: 36,
    shape: 'block',
    color: '#991b1b',
    stroke: '#fca5a5',
    hazard: true,
    hitScale: 0.78,
  },
  tall_block: {
    width: 52,
    height: 72,
    shape: 'block',
    color: '#7f1d1d',
    stroke: '#fecaca',
    hazard: true,
    hitScale: 0.78,
  },
  double_block: {
    width: 100,
    height: 52,
    shape: 'block',
    color: '#b91c1c',
    stroke: '#fecaca',
    hazard: true,
    hitScale: 0.78,
  },
  floating_barrier: {
    width: 48,
    height: 32,
    shape: 'fire',
    color: '#ea580c',
    stroke: '#9a3412',
    hazard: true,
    hitScale: 0.78,
  },
  step_platform: {
    width: 90,
    height: 16,
    shape: 'platform',
    color: '#22c55e',
    stroke: '#14532d',
    hazard: false,
    platform: true,
    hitScale: 1,
  },
  tall_pillar: {
    width: 42,
    height: 78,
    shape: 'pillar',
    color: '#57534e',
    stroke: '#292524',
    hazard: true,
    hitScale: 0.85,
  },
  rock: {
    width: 44,
    height: 44,
    shape: 'rock',
    color: '#a8a29e',
    stroke: '#57534e',
    hazard: true,
    hitScale: 0.86,
  },
  fire_trap: {
    width: 52,
    height: 36,
    shape: 'fire',
    color: '#f97316',
    stroke: '#c2410c',
    hazard: true,
    hitScale: 0.84,
  },
  ice_block: {
    width: 48,
    height: 48,
    shape: 'ice',
    color: '#38bdf8',
    stroke: '#0369a1',
    hazard: true,
    hitScale: 0.86,
  },
  platform: {
    width: 80,
    height: 16,
    shape: 'platform',
    color: '#86efac',
    stroke: '#15803d',
    hazard: false,
    platform: true,
    hitScale: 1,
  },
  top_barrier: {
    width: 54,
    height: 110,
    shape: 'top_barrier',
    color: '#7f1d1d',
    stroke: '#fecaca',
    hazard: true,
    anchor: 'ceiling',
    hitScale: 0.85,
  },
  top_spike: {
    width: 40,
    height: 48,
    shape: 'ceiling_spike',
    color: '#b91c1c',
    stroke: '#7f1d1d',
    hazard: true,
    anchor: 'ceiling',
    hitScale: 0.82,
  },
  bottom_pillar: {
    width: 48,
    height: 90,
    shape: 'pillar',
    color: '#57534e',
    stroke: '#292524',
    hazard: true,
    hitScale: 0.85,
  },
  top_pillar: {
    width: 48,
    height: 70,
    shape: 'pillar',
    color: '#57534e',
    stroke: '#292524',
    hazard: true,
    anchor: 'ceiling',
    hitScale: 0.85,
  },
  gap: {
    shape: 'gap',
    hazard: false,
    platform: false,
  },
};

export function obstacleTypeDef(type) {
  return OBSTACLE_TYPES[type] ?? OBSTACLE_TYPES.spike;
}

/** Shrink hitbox inside visual bounds for fair collisions. */
export function hazardHitbox(entity, ceilingThickness = 12) {
  const scale = entity.hitScale ?? 0.85;
  const isCeilingHazard = entity.anchorCeiling
    || entity.shape === 'top_barrier'
    || entity.shape === 'ceiling_spike';

  if (isCeilingHazard) {
    const w = entity.width * scale;
    const padX = (entity.width - w) / 2;
    const bottom = entity.y + entity.height;
    return {
      x: entity.x + padX,
      y: 0,
      width: w,
      height: Math.max(ceilingThickness, bottom),
    };
  }

  let w = entity.width * scale;
  let h = entity.height * scale;
  const padX = (entity.width - w) / 2;
  let padY = (entity.height - h) / 2;
  let y = entity.y + padY;

  if (entity.shape === 'spike') {
    const bodyH = h * 0.58;
    y += h - bodyH;
    h = bodyH;
    w *= 0.88;
  } else if (entity.shape === 'ceiling_spike') {
    h *= 0.58;
    w *= 0.88;
  }

  return {
    x: entity.x + padX + (entity.width * scale - w) / 2,
    y,
    width: w,
    height: h,
  };
}

/** Cached hitbox from spawn, or compute on the fly. */
export function resolveHazardHitbox(entity, ceilingThickness = 12) {
  if (entity.hitbox) return entity.hitbox;
  return hazardHitbox(entity, ceilingThickness);
}
