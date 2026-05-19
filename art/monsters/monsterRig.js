import React, { useContext } from 'react';
import { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { BattleShadingContext } from '../../components/monsters/BattleShadingContext';
import { LayerBodyHighlight, LayerCoreShadow, LayerGradientDef, LayerSubsurface } from './layerPrimitives';

export const DEFAULT_ST = 6;

/** @typedef {{ base: string, light: string, dark: string, accent: string, glow: string }} MonsterPalette */

/** @type {MonsterPalette} */
export const DEFAULT_MONSTER_PALETTE = {
  base: '#a29bfe',
  light: '#dfe6e9',
  dark: '#6c5ce7',
  accent: '#fdcb6e',
  glow: '#ffeaa7',
};

/**
 * Gradient wrapper + highlight + core shadow for a body mass.
 * @param {{ gradId: string, palette: MonsterPalette, highlight?: object, shadow?: object, children: React.ReactNode }} p
 */
export function ShadeBody({ gradId, palette, highlight, shadow, children }) {
  const hideContactShading = useContext(BattleShadingContext);
  const hi = highlight ?? { cx: 82, cy: 96, rx: 26, ry: 32 };
  const sh = shadow ?? { cx: 100, cy: 192, rx: 42, ry: 9 };
  return (
    <G>
      <LayerGradientDef id={gradId} top={palette.light} bottom={palette.dark} mid={palette.base} />
      {children}
      {!hideContactShading ? (
        <>
          <LayerCoreShadow {...sh} />
          <LayerBodyHighlight {...hi} />
        </>
      ) : null}
    </G>
  );
}

/** Cartoon arm: shoulder → elbow → round claw/hand */
export function RigArm({ sx, sy, ex, ey, hx, hy, stroke, fill, sw = DEFAULT_ST - 2, claw = false }) {
  return (
    <G>
      <Path
        d={`M ${sx} ${sy} Q ${(sx + ex) / 2} ${sy - 10} ${ex} ${ey}`}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={hx} cy={hy} r={claw ? 11 : 9} fill={fill} stroke={stroke} strokeWidth={sw} />
      {claw ? (
        <Path
          d={`M ${hx - 6} ${hy - 4} L ${hx} ${hy - 10} L ${hx + 6} ${hy - 4}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      ) : null}
    </G>
  );
}

/** Stub leg + chunky foot */
export function RigLeg({ hipX, hipY, footX, footY, stroke, fill, sw = DEFAULT_ST - 2, thick = false }) {
  const frx = thick ? 14 : 11;
  const fry = thick ? 7 : 6;
  return (
    <G>
      <Line x1={hipX} y1={hipY} x2={footX} y2={footY - 5} stroke={stroke} strokeWidth={sw + (thick ? 1 : 0)} strokeLinecap="round" />
      <Ellipse cx={footX} cy={footY} rx={frx} ry={fry} fill={fill} stroke={stroke} strokeWidth={sw} />
    </G>
  );
}

/** Mech panel with bolt */
export function RigPanel({ x, y, w, h, rx = 6, fill, stroke, sw = DEFAULT_ST - 1, bolts = true }) {
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={sw} />
      {bolts ? (
        <>
          <Circle cx={x + 8} cy={y + 8} r={2.5} fill="#dfe6e9" stroke={stroke} strokeWidth={1} />
          <Circle cx={x + w - 8} cy={y + 8} r={2.5} fill="#dfe6e9" stroke={stroke} strokeWidth={1} />
        </>
      ) : null}
    </G>
  );
}

/** Alien / mage glow core */
export function RigGlowCore({ cx, cy, r, color, stroke, opacity = 0.85 }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r + 6} fill={color} opacity={0.22} />
      <Circle cx={cx} cy={cy} r={r} fill={color} stroke={stroke} strokeWidth={2} opacity={opacity} />
      <Circle cx={cx - 2} cy={cy - 2} r={r * 0.35} fill="#fff" opacity={0.65} />
    </G>
  );
}

/** Spiky kaiju tail segment */
export function RigTail({ points, fill, stroke, sw = DEFAULT_ST - 1 }) {
  return <Polygon points={points} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
}

/** Chrome gleam line */
export function RigGleam({ x1, y1, x2, y2, opacity = 0.65 }) {
  const isBattle = useContext(BattleShadingContext);
  if (isBattle) return null;
  return <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={2.5} strokeLinecap="round" opacity={opacity} />;
}

/**
 * Lovable cinematic face — big eyes, shine, blush, mood.
 * @param {{ cx: number, cy: number, e?: number, m?: number, mood?: string, stroke: string, eyeWhite?: string, pupil?: string, ST?: number, scale?: number, brawler?: boolean }} p
 */
export function RigFace({
  cx,
  cy,
  m = 0,
  mood = 'neutral',
  stroke,
  eyeWhite = '#fffef8',
  pupil = '#1a1a2e',
  ST: sw = DEFAULT_ST,
  scale = 1.15,
  brawler = false,
}) {
  const eyeL = cx - 20 * scale;
  const eyeR = cx + 20 * scale;
  const eyeY = cy - 5 * scale;
  const r = 12 * scale;
  const pr = mood === 'angry' ? 4.5 : 5.5;
  const mouthY = cy + 16 * scale;
  const brow = mood === 'angry' ? 5 : 0;

  return (
    <G>
      {mood === 'angry' ? (
        <>
          <Line x1={eyeL - 10} y1={eyeY - 12} x2={eyeL + 7} y2={eyeY - 7} stroke={stroke} strokeWidth={3.5} strokeLinecap="round" />
          <Line x1={eyeR + 10} y1={eyeY - 12} x2={eyeR - 7} y2={eyeY - 7} stroke={stroke} strokeWidth={3.5} strokeLinecap="round" />
        </>
      ) : null}
      <LayerSubsurface cx={eyeL - 14} cy={eyeY + 10} r={7} color="#ff9eb5" opacity={0.45} />
      <LayerSubsurface cx={eyeR + 14} cy={eyeY + 10} r={7} color="#ff9eb5" opacity={0.45} />
      <Circle cx={eyeL} cy={eyeY} r={r} fill={eyeWhite} stroke={stroke} strokeWidth={sw - 1} />
      <Circle cx={eyeR} cy={eyeY} r={r} fill={eyeWhite} stroke={stroke} strokeWidth={sw - 1} />
      <Circle cx={eyeL + brow} cy={eyeY + 2} r={pr} fill={pupil} />
      <Circle cx={eyeR - brow} cy={eyeY + 2} r={pr} fill={pupil} />
      <Circle cx={eyeL + brow + 3} cy={eyeY - 1} r={2.2} fill="#fff" opacity={0.9} />
      <Circle cx={eyeR - brow - 3} cy={eyeY - 1} r={2.2} fill="#fff" opacity={0.9} />
      {m === 0 ? (
        <Path
          d={`M ${cx - 14 * scale} ${mouthY} Q ${cx} ${mouthY + 10 * scale} ${cx + 14 * scale} ${mouthY}`}
          fill="none"
          stroke={stroke}
          strokeWidth={sw - 1}
          strokeLinecap="round"
        />
      ) : m === 1 ? (
        <Ellipse cx={cx} cy={mouthY + 5 * scale} rx={11 * scale} ry={7 * scale} fill={stroke} />
      ) : (
        <Path
          d={`M ${cx - 11 * scale} ${mouthY + 7 * scale} Q ${cx} ${mouthY} ${cx + 11 * scale} ${mouthY + 7 * scale}`}
          fill="none"
          stroke={stroke}
          strokeWidth={sw - 1}
          strokeLinecap="round"
        />
      )}
      {brawler && mood !== 'happy' ? (
        <Path
          d={`M ${cx - 6} ${mouthY + 2} L ${cx - 2} ${mouthY + 6} L ${cx + 2} ${mouthY + 2}`}
          fill="#fff"
          stroke={stroke}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ) : null}
    </G>
  );
}

/** Ellipse torso with gradient fill */
export function RigTorso({ cx, cy, rx, ry, gradId, stroke, sw = DEFAULT_ST }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${gradId})`} stroke={stroke} strokeWidth={sw} />;
}

/** Round kaiju head */
export function RigHead({ cx, cy, r, gradId, stroke, sw = DEFAULT_ST }) {
  return <Circle cx={cx} cy={cy} r={r} fill={`url(#${gradId})`} stroke={stroke} strokeWidth={sw} />;
}

/** Chest plate with embossed detail */
export function RigChestPlate({ x, y, w, h, rx = 8, fill, stroke, sw = DEFAULT_ST - 1, children }) {
  return (
    <G>
      <Rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={stroke} strokeWidth={sw} />
      <Rect x={x + 4} y={y + 4} width={w - 8} height={h - 8} rx={Math.max(2, rx - 2)} fill="none" stroke="#fff" strokeWidth={1.5} opacity={0.35} />
      {children}
    </G>
  );
}
