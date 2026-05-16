import React from 'react';
import { Ellipse, G, Path, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigChestPlate, RigFace, RigLeg, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** 67-Rex — mythic meme kaiju, spiky mane, embossed chest plate */
export default function BodySixtySeven({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = '67-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 88, cy: 110, rx: 34, ry: 30 }}>
      <Path d="M 70 50 L 80 32 L 90 50" fill={p.accent} stroke={stroke} strokeWidth={2} />
      <Path d="M 98 46 L 100 26 L 110 46" fill={p.accent} stroke={stroke} strokeWidth={2} />
      <Path d="M 110 50 L 122 32 L 132 50" fill={p.accent} stroke={stroke} strokeWidth={2} />
      <Ellipse cx={100} cy={128} rx={56} ry={48} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <RigChestPlate x={68} y={108} w={64} h={44} rx={10} fill={p.dark} stroke={stroke} sw={ST - 1}>
        <Path
          d="M 88 118 L 92 134 L 100 138 L 108 134 L 112 118 L 108 112 L 100 108 L 92 112 Z"
          fill={p.glow}
          stroke={stroke}
          strokeWidth={1.5}
        />
        <Rect x={94} y={120} width={12} height={16} rx={2} fill={p.light} opacity={0.9} />
      </RigChestPlate>
      <Rect x={30} y={106} width={20} height={26} rx={8} fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
      <Rect x={150} y={106} width={20} height={26} rx={8} fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
      <Ellipse cx={24} cy={132} rx={12} ry={10} fill={p.light} stroke={stroke} strokeWidth={2} />
      <Ellipse cx={176} cy={132} rx={12} ry={10} fill={p.light} stroke={stroke} strokeWidth={2} />
      <RigLeg hipX={80} hipY={168} footX={72} footY={178} stroke={stroke} fill={p.accent} thick />
      <RigLeg hipX={120} hipY={168} footX={128} footY={178} stroke={stroke} fill={p.accent} thick />
      <RigFace cx={100} cy={86} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} brawler scale={0.82} />
    </ShadeBody>
  );
}
