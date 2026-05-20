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

    this.timerText = scene.add.text(w / 2, 10, '2:00', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#c4f0ff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0).setDepth(100);

    this.comboText = scene.add.text(w / 2, 42, '', {
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
  }

  relayout(w) {
    this.stageText?.setX(w - 16);
    this.timerText?.setX(w / 2);
    this.comboText?.setX(w / 2);
  }

  update({
    score,
    combo,
    stageLabel,
    timeRemainingMs,
    gameTimeLimitMs,
    movesUntilPush,
    rowPushEvery,
  }) {
    this.scoreText.setText(`Popped ${score}`);
    this.comboText.setText(combo > 1 ? `Combo x${combo}!` : '');
    this.stageText.setText(stageLabel);

    const secs = Math.max(0, Math.ceil((timeRemainingMs ?? 0) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const pad = s < 10 ? `0${s}` : `${s}`;
    const lowTime =
      typeof gameTimeLimitMs === 'number' &&
      timeRemainingMs <= gameTimeLimitMs * 0.15;
    const lowPush =
      typeof movesUntilPush === 'number' &&
      typeof rowPushEvery === 'number' &&
      movesUntilPush <= Math.max(2, Math.floor(rowPushEvery * 0.25));
    this.timerText.setColor(lowTime || lowPush ? '#ff6b6b' : '#c4f0ff');
    const pushPart =
      typeof movesUntilPush === 'number' ? ` · ↑${movesUntilPush}` : '';
    this.timerText.setText(`${m}:${pad}${pushPart}`);
  }

  destroy() {
    this.scoreText?.destroy();
    this.comboText?.destroy();
    this.stageText?.destroy();
    this.timerText?.destroy();
  }
}
