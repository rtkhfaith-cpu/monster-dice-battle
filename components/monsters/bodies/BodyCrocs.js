import React from 'react';
import { Circle, Ellipse, G, Path } from 'react-native-svg';
import { DEFAULT_ST, RigArm, RigFace, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Crocs Goblin — shoe-head alien, riverbank slick */
export default function BodyCrocs({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'cr-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 100, cy: 140, rx: 70, ry: 20 }}>
      <Path
        d="M 22 158 Q 38 186 100 190 Q 162 186 178 158 L 168 136 Q 100 124 32 136 Z"
        fill={`url(#${gid})`}
        stroke={stroke}
        strokeWidth={ST}
      />
      <Ellipse cx={100} cy={148} rx={74} ry={28} fill={p.light} stroke={stroke} strokeWidth={ST} />
      {[46, 72, 100, 128, 154].map((x) => (
        <Circle key={x} cx={x} cy={134} r={7} fill={p.glow} stroke={stroke} strokeWidth={2} />
      ))}
      <Ellipse cx={100} cy={86} rx={30} ry={34} fill={p.accent} stroke={stroke} strokeWidth={ST} />
      <Path d="M 70 60 Q 66 44 76 40 Q 86 48 80 62" fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 130 60 Q 134 44 124 40 Q 114 48 120 62" fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
      <RigArm sx={74} sy={98} ex={50} ey={110} hx={44} hy={118} stroke={stroke} fill={p.accent} />
      <RigArm sx={126} sy={98} ex={150} ey={110} hx={156} hy={118} stroke={stroke} fill={p.accent} />
      <RigLeg hipX={70} hipY={128} footX={54} footY={150} stroke={stroke} fill={p.base} sw={3} thick />
      <RigLeg hipX={130} hipY={128} footX={146} footY={150} stroke={stroke} fill={p.base} sw={3} thick />
      <RigFace cx={100} cy={88} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.95} />
    </ShadeBody>
  );
}
