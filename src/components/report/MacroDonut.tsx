import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

export interface MacroSlice {
  name: string;
  grams: number;
  target: number;
  color: string;
  /** kcal per gram (4 protein, 4 carbs, 9 fat) */
  kcalPerG: number;
}

const SIZE = 120;
const C = 60;
const OUTER = 50;
const INNER = 34;
const GAP = 0.05;

const arc = (a0: number, a1: number) => {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (r: number, a: number) => `${C + r * Math.cos(a)},${C + r * Math.sin(a)}`;
  return `M${p(OUTER, a0)} A${OUTER},${OUTER} 0 ${large} 1 ${p(OUTER, a1)} L${p(INNER, a1)} A${INNER},${INNER} 0 ${large} 0 ${p(INNER, a0)} Z`;
};

/** Donut of calorie share by macro, with the average kcal in the centre and progress rows. */
export const MacroDonut: React.FC<{ macros: MacroSlice[]; avgKcal: number }> = ({
  macros,
  avgKcal,
}) => {
  const kcals = macros.map(m => m.grams * m.kcalPerG);
  const total = kcals.reduce((a, b) => a + b, 0);
  const nonZero = kcals.filter(k => k > 0).length;
  let a0 = -Math.PI / 2;
  const arcs = macros.map((m, i) => {
    if (total <= 0 || kcals[i] <= 0) return null;
    const sweep = (kcals[i] / total) * 2 * Math.PI;
    const start = a0 + (nonZero > 1 ? GAP / 2 : 0);
    const end = a0 + sweep - (nonZero > 1 ? GAP / 2 : 0);
    a0 += sweep;
    return nonZero === 1 ? null : <Path key={m.name} d={arc(start, end)} fill={m.color} />;
  });
  const only = nonZero === 1 ? macros[kcals.findIndex(k => k > 0)] : null;

  return (
    <View style={styles.row}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Average ${avgKcal} kilocalories per day`}
      >
        <Svg width={SIZE} height={SIZE}>
          {total <= 0 || only ? (
            <Circle
              cx={C}
              cy={C}
              r={(OUTER + INNER) / 2}
              stroke={only ? only.color : Colors.chartGrid}
              strokeWidth={OUTER - INNER}
              fill="none"
            />
          ) : null}
          {arcs}
          <SvgText
            x={C}
            y={C + 2}
            textAnchor="middle"
            fontSize={19}
            fontFamily={Fonts.urbanist.extraBold}
            fill={Colors.textPrimary}
          >
            {avgKcal.toLocaleString()}
          </SvgText>
          <SvgText
            x={C}
            y={C + 17}
            textAnchor="middle"
            fontSize={10.5}
            fontFamily={Fonts.urbanist.bold}
            fill={Colors.textMuted}
          >
            kcal / day
          </SvgText>
        </Svg>
      </View>
      <View style={styles.list}>
        {macros.map(m => (
          <View
            key={m.name}
            accessible
            accessibilityLabel={`${m.name}: ${m.grams} of ${m.target} grams`}
          >
            <View style={styles.line}>
              <View style={styles.nameWrap}>
                <View style={[styles.swatch, { backgroundColor: m.color }]} />
                <Text style={styles.name}>{m.name}</Text>
              </View>
              <Text style={styles.value}>
                {m.grams}
                <Text style={styles.target}>{` / ${m.target} g`}</Text>
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(100, (m.grams / Math.max(1, m.target)) * 100)}%`,
                    backgroundColor: m.color,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
  },
  list: {
    flex: 1,
    gap: 12,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
  name: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  value: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  target: {
    fontFamily: Fonts.urbanist.semiBold,
    color: Colors.textMuted,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.surfaceContainer,
    marginTop: 6,
    overflow: 'hidden',
  },
  fill: {
    height: 5,
    borderRadius: 3,
  },
});
