import React from 'react';
import { G, Path, Polygon, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigArm, RigFace, RigLeg, RigTail, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Lunchbox Dragon — metal chest, snack belly, flame tail */
export default function BodyLunchbox({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'lb-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 84, cy: 108, rx: 30, ry: 24 }}>
      <Polygon points="150,106 176,96 170,128 148,122" fill={p.glow} stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 164 94 Q 182 80 190 62 Q 174 78 164 92" fill={p.accent} stroke={stroke} strokeWidth={2} />
      <Rect x={48} y={90} width={104} height={76} rx={12} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Rect x={48} y={90} width={104} height={24} rx={12} fill={p.dark} stroke={stroke} strokeWidth={ST} />
      <Rect x={64} y={68} width={72} height={24} rx={6} fill={p.light} stroke={stroke} strokeWidth={ST - 1} />
      <Rect x={72} y={118} width={56} height={32} rx={6} fill={p.accent} stroke={stroke} strokeWidth={ST - 2} opacity={0.75} />
      <RigArm sx={50} sy={118} ex={28} ey={106} hx={22} hy={100} stroke={stroke} fill={p.dark} claw />
      <RigArm sx={150} sy={118} ex={172} ey={106} hx={178} hy={100} stroke={stroke} fill={p.dark} claw />
      <RigLeg hipX={76} hipY={160} footX={68} footY={172} stroke={stroke} fill={p.base} thick />
      <RigLeg hipX={124} hipY={160} footX={132} footY={172} stroke={stroke} fill={p.base} thick />
      <RigFace cx={100} cy={132} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} brawler scale={0.92} />
    </ShadeBody>
  );
}
