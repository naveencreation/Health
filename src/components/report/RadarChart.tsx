import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { MotionCurves } from '@/theme/motion';

export interface RadarAxis {
  label: string;
  /** 0-1 */
  value: number;
}

const W = 306;
const H = 230;
const CX = 153;
const CY = 118;
const R = 82;

const point = (i: number, n: number, r: number): [number, number] => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [CX + Math.cos(a) * R * r, CY + Math.sin(a) * R * r];
};
const join = (pts: [number, number][]) => pts.map(p => `${p[0]},${p[1]}`).join(' ');

/** Five-axis radar: concentric grid polygons, spokes, a filled value polygon and % labels. */
export const RadarChart: React.FC<{ axes: RadarAxis[]; entranceKey?: string }> = ({
  axes,
  entranceKey = '',
}) => {
  const n = axes.length;
  const reduced = useReducedMotion();
  const progress = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) {
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withTiming(1, { duration: 400, easing: MotionCurves.easeOut });
  }, [entranceKey, reduced, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.92 + 0.08 * progress.value }],
  }));

  const summary = axes.map(a => `${a.label} ${Math.round(a.value * 100)}%`).join(', ');
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Week balance: ${summary}`}
    >
      <Animated.View style={style}>
        <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
          {[0.25, 0.5, 0.75, 1].map(r => (
            <Polygon
              key={r}
              points={join(axes.map((_, i) => point(i, n, r)))}
              fill="none"
              stroke={Colors.chartGrid}
              strokeWidth={1}
            />
          ))}
          {axes.map((_, i) => {
            const p = point(i, n, 1);
            return (
              <Line
                key={i}
                x1={CX}
                y1={CY}
                x2={p[0]}
                y2={p[1]}
                stroke={Colors.chartGrid}
                strokeWidth={1}
              />
            );
          })}
          <Polygon
            points={join(axes.map((a, i) => point(i, n, a.value)))}
            fill={Colors.primary}
            fillOpacity={0.22}
            stroke={Colors.primary}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {axes.map((a, i) => {
            const p = point(i, n, a.value);
            const l = point(i, n, 1.24);
            return (
              <React.Fragment key={a.label}>
                <Circle
                  cx={p[0]}
                  cy={p[1]}
                  r={4}
                  fill={Colors.primary}
                  stroke={Colors.card}
                  strokeWidth={2}
                />
                <SvgText
                  x={l[0]}
                  y={l[1] + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontFamily={Fonts.urbanist.extraBold}
                  fill={Colors.textPrimary}
                >
                  {a.label}
                </SvgText>
                <SvgText
                  x={l[0]}
                  y={l[1] + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily={Fonts.urbanist.bold}
                  fill={Colors.textMuted}
                >
                  {`${Math.round(a.value * 100)}%`}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
});
