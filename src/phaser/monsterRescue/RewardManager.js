export default class RewardManager {
  constructor(scene) {
    this.scene = scene;
    this.bubblesCleared = 0;
    this.floatingTexts = [];
  }

  addPopScore(cells, comboMult = 1) {
    const count = cells?.length ?? 0;
    this.bubblesCleared += count;
    if (count >= 5 && comboMult > 1) {
      this._floatText(`Combo x${comboMult}!`, 0xffe066);
    }
    return count * 10;
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
      bubblesCleared: this.bubblesCleared,
      score: this.bubblesCleared * 10,
    };
  }
}
