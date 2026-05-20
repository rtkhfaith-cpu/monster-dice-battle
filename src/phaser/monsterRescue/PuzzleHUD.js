export default class PuzzleHUD {
  constructor(scene) {
    this.scene = scene;
    const w = scene.scale.width;
    this.scoreText = scene.add.text(16, 12, 'Popped 0', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 3,
    }).setDepth(100);

    this.comboText = scene.add.text(w / 2, 12, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffe066',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(100);

    this.stageText = scene.add.text(w - 16, 12, 'Stage 1', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#fff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(100);

    this.shotsText = scene.add.text(w / 2, 40, 'Shots: 30', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#c4f0ff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setDepth(100);
  }

  update({ score, combo, stageLabel, shotsLeft, shotLimit, bubblesLeft }) {
    const left = typeof bubblesLeft === 'number' ? bubblesLeft : null;
    this.scoreText.setText(left != null ? `Left ${left}` : `Popped ${score}`);
    this.comboText.setText(combo > 1 ? `Combo x${combo}!` : '');
    this.stageText.setText(stageLabel);
    const danger = shotsLeft <= Math.max(3, Math.floor(shotLimit * 0.15));
    this.shotsText.setColor(danger ? '#ff6b6b' : '#c4f0ff');
    this.shotsText.setText(`Shots ${shotsLeft}/${shotLimit} · clear all`);
  }

  destroy() {
    this.scoreText?.destroy();
    this.comboText?.destroy();
    this.stageText?.destroy();
    this.shotsText?.destroy();
  }
}
