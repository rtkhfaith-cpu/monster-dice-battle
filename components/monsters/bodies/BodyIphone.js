import React from 'react';
import { Circle, G, Path, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigFace, RigFootPad, RigLeg, RigPanel, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** iPhone Warrior — mech phone slab, cable tail, gauntlets */
export default function BodyIphone({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'ip-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 88, cy: 88, rx: 28, ry: 50 }}>
      <Path
        d="M 170 98 Q 194 106 198 128 Q 194 152 168 158 Q 156 140 170 98"
        fill={p.dark}
        stroke={stroke}
        strokeWidth={ST - 2}
      />
      <Circle cx={198} cy={128} r={7} fill={p.glow} stroke={stroke} strokeWidth={2} />
      <RigPanel x={58} y={48} w={84} h={124} rx={14} fill={p.dark} stroke={stroke} sw={ST} />
      <Rect x={64} y={60} width={72} height={92} rx={6} fill={p.accent} stroke={stroke} strokeWidth={ST - 1} opacity={0.9} />
      <Rect x={84} y={52} width={32} height={6} rx={2} fill="#1a1a2e" />
      <Rect x={68} y={68} width={16} height={16} rx={4} fill="#fdcb6e" stroke={stroke} strokeWidth={2} />
      <Rect x={88} y={68} width={16} height={16} rx={4} fill="#00b894" stroke={stroke} strokeWidth={2} />
      <Rect x={108} y={68} width={16} height={16} rx={4} fill="#e17055" stroke={stroke} strokeWidth={2} />
      <Rect x={40} y={88} width={16} height={32} rx={5} fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <Rect x={144} y={88} width={16} height={32} rx={5} fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={34} cy={120} r={12} fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={166} cy={120} r={12} fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <RigLeg hipX={80} hipY={166} footX={74} footY={176} stroke={stroke} fill={p.base} />
      <RigLeg hipX={120} hipY={166} footX={126} footY={176} stroke={stroke} fill={p.base} />
      <RigFootPad cx={100} cy={170} rx={8} ry={8} fill={p.light} stroke={stroke} strokeWidth={2} />
      <RigFace cx={100} cy={108} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.9} />
    </ShadeBody>
  );
}
