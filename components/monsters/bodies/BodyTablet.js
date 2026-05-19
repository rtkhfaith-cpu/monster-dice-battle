import React from 'react';
import { Circle, Ellipse, G, Path, Polygon, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigFace, RigFootPad, RigGlowCore, RigPanel, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

/** Tablet Wizard — floating tablet, wizard hat, spell orb hands */
export default function BodyTablet({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'tb-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 88, cy: 96, rx: 30, ry: 44 }}>
      <RigFootPad cx={100} cy={150} rx={30} ry={30} fill={p.glow} opacity={0.22} />
      <RigFootPad cx={100} cy={170} rx={24} ry={7} fill={p.dark} opacity={0.3} />
      <RigPanel x={48} y={66} w={104} h={104} rx={14} fill={`url(#${gid})`} stroke={stroke} sw={ST} />
      <Rect x={56} y={78} width={88} height={76} rx={8} fill={p.accent} stroke={stroke} strokeWidth={ST - 1} opacity={0.88} />
      <Polygon points="100,38 120,62 80,62" fill={p.dark} stroke={stroke} strokeWidth={ST - 1} />
      <Circle cx={100} cy={46} r={7} fill={p.glow} stroke={stroke} strokeWidth={2} />
      <Path d="M 36 108 Q 20 86 30 68 Q 44 80 42 100" fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <RigGlowCore cx={26} cy={66} r={9} color={p.glow} stroke={stroke} />
      <Path d="M 164 108 Q 180 86 170 68 Q 156 80 158 100" fill={p.light} stroke={stroke} strokeWidth={ST - 2} />
      <RigGlowCore cx={174} cy={66} r={9} color={p.glow} stroke={stroke} />
      <RigFootPad cx={100} cy={182} rx={10} ry={5} fill={p.dark} stroke={stroke} strokeWidth={2} />
      <RigFace cx={100} cy={112} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.88} />
    </ShadeBody>
  );
}
