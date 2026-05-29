/**
 * Monster Rush obstacle / platform type definitions.
 * hazard: kills on overlap · platform: safe to land on top · gap: missing floor
 */

export const MONSTER_RUSH_DEBUG = false;

/** @typedef {'spike'|'low_block'|'tall_pillar'|'rock'|'fire_trap'|'ice_block'|'platform'|'top_barrier'|'top_spike'|'bottom_pillar'|'top_pillar'|'gap'} RushEntityType */

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
    height: 34,
    shape: 'block',
    color: '#78716c',
    stroke: '#44403c',
    hazard: true,
    hitScale: 0.88,
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
    color: '#65a30d',
    stroke: '#3f6212',
    hazard: false,
    platform: true,
    hitScale: 1,
  },
  top_barrier: {
    width: 54,
    height: 110,
    shape: 'top_barrier',
    color: '#7c3aed',
    stroke: '#4c1d95',
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
export function hazardHitbox(entity) {
  const scale = entity.hitScale ?? 0.85;
  const w = entity.width * scale;
  const h = entity.height * scale;
  const padX = (entity.width - w) / 2;
  const padY = (entity.height - h) / 2;
  return {
    x: entity.x + padX,
    y: entity.y + padY,
    width: w,
    height: h,
  };
}
