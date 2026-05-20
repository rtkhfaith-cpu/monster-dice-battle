export default class ComboManager {
  constructor(scene) {
    this.scene = scene;
    this.combo = 0;
    this.peak = 0;
    this.decayMs = 1400;
    this.lastPopAt = 0;
  }

  onPop(count) {
    if (count <= 0) return 0;
    const now = this.scene.time.now;
    if (now - this.lastPopAt > this.decayMs) {
      this.combo = 0;
    }
    this.combo += 1;
    this.peak = Math.max(this.peak, this.combo);
    this.lastPopAt = now;
    return this.combo;
  }

  reset() {
    this.combo = 0;
    this.peak = 0;
    this.lastPopAt = 0;
  }

  getMultiplier() {
    return 1 + Math.max(0, this.combo - 1) * 0.15;
  }
}
