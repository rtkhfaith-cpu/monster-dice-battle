import { NORMAL_MONSTER_IMAGE_ASSETS, getNormalMonsterImageAsset } from '../../utils/monsterImageAssets';

export const NORMAL_MONSTER_ASSETS = NORMAL_MONSTER_IMAGE_ASSETS;

export function getNormalMonsterAsset(templateId) {
  return getNormalMonsterImageAsset(templateId);
}
