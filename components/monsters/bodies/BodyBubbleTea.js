import React from 'react';
import { Circle, G, Line, Path } from 'react-native-svg';
import { DEFAULT_ST, RigArm, RigFace, RigGlowCore, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Bubble Tea Slime — cup shell, boba limbs, magical glow */
export default function BodyBubbleTea({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'bt-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 86, cy: 108, rx: 28, ry: 38 }}>
      <RigGlowCore cx={100} cy={130} r={52} color={p.glow} stroke={stroke} opacity={0.18} />
      <Path d="M 58 80 L 142 80 L 152 168 L 48 168 Z" fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
      <Path d="M 84 52 L 116 52 L 116 84 L 84 84 Z" fill={p.accent} stroke={stroke} strokeWidth={ST - 1} />
      <Line x1={100} y1={52} x2={100} y2={34} stroke={stroke} strokeWidth={ST - 1} strokeLinecap="round" />
      <Circle cx={100} cy={32} r={6} fill={p.glow} stroke={stroke} strokeWidth={2} />
      <Path d="M 66 116 Q 100 124 134 116" fill="none" stroke="#fff" strokeWidth={2.5} opacity={0.5} />
      <Circle cx={40} cy={116} r={12} fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={160} cy={116} r={12} fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={76} cy={136} r={8} fill={p.accent} opacity={0.7} />
      <Circle cx={124} cy={140} r={7} fill={p.accent} opacity={0.6} />
      <RigArm sx={50} sy={106} ex={36} ey={120} hx={30} hy={128} stroke={stroke} fill={p.light} />
      <RigArm sx={150} sy={106} ex={164} ey={120} hx={170} hy={128} stroke={stroke} fill={p.light} />
      <RigLeg hipX={76} hipY={164} footX={70} footY={176} stroke={stroke} fill={p.base} />
      <RigLeg hipX={124} hipY={164} footX={130} footY={176} stroke={stroke} fill={p.base} />
      <RigFace cx={100} cy={120} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.9} />
    </ShadeBody>
  );
}
