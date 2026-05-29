/**
 * Draw / style monster art cropped into the small runner box (face/body center, not letterboxed).
 */

/** Bias source crop toward top of sprite (0 = center, 0.35 ≈ upper body/face). */
const FACE_CROP_BIAS = 0.32;

/**
 * Center-cover crop into a square (canvas).
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

  const side = Math.min(iw, ih);
  let sx = (iw - side) / 2;
  let sy = (ih - side) / 2 - side * FACE_CROP_BIAS;
  sy = Math.max(0, Math.min(sy, ih - side));

  ctx.drawImage(img, sx, sy, side, side, dx, dy, size, size);
}

/** React Native Image style — oversized + offset so cover shows upper crop inside box. */
export const runnerBoxImageStyle = {
  position: 'absolute',
  width: '200%',
  height: '200%',
  left: '-50%',
  top: '-38%',
};
