import React from 'react';
import { G, Line, Path, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigFace, RigGlowCore, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Homework Troll — stacked books, paper tentacles, rune eyes */
export default function BodyHomework({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'hw-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 82, cy: 100, rx: 28, ry: 36 }}>
      <Rect x={54} y={76} width={92} height={92} rx={8} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Rect x={60} y={82} width={80} height={80} rx={5} fill={p.light} stroke={stroke} strokeWidth={2} opacity={0.35} />
      <Line x1={64} y1={96} x2={136} y2={96} stroke="#fff" strokeWidth={2} opacity={0.55} />
      <Line x1={64} y1={112} x2={126} y2={112} stroke="#fff" strokeWidth={2} opacity={0.55} />
      <Line x1={64} y1={128} x2={132} y2={128} stroke="#fff" strokeWidth={2} opacity={0.55} />
      <Rect x={68} y={54} width={64} height={28} rx={5} fill={p.accent} stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 44 110 Q 22 98 18 118 Q 32 122 46 116" fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 156 110 Q 178 98 182 118 Q 168 122 154 116" fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <RigGlowCore cx={24} cy={108} r={7} color={p.glow} stroke={stroke} />
      <RigGlowCore cx={176} cy={108} r={7} color={p.glow} stroke={stroke} />
      <RigLeg hipX={80} hipY={162} footX={72} footY={174} stroke={stroke} fill={p.base} />
      <RigLeg hipX={120} hipY={162} footX={128} footY={174} stroke={stroke} fill={p.base} />
      <RigFace cx={100} cy={120} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={p.glow} ST={ST} scale={0.9} />
    </ShadeBody>
  );
}
