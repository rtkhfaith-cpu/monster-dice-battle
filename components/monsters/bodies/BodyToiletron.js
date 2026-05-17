import React from 'react';
import { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigArm, RigFace, RigGlowCore, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

export default function BodyToiletron({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'toiletron-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 92, cy: 88, rx: 36, ry: 30 }}>
      <Rect x={48} y={50} width={104} height={64} rx={18} fill={p.light} stroke={stroke} strokeWidth={ST} />
      <Rect x={58} y={62} width={84} height={36} rx={12} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 48 112 Q 100 88 152 112 L 136 166 Q 100 184 64 166 Z" fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <RigGlowCore cx={100} cy={130} r={24} color={p.glow} stroke={stroke} opacity={0.25} />
      <Circle cx={100} cy={130} r={15} fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 68 44 Q 100 26 132 44" fill="none" stroke={stroke} strokeWidth={ST} strokeLinecap="round" />
      <RigArm sx={52} sy={118} ex={28} ey={112} hx={20} hy={126} stroke={stroke} fill={p.dark} />
      <RigArm sx={148} sy={118} ex={172} ey={112} hx={180} hy={126} stroke={stroke} fill={p.dark} />
      <RigLeg hipX={76} hipY={166} footX={62} footY={184} stroke={stroke} fill={p.dark} sw={4} thick />
      <RigLeg hipX={124} hipY={166} footX={138} footY={184} stroke={stroke} fill={p.dark} sw={4} thick />
      <Ellipse cx={100} cy={184} rx={54} ry={12} fill="#000" opacity={0.18} />
      <RigFace cx={100} cy={86} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.82} />
    </ShadeBody>
  );
}
