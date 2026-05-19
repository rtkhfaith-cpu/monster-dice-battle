import React from 'react';
import { Ellipse, G, Path, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigArm, RigFace, RigFootPad, RigLeg, RigTail, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Water Bottle Beast — bulging bottle torso, slosh belly */
export default function BodyWaterBottle({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'wb-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 88, cy: 100, rx: 22, ry: 40 }}>
      <Path
        d="M 148 158 Q 172 142 178 122 Q 162 138 150 152 Z"
        fill={p.glow}
        stroke={stroke}
        strokeWidth={ST - 2}
        opacity={0.8}
      />
      <RigFootPad cx={100} cy={170} rx={38} ry={11} fill={p.light} stroke={stroke} strokeWidth={2} opacity={0.7} />
      <Rect x={68} y={50} width={64} height={18} rx={6} fill={p.accent} stroke={stroke} strokeWidth={ST} />
      <Rect x={76} y={44} width={14} height={12} rx={4} fill={p.dark} stroke={stroke} strokeWidth={2} />
      <Rect x={62} y={70} width={76} height={100} rx={18} fill={`url(#${gid})`} stroke={stroke} strokeWidth={ST} />
      <Rect x={68} y={108} width={64} height={28} rx={6} fill={p.glow} opacity={0.55} />
      <Path d="M 70 114 Q 100 122 130 114" fill="none" stroke="#fff" strokeWidth={2.5} opacity={0.55} />
      <Path d="M 72 124 Q 100 132 128 124" fill="none" stroke="#fff" strokeWidth={2} opacity={0.4} />
      <RigArm sx={56} sy={102} ex={38} ey={120} hx={32} hy={128} stroke={stroke} fill={p.light} />
      <RigArm sx={144} sy={102} ex={162} ey={120} hx={168} hy={128} stroke={stroke} fill={p.light} />
      <RigLeg hipX={80} hipY={164} footX={74} footY={174} stroke={stroke} fill={p.accent} />
      <RigLeg hipX={120} hipY={164} footX={126} footY={174} stroke={stroke} fill={p.accent} />
      <RigFace cx={100} cy={118} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.95} />
    </ShadeBody>
  );
}
