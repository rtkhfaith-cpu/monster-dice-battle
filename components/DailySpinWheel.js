import React, { useMemo } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

export const DAILY_WHEEL_SIZE = 300;
const SIZE = DAILY_WHEEL_SIZE;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RIM = SIZE / 2 - 10;
const HUB_R = 38;
const LABEL_R = RIM * 0.56;
const LABEL_PAD_DEG = 5;

const ROYAL = {
  rimGold: '#d4af37',
  rimGoldLight: '#f5e6b8',
  rimPurple: '#2a1448',
  hub: '#1a0a2e',
  hubBorder: '#e8c547',
  divider: '#f5e6b8',
  dividerShadow: 'rgba(26, 10, 46, 0.55)',
  jewel: '#c9a227',
};

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

/** Max label width that fits inside a wedge without crossing divider lines. */
export function wedgeLabelMaxWidth(stepDeg, radius = LABEL_R, padDeg = LABEL_PAD_DEG) {
  const halfRad = Math.max(4, (stepDeg / 2 - padDeg) * (Math.PI / 180));
  return Math.floor(2 * radius * Math.sin(halfRad) * 0.88);
}

function labelTextColor(hex) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#fff8e7';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#2a1448' : '#fff8e7';
}

function WedgeLabel({ seg, mid, maxWidth, textColor }) {
  const labelH = 42;
  return (
    <View
      style={[
        styles.labelPivot,
        { left: CX, top: CY, transform: [{ rotate: `${mid}deg` }] },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.labelBox,
          {
            width: maxWidth,
            marginLeft: -maxWidth / 2,
            top: -(LABEL_R + labelH * 0.5),
            height: labelH,
          },
        ]}
      >
        <Text style={styles.labelEmoji} numberOfLines={1}>
          {seg.emoji}
        </Text>
        <Text
          style={[styles.labelTitle, { color: textColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {seg.wheelTitle}
        </Text>
        {seg.wheelSub ? (
          <Text
            style={[styles.labelSub, { color: textColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {seg.wheelSub}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export {
  rotationMatchesSegmentIndex,
  segmentCenterDeg,
  segmentIndexFromRotation,
  spinRotationForSegmentIndex,
} from '../utils/dailySpinWheelAlign';

export default function DailySpinWheel({ segments, rotate }) {
  const stepDeg = 360 / segments.length;
  const maxLabelWidth = wedgeLabelMaxWidth(stepDeg);

  const sliceData = useMemo(() => {
    const half = stepDeg / 2;
    return segments.map((seg, i) => {
      const mid = i * stepDeg;
      const start = mid - half;
      const end = mid + half;
      return {
        seg,
        start,
        end,
        mid,
        textColor: labelTextColor(seg.color),
      };
    });
  }, [segments, stepDeg]);

  const rimJewels = useMemo(() => {
    const count = 18;
    const step = 360 / count;
    return Array.from({ length: count }, (_, i) => {
      const p = polar(CX, CY, RIM + 5, i * step);
      return { key: `jewel_${i}`, x: p.x, y: p.y };
    });
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.outerFrame}>
        <View style={styles.outerFrameInner}>
          <Animated.View style={[styles.spinLayer, { transform: [{ rotate }] }]}>
            <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
              <Circle cx={CX} cy={CY} r={RIM + 8} fill={ROYAL.rimPurple} />
              {sliceData.map(({ seg, start, end }) => (
                <Path
                  key={seg.id}
                  d={wedgePath(start, end)}
                  fill={seg.color}
                  stroke={ROYAL.dividerShadow}
                  strokeWidth={1}
                />
              ))}
              {sliceData.map(({ seg, start, end }) => (
                <G key={`line_${seg.id}`}>
                  <Path
                    d={wedgePath(start, end)}
                    fill="none"
                    stroke={ROYAL.divider}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </G>
              ))}
              {rimJewels.map((j) => (
                <Circle
                  key={j.key}
                  cx={j.x}
                  cy={j.y}
                  r={3.5}
                  fill={ROYAL.jewel}
                  stroke={ROYAL.rimGoldLight}
                  strokeWidth={1}
                />
              ))}
              <Circle cx={CX} cy={CY} r={RIM + 2} fill="none" stroke={ROYAL.rimGold} strokeWidth={5} />
              <Circle cx={CX} cy={CY} r={RIM - 4} fill="none" stroke="rgba(255, 248, 231, 0.12)" strokeWidth={1} />
            </Svg>

            {sliceData.map((item) => (
              <View key={`lbl_${item.seg.id}`} style={styles.labelClipHost} pointerEvents="none">
                <WedgeLabel
                  seg={item.seg}
                  mid={item.mid}
                  maxWidth={maxLabelWidth}
                  textColor={item.textColor}
                />
              </View>
            ))}
          </Animated.View>

          <View style={styles.pointerFixed} pointerEvents="none">
            <View style={styles.pointerCrown}>
              <Text style={styles.pointerCrownIcon}>♛</Text>
            </View>
            <View style={styles.pointerStem} />
            <View style={styles.pointerTip} />
          </View>

          <View style={styles.hub} pointerEvents="none">
            <View style={styles.hubRing}>
              <Text style={styles.hubCrown}>♛</Text>
              <Text style={styles.hubTxt}>ROYAL</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE + 14,
    height: SIZE + 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  pointerFixed: {
    position: 'absolute',
    top: 2,
    left: SIZE / 2 - 24,
    zIndex: 30,
    alignItems: 'center',
    width: 48,
  },
  pointerCrown: {
    width: 34,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#2a1448',
    borderWidth: 2,
    borderColor: ROYAL.rimGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -2,
  },
  pointerCrownIcon: {
    color: ROYAL.rimGoldLight,
    fontSize: 18,
    fontWeight: '900',
    marginTop: -2,
  },
  pointerStem: {
    width: 4,
    height: 10,
    backgroundColor: ROYAL.rimGold,
  },
  pointerTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: ROYAL.rimGold,
    marginTop: -1,
  },
  outerFrame: {
    width: SIZE + 14,
    height: SIZE + 14,
    borderRadius: (SIZE + 14) / 2,
    padding: 5,
    backgroundColor: ROYAL.rimGold,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 16,
  },
  outerFrameInner: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    borderColor: '#5b21b6',
    backgroundColor: ROYAL.rimPurple,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spinLayer: {
    width: SIZE,
    height: SIZE,
    position: 'relative',
  },
  labelClipHost: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: SIZE / 2,
  },
  labelPivot: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  labelBox: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  labelEmoji: {
    fontSize: 16,
    lineHeight: 18,
    textAlign: 'center',
  },
  labelTitle: {
    fontWeight: '900',
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  labelSub: {
    fontWeight: '800',
    fontSize: 7,
    textAlign: 'center',
    letterSpacing: 0.6,
    opacity: 0.95,
  },
  hub: {
    position: 'absolute',
    left: CX - HUB_R,
    top: CY - HUB_R,
    width: HUB_R * 2,
    height: HUB_R * 2,
    borderRadius: HUB_R,
    backgroundColor: ROYAL.hub,
    borderWidth: 4,
    borderColor: ROYAL.hubBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
  },
  hubRing: {
    width: HUB_R * 2 - 10,
    height: HUB_R * 2 - 10,
    borderRadius: HUB_R - 5,
    borderWidth: 2,
    borderColor: 'rgba(232, 197, 71, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubCrown: {
    color: ROYAL.rimGoldLight,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: -2,
  },
  hubTxt: {
    color: ROYAL.rimGoldLight,
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 3,
  },
});
