import React from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

/** Ground shadow — fake depth under monster */
export function LayerShadow({ cx = 100, cy = 188, rx = 52, ry = 11, opacity = 0.32 }) {
  return (
    <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#1a203a" opacity={opacity} />
  );
}

/** Theme / element aura behind body */
export function LayerAura({ color = '#a29bfe', cx = 100, cy = 118, r = 78, opacity = 0.2 }) {
  if (!color) return null;
  return (
    <G>
      <Defs>
        <RadialGradient id="monsterAuraGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={opacity * 1.4} />
          <Stop offset="0.7" stopColor={color} stopOpacity={opacity * 0.5} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={cx} cy={cy} r={r} fill="url(#monsterAuraGrad)" />
    </G>
  );
}

/** Soft highlight blob for fake-3D shading on rounded bodies */
export function LayerBodyHighlight({ cx = 88, cy = 100, rx = 22, ry = 28, opacity = 0.35 }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffffff" opacity={opacity} />;
}

/** Vertical gradient fill helper */
export function LayerGradientDef({ id, top, bottom }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0.15" y2="1">
        <Stop offset="0" stopColor={top} />
        <Stop offset="1" stopColor={bottom} />
      </LinearGradient>
    </Defs>
  );
}
