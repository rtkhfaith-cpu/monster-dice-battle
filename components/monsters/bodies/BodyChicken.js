import React from 'react';
import { Circle, Ellipse, G, Path, Polygon } from 'react-native-svg';
import { DEFAULT_ST, RigArm, RigFace, RigLeg, RigTail, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Chickenzilla — plump Godzilla-chicken, comb crest, stub wings */
export default function BodyChicken({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'ch-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 86, cy: 128, rx: 32, ry: 28 }}>
      <RigTail points="168,148 192,118 198,98 184,112 172,138" fill={p.accent} stroke={stroke} />
      <Polygon points="178,118 202,104 188,132 170,134" fill={p.glow} stroke={stroke} strokeWidth={2} />
      <Ellipse cx={100} cy={142} rx={52} ry={40} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Path
        d="M 36 130 Q 14 108 26 84 Q 44 100 50 120 Q 44 134 36 130"
        fill={p.dark}
        stroke={stroke}
        strokeWidth={ST - 1}
      />
      <Path
        d="M 164 130 Q 186 108 174 84 Q 156 100 150 120 Q 156 134 164 130"
        fill={p.dark}
        stroke={stroke}
        strokeWidth={ST - 1}
      />
      <Polygon points="100,40 128,66 72,66" fill={p.accent} stroke={stroke} strokeWidth={ST - 1} />
      <Ellipse cx={100} cy={58} rx={10} ry={14} fill={p.dark} stroke={stroke} strokeWidth={2} />
      <Circle cx={100} cy={74} r={32} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Path d="M 130 76 L 156 80 L 130 90 Z" fill={p.glow} stroke={stroke} strokeWidth={ST - 1} />
      <Ellipse cx={142} cy={82} rx={5} ry={4} fill={p.accent} />
      <RigLeg hipX={76} hipY={170} footX={64} footY={180} stroke={stroke} fill={p.glow} thick />
      <RigLeg hipX={124} hipY={170} footX={136} footY={180} stroke={stroke} fill={p.glow} thick />
      <Circle cx={46} cy={94} r={9} fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={154} cy={94} r={9} fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <RigFace cx={100} cy={76} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} />
    </ShadeBody>
  );
}
