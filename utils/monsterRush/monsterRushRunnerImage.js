/**
 * Draw / style monster art cropped into the small runner box (face/body center, not letterboxed).
 * Matches selection UI: Image resizeMode="cover" at 200% with upward offset.
 */

/** Same as runnerBoxImageStyle width/height 200%. */
export const RUNNER_BOX_COVER_ZOOM = 2;
/** Same as runnerBoxImageStyle top: '-38%'. */
export const RUNNER_BOX_TOP_BIAS = 0.38;

/**
 * CSS-like cover + zoom into a square clip (canvas).
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLImageElement} img
 * @param {number} dx
 * @param {number} dy
 * @param {number} size
 */
export function drawRunnerImageCover(ctx, img, dx, dy, size) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;

  const cover = Math.max(size / iw, size / ih);
  const scale = cover * RUNNER_BOX_COVER_ZOOM;
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = dx + (size - dw) / 2;
  const oy = dy + (size - dh) * RUNNER_BOX_TOP_BIAS;

  ctx.drawImage(img, 0, 0, iw, ih, ox, oy, dw, dh);
}

/** React Native Image style — oversized + offset so cover shows upper crop inside box. */
export const runnerBoxImageStyle = {
  position: 'absolute',
  width: `${RUNNER_BOX_COVER_ZOOM * 100}%`,
  height: `${RUNNER_BOX_COVER_ZOOM * 100}%`,
  left: `${-RUNNER_BOX_COVER_ZOOM * 50}%`,
  top: `${-RUNNER_BOX_TOP_BIAS * 100}%`,
};
