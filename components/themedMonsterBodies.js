import React from 'react';
import { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

const ST = 6;

/** Cartoon arm: shoulder → elbow → round hand */
function Arm({ sx, sy, ex, ey, hx, hy, stroke, fill, sw = ST - 2 }) {
  return (
    <G>
      <Path
        d={`M ${sx} ${sy} Q ${(sx + ex) / 2} ${sy - 8} ${ex} ${ey}`}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={hx} cy={hy} r={9} fill={fill} stroke={stroke} strokeWidth={sw} />
    </G>
  );
}

/** Stub leg + oval foot */
function Leg({ hipX, hipY, footX, footY, stroke, fill, sw = ST - 2 }) {
  return (
    <G>
      <Line x1={hipX} y1={hipY} x2={footX} y2={footY - 4} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <Ellipse cx={footX} cy={footY} rx={11} ry={6} fill={fill} stroke={stroke} strokeWidth={sw} />
    </G>
  );
}

function Face({ cx, cy, e, m, mood, stroke, eyeWhite, pupil, ST: sw, scale = 1 }) {
  const eyeL = cx - 18 * scale;
  const eyeR = cx + 18 * scale;
  const eyeY = cy - 4 * scale;
  const r = 10 * scale;
  const pr = mood === 'angry' ? 3 : 4;
  const mouthY = cy + 14 * scale;
  const brow = mood === 'angry' ? 4 : 0;
  return (
    <G>
      {mood === 'angry' ? (
        <>
          <Line x1={eyeL - 8} y1={eyeY - 10} x2={eyeL + 6} y2={eyeY - 6} stroke={stroke} strokeWidth={3} strokeLinecap="round" />
          <Line x1={eyeR + 8} y1={eyeY - 10} x2={eyeR - 6} y2={eyeY - 6} stroke={stroke} strokeWidth={3} strokeLinecap="round" />
        </>
      ) : null}
      <Circle cx={eyeL} cy={eyeY} r={r} fill={eyeWhite} stroke={stroke} strokeWidth={sw - 1} />
      <Circle cx={eyeR} cy={eyeY} r={r} fill={eyeWhite} stroke={stroke} strokeWidth={sw - 1} />
      <Circle cx={eyeL + brow} cy={eyeY + 1} r={pr} fill={pupil} />
      <Circle cx={eyeR - brow} cy={eyeY + 1} r={pr} fill={pupil} />
      {m === 0 ? (
        <Path
          d={`M ${cx - 12 * scale} ${mouthY} Q ${cx} ${mouthY + 8 * scale} ${cx + 12 * scale} ${mouthY}`}
          fill="none"
          stroke={stroke}
          strokeWidth={sw - 1}
          strokeLinecap="round"
        />
      ) : m === 1 ? (
        <Ellipse cx={cx} cy={mouthY + 4 * scale} rx={10 * scale} ry={6 * scale} fill={stroke} />
      ) : (
        <Path
          d={`M ${cx - 10 * scale} ${mouthY + 6 * scale} Q ${cx} ${mouthY} ${cx + 10 * scale} ${mouthY + 6 * scale}`}
          fill="none"
          stroke={stroke}
          strokeWidth={sw - 1}
          strokeLinecap="round"
        />
      )}
    </G>
  );
}

/** @param {{ themeBody: string, stroke: string, e: number, m: number, mood: string, eyeWhite: string, pupil: string, templateId?: string }} p */
export function ThemedMonsterBody(p) {
  const { themeBody } = p;
  switch (themeBody) {
    case 'cockroach':
      return <BodyCockroach {...p} />;
    case 'skibidi':
      return <BodySkibidi {...p} />;
    case 'water_bottle':
      return <BodyWaterBottle {...p} />;
    case 'iphone':
      return <BodyIphone {...p} />;
    case 'crocs':
      return <BodyCrocs {...p} />;
    case 'chicken':
      return <BodyChicken {...p} />;
    case 'lunchbox':
      return <BodyLunchbox {...p} />;
    case 'pencil':
      return <BodyPencil {...p} />;
    case 'homework':
      return <BodyHomework {...p} />;
    case 'toilet_paper':
      return <BodyToiletPaper {...p} />;
    case 'schoolbag':
      return <BodySchoolbag {...p} />;
    case 'trex':
      return <BodyTrex {...p} />;
    case 'tablet':
      return <BodyTablet {...p} />;
    case 'bubble_tea':
      return <BodyBubbleTea {...p} />;
    case 'sixtyseven':
      return <BodySixtySeven {...p} />;
    case 'poop':
      return <BodyPoop {...p} />;
    default:
      return null;
  }
}

/* —— Cockroachsaurus: upright bug-kaiju, spiky dino tail —— */
function BodyCockroach({ stroke, e, m, mood, eyeWhite, pupil }) {
  const shell = '#5d4037';
  const belly = '#8d6e63';
  const hi = '#a1887f';
  return (
    <G>
      <Path
        d="M 54 130 Q 28 124 22 100 Q 30 112 48 120 L 58 132 Z"
        fill={shell}
        stroke={stroke}
        strokeWidth={ST - 1}
      />
      <Polygon points="40,108 34,98 46,102" fill={shell} stroke={stroke} strokeWidth={2} />
      <Polygon points="30,100 24,90 36,94" fill={shell} stroke={stroke} strokeWidth={2} />
      <Ellipse cx={100} cy={132} rx={42} ry={34} fill={belly} stroke={stroke} strokeWidth={ST} />
      <Ellipse cx={100} cy={124} rx={38} ry={28} fill={shell} stroke={stroke} strokeWidth={ST} />
      <Path d="M 74 116 Q 100 110 126 116" fill="none" stroke={stroke} strokeWidth={2} opacity={0.4} />
      <Path d="M 78 126 Q 100 120 122 126" fill="none" stroke={stroke} strokeWidth={2} opacity={0.4} />
      <Leg hipX={78} hipY={148} footX={72} footY={162} stroke={stroke} fill={hi} />
      <Leg hipX={98} hipY={152} footX={94} footY={166} stroke={stroke} fill={hi} />
      <Leg hipX={118} hipY={152} footX={122} footY={166} stroke={stroke} fill={hi} />
      <Leg hipX={138} hipY={148} footX={144} footY={162} stroke={stroke} fill={hi} />
      <Arm sx={72} sy={118} ex={52} ey={108} hx={46} hy={104} stroke={stroke} fill={hi} />
      <Arm sx={128} sy={118} ex={148} ey={108} hx={154} hy={104} stroke={stroke} fill={hi} />
      <Circle cx={100} cy={76} r={32} fill={shell} stroke={stroke} strokeWidth={ST} />
      <Path
        d="M 84 54 Q 68 36 54 42 Q 64 48 76 58"
        fill="none"
        stroke={stroke}
        strokeWidth={ST - 2}
        strokeLinecap="round"
      />
      <Path
        d="M 116 54 Q 132 36 146 42 Q 136 48 124 58"
        fill="none"
        stroke={stroke}
        strokeWidth={ST - 2}
        strokeLinecap="round"
      />
      <Circle cx={52} cy={40} r={5} fill={shell} stroke={stroke} strokeWidth={2} />
      <Circle cx={148} cy={40} r={5} fill={shell} stroke={stroke} strokeWidth={2} />
      <Face cx={100} cy={78} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} />
      <Path d="M 36 88 Q 44 80 52 88" fill="none" stroke="#6d4c41" strokeWidth={2} opacity={0.45} strokeLinecap="round" />
      <Path d="M 148 92 Q 156 84 164 92" fill="none" stroke="#6d4c41" strokeWidth={2} opacity={0.45} strokeLinecap="round" />
      <Circle cx={88} cy={86} r={3} fill="#d7ccc8" opacity={0.7} />
      <Circle cx={112} cy={86} r={3} fill="#d7ccc8" opacity={0.7} />
    </G>
  );
}

/* —— Chickenzilla: kaiju chicken, wing-arms, tail fan —— */
function BodyChicken({ stroke, e, m, mood, eyeWhite, pupil }) {
  const body = '#fff8e8';
  const wing = '#f5e6c8';
  return (
    <G>
      <Path
        d="M 168 148 Q 188 132 192 108 Q 180 118 172 138 Z"
        fill="#e74c3c"
        stroke={stroke}
        strokeWidth={ST - 1}
      />
      <Polygon points="178,118 198,108 188,128 172,132" fill="#f39c12" stroke={stroke} strokeWidth={2} />
      <Ellipse cx={100} cy={140} rx={50} ry={38} fill={body} stroke={stroke} strokeWidth={ST} />
      <Path
        d="M 38 128 Q 18 108 28 88 Q 42 100 48 118 Q 44 132 38 128"
        fill={wing}
        stroke={stroke}
        strokeWidth={ST - 1}
      />
      <Path
        d="M 162 128 Q 182 108 172 88 Q 158 100 152 118 Q 156 132 162 128"
        fill={wing}
        stroke={stroke}
        strokeWidth={ST - 1}
      />
      <Polygon points="100,44 124,68 76,68" fill="#e74c3c" stroke={stroke} strokeWidth={ST - 1} />
      <Ellipse cx={100} cy={62} rx={8} ry={12} fill="#c0392b" stroke={stroke} strokeWidth={2} />
      <Circle cx={100} cy={76} r={30} fill={body} stroke={stroke} strokeWidth={ST} />
      <Path d="M 128 78 L 152 82 L 128 88 Z" fill="#f39c12" stroke={stroke} strokeWidth={ST - 1} />
      <Ellipse cx={138} cy={84} rx={4} ry={3} fill="#e67e22" />
      <Leg hipX={78} hipY={168} footX={68} footY={178} stroke={stroke} fill="#f39c12" />
      <Leg hipX={122} hipY={168} footX={132} footY={178} stroke={stroke} fill="#f39c12" />
      <Path d="M 62 108 L 48 98" stroke={stroke} strokeWidth={ST - 2} strokeLinecap="round" />
      <Path d="M 138 108 L 152 98" stroke={stroke} strokeWidth={ST - 2} strokeLinecap="round" />
      <Circle cx={48} cy={96} r={8} fill={wing} stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={152} cy={96} r={8} fill={wing} stroke={stroke} strokeWidth={ST - 2} />
      <Face cx={100} cy={78} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} />
    </G>
  );
}

/* —— Water Bottle Beast: bottle torso, slosh, splash limbs —— */
function BodyWaterBottle({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Path
        d="M 148 158 Q 168 148 172 128 Q 160 140 148 152 Z"
        fill="#48cae4"
        stroke={stroke}
        strokeWidth={ST - 2}
        opacity={0.75}
      />
      <Ellipse cx={100} cy={168} rx={36} ry={10} fill="#81d4fa" stroke={stroke} strokeWidth={2} opacity={0.6} />
      <Rect x={70} y={54} width={60} height={16} rx={5} fill="#74b9ff" stroke={stroke} strokeWidth={ST} />
      <Rect x={78} y={48} width={12} height={10} rx={3} fill="#0984e3" stroke={stroke} strokeWidth={2} />
      <Rect x={64} y={72} width={72} height={96} rx={16} fill="#a8e6ff" stroke={stroke} strokeWidth={ST} opacity={0.9} />
      <Rect x={70} y={108} width={60} height={24} rx={4} fill="#48cae4" opacity={0.55} />
      <Path d="M 72 112 Q 100 118 128 112" fill="none" stroke="#fff" strokeWidth={2} opacity={0.5} />
      <Path d="M 74 120 Q 100 126 126 120" fill="none" stroke="#fff" strokeWidth={2} opacity={0.35} />
      <Path
        d="M 58 72 Q 52 88 56 104"
        fill="none"
        stroke="#dfe6e9"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.7}
      />
      <Arm sx={58} sy={100} ex={42} ey={118} hx={36} hy={124} stroke={stroke} fill="#81d4fa" />
      <Arm sx={142} sy={100} ex={158} ey={118} hx={164} hy={124} stroke={stroke} fill="#81d4fa" />
      <Leg hipX={82} hipY={162} footX={76} footY={172} stroke={stroke} fill="#74b9ff" />
      <Leg hipX={118} hipY={162} footX={124} footY={172} stroke={stroke} fill="#74b9ff" />
      <Face cx={100} cy={118} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.9} />
    </G>
  );
}

/* —— iPhone Warrior: phone torso, cable tail, gauntlets —— */
function BodyIphone({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Path
        d="M 168 100 Q 188 108 192 128 Q 188 148 168 156 Q 158 140 168 100"
        fill="#636e72"
        stroke={stroke}
        strokeWidth={ST - 2}
      />
      <Circle cx={192} cy={128} r={6} fill="#ffd166" stroke={stroke} strokeWidth={2} />
      <Rect x={62} y={50} width={76} height={118} rx={12} fill="#2d3436" stroke={stroke} strokeWidth={ST} />
      <Rect x={68} y={62} width={64} height={88} rx={4} fill="#74b9ff" stroke={stroke} strokeWidth={ST - 1} />
      <Rect x={86} y={54} width={28} height={5} rx={2} fill="#1a1a2e" />
      <Rect x={72} y={68} width={14} height={14} rx={3} fill="#fdcb6e" stroke={stroke} strokeWidth={2} />
      <Rect x={90} y={68} width={14} height={14} rx={3} fill="#00b894" stroke={stroke} strokeWidth={2} />
      <Rect x={108} y={68} width={14} height={14} rx={3} fill="#e17055" stroke={stroke} strokeWidth={2} />
      <Rect x={44} y={88} width={14} height={28} rx={4} fill="#b2bec3" stroke={stroke} strokeWidth={ST - 2} />
      <Rect x={142} y={88} width={14} height={28} rx={4} fill="#b2bec3" stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={38} cy={118} r={10} fill="#dfe6e9" stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={162} cy={118} r={10} fill="#dfe6e9" stroke={stroke} strokeWidth={ST - 2} />
      <Leg hipX={82} hipY={164} footX={76} footY={174} stroke={stroke} fill="#636e72" />
      <Leg hipX={118} hipY={164} footX={124} footY={174} stroke={stroke} fill="#636e72" />
      <Circle cx={100} cy={168} r={7} fill="#dfe6e9" stroke={stroke} strokeWidth={2} />
      <Face cx={100} cy={108} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.85} />
    </G>
  );
}

/* —— Crocs Goblin: goblin on mega crocs —— */
function BodyCrocs({ stroke, e, m, mood, eyeWhite, pupil }) {
  const shoe = '#00b894';
  const skin = '#ffeaa7';
  return (
    <G>
      <Path
        d="M 24 158 Q 40 182 100 186 Q 160 182 176 158 L 164 138 Q 100 128 36 138 Z"
        fill={shoe}
        stroke={stroke}
        strokeWidth={ST}
      />
      <Ellipse cx={100} cy={148} rx={72} ry={26} fill={shoe} stroke={stroke} strokeWidth={ST} />
      {[48, 72, 100, 128, 152].map((x) => (
        <Circle key={x} cx={x} cy={136} r={6} fill="#55efc4" stroke={stroke} strokeWidth={2} />
      ))}
      <Path d="M 36 150 L 44 142" stroke="#fff" strokeWidth={2} opacity={0.5} />
      <Path d="M 164 150 L 156 142" stroke="#fff" strokeWidth={2} opacity={0.5} />
      <Ellipse cx={100} cy={88} rx={28} ry={32} fill={skin} stroke={stroke} strokeWidth={ST} />
      <Path d="M 72 62 Q 68 48 76 44 Q 84 50 80 62" fill={skin} stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 128 62 Q 132 48 124 44 Q 116 50 120 62" fill={skin} stroke={stroke} strokeWidth={ST - 2} />
      <Arm sx={76} sy={100} ex={54} ey={112} hx={48} hy={118} stroke={stroke} fill={skin} />
      <Arm sx={124} sy={100} ex={146} ey={112} hx={152} hy={118} stroke={stroke} fill={skin} />
      <Leg hipX={72} hipY={128} footX={58} footY={148} stroke={stroke} fill={shoe} sw={3} />
      <Leg hipX={128} hipY={128} footX={142} footY={148} stroke={stroke} fill={shoe} sw={3} />
      <Face cx={100} cy={90} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.92} />
      <Circle cx={86} cy={98} r={5} fill="#fab1a0" opacity={0.65} />
      <Circle cx={114} cy={98} r={5} fill="#fab1a0" opacity={0.65} />
    </G>
  );
}

/* —— Skibidi: toilet body + head + pipe limbs —— */
function BodySkibidi({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Rect x={142} y={72} width={10} height={24} rx={3} fill="#b2bec3" stroke={stroke} strokeWidth={2} />
      <Path
        d="M 46 106 Q 46 172 100 180 Q 154 172 154 106 L 154 92 Q 154 68 100 64 Q 46 68 46 92 Z"
        fill="#f5f5f5"
        stroke={stroke}
        strokeWidth={ST}
      />
      <Ellipse cx={100} cy={92} rx={50} ry={12} fill="#e8e8e8" stroke={stroke} strokeWidth={ST - 1} />
      <Rect x={86} y={108} width={28} height={8} fill="#4fc3f7" stroke={stroke} strokeWidth={2} opacity={0.65} />
      <Path d="M 58 78 L 142 78 Q 150 88 142 106 L 58 106 Q 50 88 58 78 Z" fill="#ffeaa7" stroke={stroke} strokeWidth={ST} />
      <Arm sx={52} sy={108} ex={34} ey={124} hx={28} hy={130} stroke={stroke} fill="#b2bec3" />
      <Path d="M 28 130 L 22 148 L 34 142 Z" fill="#e74c3c" stroke={stroke} strokeWidth={2} />
      <Arm sx={148} sy={108} ex={166} ey={120} hx={172} hy={126} stroke={stroke} fill="#dfe6e9" />
      <Leg hipX={78} hipY={172} footX={72} footY={182} stroke={stroke} fill="#f5f5f5" />
      <Leg hipX={122} hipY={172} footX={128} footY={182} stroke={stroke} fill="#f5f5f5" />
      <Face cx={100} cy={92} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} />
    </G>
  );
}

/* —— Lunchbox Dragon: box body, lid wings, flame tail —— */
function BodyLunchbox({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Polygon points="148,108 172,100 168,128 148,120" fill="#f39c12" stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 162 98 Q 178 88 184 72 Q 172 82 162 94" fill="#e74c3c" stroke={stroke} strokeWidth={2} />
      <Rect x={50} y={92} width={100} height={72} rx={10} fill="#e17055" stroke={stroke} strokeWidth={ST} />
      <Rect x={50} y={92} width={100} height={22} rx={10} fill="#d63031" stroke={stroke} strokeWidth={ST} />
      <Line x1={50} y1={114} x2={150} y2={114} stroke={stroke} strokeWidth={ST - 1} />
      <Rect x={66} y={72} width={68} height={22} rx={5} fill="#fab1a0" stroke={stroke} strokeWidth={ST - 1} />
      <Arm sx={52} sy={118} ex={32} ey={108} hx={26} hy={104} stroke={stroke} fill="#d63031" />
      <Arm sx={148} sy={118} ex={168} ey={108} hx={174} hy={104} stroke={stroke} fill="#d63031" />
      <Leg hipX={78} hipY={160} footX={70} footY={172} stroke={stroke} fill="#e17055" />
      <Leg hipX={122} hipY={160} footX={130} footY={172} stroke={stroke} fill="#e17055" />
      <Face cx={100} cy={132} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.88} />
    </G>
  );
}

/* —— Pencil Shark: diagonal shark-pencil, fin arms —— */
function BodyPencil({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Polygon points="100,38 122,172 78,172" fill="#fdcb6e" stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
      <Rect x={86} y={158} width={28} height={20} rx={4} fill="#e84393" stroke={stroke} strokeWidth={ST - 1} />
      <Polygon points="100,38 110,56 90,56" fill="#f8c291" stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 78 100 Q 48 108 38 98 Q 52 104 68 102" fill="#ffeaa7" stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 122 100 Q 152 108 162 98 Q 148 104 132 102" fill="#ffeaa7" stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 168 96 L 188 88 L 178 108 Z" fill="#fdcb6e" stroke={stroke} strokeWidth={ST - 1} />
      <Leg hipX={88} hipY={168} footX={82} footY={178} stroke={stroke} fill="#f39c12" />
      <Leg hipX={112} hipY={168} footX={118} footY={178} stroke={stroke} fill="#f39c12" />
      <Face cx={100} cy={108} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.82} />
    </G>
  );
}

/* —— Homework Troll: book stack + paper limbs —— */
function BodyHomework({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Rect x={56} y={78} width={88} height={88} rx={6} fill="#6c5ce7" stroke={stroke} strokeWidth={ST} />
      <Rect x={62} y={84} width={76} height={76} rx={4} fill="#a29bfe" stroke={stroke} strokeWidth={2} opacity={0.35} />
      <Line x1={66} y1={98} x2={134} y2={98} stroke="#fff" strokeWidth={2} opacity={0.55} />
      <Line x1={66} y1={114} x2={124} y2={114} stroke="#fff" strokeWidth={2} opacity={0.55} />
      <Line x1={66} y1={130} x2={130} y2={130} stroke="#fff" strokeWidth={2} opacity={0.55} />
      <Rect x={70} y={56} width={60} height={26} rx={4} fill="#fd79a8" stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 48 108 Q 28 98 24 118 Q 36 120 48 114" fill="#dfe6e9" stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 152 108 Q 172 98 176 118 Q 164 120 152 114" fill="#dfe6e9" stroke={stroke} strokeWidth={ST - 2} />
      <Line x1={78} y1={68} x2={92} y2={62} stroke={stroke} strokeWidth={3} strokeLinecap="round" />
      <Line x1={122} y1={68} x2={108} y2={62} stroke={stroke} strokeWidth={3} strokeLinecap="round" />
      <Leg hipX={82} hipY={162} footX={74} footY={174} stroke={stroke} fill="#6c5ce7" />
      <Leg hipX={118} hipY={162} footX={126} footY={174} stroke={stroke} fill="#6c5ce7" />
      <Rect x={82} y={52} width={36} height={8} rx={2} fill="none" stroke={stroke} strokeWidth={2} />
      <Face cx={100} cy={122} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.85} />
    </G>
  );
}

/* —— Toilet Paper Ninja: roll body, trailing sheet, nimble legs —— */
function BodyToiletPaper({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Path
        d="M 158 120 Q 188 108 196 88 Q 188 72 168 78 Q 158 92 158 120"
        fill="#fff"
        stroke={stroke}
        strokeWidth={ST - 2}
        opacity={0.9}
      />
      <Ellipse cx={100} cy={142} rx={40} ry={34} fill="#f5f5f5" stroke={stroke} strokeWidth={ST} />
      <Rect x={64} y={72} width={72} height={72} rx={36} fill="#fff" stroke={stroke} strokeWidth={ST} />
      <Line x1={74} y1={92} x2={126} y2={92} stroke="#dfe6e9" strokeWidth={2} />
      <Line x1={74} y1={112} x2={126} y2={112} stroke="#dfe6e9" strokeWidth={2} />
      <Ellipse cx={100} cy={72} rx={36} ry={11} fill="#ecf0f1" stroke={stroke} strokeWidth={ST - 1} />
      <Rect x={78} y={58} width={44} height={10} rx={3} fill="#2d3436" stroke={stroke} strokeWidth={2} />
      <Arm sx={62} sy={108} ex={42} ey={98} hx={36} hy={94} stroke={stroke} fill="#fff" />
      <Arm sx={138} sy={108} ex={158} ey={98} hx={164} hy={94} stroke={stroke} fill="#fff" />
      <Leg hipX={82} hipY={168} footX={74} footY={178} stroke={stroke} fill="#ecf0f1" />
      <Leg hipX={118} hipY={168} footX={126} footY={178} stroke={stroke} fill="#ecf0f1" />
      <Face cx={100} cy={112} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.88} />
    </G>
  );
}

/* —— Schoolbag Golem: heavy backpack, strap arms —— */
function BodySchoolbag({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Path d="M 46 90 L 154 90 L 160 172 L 40 172 Z" fill="#e84393" stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
      <Rect x={66} y={74} width={68} height={22} rx={8} fill="#fd79a8" stroke={stroke} strokeWidth={ST - 1} />
      <Path d="M 66 74 Q 100 52 134 74" fill="none" stroke={stroke} strokeWidth={ST - 1} />
      <Rect x={88} y={112} width={28} height={36} rx={4} fill="#d63031" stroke={stroke} strokeWidth={ST - 2} />
      <Path d="M 48 100 Q 32 88 28 108" fill="none" stroke="#fd79a8" strokeWidth={ST - 1} />
      <Path d="M 152 100 Q 168 88 172 108" fill="none" stroke="#fd79a8" strokeWidth={ST - 1} />
      <Arm sx={48} sy={108} ex={30} ey={124} hx={24} hy={130} stroke={stroke} fill="#fd79a8" />
      <Arm sx={152} sy={108} ex={170} ey={124} hx={176} hy={130} stroke={stroke} fill="#fd79a8" />
      <Leg hipX={78} hipY={168} footX={70} footY={180} stroke={stroke} fill="#c0392b" sw={3} />
      <Leg hipX={122} hipY={168} footX={130} footY={180} stroke={stroke} fill="#c0392b" sw={3} />
      <Circle cx={100} cy={86} r={6} fill="#ffd166" stroke={stroke} strokeWidth={2} />
      <Face cx={100} cy={122} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.88} />
    </G>
  );
}

/* —— T-Rex: tanky dino, tiny arms, thick tail —— */
function BodyTrex({ stroke, e, m, mood, eyeWhite, pupil }) {
  const green = '#27ae60';
  const hi = '#2ecc71';
  return (
    <G>
      <Path
        d="M 176 152 L 212 162 L 218 178 L 184 184 Q 168 176 176 152 Z"
        fill={green}
        stroke={stroke}
        strokeWidth={ST}
      />
      <Path d="M 88 108 L 78 98 L 92 104 Z" fill={hi} stroke={stroke} strokeWidth={2} />
      <Path d="M 108 108 L 118 98 L 104 104 Z" fill={hi} stroke={stroke} strokeWidth={2} />
      <Ellipse cx={88} cy={142} rx={48} ry={40} fill={hi} stroke={stroke} strokeWidth={ST} />
      <Polygon points="24,118 148,72 178,138 148,178 88,186 48,176" fill={green} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
      <Path d="M 52 100 L 38 108 L 44 118" fill="none" stroke={stroke} strokeWidth={ST - 2} strokeLinecap="round" />
      <Path d="M 68 98 L 54 104 L 60 114" fill="none" stroke={stroke} strokeWidth={ST - 2} strokeLinecap="round" />
      <Leg hipX={68} hipY={172} footX={58} footY={182} stroke={stroke} fill={green} sw={3} />
      <Leg hipX={108} hipY={172} footX={118} footY={182} stroke={stroke} fill={green} sw={3} />
      <Face cx={118} cy={108} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.92} />
    </G>
  );
}

/* —— Tablet Wizard: floating tablet, hat, magic hands —— */
function BodyTablet({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Circle cx={100} cy={148} r={28} fill="#a29bfe" opacity={0.2} />
      <Ellipse cx={100} cy={168} rx={22} ry={6} fill="#6c5ce7" opacity={0.25} />
      <Rect x={50} y={68} width={100} height={100} rx={12} fill="#a29bfe" stroke={stroke} strokeWidth={ST} />
      <Rect x={58} y={80} width={84} height={72} rx={6} fill="#48cae4" stroke={stroke} strokeWidth={ST - 1} opacity={0.85} />
      <Polygon points="100,42 118,64 82,64" fill="#6c5ce7" stroke={stroke} strokeWidth={ST - 1} />
      <Circle cx={100} cy={50} r={6} fill="#fdcb6e" stroke={stroke} strokeWidth={2} />
      <Path d="M 38 108 Q 24 88 32 72 Q 44 82 42 100" fill="#dfe6e9" stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={28} cy={70} r={8} fill="#ffeaa7" stroke={stroke} strokeWidth={2} opacity={0.9} />
      <Path d="M 162 108 Q 176 88 168 72 Q 156 82 158 100" fill="#dfe6e9" stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={172} cy={70} r={8} fill="#ffeaa7" stroke={stroke} strokeWidth={2} opacity={0.9} />
      <Line x1={100} y1={168} x2={100} y2={178} stroke={stroke} strokeWidth={ST - 2} />
      <Ellipse cx={100} cy={180} rx={8} ry={4} fill="#6c5ce7" stroke={stroke} strokeWidth={2} />
      <Face cx={100} cy={114} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.85} />
    </G>
  );
}

/* —— Bubble Tea: cup body, straw, boba hands —— */
function BodyBubbleTea({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Path d="M 60 82 L 140 82 L 150 168 L 50 168 Z" fill="#ff85e4" stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
      <Rect x={86} y={54} width={28} height={32} rx={4} fill="#fd79a8" stroke={stroke} strokeWidth={ST - 1} />
      <Line x1={100} y1={54} x2={100} y2={38} stroke={stroke} strokeWidth={ST - 1} strokeLinecap="round" />
      <Circle cx={100} cy={36} r={5} fill="#fdcb6e" stroke={stroke} strokeWidth={2} />
      <Path d="M 68 118 Q 100 124 132 118" fill="none" stroke="#fff" strokeWidth={2} opacity={0.45} />
      <Circle cx={42} cy={118} r={11} fill="#2d3436" stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={158} cy={118} r={11} fill="#2d3436" stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={78} cy={138} r={7} fill="#2d3436" opacity={0.65} />
      <Circle cx={122} cy={142} r={6} fill="#2d3436" opacity={0.55} />
      <Arm sx={52} sy={108} ex={38} ey={122} hx={32} hy={128} stroke={stroke} fill="#ffb8e8" />
      <Arm sx={148} sy={108} ex={162} ey={122} hx={168} hy={128} stroke={stroke} fill="#ffb8e8" />
      <Leg hipX={78} hipY={164} footX={72} footY={176} stroke={stroke} fill="#ff85e4" />
      <Leg hipX={122} hipY={164} footX={128} footY={176} stroke={stroke} fill="#ff85e4" />
      <Face cx={100} cy={122} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.88} />
    </G>
  );
}

/* —— 67 Rex: meme body, glove fists, spiky mane —— */
function BodySixtySeven({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Path d="M 72 52 L 80 38 L 88 52" fill="#fd79a8" stroke={stroke} strokeWidth={2} />
      <Path d="M 100 48 L 100 32 L 108 48" fill="#fd79a8" stroke={stroke} strokeWidth={2} />
      <Path d="M 112 52 L 120 38 L 128 52" fill="#fd79a8" stroke={stroke} strokeWidth={2} />
      <Ellipse cx={100} cy={128} rx={54} ry={46} fill="#fd79a8" stroke={stroke} strokeWidth={ST} />
      <SvgText x={100} y={138} fontSize={48} fontWeight="bold" fill="#2d3436" textAnchor="middle">
        67
      </SvgText>
      <Rect x={34} y={108} width={18} height={22} rx={6} fill="#e84393" stroke={stroke} strokeWidth={ST - 2} />
      <Rect x={148} y={108} width={18} height={22} rx={6} fill="#e84393" stroke={stroke} strokeWidth={ST - 2} />
      <Circle cx={28} cy={132} r={10} fill="#fff" stroke={stroke} strokeWidth={2} />
      <Circle cx={172} cy={132} r={10} fill="#fff" stroke={stroke} strokeWidth={2} />
      <Leg hipX={82} hipY={168} footX={74} footY={178} stroke={stroke} fill="#e84393" />
      <Leg hipX={118} hipY={168} footX={126} footY={178} stroke={stroke} fill="#e84393" />
      <Face cx={100} cy={88} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.78} />
    </G>
  );
}

/* —— Poop (unused catalog fallback) —— */
function BodyPoop({ stroke, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <Ellipse cx={100} cy={158} rx={42} ry={26} fill="#8d6e63" stroke={stroke} strokeWidth={ST} />
      <Ellipse cx={100} cy={128} rx={34} ry={24} fill="#a1887f" stroke={stroke} strokeWidth={ST} />
      <Ellipse cx={100} cy={100} rx={26} ry={20} fill="#bcaaa4" stroke={stroke} strokeWidth={ST} />
      <Path d="M 90 76 Q 100 58 110 76 L 106 84 Q 100 70 94 84 Z" fill="#8d6e63" stroke={stroke} strokeWidth={ST - 1} />
      <Arm sx={72} sy={118} ex={52} ey={108} hx={46} hy={104} stroke={stroke} fill="#a1887f" />
      <Arm sx={128} sy={118} ex={148} ey={108} hx={154} hy={104} stroke={stroke} fill="#a1887f" />
      <Leg hipX={82} hipY={168} footX={76} footY={178} stroke={stroke} fill="#8d6e63" />
      <Leg hipX={118} hipY={168} footX={124} footY={178} stroke={stroke} fill="#8d6e63" />
      <Face cx={100} cy={108} e={e} m={m} mood={mood} stroke={stroke} eyeWhite={eyeWhite} pupil={pupil} ST={ST} scale={0.85} />
      <Circle cx={44} cy={72} r={3} fill="#6d4c41" opacity={0.5} />
      <Circle cx={156} cy={68} r={3} fill="#6d4c41" opacity={0.5} />
    </G>
  );
}
