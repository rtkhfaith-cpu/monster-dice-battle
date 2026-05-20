import { formatRescueTimeLabel } from '../../../utils/monsterRescue/difficulty';

export default class PuzzleHUD {
  constructor(scene) {
    this.scene = scene;
    const w = scene.scale.width;
    this.timerText = scene.add.text(16, 12, '5:00', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#c4f0ff',
      stroke: '#000',
      strokeThickness: 4,
    }).setDepth(100);

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
    this.comboText?.setX(w / 2);
  }

  update({
    combo,
    stageLabel,
    timeRemainingMs,
    gameTimeLimitMs,
    shotRemainingMs,
    shotTimeLimitMs,
    movesUntilPush,
    rowPushEvery,
  }) {
    this.comboText.setText(combo > 1 ? `Combo x${combo}!` : '');
    this.stageText.setText(stageLabel);

    const stageSecs = Math.max(0, Math.ceil((timeRemainingMs ?? 0) / 1000));
    const stageLabelText = formatRescueTimeLabel(stageSecs);

    const lowStage =
      typeof gameTimeLimitMs === 'number' &&
      timeRemainingMs <= gameTimeLimitMs * 0.15;
    const lowPush =
      typeof movesUntilPush === 'number' &&
      typeof rowPushEvery === 'number' &&
      movesUntilPush <= Math.max(2, Math.floor(rowPushEvery * 0.25));
    const lowShot =
      typeof shotRemainingMs === 'number' &&
      typeof shotTimeLimitMs === 'number' &&
      shotRemainingMs <= shotTimeLimitMs * 0.25;

    this.timerText.setColor(lowStage || lowPush || lowShot ? '#ff6b6b' : '#c4f0ff');

    const pushPart =
      typeof movesUntilPush === 'number' ? ` · ↑${movesUntilPush}` : '';
    const shotPart =
      typeof shotRemainingMs === 'number'
        ? ` · ${Math.ceil(shotRemainingMs / 1000)}s`
        : '';

    this.timerText.setText(`${stageLabelText}${shotPart}${pushPart}`);
  }

  destroy() {
    this.comboText?.destroy();
    this.stageText?.destroy();
    this.timerText?.destroy();
  }
}
