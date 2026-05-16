import React from 'react';
import { G, Circle, Ellipse, Path, Polygon, Rect, Line } from 'react-native-svg';
import { getGear } from '../utils/cosmetics';

const ELEMENT_GLOW = {
  fire: '#ff6b35',
  water: '#4dabf7',
  metal: '#adb5bd',
  wood: '#69db7c',
  earth: '#a67c52',
};

/**
 * SVG gear overlays — head/feet/shield/aura without covering eyes.
 * @param {string[]} cosmetics — equipped gear ids
 */
export function MonsterGearLayers({ cosmetics = [], stroke = '#2d3561', ST = 6 }) {
  if (!cosmetics.length) return null;

  const has = (id) => cosmetics.includes(id);
  const elementGear = cosmetics.map((id) => getGear(id)).find((g) => g?.element);
  const glowColor = elementGear ? ELEMENT_GLOW[elementGear.element] ?? '#a66cff' : null;

  return (
    <G>
      {/* Back aura — behind body */}
      {has('fireAura') || has('fireCore') ? (
        <Circle cx={100} cy={118} r={74} fill="#ff6b35" opacity={0.2} stroke={stroke} strokeWidth={3} />
      ) : null}
      {has('waterShell') ? (
        <Ellipse cx={100} cy={120} rx={78} ry={70} fill="#4dabf7" opacity={0.16} stroke="#339af0" strokeWidth={3} />
      ) : null}
      {has('woodCharm') ? (
        <Circle cx={100} cy={122} r={70} fill="#69db7c" opacity={0.14} stroke={stroke} strokeWidth={2} />
      ) : null}
      {has('earthRune') ? (
        <Circle cx={100} cy={124} r={68} fill="#a67c52" opacity={0.12} stroke={stroke} strokeWidth={2} />
      ) : null}
      {has('metalPlate') ? (
        <Rect x={42} y={88} width={116} height={72} rx={18} fill="#ced4da" opacity={0.22} stroke="#868e96" strokeWidth={3} />
      ) : null}
      {glowColor && !has('fireAura') && !has('waterShell') ? (
        <Circle cx={100} cy={118} r={72} fill={glowColor} opacity={0.18} stroke={glowColor} strokeWidth={2} />
      ) : null}

      {/* Feet */}
      {has('slippers') ? (
        <G>
          <Ellipse cx={78} cy={192} rx={18} ry={8} fill="#ff922b" stroke={stroke} strokeWidth={ST - 2} />
          <Ellipse cx={122} cy={192} rx={18} ry={8} fill="#ff922b" stroke={stroke} strokeWidth={ST - 2} />
          <Rect x={64} y={184} width={28} height={6} rx={3} fill="#ffd43b" stroke={stroke} strokeWidth={2} />
          <Rect x={108} y={184} width={28} height={6} rx={3} fill="#ffd43b" stroke={stroke} strokeWidth={2} />
        </G>
      ) : null}

      {/* Shield on left arm */}
      {has('toiletLid') ? (
        <G>
          <Ellipse cx={34} cy={132} rx={22} ry={26} fill="#e8f4f8" stroke={stroke} strokeWidth={ST - 1} />
          <Ellipse cx={34} cy={128} rx={14} ry={8} fill="#74c0fc" opacity={0.5} />
          <Circle cx={34} cy={132} r={4} fill="#adb5bd" stroke={stroke} strokeWidth={2} />
        </G>
      ) : null}
      {has('guardBadge') && !has('toiletLid') ? (
        <G>
          <Polygon points="28,118 44,108 44,148 28,158" fill="#74c0fc" stroke={stroke} strokeWidth={ST - 2} strokeLinejoin="round" />
          <Path d="M 36 124 L 36 140" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
        </G>
      ) : null}

      {/* Side charms — avoid face */}
      {has('mpOrb') ? (
        <Circle cx={168} cy={108} r={12} fill="#9775fa" stroke={stroke} strokeWidth={ST - 2} opacity={0.95} />
      ) : null}
      {has('hpCharm') ? (
        <Path
          d="M 32 108 Q 32 98 40 98 Q 48 98 48 108 Q 48 118 40 126 Q 32 118 32 108"
          fill="#ff6b6b"
          stroke={stroke}
          strokeWidth={ST - 2}
        />
      ) : null}
      {has('rubberDuck') ? (
        <G>
          <Ellipse cx={168} cy={142} rx={10} ry={8} fill="#ffd43b" stroke={stroke} strokeWidth={3} />
          <Circle cx={174} cy={136} r={6} fill="#ffd43b" stroke={stroke} strokeWidth={2} />
        </G>
      ) : null}
      {has('smellySocks') ? (
        <G>
          <Ellipse cx={164} cy={150} rx={8} ry={14} fill="#a8c4a8" stroke={stroke} strokeWidth={3} />
          <Line x1={160} y1={138} x2={168} y2={134} stroke="#7dcea0" strokeWidth={3} strokeLinecap="round" />
        </G>
      ) : null}
      {has('powerBand') ? (
        <Rect x={158} y={118} width={14} height={28} rx={4} fill="#ff6b6b" stroke={stroke} strokeWidth={3} />
      ) : null}

      {/* Head gear — above eyes */}
      {has('slapHand') || has('powerBand') ? (
        <G>
          <Ellipse cx={158} cy={118} rx={14} ry={10} fill="#ff922b" stroke={stroke} strokeWidth={ST - 2} />
          <Path d="M 168 112 L 178 108 L 172 122 Z" fill="#ffd43b" stroke={stroke} strokeWidth={2} />
        </G>
      ) : null}
      {has('durianHelm') ? (
        <G>
          <Ellipse cx={100} cy={62} rx={52} ry={28} fill="#8bc34a" stroke={stroke} strokeWidth={ST - 1} />
          <Path d="M 58 58 L 68 42 L 78 56" fill="#689f38" stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M 88 50 L 100 34 L 112 50" fill="#689f38" stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M 122 58 L 132 42 L 142 56" fill="#689f38" stroke={stroke} strokeWidth={3} strokeLinejoin="round" />
        </G>
      ) : null}
    </G>
  );
}

export default MonsterGearLayers;
