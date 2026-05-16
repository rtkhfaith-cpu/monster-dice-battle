import React from 'react';
import { G, Path, Polygon, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigFace, RigGleam, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Pencil Shark — shark silhouette, graphite sheen, eraser tail */
export default function BodyPencil({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'pn-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 94, cy: 72, rx: 18, ry: 28 }}>
      <Polygon points="100,34 126,174 74,174" fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
      <Rect x={84} y={158} width={32} height={22} rx={5} fill={p.accent} stroke={stroke} strokeWidth={ST - 1} />
      <Polygon points="100,34 112,54 88,54" fill={p.light} stroke={stroke} strokeWidth={ST - 1} />
      <RigGleam x1={92} y1={80} x2={108} y2={120} />
      <Path d="M 76 98 Q 44 108 34 96 Q 50 104 66 100" fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 124 98 Q 156 108 166 96 Q 150 104 134 100" fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 170 92 L 192 82 L 180 110 Z" fill={p.base} stroke={stroke} strokeWidth={ST - 1} />
      <RigLeg hipX={86} hipY={168} footX={80} footY={178} stroke={stroke} fill={p.glow} />
      <RigLeg hipX={114} hipY={168} footX={120} footY={178} stroke={stroke} fill={p.glow} />
      <RigFace cx={100} cy={106} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} brawler scale={0.88} />
    </ShadeBody>
  );
}
