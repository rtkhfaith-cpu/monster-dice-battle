import React from 'react';
import { Circle, Ellipse, G, Path } from 'react-native-svg';
import { DEFAULT_ST, RigArm, RigFace, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Fallback poop silhouette */
export default function BodyPoop({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'po-body';
  return (
    <ShadeBody gradId={gid} palette={p}>
      <Ellipse cx={100} cy={158} rx={44} ry={28} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Ellipse cx={100} cy={128} rx={36} ry={26} fill={p.base} stroke={stroke} strokeWidth={ST} />
      <Ellipse cx={100} cy={100} rx={28} ry={22} fill={p.light} stroke={stroke} strokeWidth={ST} />
      <Path d="M 90 76 Q 100 56 110 76 L 106 84 Q 100 68 94 84 Z" fill={p.dark} stroke={stroke} strokeWidth={ST - 1} />
      <RigArm sx={70} sy={118} ex={50} ey={108} hx={44} hy={104} stroke={stroke} fill={p.base} />
      <RigArm sx={130} sy={118} ex={150} ey={108} hx={156} hy={104} stroke={stroke} fill={p.base} />
      <RigLeg hipX={82} hipY={168} footX={76} footY={178} stroke={stroke} fill={p.dark} />
      <RigLeg hipX={118} hipY={168} footX={124} footY={178} stroke={stroke} fill={p.dark} />
      <RigFace cx={100} cy={108} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.88} />
    </ShadeBody>
  );
}
