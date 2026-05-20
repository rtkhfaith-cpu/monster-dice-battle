import { BUBBLE_RADIUS as DEFAULT_BUBBLE_RADIUS } from '../../../utils/monsterRescue/constants';
import { getRescueBootShooterTemplateId } from './bootConfig';
import { getMonsterImageAsset } from '../../../utils/monsterImageAssets';
import { createShinyBubble } from './bubbleVisuals';
import { drawSummoningPlatform } from './ShooterPlatform';

export const RESCUE_SHOOTER_MONSTER_KEY = 'rescue_shooter_monster';

const BARREL_LENGTH = 42;
const CANNON_PIVOT_Y = -10;
/** Shooter sprite scales with bubble size (fixed 24px looked tiny on larger layouts). */
const MONSTER_SIZE_MIN = 40;
const MONSTER_SIZE_MAX = 78;
const MONSTER_SIZE_PER_RADIUS = 2.35;
/** Feet sit on the stone platform ring, not the outer glow. */
const MONSTER_FOOT_ON_PLATFORM = 0.38;

export function shooterMonsterDisplaySize(bubbleRadius = DEFAULT_BUBBLE_RADIUS) {
  const raw = Math.round((bubbleRadius ?? DEFAULT_BUBBLE_RADIUS) * MONSTER_SIZE_PER_RADIUS);
  return Math.max(MONSTER_SIZE_MIN, Math.min(MONSTER_SIZE_MAX, raw));
}
const PREVIEW_COUNT = 3;
const PREVIEW_SCALE = 0.3;
const PREVIEW_SLOT_X = -58;
const GUN_BASE_HALF_W = 18;
/** Total guide length ≈ three bubble diameters */
const AIM_LINE_BUBBLE_COUNT = 3;
const AIM_DASH = 5;
const AIM_GAP = 4;

/** Silver pipe palette */
const SILVER = {
  dark: 0x6b7280,
  mid: 0xb8c0cc,
  light: 0xe8edf2,
  shine: 0xffffff,
  rim: 0x9ca3af,
};

/** Turret base palette */
const BASE = {
  stone: 0x2a1f3d,
  bronze: 0x6b4e2e,
  bronzeHi: 0x9a7344,
  gold: 0xffc04d,
  shadow: 0x120a1e,
};

/**
 * Puzzle Bobble–style shooter: summoning platform + turret base + silver cannon.
 */
export default class RescueShooter {
  constructor(scene, x, y, monsterTemplateId, bubbleRadius = DEFAULT_BUBBLE_RADIUS) {
    this.scene = scene;
    this.baseX = x;
    this.baseY = y;
    this.bubbleRadius = bubbleRadius;
    this.templateId = monsterTemplateId || getRescueBootShooterTemplateId();
    this.aimAngle = -Math.PI / 2;
    this.loadedBubble = null;

    this.root = scene.add.container(x, y).setDepth(32);

    this.platformGfx = scene.add.graphics();
    this.platformRadius = Math.max(34, bubbleRadius * 1.55);
    drawSummoningPlatform(this.platformGfx, this.platformRadius);

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
    this.nextPreviewBubbles = [];

    this.monsterImg = scene.add
      .image(0, 0, RESCUE_SHOOTER_MONSTER_KEY)
      .setOrigin(0.5, 1);
    this.monsterImg.setVisible(false);
    this.monsterFallback = scene.add
      .text(0, 0, '🐾', { fontSize: '22px' })
      .setOrigin(0.5, 1);
    this._applyMonsterSize();

    this.aimPivot = scene.add.container(0, CANNON_PIVOT_Y);
    this.aimLineGfx = scene.add.graphics();
    this.cannonGfx = scene.add.graphics();
    this.bubbleSlot = scene.add.container(0, 0);
    this.aimLineVisible = true;

    this.aimPivot.add([this.aimLineGfx, this.cannonGfx, this.bubbleSlot]);
    this.root.add([
      this.platformGfx,
      this.nextPreviewLabel,
      this.nextBubbleSlot,
      this.monsterFallback,
      this.monsterImg,
      this.aimPivot,
    ]);

    this._drawCannon();
    this._tryLoadMonsterTexture();
  }

  /**
   * Place monster to the right of the gun base, feet on the inner frame line.
   * @param {{ canvasWidth: number, frameLineLocalY: number, gunBaseRight?: number }} layout
   */
  configureLayout(layout) {
    this._layoutRef = layout;
    const gunRight = layout.gunBaseRight ?? GUN_BASE_HALF_W;
    const gap = layout.canvasWidth * 0.01;
    const monsterX = gunRight + gap;
    const footY = this._monsterFootY();

    this.monsterImg.setPosition(monsterX, footY);
    this.monsterFallback.setPosition(monsterX, footY);
    this._applyMonsterSize();
  }

  _applyMonsterSize() {
    const size = shooterMonsterDisplaySize(this.bubbleRadius);
    this.monsterImg?.setDisplaySize(size, size);
    const emojiPx = Math.max(14, Math.round(size * 0.58));
    this.monsterFallback?.setFontSize(`${emojiPx}px`);
  }

  _monsterFootY() {
    const platformR = this.platformRadius ?? 34;
    return 4 + platformR * MONSTER_FOOT_ON_PLATFORM;
  }

  setBubbleRadius(radius) {
    this.bubbleRadius = radius;
    this.platformRadius = Math.max(34, radius * 1.55);
    drawSummoningPlatform(this.platformGfx, this.platformRadius);
    this._applyMonsterSize();
    this._drawCannon();
    this.setAimAngle(this.aimAngle);
    if (this._layoutRef) this.configureLayout(this._layoutRef);
  }

  _tryLoadMonsterTexture() {
    const asset = getMonsterImageAsset(this.templateId);
    if (!asset?.path) return;

    const apply = () => {
      if (!this.scene?.scene?.isActive?.()) return;
      if (this.scene.textures.exists(RESCUE_SHOOTER_MONSTER_KEY)) {
        this.monsterImg.setTexture(RESCUE_SHOOTER_MONSTER_KEY);
        this.monsterImg.setOrigin(0.5, 1);
        this._applyMonsterSize();
        this.monsterImg.setVisible(true);
        this.monsterFallback?.setVisible(false);
        if (this._layoutRef) this.configureLayout(this._layoutRef);
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

  /** Stone/bronze swivel mount — cannon sits on top of this. */
  _drawGunBase(g) {
    const y = 6;

    g.fillStyle(BASE.shadow, 0.55);
    g.fillEllipse(0, y + 10, 34, 10);

    g.fillStyle(BASE.stone, 1);
    g.fillRoundedRect(-18, y, 36, 14, 5);

    g.fillStyle(BASE.bronze, 1);
    g.fillRoundedRect(-16, y - 2, 32, 12, 4);

    g.fillStyle(BASE.bronzeHi, 0.85);
    g.fillRoundedRect(-14, y - 1, 28, 6, 3);

    g.lineStyle(2, BASE.gold, 0.75);
    g.strokeRoundedRect(-16, y - 2, 32, 12, 4);

    g.fillStyle(0x4a3728, 1);
    g.fillRoundedRect(-12, y + 4, 24, 6, 3);

    g.fillStyle(BASE.bronzeHi, 1);
    g.fillCircle(0, y + 2, 10);

    g.fillStyle(BASE.gold, 0.9);
    g.fillCircle(0, y + 1, 6);

    g.lineStyle(1, SILVER.rim, 0.5);
    g.strokeCircle(0, y + 1, 7);

    g.fillStyle(0x1a1028, 0.6);
    g.fillCircle(-4, y, 2);
    g.fillStyle(SILVER.shine, 0.35);
    g.fillCircle(3, y - 1, 2);
  }

  /** Silver cannon barrel rising from the gun base. */
  _drawSilverBarrel(g) {
    const mountTop = -4;
    const tipY = mountTop - BARREL_LENGTH;
    const w = 16;
    const half = w / 2;

    g.fillStyle(SILVER.dark, 1);
    g.fillRoundedRect(-half, tipY, w, BARREL_LENGTH, 7);

    g.fillStyle(SILVER.mid, 1);
    g.fillRoundedRect(-half + 2, tipY + 3, w - 4, BARREL_LENGTH - 6, 6);

    g.fillStyle(SILVER.light, 0.55);
    g.fillRoundedRect(-half + 3, tipY + 5, w - 8, BARREL_LENGTH - 12, 5);

    g.fillStyle(SILVER.shine, 0.45);
    g.fillRoundedRect(-2, tipY + 10, 3, BARREL_LENGTH - 22, 2);

    g.lineStyle(2, SILVER.rim, 0.9);
    g.strokeRoundedRect(-half, tipY, w, 10, 5);

    g.fillStyle(SILVER.dark, 1);
    g.fillCircle(0, tipY + 5, 5);
    g.fillStyle(SILVER.light, 0.8);
    g.fillCircle(-1, tipY + 4, 2);

    g.lineStyle(1, BASE.gold, 0.5);
    g.strokeRoundedRect(-half + 1, mountTop - 6, w - 2, 8, 3);
  }

  _drawCannon() {
    const g = this.cannonGfx;
    g.clear();
    this._drawGunBase(g);
    this._drawSilverBarrel(g);
  }

  _muzzleLocalY() {
    const mountTop = -4;
    return mountTop - BARREL_LENGTH - this.bubbleRadius * 0.32;
  }

  _strokeDottedLine(g, x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const ux = dx / dist;
    const uy = dy / dist;
    let t = 0;
    let drawing = true;
    while (t < dist) {
      const seg = drawing ? AIM_DASH : AIM_GAP;
      const t2 = Math.min(t + seg, dist);
      if (drawing) {
        g.beginPath();
        g.moveTo(x0 + ux * t, y0 + uy * t);
        g.lineTo(x0 + ux * t2, y0 + uy * t2);
        g.strokePath();
      }
      t = t2;
      drawing = !drawing;
    }
  }

  _drawAimLine() {
    const g = this.aimLineGfx;
    g.clear();
    if (!this.aimLineVisible) return;

    const tipY = this._muzzleLocalY();
    const len = this.bubbleRadius * 2 * AIM_LINE_BUBBLE_COUNT;
    const x0 = 0;
    const y0 = tipY;
    const y1 = tipY - len;

    g.lineStyle(2, 0xffe6a3, 0.5);
    this._strokeDottedLine(g, x0, y0, x0, y1);
    g.lineStyle(1, 0xffffff, 0.25);
    this._strokeDottedLine(g, x0, y0, x0, y1);
  }

  setAimLineVisible(visible) {
    this.aimLineVisible = visible !== false;
    this._drawAimLine();
  }

  setAimAngle(rad) {
    this.aimAngle = rad;
    this.aimPivot.rotation = rad + Math.PI / 2;
    const tipY = this._muzzleLocalY();
    this.bubbleSlot.setPosition(0, tipY);
    this._drawAimLine();
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
