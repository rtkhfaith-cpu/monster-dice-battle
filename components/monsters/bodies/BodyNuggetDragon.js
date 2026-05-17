import React from 'react';
import { Circle, Ellipse, Path } from 'react-native-svg';
import { DEFAULT_ST, RigFace, RigGleam, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

export default function BodyNuggetDragon({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'nugget-dragon-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 82, cy: 118, rx: 34, ry: 28 }}>
      <Path d="M 38 116 Q 18 128 22 148 Q 46 142 54 126 Z" fill={p.accent} stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 162 116 Q 184 128 178 150 Q 154 142 146 126 Z" fill={p.accent} stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 40 118 Q 46 70 98 66 Q 156 70 166 118 Q 168 172 102 182 Q 40 174 40 118 Z" fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Ellipse cx={92} cy={138} rx={46} ry={34} fill={p.light} opacity={0.42} />
      <Path d="M 38 92 Q 24 78 22 60 Q 52 66 58 88 Z" fill={p.dark} stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 150 74 L 168 52 L 170 84 Z" fill={p.dark} stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 66 70 L 58 48 L 82 64 Z" fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 118 68 L 132 46 L 138 76 Z" fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={58} cy={126} r={6} fill={p.dark} opacity={0.35} />
      <Circle cx={128} cy={148} r={7} fill={p.dark} opacity={0.32} />
      <Path d="M 34 152 Q 18 166 8 156" fill="none" stroke={stroke} strokeWidth={ST - 1} strokeLinecap="round" />
      <RigLeg hipX={72} hipY={170} footX={62} footY={184} stroke={stroke} fill={p.base} sw={3} thick />
      <RigLeg hipX={122} hipY={170} footX={136} footY={184} stroke={stroke} fill={p.base} sw={3} thick />
      <RigGleam x1={78} y1={82} x2={122} y2={96} />
      <RigFace cx={104} cy={112} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} brawler scale={0.94} />
    </ShadeBody>
  );
}
