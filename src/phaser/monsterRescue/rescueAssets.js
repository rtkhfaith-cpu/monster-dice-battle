import { GAME_ASSETS } from '../../../utils/gameAssetPaths';
import { getRescueStage } from '../../../utils/monsterRescue/stages';

/** Phaser texture keys + paths for Monster Rescue (existing public assets). */
export const RESCUE_SCENE_ASSETS = {
  bg: { key: 'rescue_bg', path: GAME_ASSETS.monsterRescueBackground },
  chest: { key: 'rescue_chest', path: GAME_ASSETS.chestClosed },
  chestOpen: { key: 'rescue_chest_open', path: GAME_ASSETS.chestOpen },
  bomb: { key: 'rescue_bomb', path: GAME_ASSETS.battleActions.feedback.critical },
  exp: { key: 'rescue_exp', path: GAME_ASSETS.battleActions.magic },
  gear: { key: 'rescue_gear', path: GAME_ASSETS.battleActions.defend },
  popFx: { key: 'rescue_pop_fx', path: GAME_ASSETS.battleActions.feedback.hit },
};

export function preloadRescueAssets(scene, { skipBg = true } = {}) {
  Object.values(RESCUE_SCENE_ASSETS).forEach(({ key, path }) => {
    if (skipBg && key === RESCUE_SCENE_ASSETS.bg.key) return;
    if (path) scene.load.image(key, path);
  });
}

export function rescueBackgroundForStage(levelId) {
  const list = GAME_ASSETS.monsterRescueBackgrounds;
  if (!list?.length) return GAME_ASSETS.monsterRescueBackground;
  const stage = getRescueStage(levelId);
  return list[stage.bgIndex % list.length] ?? GAME_ASSETS.monsterRescueBackground;
}
