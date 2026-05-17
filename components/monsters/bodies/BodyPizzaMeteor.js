import React from 'react';
import { Circle, Ellipse, Path } from 'react-native-svg';
import { DEFAULT_ST, RigFace, RigGleam, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

export default function BodyPizzaMeteor({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'pizza-meteor-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 92, cy: 86, rx: 36, ry: 28 }}>
      <Path d="M 48 126 Q 20 118 8 96 Q 36 102 56 90 Z" fill={p.glow} opacity={0.8} />
      <Path d="M 62 62 Q 126 36 174 94 Q 144 160 54 166 Q 28 118 62 62 Z" fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Path d="M 68 72 Q 124 54 158 96 Q 126 126 64 132 Z" fill={p.light} opacity={0.72} />
      <Circle cx={88} cy={92} r={10} fill={p.accent} stroke={stroke} strokeWidth={2} />
      <Circle cx={126} cy={82} r={9} fill={p.accent} stroke={stroke} strokeWidth={2} />
      <Circle cx={116} cy={122} r={8} fill={p.accent} stroke={stroke} strokeWidth={2} />
      <Path d="M 86 134 Q 88 158 72 170" fill="none" stroke={p.glow} strokeWidth={7} strokeLinecap="round" />
      <Path d="M 130 136 Q 138 154 128 174" fill="none" stroke={p.glow} strokeWidth={6} strokeLinecap="round" />
      <Ellipse cx={108} cy={170} rx={58} ry={14} fill="#000" opacity={0.18} />
      <RigGleam x1={78} y1={66} x2={128} y2={80} />
      <RigFace cx={108} cy={108} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} brawler scale={0.88} />
    </ShadeBody>
  );
}
