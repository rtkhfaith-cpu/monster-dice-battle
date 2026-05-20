/**
 * Magical summoning circle beneath the rescue shooter (arena floor anchor).
 */
export function drawSummoningPlatform(g, radius = 40) {
  const r = radius;
  const cy = 4;
  g.clear();

  g.fillStyle(0xff6b1a, 0.12);
  g.fillCircle(0, cy, r + 14);

  g.lineStyle(4, 0xffc04d, 0.35);
  g.strokeCircle(0, cy, r + 6);

  g.lineStyle(2, 0xc084fc, 0.55);
  g.strokeCircle(0, cy, r);

  g.fillStyle(0x1e1035, 0.88);
  g.fillCircle(0, cy, r - 8);

  g.fillStyle(0x4a1d6a, 0.5);
  g.fillCircle(0, cy, r - 16);

  g.lineStyle(2, 0xff8c42, 0.65);
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    const x1 = Math.cos(a) * (r - 12);
    const y1 = cy + Math.sin(a) * (r - 12);
    const x2 = Math.cos(a) * (r - 4);
    const y2 = cy + Math.sin(a) * (r - 4);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
  }

  g.lineStyle(1, 0xffe6a3, 0.4);
  g.strokeCircle(0, cy, r - 20);

  g.fillStyle(0xff6b1a, 0.25);
  g.fillEllipse(0, cy + 6, r * 0.55, 8);
}
