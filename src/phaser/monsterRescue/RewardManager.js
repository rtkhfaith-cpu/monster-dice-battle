import { BUBBLE_TYPES } from '../../../utils/monsterRescue/constants';
import { getBubbleTypeMeta } from './bubbleTypes';

export default class RewardManager {
  constructor(scene) {
    this.scene = scene;
    this.score = 0;
    this.rescued = 0;
    this.chests = 0;
    this.expOrbs = 0;
    this.gearDrops = 0;
    this.floatingTexts = [];
  }

  addPopScore(cells, comboMult = 1) {
    let gained = 0;
    for (const cell of cells) {
      const meta = getBubbleTypeMeta(cell.type);
      gained += meta.score;
      if (cell.type === BUBBLE_TYPES.MONSTER) {
        this.rescued += 1;
        this._floatText('Rescued!', 0xffd93d);
      }
      if (cell.type === BUBBLE_TYPES.CHEST) this.chests += 1;
      if (cell.type === BUBBLE_TYPES.EXP) this.expOrbs += 1;
      if (cell.type === BUBBLE_TYPES.GEAR) this.gearDrops += 1;
    }
    this.score += Math.floor(gained * comboMult);
    return gained;
  }

  _floatText(msg, color = 0xffffff) {
    const { width } = this.scene.scale;
    const t = this.scene.add
      .text(width / 2 + (Math.random() * 80 - 40), 120, msg, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.scene.tweens.add({
      targets: t,
      y: t.y - 48,
      alpha: 0,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  getSummary() {
    return {
      score: this.score,
      rescued: this.rescued,
      chests: this.chests,
      expOrbs: this.expOrbs,
      gearDrops: this.gearDrops,
    };
  }
}
