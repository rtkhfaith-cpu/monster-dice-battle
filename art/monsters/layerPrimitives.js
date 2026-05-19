import React from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

/** Ground shadow — soft contact oval (menus / collection only; battle uses AnimatedMonster shadow) */
export function LayerShadow({ cx = 100, cy = 192, rx = 44, ry = 10, opacity = 0.3 }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} rx={rx * 1.08} ry={ry * 1.15} fill="#1a203a" opacity={opacity * 0.45} />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#1a203a" opacity={opacity} />
    </G>
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

/** Soft highlight blob for fake-3D shading on rounded bodies (collection / menu only) */
export function LayerBodyHighlight({ cx = 88, cy = 92, rx = 22, ry = 26, opacity = 0.32 }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffffff" opacity={opacity} />;
}

/** Core shadow on underside of mass — kept above feet, not a long ground streak */
export function LayerCoreShadow({ cx = 100, cy = 192, rx = 40, ry = 9, opacity = 0.26 }) {
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
