import { BUBBLE_RADIUS } from '../../../utils/monsterRescue/constants';
import { getRescueBootShooterTemplateId } from './bootConfig';
import { getMonsterImageAsset } from '../../../utils/monsterImageAssets';
import { createShinyBubble } from './bubbleVisuals';

export const RESCUE_SHOOTER_MONSTER_KEY = 'rescue_shooter_monster';

const CANNON_LENGTH = 46;
const MONSTER_SIZE = 58;

/**
 * Puzzle Bobble–style shooter: player's monster + rotating bubble cannon (no aim line).
 */
export default class RescueShooter {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {string} [monsterTemplateId]
   */
  constructor(scene, x, y, monsterTemplateId) {
    this.scene = scene;
    this.baseX = x;
    this.baseY = y;
    this.templateId = monsterTemplateId || getRescueBootShooterTemplateId();
    this.aimAngle = -Math.PI / 2;
    this.loadedBubble = null;

    this.root = scene.add.container(x, y).setDepth(32);

    const pad = scene.add.ellipse(0, 14, 88, 28, 0x0f172a, 0.45);
    pad.setStrokeStyle(2, 0xffe6a3, 0.35);

    this.aimPivot = scene.add.container(0, 0);
    this.monsterImg = scene.add.image(0, 12, RESCUE_SHOOTER_MONSTER_KEY).setOrigin(0.5, 1);
    this.monsterImg.setDisplaySize(MONSTER_SIZE, MONSTER_SIZE);
    this.monsterImg.setVisible(false);
    this.monsterFallback = scene.add.text(0, 4, '🐾', { fontSize: '32px' }).setOrigin(0.5, 1);

    this.cannonGfx = scene.add.graphics();
    this.bubbleSlot = scene.add.container(0, 0);

    this.aimPivot.add([this.monsterFallback, this.monsterImg, this.cannonGfx, this.bubbleSlot]);
    this.root.add([pad, this.aimPivot]);

    this._drawCannon();
    this._tryLoadMonsterTexture();
  }

  _tryLoadMonsterTexture() {
    const asset = getMonsterImageAsset(this.templateId);
    if (!asset?.path) return;

    const apply = () => {
      if (!this.scene?.scene?.isActive?.()) return;
      if (this.scene.textures.exists(RESCUE_SHOOTER_MONSTER_KEY)) {
        this.monsterImg.setTexture(RESCUE_SHOOTER_MONSTER_KEY);
        this.monsterImg.setVisible(true);
        this.monsterFallback?.setVisible(false);
      }
    };

    if (this.scene.textures.exists(RESCUE_SHOOTER_MONSTER_KEY)) {
      apply();
      return;
    }

    if (this.scene.load.isLoading()) {
      this.scene.load.once('complete', apply);
    } else {
      this.scene.load.image(RESCUE_SHOOTER_MONSTER_KEY, asset.path);
      this.scene.load.once('complete', apply);
      this.scene.load.start();
    }
  }

  preloadMonster(scene) {
    const asset = getMonsterImageAsset(this.templateId);
    if (asset?.path && !scene.textures.exists(RESCUE_SHOOTER_MONSTER_KEY)) {
      scene.load.image(RESCUE_SHOOTER_MONSTER_KEY, asset.path);
    }
  }

  _drawCannon() {
    const g = this.cannonGfx;
    g.clear();
    const tipY = -CANNON_LENGTH;

    g.fillStyle(0x4a3728, 1);
    g.fillRoundedRect(-11, -8, 22, 18, 6);

    g.fillStyle(0xc9a227, 1);
    g.fillRoundedRect(-9, tipY + 8, 18, CANNON_LENGTH - 4, 8);

    g.fillStyle(0xffe566, 0.85);
    g.fillRoundedRect(-6, tipY + 12, 12, CANNON_LENGTH - 12, 6);

    g.lineStyle(2, 0xfff8e5, 0.7);
    g.strokeRoundedRect(-9, tipY + 8, 18, CANNON_LENGTH - 4, 8);

    g.fillStyle(0x8b6914, 1);
    g.fillCircle(0, 4, 10);
    g.fillStyle(0xffe566, 0.9);
    g.fillCircle(-3, 2, 4);
  }

  setAimAngle(rad) {
    this.aimAngle = rad;
    this.aimPivot.rotation = rad + Math.PI / 2;
    const tipY = -CANNON_LENGTH - BUBBLE_RADIUS * 0.35;
    this.bubbleSlot.setPosition(0, tipY);
  }

  setLoadedBubble(cell) {
    this.clearLoadedBubble();
    if (!cell) return null;
    this.loadedBubble = createShinyBubble(this.scene, cell, 40);
    this.bubbleSlot.add(this.loadedBubble);
    return this.loadedBubble;
  }

  clearLoadedBubble() {
    if (this.loadedBubble) {
      this.loadedBubble.destroy();
      this.loadedBubble = null;
    }
  }

  /** World position of muzzle / loaded bubble. */
  getMuzzleWorld() {
    const m = this.bubbleSlot.getWorldTransformMatrix();
    return { x: m.tx, y: m.ty };
  }

  getShooterWorld() {
    return { x: this.baseX, y: this.baseY };
  }

  destroy() {
    this.clearLoadedBubble();
    this.root?.destroy();
    this.root = null;
  }
}
