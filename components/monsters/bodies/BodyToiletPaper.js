import React from 'react';
import { Ellipse, G, Path, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigArm, RigFace, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Toilet Paper Ninja — roll torso, sheet cape, masked eyes */
export default function BodyToiletPaper({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'tp-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 88, cy: 100, rx: 26, ry: 32 }}>
      <Path
        d="M 156 118 Q 192 102 200 80 Q 188 66 166 74 Q 156 90 156 118"
        fill={p.light}
        stroke={stroke}
        strokeWidth={ST - 2}
        opacity={0.92}
      />
      <Ellipse cx={100} cy={144} rx={42} ry={36} fill={p.dark} stroke={stroke} strokeWidth={ST} opacity={0.35} />
      <Rect x={62} y={70} width={76} height={76} rx={38} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Ellipse cx={100} cy={70} rx={38} ry={12} fill={p.dark} stroke={stroke} strokeWidth={ST - 1} />
      <Rect x={76} y={54} width={48} height={12} rx={4} fill={p.accent} stroke={stroke} strokeWidth={2} />
      <RigArm sx={60} sy={106} ex={38} ey={94} hx={32} hy={88} stroke={stroke} fill={p.base} />
      <RigArm sx={140} sy={106} ex={162} ey={94} hx={168} hy={88} stroke={stroke} fill={p.base} />
      <RigLeg hipX={80} hipY={168} footX={72} footY={178} stroke={stroke} fill={p.light} />
      <RigLeg hipX={120} hipY={168} footX={128} footY={178} stroke={stroke} fill={p.light} />
      <RigFace cx={100} cy={110} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.92} />
    </ShadeBody>
  );
}
