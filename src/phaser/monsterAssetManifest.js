import {
  LADDER_MONSTER_IMAGE_ASSETS,
  NORMAL_MONSTER_IMAGE_ASSETS,
  getMonsterImageAsset,
} from '../../utils/monsterImageAssets';

export const MONSTER_ASSETS = {
  ...NORMAL_MONSTER_IMAGE_ASSETS,
  ...LADDER_MONSTER_IMAGE_ASSETS,
};

export function getNormalMonsterAsset(templateId) {
  return getMonsterImageAsset(templateId);
}
