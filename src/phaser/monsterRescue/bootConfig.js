/** Stage id for the next Monster Rescue scene boot (set before Phaser.Game is constructed). */
let bootStageId = 1;

export function setRescueBootStageId(stageId) {
  bootStageId = Math.max(1, Number(stageId) || 1);
}

export function getRescueBootStageId() {
  return bootStageId;
}
