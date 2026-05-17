import React from 'react';
import { Circle, Ellipse, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import { DEFAULT_ST } from '../../../art/monsters/monsterRig';
import { resolvePalette } from '../bodies/shared';

/** Scale + lift applied to themed body at each visual tier. */
export function evolutionBodyTransform(tier = 0) {
  const t = Math.min(3, Math.max(0, tier));
  const scale = 1 + t * 0.065;
  const lift = -t * 5;
  return { scale, lift, transform: `translate(100 ${100 + lift}) scale(${scale}) translate(-100 -100)` };
}

function WingPair({ stroke, fill, y = 88, span = 38, tier = 1 }) {
  const w = span + tier * 6;
  return (
    <G opacity={0.92}>
      <Path
        d={`M 100 ${y} Q ${100 - w} ${y - 22 - tier * 4} ${100 - w - 8} ${y + 6} Q ${100 - w * 0.5} ${y - 8} 100 ${y}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={3}
      />
      <Path
        d={`M 100 ${y} Q ${100 + w} ${y - 22 - tier * 4} ${100 + w + 8} ${y + 6} Q ${100 + w * 0.5} ${y - 8} 100 ${y}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={3}
      />
    </G>
  );
}

function CrownSpikes({ stroke, fill, tier }) {
  const n = 3 + tier;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = 78 + (44 / (n - 1 || 1)) * i;
    pts.push(`${x},${42 - tier * 3} ${x + 6},${54} ${x - 6},${54}`);
  }
  return <Polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={2} />;
}

function MegaAura({ color, tier }) {
  return (
    <Ellipse
      cx={100}
      cy={118}
      rx={58 + tier * 4}
      ry={68 + tier * 6}
      fill={color}
      opacity={0.12 + tier * 0.04}
    />
  );
}

function CockroachOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? <WingPair stroke={stroke} fill={p.light} y={92} tier={tier} /> : null}
      {tier >= 2 ? (
        <>
          <Ellipse cx={100} cy={130} rx={50} ry={40} fill="none" stroke={p.glow} strokeWidth={4} opacity={0.55} />
          <Circle cx={72} cy={128} r={5} fill={p.accent} stroke={stroke} strokeWidth={2} />
          <Circle cx={128} cy={128} r={5} fill={p.accent} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <CrownSpikes stroke={stroke} fill={p.accent} tier={2} />
          <Path d="M 58 40 L 48 28 L 62 34" fill={p.light} stroke={stroke} strokeWidth={2} />
          <Path d="M 142 40 L 152 28 L 138 34" fill={p.light} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
    </G>
  );
}

function ChickenOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <Polygon points="92,48 100,28 108,48 100,42" fill={p.accent} stroke={stroke} strokeWidth={2} />
      ) : null}
      {tier >= 2 ? (
        <>
          <WingPair stroke={stroke} fill={p.light} y={100} span={32} tier={tier} />
          <Path d="M 88 58 L 76 50 L 90 54" fill={p.dark} stroke={stroke} strokeWidth={2} />
          <Path d="M 112 58 L 124 50 L 110 54" fill={p.dark} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <CrownSpikes stroke={stroke} fill={p.accent} tier={3} />
          <Ellipse cx={100} cy={72} rx={22} ry={14} fill={p.accent} opacity={0.35} />
        </>
      ) : null}
    </G>
  );
}

function WaterBottleOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <Rect x={88} y={34} width={24} height={12} rx={4} fill={p.light} stroke={stroke} strokeWidth={2} />
      ) : null}
      {tier >= 2 ? (
        <>
          <Path d="M 70 110 Q 100 95 130 110" fill="none" stroke={p.glow} strokeWidth={4} opacity={0.7} />
          <Circle cx={78} cy={108} r={4} fill={p.accent} />
          <Circle cx={122} cy={108} r={4} fill={p.accent} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <Path d="M 64 120 Q 100 80 136 120 L 130 150 Q 100 130 70 150 Z" fill={p.light} opacity={0.25} stroke={p.glow} strokeWidth={3} />
        </>
      ) : null}
    </G>
  );
}

function CrocsOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <>
          <Ellipse cx={68} cy={158} rx={16} ry={8} fill={p.accent} stroke={stroke} strokeWidth={2} />
          <Ellipse cx={132} cy={158} rx={16} ry={8} fill={p.accent} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
      {tier >= 2 ? <CrownSpikes stroke={stroke} fill={p.light} tier={2} /> : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <Circle cx={100} cy={52} r={14} fill={p.accent} stroke={stroke} strokeWidth={3} />
          <SvgText x={100} y={57} fontSize={14} fontWeight="bold" fill={p.dark} textAnchor="middle">
            J
          </SvgText>
        </>
      ) : null}
    </G>
  );
}

function IphoneOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <Rect x={118} y={70} width={14} height={22} rx={3} fill={p.dark} stroke={stroke} strokeWidth={2} />
      ) : null}
      {tier >= 2 ? (
        <>
          <Rect x={72} y={88} width={56} height={8} rx={2} fill={p.accent} stroke={stroke} strokeWidth={2} />
          <Circle cx={82} cy={92} r={2} fill={p.light} />
          <Circle cx={118} cy={92} r={2} fill={p.light} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <Rect x={78} y={48} width={44} height={6} rx={2} fill={p.glow} opacity={0.8} />
          <Line x1={100} y1={40} x2={100} y2={20} stroke={p.glow} strokeWidth={3} />
        </>
      ) : null}
    </G>
  );
}

function LunchboxOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? <Path d="M 92 38 Q 100 24 108 38" fill="none" stroke={p.accent} strokeWidth={3} /> : null}
      {tier >= 2 ? (
        <>
          <Path d="M 150 100 L 168 88 L 162 110 Z" fill={p.accent} stroke={stroke} strokeWidth={2} />
          <Circle cx={164} cy={96} r={6} fill={p.glow} opacity={0.5} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <WingPair stroke={stroke} fill={p.light} y={86} span={28} tier={2} />
          <Path d="M 86 42 L 100 26 L 114 42" fill={p.accent} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
    </G>
  );
}

function PencilOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <Rect x={148} y={72} width={10} height={28} rx={2} fill={p.accent} stroke={stroke} strokeWidth={2} />
      ) : null}
      {tier >= 2 ? (
        <>
          <Path d="M 40 100 L 24 92 L 30 108 Z" fill={p.dark} stroke={stroke} strokeWidth={2} />
          <Line x1={50} y1={118} x2={70} y2={128} stroke={p.accent} strokeWidth={4} />
          <Line x1={130} y1={128} x2={150} y2={118} stroke={p.accent} strokeWidth={4} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <Polygon points="100,24 112,44 88,44" fill={p.accent} stroke={stroke} strokeWidth={2} />
          <Path d="M 60 130 L 48 150 L 72 142 Z" fill={p.light} stroke={stroke} strokeWidth={2} />
          <Path d="M 140 130 L 152 150 L 128 142 Z" fill={p.light} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
    </G>
  );
}

function HomeworkOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <>
          <Rect x={76} y={44} width={48} height={10} rx={2} fill={p.light} stroke={stroke} strokeWidth={2} />
          <Line x1={82} y1={48} x2={118} y2={48} stroke={p.dark} strokeWidth={1} />
        </>
      ) : null}
      {tier >= 2 ? (
        <>
          <Path d="M 88 36 L 80 22 L 96 30" fill={p.accent} stroke={stroke} strokeWidth={2} />
          <Path d="M 112 36 L 120 22 L 104 30" fill={p.accent} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <Rect x={70} y={52} width={60} height={48} rx={4} fill={p.dark} opacity={0.2} stroke={p.glow} strokeWidth={3} />
          <SvgText x={100} y={82} fontSize={22} fontWeight="bold" fill={p.accent} textAnchor="middle">
            A+
          </SvgText>
        </>
      ) : null}
    </G>
  );
}

function ToiletPaperOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <>
          <Ellipse cx={62} cy={100} rx={10} ry={16} fill={p.light} stroke={stroke} strokeWidth={2} />
          <Ellipse cx={138} cy={100} rx={10} ry={16} fill={p.light} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
      {tier >= 2 ? (
        <Path d="M 70 60 Q 100 40 130 60" fill="none" stroke={p.accent} strokeWidth={4} strokeDasharray="6 4" />
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <Circle cx={100} cy={48} r={18} fill={p.light} stroke={stroke} strokeWidth={3} />
          <Path d="M 88 48 Q 100 30 112 48" fill="none" stroke={p.accent} strokeWidth={2} />
        </>
      ) : null}
    </G>
  );
}

function SchoolbagOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <Rect x={92} y={38} width={16} height={28} rx={4} fill="none" stroke={stroke} strokeWidth={3} />
      ) : null}
      {tier >= 2 ? (
        <>
          <Rect x={74} y={100} width={52} height={12} rx={3} fill={p.dark} stroke={stroke} strokeWidth={2} />
          <Circle cx={84} cy={106} r={3} fill={p.accent} />
          <Circle cx={116} cy={106} r={3} fill={p.accent} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <CrownSpikes stroke={stroke} fill={p.accent} tier={2} />
          <Rect x={68} y={108} width={64} height={20} rx={4} fill={p.accent} opacity={0.4} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
    </G>
  );
}

function TrexOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <Path d="M 100 44 L 108 28 L 116 44" fill={p.accent} stroke={stroke} strokeWidth={2} />
      ) : null}
      {tier >= 2 ? (
        <>
          <Polygon points="28,120 16,108 24,132" fill={p.dark} stroke={stroke} strokeWidth={2} />
          <Polygon points="172,120 184,108 176,132" fill={p.dark} stroke={stroke} strokeWidth={2} />
          <Path d="M 88 150 L 76 168 L 96 158" fill={p.accent} stroke={stroke} strokeWidth={2} />
          <Path d="M 112 150 L 124 168 L 104 158" fill={p.accent} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <CrownSpikes stroke={stroke} fill={p.accent} tier={3} />
          <Path d="M 70 56 L 58 40 L 74 50" fill={p.light} stroke={stroke} strokeWidth={2} />
          <Path d="M 130 56 L 142 40 L 126 50" fill={p.light} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
    </G>
  );
}

function TabletOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <Circle cx={100} cy={52} r={20} fill="none" stroke={p.glow} strokeWidth={2} opacity={0.6} />
      ) : null}
      {tier >= 2 ? (
        <>
          <Path d="M 72 40 L 68 24 L 80 32" fill={p.accent} stroke={stroke} strokeWidth={2} />
          <Path d="M 128 40 L 132 24 L 120 32" fill={p.accent} stroke={stroke} strokeWidth={2} />
          <Circle cx={68} cy={100} r={5} fill={p.glow} />
          <Circle cx={132} cy={100} r={5} fill={p.glow} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <Circle cx={100} cy={100} r={48} fill="none" stroke={p.glow} strokeWidth={3} opacity={0.5} />
          <SvgText x={100} y={106} fontSize={18} fontWeight="bold" fill={p.accent} textAnchor="middle">
            ★
          </SvgText>
        </>
      ) : null}
    </G>
  );
}

function SkibidiOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <Rect x={86} y={32} width={28} height={10} rx={3} fill={p.accent} stroke={stroke} strokeWidth={2} />
      ) : null}
      {tier >= 2 ? (
        <>
          <Line x1={64} y1={120} x2={52} y2={140} stroke={stroke} strokeWidth={4} />
          <Line x1={136} y1={120} x2={148} y2={140} stroke={stroke} strokeWidth={4} />
          <Circle cx={52} cy={142} r={8} fill={p.light} stroke={stroke} strokeWidth={2} />
          <Circle cx={148} cy={142} r={8} fill={p.light} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <Rect x={78} y={20} width={44} height={14} rx={4} fill={p.glow} stroke={stroke} strokeWidth={2} />
          <Path d="M 90 34 Q 100 8 110 34" fill={p.accent} opacity={0.5} />
        </>
      ) : null}
    </G>
  );
}

function BubbleTeaOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <>
          <Circle cx={86} cy={110} r={5} fill={p.dark} stroke={stroke} strokeWidth={1} />
          <Circle cx={100} cy={118} r={5} fill={p.dark} stroke={stroke} strokeWidth={1} />
          <Circle cx={114} cy={110} r={5} fill={p.dark} stroke={stroke} strokeWidth={1} />
        </>
      ) : null}
      {tier >= 2 ? (
        <Path d="M 82 48 Q 100 32 118 48" fill="none" stroke={p.accent} strokeWidth={4} />
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <Ellipse cx={100} cy={40} rx={28} ry={12} fill={p.light} stroke={stroke} strokeWidth={2} />
          <Circle cx={88} cy={100} r={6} fill={p.accent} />
          <Circle cx={112} cy={100} r={6} fill={p.accent} />
        </>
      ) : null}
    </G>
  );
}

function SixtySevenOverlay({ tier, p, stroke }) {
  return (
    <G>
      {tier >= 1 ? (
        <SvgText x={100} y={44} fontSize={16} fontWeight="bold" fill={p.accent} textAnchor="middle" opacity={0.85}>
          67
        </SvgText>
      ) : null}
      {tier >= 2 ? (
        <>
          <Path d="M 74 52 L 66 36 L 82 44" fill={p.glow} stroke={stroke} strokeWidth={2} />
          <Path d="M 126 52 L 134 36 L 118 44" fill={p.glow} stroke={stroke} strokeWidth={2} />
        </>
      ) : null}
      {tier >= 3 ? (
        <>
          <MegaAura color={p.glow} tier={tier} />
          <SvgText x={100} y={38} fontSize={28} fontWeight="bold" fill={p.accent} textAnchor="middle">
            67
          </SvgText>
          <Rect x={76} y={108} width={48} height={10} rx={3} fill={p.glow} opacity={0.6} />
        </>
      ) : null}
    </G>
  );
}

const OVERLAY_MAP = {
  cockroach: CockroachOverlay,
  chicken: ChickenOverlay,
  water_bottle: WaterBottleOverlay,
  crocs: CrocsOverlay,
  iphone: IphoneOverlay,
  lunchbox: LunchboxOverlay,
  pencil: PencilOverlay,
  homework: HomeworkOverlay,
  toilet_paper: ToiletPaperOverlay,
  schoolbag: SchoolbagOverlay,
  trex: TrexOverlay,
  tablet: TabletOverlay,
  skibidi: SkibidiOverlay,
  bubble_tea: BubbleTeaOverlay,
  sixtyseven: SixtySevenOverlay,
};

/**
 * Evolution accessories drawn on top of themed bodies (tiers 1–3 = Lv 10 / 25 / 50).
 */
export default function EvolutionOverlay({
  themeBody,
  evolutionTier = 0,
  palette = null,
  stroke = '#1a1a2e',
}) {
  const tier = Math.min(3, Math.max(0, Math.floor(evolutionTier || 0)));
  if (tier < 1 || !themeBody) return null;
  const Overlay = OVERLAY_MAP[themeBody];
  if (!Overlay) return null;
  const p = resolvePalette(palette);
  return <Overlay tier={tier} p={p} stroke={stroke} ST={DEFAULT_ST} />;
}
