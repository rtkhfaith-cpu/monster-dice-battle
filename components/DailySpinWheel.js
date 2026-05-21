import React, { useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const SIZE = 288;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RIM = SIZE / 2 - 8;
const HUB_R = 36;

function polar(cx, cy, r, deg) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function wedgePath(startDeg, endDeg) {
  const start = polar(CX, CY, RIM, startDeg);
  const end = polar(CX, CY, RIM, endDeg);
  const sweep = endDeg - startDeg;
  const large = sweep > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${RIM} ${RIM} 0 ${large} 1 ${end.x} ${end.y} Z`;
}

function labelTextColor(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#0f172a';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#1e1b4b' : '#fff7ed';
}

export default function DailySpinWheel({ segments, rotate }) {
  const sliceData = useMemo(() => {
    const n = segments.length;
    const step = 360 / n;
    return segments.map((seg, i) => {
      const start = i * step;
      const end = start + step;
      const mid = start + step / 2;
      const labelR = RIM * 0.58;
      const pos = polar(CX, CY, labelR, mid);
      return { seg, start, end, mid, pos, textColor: labelTextColor(seg.color) };
    });
  }, [segments]);

  const tickMarks = useMemo(() => {
    const n = segments.length;
    const step = 360 / n;
    return Array.from({ length: n }, (_, i) => {
      const deg = i * step;
      const outer = polar(CX, CY, RIM + 2, deg);
      const inner = polar(CX, CY, RIM - 10, deg);
      return { key: `tick_${i}`, x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y };
    });
  }, [segments.length]);

  return (
    <View style={styles.wrap}>
      <View style={styles.pointerWrap}>
        <View style={styles.pointerRing} />
        <View style={styles.pointer} />
      </View>

      <View style={styles.outerRing}>
        <View style={styles.outerGlow} pointerEvents="none" />
        <Animated.View style={[styles.spinLayer, { transform: [{ rotate }] }]}>
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Circle cx={CX} cy={CY} r={RIM + 6} fill="#120a24" />
            {sliceData.map(({ seg, start, end }) => (
              <Path
                key={seg.id}
                d={wedgePath(start, end)}
                fill={seg.color}
                stroke="rgba(255, 230, 163, 0.45)"
                strokeWidth={2}
              />
            ))}
            {tickMarks.map((t) => (
              <Path
                key={t.key}
                d={`M ${t.x1} ${t.y1} L ${t.x2} ${t.y2}`}
                stroke="rgba(255, 230, 163, 0.7)"
                strokeWidth={2}
              />
            ))}
            <Circle cx={CX} cy={CY} r={RIM} fill="none" stroke="#ffe6a3" strokeWidth={4} />
            <Circle cx={CX} cy={CY} r={RIM - 6} fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={1} />
          </Svg>

          {sliceData.map(({ seg, pos, textColor }) => (
            <View
              key={`lbl_${seg.id}`}
              style={[styles.labelSlot, { left: pos.x - 40, top: pos.y - 24 }]}
              pointerEvents="none"
            >
              <Text style={styles.emoji}>{seg.emoji}</Text>
              <Text style={[styles.labelTitle, { color: textColor }]} numberOfLines={1}>
                {seg.wheelTitle}
              </Text>
              {seg.wheelSub ? (
                <Text style={[styles.labelSub, { color: textColor }]} numberOfLines={1}>
                  {seg.wheelSub}
                </Text>
              ) : null}
            </View>
          ))}
        </Animated.View>

        <View style={styles.hub} pointerEvents="none">
          <View style={styles.hubInner}>
            <Text style={styles.hubStar}>✦</Text>
            <Text style={styles.hubTxt}>LUCKY</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE + 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  pointerWrap: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  pointerRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 230, 163, 0.25)',
    borderWidth: 2,
    borderColor: 'rgba(255, 230, 163, 0.6)',
    position: 'absolute',
    top: 2,
  },
  pointer: {
    width: 0,
    height: 0,
    marginTop: 10,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 28,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#ffe6a3',
    elevation: 10,
  },
  outerRing: {
    width: SIZE,
    height: SIZE,
    marginTop: 24,
    borderRadius: SIZE / 2,
    borderWidth: 6,
    borderColor: '#c9a227',
    backgroundColor: '#0c0618',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 14,
  },
  outerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 230, 163, 0.2)',
  },
  spinLayer: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  labelSlot: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 1,
  },
  labelTitle: {
    fontWeight: '900',
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  labelSub: {
    fontWeight: '800',
    fontSize: 8,
    textAlign: 'center',
    letterSpacing: 0.8,
    opacity: 0.92,
  },
  hub: {
    position: 'absolute',
    left: CX - HUB_R,
    top: CY - HUB_R,
    width: HUB_R * 2,
    height: HUB_R * 2,
    borderRadius: HUB_R,
    backgroundColor: '#1a1030',
    borderWidth: 4,
    borderColor: '#ffe6a3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  hubInner: { alignItems: 'center' },
  hubStar: {
    color: '#fde68a',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: -2,
  },
  hubTxt: {
    color: '#ffe6a3',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 2.5,
  },
});
