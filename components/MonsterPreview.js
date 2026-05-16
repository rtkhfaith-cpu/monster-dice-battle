import React, { useId, useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { ThemedMonsterBody } from './themedMonsterBodies';
import MonsterGearLayers from './MonsterGearLayers';
import { ART } from '../utils/artDirection';

/** Pastel-vibrant cartoon palette */
export const MONSTER_PALETTE = [
  '#FF7B7B',
  '#5ED4D0',
  '#FFE066',
  '#7AD99A',
  '#B794F6',
  '#FFA94D',
  '#74C0FC',
  '#FF9ECE',
];

export const PART_KEYS = ['body', 'head', 'eyes', 'mouth', 'horn', 'tail', 'hands', 'legs'];

/** @typedef {'neutral'|'happy'|'angry'|'dizzy'} MonsterMood */

export const SPECIES_LABELS = ['Silly Blob', 'Kaiju Titan', 'T-Rex Chomp', 'Mech Transformer'];

export function partMax(part) {
  const map = {
    species: 3,
    body: 3,
    head: 3,
    eyes: 4,
    mouth: 4,
    horn: 3,
    tail: 3,
    hands: 3,
    legs: 3,
  };
  return map[part] ?? 0;
}

function shadeHex(hex, d) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const num = parseInt(n, 16);
  if (!Number.isFinite(num)) return hex;
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;
  r = Math.max(0, Math.min(255, Math.round(r * (1 + d))));
  g = Math.max(0, Math.min(255, Math.round(g * (1 + d))));
  b = Math.max(0, Math.min(255, Math.round(b * (1 + d))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} props.gid
 * @param {string} props.light
 * @param {string} props.dark
 */
function BodyGrad({ children, gid, light, dark }) {
  return (
    <G>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0.2" y2="1">
          <Stop offset="0" stopColor={light} stopOpacity={1} />
          <Stop offset="0.55" stopColor={light} stopOpacity={0.98} />
          <Stop offset="1" stopColor={dark} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      {children}
    </G>
  );
}

/**
 * Whimsical SVG monster — thick cartoon outline, soft shadow, optional cosmetics & mood.
 *
 * `parts`: body, head, eyes, mouth, horn, tail, hands, legs, colorIdx, cosmetics?: string[]
 * @param {{ parts: object, size?: number, mood?: MonsterMood }} props
 */
export default function MonsterPreview({ parts, size = 200, mood = 'neutral' }) {
  const instanceId = useId().replace(/:/g, '');
  const safe = parts && typeof parts === 'object' ? parts : null;
  const ST = 5;
  const stroke = ART.outline;
  const cheek = '#ff8fb188';
  const eyeWhite = '#fffef8';
  const pupil = '#1a1a2e';

  const colorIdx = (safe?.colorIdx ?? 0) % MONSTER_PALETTE.length;
  const bodyBase = MONSTER_PALETTE[colorIdx];
  const bodyLight = shadeHex(bodyBase, 0.18);
  const bodyDark = shadeHex(bodyBase, -0.22);
  const gid = useMemo(
    () => `mgrad_${instanceId}_${colorIdx}_${Math.round(size)}`,
    [instanceId, colorIdx, size],
  );

  if (!safe) {
    return <View style={{ width: size, height: size * 1.06, alignSelf: 'center' }} />;
  }

  const b = safe.body ?? 0;
  const hd = safe.head ?? 0;
  const e = safe.eyes ?? 0;
  const m = safe.mouth ?? 0;
  const h = safe.horn ?? 0;
  const t = safe.tail ?? 0;
  const ha = safe.hands ?? 0;
  const lg = safe.legs ?? 0;
  const cosmetics = Array.isArray(safe.cosmetics) ? safe.cosmetics : [];
  const species = Math.min(3, Math.max(0, safe.species ?? 0));

  const fillUrl = `url(#${gid})`;

  const themeEmoji = safe.themeEmoji || null;
  const themeAura = safe.themeAura || null;
  const themeBody = safe.themeBody || null;
  const hasThemedSilhouette = !!themeBody;

  return (
    <View style={{ width: size, height: size * 1.06, alignSelf: 'center', justifyContent: 'flex-start' }}>
      {themeAura && !hasThemedSilhouette ? (
        <View
          style={{
            position: 'absolute',
            top: size * 0.12,
            left: size * 0.1,
            width: size * 0.8,
            height: size * 0.72,
            borderRadius: size,
            backgroundColor: themeAura,
            opacity: 0.22,
          }}
        />
      ) : null}
      {themeEmoji && !hasThemedSilhouette ? (
        <Text
          style={{
            position: 'absolute',
            top: size * 0.02,
            right: size * 0.02,
            fontSize: Math.max(14, size * 0.22),
            opacity: 0.95,
          }}
        >
          {themeEmoji}
        </Text>
      ) : null}
      {themeEmoji && hasThemedSilhouette ? (
        <Text
          style={{
            position: 'absolute',
            top: size * 0.02,
            right: size * 0.02,
            fontSize: Math.max(12, size * 0.16),
            opacity: 0.75,
          }}
        >
          {themeEmoji}
        </Text>
      ) : null}
      <View
        style={{
          position: 'absolute',
          bottom: size * 0.04,
          left: size * 0.12,
          width: size * 0.76,
          height: size * 0.1,
          borderRadius: size,
          backgroundColor: ART.shadowDeep,
          opacity: 0.28,
        }}
      />
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <G>
          <MonsterGearLayers cosmetics={cosmetics} stroke={stroke} ST={ST} />
          {renderCapeLayer(cosmetics, fillUrl, stroke, ST)}
          {hasThemedSilhouette ? (
            <ThemedMonsterBody
              themeBody={themeBody}
              stroke={stroke}
              ST={ST}
              e={e}
              m={m}
              mood={mood}
              eyeWhite={eyeWhite}
              pupil={pupil}
              fillUrl={fillUrl}
              gid={gid}
              bodyLight={bodyLight}
              bodyDark={bodyDark}
              cheek={cheek}
            />
          ) : null}
          {!hasThemedSilhouette && species === 0 ? (
            <>
              {renderTail(t, fillUrl, stroke, ST)}
              {renderLegs(lg, fillUrl, stroke, ST)}
              {renderBody(b, fillUrl, stroke, ST, cheek, gid, bodyLight, bodyDark)}
              {renderHead(hd, fillUrl, stroke, ST)}
              {renderHorn(h, stroke, fillUrl, ST)}
              {renderMouth(m, stroke, ST, mood)}
              {renderEyes(e, stroke, eyeWhite, pupil, ST, mood)}
              {renderHands(ha, fillUrl, stroke, ST, cosmetics)}
            </>
          ) : null}
          {!hasThemedSilhouette && species === 1 ? (
            <SpeciesKaiju
              gid={gid}
              fillUrl={fillUrl}
              stroke={stroke}
              ST={ST}
              cheek={cheek}
              bodyLight={bodyLight}
              bodyDark={bodyDark}
              e={e}
              m={m}
              mood={mood}
              eyeWhite={eyeWhite}
              pupil={pupil}
            />
          ) : null}
          {!hasThemedSilhouette && species === 2 ? (
            <SpeciesTrex
              gid={gid}
              fillUrl={fillUrl}
              stroke={stroke}
              ST={ST}
              cheek={cheek}
              bodyLight={bodyLight}
              bodyDark={bodyDark}
              e={e}
              m={m}
              mood={mood}
              eyeWhite={eyeWhite}
              pupil={pupil}
              cosmetics={cosmetics}
            />
          ) : null}
          {!hasThemedSilhouette && species === 3 ? (
            <SpeciesMech
              gid={gid}
              fillUrl={fillUrl}
              stroke={stroke}
              ST={ST}
              bodyLight={bodyLight}
              bodyDark={bodyDark}
              e={e}
              m={m}
              mood={mood}
              eyeWhite={eyeWhite}
              pupil={pupil}
              cosmetics={cosmetics}
            />
          ) : null}
          {renderCosmeticsTop(cosmetics, stroke, ST)}
        </G>
      </Svg>
    </View>
  );
}

function SpeciesKaiju({ gid, fillUrl, stroke, ST, cheek, bodyLight, bodyDark, e, m, mood, eyeWhite, pupil }) {
  const spike = shadeHex(bodyDark, -0.15);
  return (
    <G>
      <BodyGrad gid={gid} light={bodyLight} dark={bodyDark}>
        <G>
          <Path
            d="M 14 152 Q 44 174 94 164 Q 128 154 154 174 L 168 182 L 158 192 Q 100 182 52 190 Q 20 178 14 152 Z"
            fill={fillUrl}
            stroke={stroke}
            strokeWidth={ST}
            strokeLinejoin="round"
          />
          <Polygon points="82,118 92,74 102,118" fill={spike} stroke={stroke} strokeWidth={ST - 2} strokeLinejoin="round" />
          <Polygon points="96,112 106,62 114,112" fill={spike} stroke={stroke} strokeWidth={ST - 2} strokeLinejoin="round" />
          <Polygon points="110,118 118,74 128,118" fill={spike} stroke={stroke} strokeWidth={ST - 2} strokeLinejoin="round" />
          <Ellipse cx={100} cy={132} rx={60} ry={66} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Circle cx={76} cy={128} r={11} fill={cheek} />
          <Circle cx={126} cy={128} r={11} fill={cheek} />
          <Rect x={72} y={170} width={30} height={26} rx={9} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Rect x={98} y={170} width={30} height={26} rx={9} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Ellipse cx={104} cy={70} rx={38} ry={32} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Path
            d="M 62 74 Q 104 54 146 74 L 154 94 Q 104 118 62 94 Z"
            fill={fillUrl}
            stroke={stroke}
            strokeWidth={ST}
            strokeLinejoin="round"
          />
          <Ellipse cx={54} cy={88} rx={16} ry={12} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Ellipse cx={40} cy={122} rx={18} ry={44} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" transform="rotate(-12 40 122)" />
          <Ellipse cx={160} cy={122} rx={18} ry={44} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" transform="rotate(12 160 122)" />
        </G>
      </BodyGrad>
      <G transform="translate(-2, -6)">
        {renderEyes(e, stroke, eyeWhite, pupil, ST, mood)}
        {renderMouth(m, stroke, ST, mood)}
      </G>
    </G>
  );
}

function SpeciesTrex({ gid, fillUrl, stroke, ST, cheek, bodyLight, bodyDark, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <BodyGrad gid={gid} light={bodyLight} dark={bodyDark}>
        <G>
          <Path
            d="M 174 154 L 210 164 L 214 178 L 186 182 Q 168 174 174 154 Z"
            fill={fillUrl}
            stroke={stroke}
            strokeWidth={ST}
            strokeLinejoin="round"
          />
          <Ellipse cx={92} cy={138} rx={46} ry={42} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Polygon
            points="28,112 154,74 174,134 154,174 92,182 52,174"
            fill={fillUrl}
            stroke={stroke}
            strokeWidth={ST}
            strokeLinejoin="round"
          />
          <Circle cx={120} cy={126} r={12} fill={cheek} />
          <Circle cx={138} cy={132} r={11} fill={cheek} />
          <Rect x={48} y={132} width={12} height={22} rx={3} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Rect x={64} y={130} width={12} height={22} rx={3} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Path
            d="M 40 154 Q 70 178 132 174"
            fill="none"
            stroke={stroke}
            strokeWidth={ST}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Rect x={74} y={168} width={28} height={26} rx={8} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Rect x={98} y={168} width={28} height={26} rx={8} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
        </G>
      </BodyGrad>
      <G transform="translate(22, -2)">{renderEyes(e, stroke, eyeWhite, pupil, ST, mood)}</G>
      <G transform="translate(20, 32)">{renderMouth(m, stroke, ST, mood)}</G>
    </G>
  );
}

function SpeciesMech({ gid, fillUrl, stroke, ST, bodyLight, bodyDark, e, m, mood, eyeWhite, pupil }) {
  return (
    <G>
      <BodyGrad gid={gid} light={bodyLight} dark={bodyDark}>
        <G>
          <Rect x={40} y={102} width={26} height={56} rx={8} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Rect x={134} y={102} width={26} height={56} rx={8} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Rect x={58} y={96} width={84} height={92} rx={14} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Line x1={68} y1={118} x2={132} y2={118} stroke={stroke} strokeWidth={4} opacity={0.35} strokeLinecap="round" />
          <Line x1={68} y1={138} x2={132} y2={138} stroke={stroke} strokeWidth={4} opacity={0.35} strokeLinecap="round" />
          <Rect x={72} y={44} width={56} height={48} rx={10} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Rect x={78} y={56} width={44} height={22} rx={4} fill="#2ecc71" stroke={stroke} strokeWidth={ST - 2} opacity={0.85} />
          <Rect x={86} y={62} width={28} height={8} rx={2} fill="#f39c12" opacity={0.9} stroke={stroke} strokeWidth={2} />
          <Polygon points="100,28 112,52 88,52" fill={fillUrl} stroke={stroke} strokeWidth={ST - 2} strokeLinejoin="round" />
          <Circle cx={100} cy={36} r={4} fill="#e74c3c" stroke={stroke} strokeWidth={2} />
          <Rect x={74} y={182} width={24} height={16} rx={4} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Rect x={102} y={182} width={24} height={16} rx={4} fill={fillUrl} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
        </G>
      </BodyGrad>
      <G transform="translate(0, -34)">{renderEyes(e, stroke, eyeWhite, pupil, ST, mood)}</G>
      <G transform="translate(0, -14)">{renderMouth(m, stroke, ST, mood)}</G>
    </G>
  );
}

function renderCapeLayer(cosmetics, fillUrl, stroke, ST) {
  if (!cosmetics.includes('cape') && !cosmetics.includes('tpCape')) return null;
  const tp = cosmetics.includes('tpCape');
  return (
    <G opacity={0.92}>
      <Path
        d="M 52 96 Q 100 200 148 96 L 132 88 Q 100 170 68 88 Z"
        fill={tp ? '#f5f0e8' : '#c0392b'}
        stroke={stroke}
        strokeWidth={ST}
        strokeLinejoin="round"
      />
      {tp ? (
        <G>
          <Circle cx={72} cy={130} r={5} fill="#dfe6e9" opacity={0.7} />
          <Circle cx={118} cy={122} r={4} fill="#dfe6e9" opacity={0.5} />
        </G>
      ) : null}
    </G>
  );
}

function renderLegs(variant, fill, stroke, ST) {
  switch (variant) {
    case 1:
      return (
        <G>
          <Rect x={70} y={168} width={22} height={22} rx={6} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Rect x={108} y={168} width={22} height={22} rx={6} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
        </G>
      );
    case 2:
      return (
        <G>
          <Path d="M76 168 L86 194 L66 194 Z" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Path d="M124 168 L134 194 L114 194 Z" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
        </G>
      );
    case 3:
      return (
        <G>
          <Ellipse cx={80} cy={184} rx={16} ry={12} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Ellipse cx={120} cy={184} rx={16} ry={12} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
        </G>
      );
    default:
      return (
        <G>
          <Path d="M 72 168 L 92 196 L 92 168 Z" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Path d="M 128 168 L 108 196 L 108 168 Z" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
        </G>
      );
  }
}

function renderHead(variant, fill, stroke, ST) {
  switch (variant) {
    case 1:
      return <Rect x={58} y={60} width={84} height={64} rx={28} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" opacity={0.96} />;
    case 2:
      return <Polygon points="100,54 140,98 128,126 72,126 60,98" fill={fill} stroke={stroke} strokeWidth={ST} opacity={0.94} strokeLinejoin="round" />;
    case 3:
      return <Circle cx={100} cy={94} r={44} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" opacity={0.92} />;
    default:
      return <Ellipse cx={100} cy={96} rx={50} ry={38} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" opacity={0.9} />;
  }
}

function renderHands(variant, fill, stroke, ST, cosmetics) {
  const box = cosmetics.includes('boxing');
  switch (variant) {
    case 1:
      return (
        <G>
          <Circle cx={38} cy={128} r={box ? 20 : 16} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Circle cx={162} cy={128} r={box ? 20 : 16} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          {box ? (
            <G>
              <Rect x={30} y={122} width={16} height={10} rx={2} fill="#e74c3c" opacity={0.9} />
              <Rect x={154} y={122} width={16} height={10} rx={2} fill="#e74c3c" opacity={0.9} />
            </G>
          ) : null}
        </G>
      );
    case 2:
      return (
        <G>
          <Polygon points="44,108 24,126 48,134" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Polygon points="156,108 176,126 152,134" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
        </G>
      );
    case 3:
      return (
        <G>
          <Path d="M 30 124 L 54 108 L 54 144 Z" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Path d="M 170 124 L 146 108 L 146 144 Z" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
        </G>
      );
    default:
      return (
        <G>
          <Ellipse cx={42} cy={130} rx={14} ry={20} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Ellipse cx={158} cy={130} rx={14} ry={20} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
        </G>
      );
  }
}

function renderTail(variant, fill, stroke, ST) {
  switch (variant) {
    case 1:
      return <Path d="M 154 118 Q 182 132 184 154 Q 169 174 154 154" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />;
    case 2:
      return <Polygon points="146,132 174,146 174,118" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />;
    case 3:
      return <Path d="M 142 138 L 188 154 L 188 174 L 174 174 L 166 154 Z" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />;
    default:
      return <Path d="M 154 138 C 174 154 174 174 154 174 C 154 158 154 146 154 138 Z" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />;
  }
}

function renderBody(variant, fill, stroke, ST, cheek, gid, light, dark) {
  const wrap = (node) => (
    <BodyGrad gid={gid} light={light} dark={dark}>
      {node}
    </BodyGrad>
  );
  switch (variant) {
    case 1:
      return wrap(
        <G>
          <Rect x={52} y={78} width={96} height={88} rx={22} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Circle cx={78} cy={118} r={10} fill={cheek} />
          <Circle cx={122} cy={118} r={10} fill={cheek} />
        </G>,
      );
    case 2:
      return wrap(
        <G>
          <Polygon points="100,70 160,120 138,174 62,174 40,120" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Circle cx={74} cy={124} r={9} fill={cheek} />
          <Circle cx={126} cy={124} r={9} fill={cheek} />
        </G>,
      );
    case 3:
      return wrap(
        <G>
          <Ellipse cx={100} cy={124} rx={58} ry={48} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Circle cx={74} cy={124} r={11} fill={cheek} />
          <Circle cx={126} cy={124} r={11} fill={cheek} />
        </G>,
      );
    default:
      return wrap(
        <G>
          <Ellipse cx={100} cy={126} rx={54} ry={58} fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Circle cx={74} cy={124} r={11} fill={cheek} />
          <Circle cx={126} cy={124} r={11} fill={cheek} />
        </G>,
      );
  }
}

/**
 * @param {'neutral'|'happy'|'angry'|'dizzy'} mood
 */
function renderEyes(variant, stroke, eyeWhite, pupil, ST, mood) {
  const y = variant === 2 ? 100 : variant === 3 ? 98 : variant === 4 ? 102 : 100;
  const ex = variant === 1 ? 10 : variant === 2 ? -4 : variant === 3 ? -6 : 0;
  const ey = variant === 1 ? -4 : 0;

  if (mood === 'happy') {
    return (
      <G>
        <Path d="M 72 104 Q 78 98 84 104" fill="none" stroke={stroke} strokeWidth={ST - 1} strokeLinecap="round" />
        <Path d="M 116 104 Q 122 98 128 104" fill="none" stroke={stroke} strokeWidth={ST - 1} strokeLinecap="round" />
      </G>
    );
  }
  if (mood === 'angry') {
    return (
      <G>
        <Path d="M 70 96 L 88 108" stroke={stroke} strokeWidth={ST} strokeLinecap="round" />
        <Path d="M 130 96 L 112 108" stroke={stroke} strokeWidth={ST} strokeLinecap="round" />
        <Circle cx={80} cy={112} r={9} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 2} />
        <Circle cx={120} cy={112} r={9} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 2} />
        <Circle cx={82} cy={112} r={4} fill={pupil} />
        <Circle cx={122} cy={112} r={4} fill={pupil} />
      </G>
    );
  }
  if (mood === 'dizzy') {
    return (
      <G>
        <Circle cx={78} cy={104} r={16} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 1} />
        <Circle cx={122} cy={104} r={16} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 1} />
        <Path d="M 70 100 Q 78 92 86 100 T 102 100" fill="none" stroke={pupil} strokeWidth={3} />
        <Path d="M 114 100 Q 122 92 130 100 T 146 100" fill="none" stroke={pupil} strokeWidth={3} />
      </G>
    );
  }

  switch (variant) {
    case 1:
      return (
        <G>
          <Rect x={68 + ex / 2} y={y + ey / 2} width={64} height={22} rx={8} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 1} />
          <Circle cx={88 + ex / 2} cy={y + ey / 2 + 11} r={7} fill={pupil} />
          <Circle cx={112 + ex / 2} cy={y + ey / 2 + 11} r={7} fill={pupil} />
        </G>
      );
    case 2:
      return (
        <G>
          <Ellipse cx={84} cy={y} rx={18} ry={24} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 1} />
          <Ellipse cx={116} cy={y} rx={18} ry={24} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 1} />
          <Circle cx={84} cy={y + 2} r={8} fill={pupil} />
          <Circle cx={116} cy={y + 2} r={8} fill={pupil} />
        </G>
      );
    case 3:
      return (
        <G>
          <Circle cx={76} cy={y} r={22} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 1} />
          <Circle cx={124} cy={y} r={22} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 1} />
          <Circle cx={72} cy={y - 2} r={10} fill={pupil} />
          <Circle cx={120} cy={y - 2} r={10} fill={pupil} />
        </G>
      );
    case 4:
      return (
        <G>
          <Path d="M 66 98 L 86 92 L 78 108 Z" fill={eyeWhite} stroke={stroke} strokeWidth={ST - 2} strokeLinejoin="round" />
          <Path d="M 114 98 L 134 92 L 126 108 Z" fill={eyeWhite} stroke={stroke} strokeWidth={ST - 2} strokeLinejoin="round" />
          <Circle cx={78} cy={100} r={4} fill={pupil} />
          <Circle cx={126} cy={100} r={4} fill={pupil} />
        </G>
      );
    default:
      return (
        <G>
          <Circle cx={78} cy={y} r={18} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 1} />
          <Circle cx={122} cy={y} r={18} fill={eyeWhite} stroke={stroke} strokeWidth={ST - 1} />
          <Circle cx={78} cy={y} r={8} fill={pupil} />
          <Circle cx={122} cy={y} r={8} fill={pupil} />
        </G>
      );
  }
}

/**
 * @param {'neutral'|'happy'|'angry'|'dizzy'} mood
 */
function renderMouth(variant, stroke, ST, mood) {
  const y = 148;
  if (mood === 'happy') {
    return <Path d={`M 78 ${y - 4} Q 100 ${y + 22} 122 ${y - 4}`} fill="none" stroke={stroke} strokeWidth={ST} strokeLinecap="round" />;
  }
  if (mood === 'angry') {
    return (
      <G>
        <Path d={`M 78 ${y + 6} L 88 ${y - 4} L 98 ${y + 6} L 108 ${y - 4} L 118 ${y + 6}`} fill="none" stroke={stroke} strokeWidth={ST - 1} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    );
  }
  if (mood === 'dizzy') {
    return <Path d={`M 74 ${y} Q 88 ${y + 8} 100 ${y} T 126 ${y}`} fill="none" stroke={stroke} strokeWidth={ST - 1} strokeLinecap="round" />;
  }
  switch (variant) {
    case 1:
      return <Rect x={78} y={y - 6} width={44} height={16} rx={4} fill="#2d2d44" stroke={stroke} strokeWidth={ST - 2} />;
    case 2:
      return <Path d={`M 76 ${y} Q 100 ${y + 18} 124 ${y}`} fill="none" stroke={stroke} strokeWidth={ST} strokeLinecap="round" />;
    case 3:
      return <Path d={`M 78 ${y - 2} L 100 ${y + 14} L 122 ${y - 2}`} fill="none" stroke={stroke} strokeWidth={ST} strokeLinecap="round" strokeLinejoin="round" />;
    case 4:
      return (
        <G>
          <Path d={`M 74 ${y} Q 100 ${y - 10} 126 ${y}`} fill="none" stroke={stroke} strokeWidth={ST} strokeLinecap="round" />
          <Rect x={92} y={y - 2} width={16} height={10} rx={2} fill="#fff" stroke={stroke} strokeWidth={3} />
        </G>
      );
    default:
      return <Ellipse cx={100} cy={y} rx={22} ry={12} fill="#2d2d44" stroke={stroke} strokeWidth={ST - 2} />;
  }
}

function renderHorn(variant, stroke, fill, ST) {
  switch (variant) {
    case 1:
      return <Polygon points="100,42 120,86 80,86" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />;
    case 2:
      return (
        <G>
          <Polygon points="78,58 88,36 98,58" fill={fill} stroke={stroke} strokeWidth={ST - 1} strokeLinejoin="round" />
          <Polygon points="102,58 112,36 122,58" fill={fill} stroke={stroke} strokeWidth={ST - 1} strokeLinejoin="round" />
        </G>
      );
    case 3:
      return <Path d="M 100 36 L 122 88 L 88 88 Z" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />;
    default:
      return <Polygon points="100,34 116,88 84,88" fill={fill} stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />;
  }
}

function renderCosmeticsTop(cosmetics, stroke, ST) {
  if (!cosmetics.length) return null;
  return (
    <G>
      {cosmetics.includes('crown') ? (
        <G>
          <Path d="M 72 58 L 84 44 L 100 52 L 116 44 L 128 58 L 124 68 L 76 68 Z" fill="#f1c40f" stroke={stroke} strokeWidth={ST - 1} strokeLinejoin="round" />
          <Circle cx={100} cy={48} r={5} fill="#e74c3c" />
        </G>
      ) : null}
      {cosmetics.includes('sunglasses') ? (
        <G>
          <Rect x={64} y={94} width={34} height={18} rx={5} fill="#2c3e50" stroke={stroke} strokeWidth={4} />
          <Rect x={102} y={94} width={34} height={18} rx={5} fill="#2c3e50" stroke={stroke} strokeWidth={4} />
          <Line x1={98} y1={102} x2={102} y2={102} stroke={stroke} strokeWidth={5} strokeLinecap="round" />
        </G>
      ) : null}
      {cosmetics.includes('wizard') ? (
        <G>
          <Polygon points="100,22 132,78 68,78" fill="#8e44ad" stroke={stroke} strokeWidth={ST} strokeLinejoin="round" />
          <Rect x={88} y={74} width={24} height={8} rx={2} fill="#f39c12" stroke={stroke} strokeWidth={3} />
        </G>
      ) : null}
      {cosmetics.includes('sockNecklace') ? (
        <G>
          <Path d="M 78 132 Q 100 148 122 132" fill="none" stroke="#7dcea0" strokeWidth={5} strokeLinecap="round" />
          <Ellipse cx={88} cy={138} rx={8} ry={12} fill="#c8d6bf" stroke={stroke} strokeWidth={3} />
          <Ellipse cx={112} cy={138} rx={8} ry={12} fill="#a8c4a8" stroke={stroke} strokeWidth={3} />
        </G>
      ) : null}
    </G>
  );
}
