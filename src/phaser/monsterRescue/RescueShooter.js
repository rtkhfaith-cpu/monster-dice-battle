import { BUBBLE_RADIUS as DEFAULT_BUBBLE_RADIUS } from '../../../utils/monsterRescue/constants';
import { getRescueBootShooterTemplateId } from './bootConfig';
import { getMonsterImageAsset } from '../../../utils/monsterImageAssets';
import { createShinyBubble } from './bubbleVisuals';

export const RESCUE_SHOOTER_MONSTER_KEY = 'rescue_shooter_monster';

const CANNON_LENGTH = 46;
/** Gun footprint ~22×50px — monster matches cannon width */
const CANNON_VISUAL_W = 22;
const MONSTER_SIZE = CANNON_VISUAL_W;
const PREVIEW_COUNT = 3;
const PREVIEW_SCALE = 0.3;
const PREVIEW_SLOT_X = -58;
/** Monster stands to the right of the cannon (previews are on the left). */
const MONSTER_OFFSET_X = 22;
const MONSTER_FOOT_Y = 6;

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
  constructor(scene, x, y, monsterTemplateId, bubbleRadius = DEFAULT_BUBBLE_RADIUS) {
    this.scene = scene;
    this.baseX = x;
    this.baseY = y;
    this.bubbleRadius = bubbleRadius;
    this.templateId = monsterTemplateId || getRescueBootShooterTemplateId();
    this.aimAngle = -Math.PI / 2;
    this.loadedBubble = null;

    this.root = scene.add.container(x, y).setDepth(32);

    const pad = scene.add.ellipse(10, 10, 48, 16, 0x0f172a, 0.45);
    pad.setStrokeStyle(2, 0xffe6a3, 0.35);

    this.nextBubbleSlot = scene.add.container(PREVIEW_SLOT_X, 2);
    this.nextPreviewLabel = scene.add
      .text(PREVIEW_SLOT_X, -14, 'NEXT', {
        fontFamily: 'Arial',
        fontSize: '8px',
        color: '#ffe6a3',
        stroke: '#000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    /** @type {Phaser.GameObjects.Container[]} */
    this.nextPreviewBubbles = [];

    this.monsterImg = scene.add
      .image(MONSTER_OFFSET_X, MONSTER_FOOT_Y, RESCUE_SHOOTER_MONSTER_KEY)
      .setOrigin(0.5, 1);
    this.monsterImg.setDisplaySize(MONSTER_SIZE, MONSTER_SIZE);
    this.monsterImg.setVisible(false);
    this.monsterFallback = scene.add
      .text(MONSTER_OFFSET_X, 2, '🐾', { fontSize: '14px' })
      .setOrigin(0.5, 1);

    this.aimPivot = scene.add.container(0, 0);
    this.cannonGfx = scene.add.graphics();
    this.bubbleSlot = scene.add.container(0, 0);

    this.aimPivot.add([this.cannonGfx, this.bubbleSlot]);
    this.root.add([
      pad,
      this.nextPreviewLabel,
      this.nextBubbleSlot,
      this.monsterFallback,
      this.monsterImg,
      this.aimPivot,
    ]);

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
    const tipY = -CANNON_LENGTH - this.bubbleRadius * 0.35;
    this.bubbleSlot.setPosition(0, tipY);
  }

  setLoadedBubble(cell) {
    this.clearLoadedBubble();
    if (!cell) return null;
    this.loadedBubble = createShinyBubble(this.scene, cell, 40, this.bubbleRadius);
    this.bubbleSlot.add(this.loadedBubble);
    return this.loadedBubble;
  }

  clearLoadedBubble() {
    if (this.loadedBubble) {
      this.loadedBubble.destroy();
      this.loadedBubble = null;
    }
  }

  _clearPreviewBubbles() {
    for (const b of this.nextPreviewBubbles) b?.destroy();
    this.nextPreviewBubbles = [];
  }

  /**
   * Up to 3 upcoming bubbles (smaller than the loaded shot).
   * @param {import('./bubbleTypes').BubbleCell|import('./bubbleTypes').BubbleCell[]|null} cells
   */
  setNextPreview(cells) {
    this._clearPreviewBubbles();
    const list = Array.isArray(cells) ? cells.filter(Boolean) : cells ? [cells] : [];
    if (!list.length) return;

    const shown = list.slice(0, PREVIEW_COUNT);
    const gap = this.bubbleRadius * PREVIEW_SCALE * 2.15;

    shown.forEach((cell, i) => {
      const bubble = createShinyBubble(this.scene, cell, 33, this.bubbleRadius);
      bubble.setScale(PREVIEW_SCALE);
      const xOff = (i - (shown.length - 1) / 2) * gap;
      bubble.setPosition(xOff, 0);
      this.nextBubbleSlot.add(bubble);
      this.nextPreviewBubbles.push(bubble);
    });
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
    this._clearPreviewBubbles();
    this.root?.destroy();
    this.root = null;
  }
}
