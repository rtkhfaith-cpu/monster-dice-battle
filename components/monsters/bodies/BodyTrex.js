import React from 'react';
import { Ellipse, G, Path, Polygon } from 'react-native-svg';
import { DEFAULT_ST, RigFace, RigGleam, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** T-Rex — huge head, tiny arms, thick tail, angry cute kaiju */
export default function BodyTrex({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'tx-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 118, cy: 100, rx: 36, ry: 28 }}>
      <Path
        d="M 178 150 L 218 162 L 224 180 L 186 186 Q 168 176 178 150 Z"
        fill={p.dark}
        stroke={stroke}
        strokeWidth={ST}
      />
      <Path d="M 86 106 L 74 94 L 90 102 Z" fill={p.light} stroke={stroke} strokeWidth={2} />
      <Path d="M 106 106 L 118 94 L 102 102 Z" fill={p.light} stroke={stroke} strokeWidth={2} />
      <Ellipse cx={86} cy={142} rx={50} ry={42} fill={p.light} stroke={stroke} strokeWidth={ST} opacity={0.55} />
      <Polygon
        points="20,116 152,68 182,136 150,180 86,188 44,176"
        fill={`url(#${gid})`}
        stroke={stroke}
        strokeWidth={ST}
        strokeLinejoin="round"
      />
      <RigGleam x1={100} y1={88} x2={140} y2={100} />
      <Path d="M 50 98 L 34 106 L 42 118" fill="none" stroke={stroke} strokeWidth={ST - 2} strokeLinecap="round" />
      <Path d="M 66 96 L 50 102 L 58 114" fill="none" stroke={stroke} strokeWidth={ST - 2} strokeLinecap="round" />
      <RigLeg hipX={66} hipY={172} footX={54} footY={182} stroke={stroke} fill={p.base} sw={3} thick />
      <RigLeg hipX={106} hipY={172} footX={118} footY={182} stroke={stroke} fill={p.base} sw={3} thick />
      <RigFace cx={120} cy={106} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} brawler scale={0.95} />
    </ShadeBody>
  );
}
