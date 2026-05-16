import React from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigArm, RigFace, RigLeg, RigPanel, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Schoolbag Golem — heavy backpack chassis, stomp feet */
export default function BodySchoolbag({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'sb-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 86, cy: 108, rx: 32, ry: 40 }}>
      <Path d="M 44 88 L 156 88 L 162 174 L 38 174 Z" fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
      <Rect x={64} y={72} width={72} height={24} rx={10} fill={p.light} stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 64 72 Q 100 48 136 72" fill="none" stroke={stroke} strokeWidth={ST - 1} />
      <RigPanel x={86} y={110} w={32} h={40} rx={5} fill={p.dark} stroke={stroke} sw={ST - 2} />
      <RigArm sx={46} sy={106} ex={26} ey={122} hx={20} hy={130} stroke={stroke} fill={p.light} />
      <RigArm sx={154} sy={106} ex={174} ey={122} hx={180} hy={130} stroke={stroke} fill={p.light} />
      <RigLeg hipX={76} hipY={168} footX={66} footY={182} stroke={stroke} fill={p.dark} sw={3} thick />
      <RigLeg hipX={124} hipY={168} footX={134} footY={182} stroke={stroke} fill={p.dark} sw={3} thick />
      <Circle cx={100} cy={84} r={7} fill={p.glow} stroke={stroke} strokeWidth={2} />
      <RigFace cx={100} cy={120} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.9} />
    </ShadeBody>
  );
}
