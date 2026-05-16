import React from 'react';
import { Circle, Ellipse, G, Path, Polygon } from 'react-native-svg';
import {
  DEFAULT_ST,
  RigArm,
  RigFace,
  RigGleam,
  RigLeg,
  RigTail,
  ShadeBody,
} from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Cockroachsaurus — low bug-kaiju, chrome shell, twitchy legs, spiky tail */
export default function BodyCockroach({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'ck-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 84, cy: 118, rx: 28, ry: 34 }} shadow={{ cx: 100, cy: 158, rx: 48, ry: 14 }}>
      <RigTail points="28,118 12,108 8,92 18,100 26,112" fill={p.dark} stroke={stroke} />
      <RigTail points="54,130 28,124 22,100 30,112 48,120" fill={p.base} stroke={stroke} />
      <Polygon points="40,108 34,98 46,102" fill={p.dark} stroke={stroke} strokeWidth={2} />
      <Polygon points="30,100 24,90 36,94" fill={p.dark} stroke={stroke} strokeWidth={2} />
      <Ellipse cx={100} cy={132} rx={44} ry={36} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Ellipse cx={100} cy={124} rx={40} ry={30} fill={p.dark} stroke={stroke} strokeWidth={ST - 1} opacity={0.55} />
      <RigGleam x1={78} y1={108} x2={118} y2={108} />
      <RigGleam x1={82} y1={118} x2={114} y2={122} opacity={0.4} />
      <RigLeg hipX={76} hipY={150} footX={68} footY={164} stroke={stroke} fill={p.accent} />
      <RigLeg hipX={96} hipY={154} footX={92} footY={168} stroke={stroke} fill={p.accent} />
      <RigLeg hipX={116} hipY={154} footX={120} footY={168} stroke={stroke} fill={p.accent} />
      <RigLeg hipX={136} hipY={150} footX={142} footY={164} stroke={stroke} fill={p.accent} />
      <RigArm sx={70} sy={120} ex={48} ey={108} hx={42} hy={102} stroke={stroke} fill={p.light} claw />
      <RigArm sx={130} sy={120} ex={152} ey={108} hx={158} hy={102} stroke={stroke} fill={p.light} claw />
      <Circle cx={100} cy={74} r={34} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Path d="M 84 52 Q 66 34 52 40 Q 62 48 74 58" fill="none" stroke={stroke} strokeWidth={ST - 2} strokeLinecap="round" />
      <Path d="M 116 52 Q 134 34 148 40 Q 138 48 126 58" fill="none" stroke={stroke} strokeWidth={ST - 2} strokeLinecap="round" />
      <Circle cx={50} cy={38} r={6} fill={p.base} stroke={stroke} strokeWidth={2} />
      <Circle cx={150} cy={38} r={6} fill={p.base} stroke={stroke} strokeWidth={2} />
      <RigGleam x1={88} y1={62} x2={108} y2={68} />
      <RigFace cx={100} cy={76} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} />
    </ShadeBody>
  );
}
