import React from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

/** Ground shadow — fake depth under monster */
export function LayerShadow({ cx = 100, cy = 190, rx = 58, ry = 13, opacity = 0.38 }) {
  return (
    <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#1a203a" opacity={opacity} />
  );
}

/** Theme / element aura behind body */
export function LayerAura({ color = '#a29bfe', cx = 100, cy = 118, r = 82, opacity = 0.24 }) {
  if (!color) return null;
  return (
    <G>
      <Defs>
        <RadialGradient id="monsterAuraGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity * 1.5} />
          <Stop offset="0.65" stopColor={color} stopOpacity={opacity * 0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill="url(#monsterAuraGrad)" />
    </G>
  );
}

/** Soft highlight blob for fake-3D shading on rounded bodies */
export function LayerBodyHighlight({ cx = 88, cy = 100, rx = 24, ry = 30, opacity = 0.42 }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffffff" opacity={opacity} />;
}

/** Core shadow on underside of mass */
export function LayerCoreShadow({ cx = 100, cy = 148, rx = 40, ry = 18, opacity = 0.28 }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#1a203a" opacity={opacity} />;
}

/** Cheek subsurface / magical glow */
export function LayerSubsurface({ cx, cy, r = 8, color = '#ff9eb5', opacity = 0.5 }) {
  return <Circle cx={cx} cy={cy} r={r} fill={color} opacity={opacity} />;
}

/** Vertical gradient fill helper */
export function LayerGradientDef({ id, top, bottom, mid }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0.18" y2="1">
        <Stop offset="0" stopColor={top} />
        {mid ? <Stop offset="0.5" stopColor={mid} /> : null}
        <Stop offset="1" stopColor={bottom} />
      </LinearGradient>
    </Defs>
  );
}

/** Rarity rim pulse ring (static; AnimatedMonster handles motion) */
export function LayerRarityRim({ cx = 100, cy = 110, r = 88, color = '#ffd166', opacity = 0.35 }) {
  return (
    <Circle
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={3}
      opacity={opacity}
      strokeDasharray="8 6"
    />
  );
}
