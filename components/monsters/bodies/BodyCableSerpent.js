import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { DEFAULT_ST, RigFace, RigGleam, ShadeBody } from '../../../art/monsters/monsterRig';
import { resolvePalette } from './shared';

export default function BodyCableSerpent({ stroke, m, mood, eyeWhite, pupil, palette, ST = DEFAULT_ST }) {
  const p = resolvePalette(palette);
  const gid = 'cable-serpent-body';
  return (
    <ShadeBody gradId={gid} palette={p} highlight={{ cx: 122, cy: 72, rx: 30, ry: 18 }}>
      <Path
        d="M 38 152 C 70 180, 132 180, 154 140 C 172 108, 130 96, 104 116 C 82 134, 112 152, 140 126 C 166 102, 154 62, 114 58"
        fill="none"
        stroke={stroke}
        strokeWidth={26}
        strokeLinecap="round"
      />
      <Path
        d="M 38 152 C 70 180, 132 180, 154 140 C 172 108, 130 96, 104 116 C 82 134, 112 152, 140 126 C 166 102, 154 62, 114 58"
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={18}
        strokeLinecap="round"
      />
      {[52, 78, 110, 140].map((x, i) => (
        <Circle key={x} cx={x} cy={i % 2 ? 164 : 146} r={5} fill={p.glow} opacity={0.9} />
      ))}
      <G transform="translate(108 42) rotate(-8)">
        <Ellipse cx={28} cy={28} rx={38} ry={27} fill={p.light} stroke={stroke} strokeWidth={ST} />
        <Rect x={56} y={18} width={24} height={9} rx={3} fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
        <Rect x={56} y={34} width={24} height={9} rx={3} fill={p.accent} stroke={stroke} strokeWidth={ST - 2} />
        <RigFace cx={26} cy={28} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.72} />
      </G>
      <Path d="M 62 122 L 74 104 L 82 126" fill={p.glow} stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 150 96 L 166 78 L 166 106" fill={p.glow} stroke={stroke} strokeWidth={ST - 2} />
      <RigGleam x1={122} y1={62} x2={150} y2={72} />
    </ShadeBody>
  );
}
