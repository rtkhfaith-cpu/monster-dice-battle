import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigArm, RigFace, RigLeg, RigPanel, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Skibidi-Bot — camera head dome, toilet tank body */
export default function BodySkibidi({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'sk-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 90, cy: 88, rx: 28, ry: 36 }}>
      <Rect x={140} y={70} width={12} height={28} rx={4} fill={p.base} stroke={stroke} strokeWidth={2} />
      <Path
        d="M 44 106 Q 44 174 100 182 Q 156 174 156 106 L 156 90 Q 156 64 100 60 Q 44 64 44 90 Z"
        fill={`url(#${gid})`}
        stroke={stroke}
        strokeWidth={ST}
      />
      <Ellipse cx={100} cy={90} rx={52} ry={14} fill={p.dark} stroke={stroke} strokeWidth={ST - 1} />
      <Rect x={84} y={106} width={32} height={10} fill={p.glow} stroke={stroke} strokeWidth={2} opacity={0.7} />
      <Path d="M 56 76 L 144 76 Q 152 88 144 106 L 56 106 Q 48 88 56 76 Z" fill={p.accent} stroke={stroke} strokeWidth={ST} />
      <Circle cx={100} cy={88} r={22} fill="#2d3436" stroke={stroke} strokeWidth={ST - 1} />
      <Circle cx={100} cy={88} r={14} fill="#4fc3f7" stroke={stroke} strokeWidth={2} opacity={0.85} />
      <Circle cx={94} cy={84} r={4} fill="#fff" opacity={0.8} />
      <RigArm sx={50} sy={108} ex={30} ey={124} hx={24} hy={132} stroke={stroke} fill={p.base} />
      <Path d="M 22 134 L 16 152 L 32 146 Z" fill={p.accent} stroke={stroke} strokeWidth={2} />
      <RigArm sx={150} sy={108} ex={170} ey={118} hx={176} hy={126} stroke={stroke} fill={p.light} />
      <RigLeg hipX={76} hipY={172} footX={70} footY={182} stroke={stroke} fill={p.light} />
      <RigLeg hipX={124} hipY={172} footX={130} footY={182} stroke={stroke} fill={p.light} />
      <RigFace cx={100} cy={90} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.75} />
    </ShadeBody>
  );
}
