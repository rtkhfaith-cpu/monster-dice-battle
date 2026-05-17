import React from 'react';
import { Circle, Path, Polygon } from 'react-native-svg';
import { DEFAULT_ST, RigFace, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

export default function BodyDurianKnight({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'durian-knight-body';
  const spikes = [
    '98,34 108,60 88,60',
    '58,58 82,72 56,86',
    '142,58 118,72 144,86',
    '38,112 66,116 44,138',
    '162,112 134,116 156,138',
    '76,170 96,150 104,176',
  ];
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 82, cy: 96, rx: 32, ry: 30 }}>
      {spikes.map((points) => (
        <Polygon key={points} points={points} fill={p.accent} stroke={stroke} strokeWidth={ST - 2} strokeLinejoin="round" />
      ))}
      <Path d="M 54 96 Q 64 50 108 52 Q 152 62 154 112 Q 148 166 96 176 Q 48 158 54 96 Z" fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Circle cx={64} cy={100} r={8} fill={p.accent} opacity={0.55} />
      <Circle cx={132} cy={118} r={9} fill={p.accent} opacity={0.5} />
      <Path d="M 46 126 L 18 112 L 26 158 Z" fill={p.dark} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
      <Path d="M 150 126 L 176 118 L 166 154 Z" fill={p.dark} stroke={stroke} strokeWidth={ST - 1} strokeLinejoin="round" />
      <RigLeg hipX={78} hipY={166} footX={68} footY={184} stroke={stroke} fill={p.dark} sw={3} thick />
      <RigLeg hipX={118} hipY={166} footX={130} footY={184} stroke={stroke} fill={p.dark} sw={3} thick />
      <RigFace cx={106} cy={108} m={m} mood={mood || 'angry'} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} brawler scale={0.84} />
    </ShadeBody>
  );
}
