import React from 'react';
import { Circle, Ellipse, Path } from 'react-native-svg';
import { DEFAULT_ST, RigFace, RigGlowCore, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

export default function BodyWifiWraith({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'wifi-wraith-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 100, cy: 88, rx: 34, ry: 36 }}>
      <RigGlowCore cx={100} cy={112} r={66} color={p.glow} stroke={stroke} opacity={0.16} />
      <Path d="M 62 80 Q 100 34 138 80 Q 160 120 132 160 Q 118 176 104 150 Q 88 182 72 158 Q 48 118 62 80 Z" fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} opacity={0.86} />
      <Path d="M 44 76 Q 100 26 156 76" fill="none" stroke={p.glow} strokeWidth={7} strokeLinecap="round" opacity={0.7} />
      <Path d="M 60 92 Q 100 56 140 92" fill="none" stroke={p.glow} strokeWidth={6} strokeLinecap="round" opacity={0.75} />
      <Path d="M 78 108 Q 100 88 122 108" fill="none" stroke={p.glow} strokeWidth={5} strokeLinecap="round" opacity={0.82} />
      <Circle cx={42} cy={120} r={9} fill={p.light} stroke={stroke} strokeWidth={ST - 2} opacity={0.72} />
      <Circle cx={160} cy={112} r={11} fill={p.light} stroke={stroke} strokeWidth={ST - 2} opacity={0.65} />
      <Ellipse cx={100} cy={174} rx={42} ry={12} fill="#000" opacity={0.12} />
      <RigFace cx={100} cy={108} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.9} />
    </ShadeBody>
  );
}
