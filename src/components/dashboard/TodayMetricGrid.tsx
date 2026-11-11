import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts, Typography, ArchitecturalSurfaces } from '@/theme/typography';
import { IconSizes } from '@/theme/icons';
import { useGoals } from '@/context/HealthContext';
import { useHydration } from '@/features/hydration/hooks/useHydration';
import { useWeight } from '@/features/weight/hooks/useWeight';
import { useMovement } from '@/features/movement/hooks/useMovement';
import {
  BMI_SPECTRUM_CATEGORIES,
  getTodayBMICategory,
} from '@/features/weight/utils/bmiCalculator';
import { AnimatedProgressBar } from '../common/AnimatedProgressBar';
import { SneakerIcon, DropIcon, ScaleIcon, BodyIcon } from './MetricIcons';

interface TodayMetricGridProps {
  onOpenWater?: () => void;
  onOpenWeight?: () => void;
  onOpenSteps?: () => void;
  onEditGoal?: () => void;
}

const ICON = 18;
const BAR = 6;

interface TileProps {
  label: string;
  icon: React.ReactNode;
  /** Badge background behind the icon */
  tint: string;
  value: string;
  unit?: string;
  context: string;
  bar: React.ReactNode;
  a11yLabel: string;
  onPress?: () => void;
  testID: string;
}

// Every tile has the same four rows (title, number, context, bar) so the grid lines up
const Tile: React.FC<TileProps> = ({
  label,
  icon,
  tint,
  value,
  unit,
  context,
  bar,
  a11yLabel,
  onPress,
  testID,
}) => (
  <Pressable
    testID={testID}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={a11yLabel}
    style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
  >
    <View style={styles.titleRow}>
      <View style={[styles.iconBadge, { backgroundColor: tint }]}>{icon}</View>
      <Text style={styles.title} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={IconSizes.compact} color={Colors.textMuted} />
    </View>
    <Text style={styles.value} numberOfLines={1} maxFontSizeMultiplier={1.2}>
      {value}
      {unit ? <Text style={styles.unit}> {unit}</Text> : null}
    </Text>
    <Text style={styles.context} numberOfLines={1}>
      {context}
    </Text>
    <View style={styles.bar}>{bar}</View>
  </Pressable>
);

// BMI colour bar over 15–40: underweight / normal / overweight / obese
const BMI_MIN = 15;
const BMI_MAX = 40;
const BMI_SEGMENTS = (['underweight', 'normal', 'overweight', 'obese_1'] as const).map(id => {
  const c = BMI_SPECTRUM_CATEGORIES.find(cat => cat.id === id)!;
  const from = id === 'underweight' ? BMI_MIN : c.minBMI;
  const to = id === 'obese_1' ? BMI_MAX : c.maxBMI;
  return { id, flex: to - from, color: c.color };
});

const BmiBar: React.FC<{ bmi: number | null }> = ({ bmi }) => {
  const pct =
    bmi === null
      ? null
      : ((Math.min(BMI_MAX, Math.max(BMI_MIN, bmi)) - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100;
  return (
    <View style={styles.bmiTrack}>
      {BMI_SEGMENTS.map(s => (
        <View
          key={s.id}
          style={[
            styles.bmiSegment,
            { flex: s.flex, backgroundColor: bmi === null ? Colors.borderInset : s.color },
          ]}
        />
      ))}
      {pct !== null ? <View style={[styles.bmiMarker, { left: `${pct}%` }]} /> : null}
    </View>
  );
};

export const TodayMetricGrid: React.FC<TodayMetricGridProps> = ({
  onOpenWater,
  onOpenWeight,
  onOpenSteps,
  onEditGoal,
}) => {
  const { userGoals } = useGoals();
  const { currentWaterMl, targetWaterMl, percentage } = useHydration();
  const {
    unit,
    displayCurrentWeight,
    displayTargetWeight,
    displayDelta,
    isLoss,
    isGain,
    progressPercent,
    bmi,
  } = useWeight();
  const { steps, stepGoal, barPercent } = useMovement();

  // useWeight falls back to a default height; don't show a made-up BMI
  const hasHeight = !!userGoals.heightCm && userGoals.heightCm > 0;
  const bmiCategory = getTodayBMICategory(bmi);
  const bmiColor = hasHeight ? bmiCategory.color : Colors.textMuted;
  const unitWord = unit === 'kg' ? 'kilograms' : 'pounds';
  const goalText = `Goal ${displayTargetWeight} ${unit}`;
  const hasDelta = isLoss || isGain;

  return (
    <View style={styles.grid} testID="today-metric-grid">
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {'Body & activity'}
      </Text>
      <View style={styles.row}>
        <Tile
          testID="today-tile-steps"
          label="Steps"
          icon={<SneakerIcon size={ICON} color={Colors.steps} />}
          tint={Colors.stepsLight}
          value={steps.toLocaleString()}
          context={`of ${stepGoal.toLocaleString()} steps`}
          bar={
            <AnimatedProgressBar
              progress={barPercent / 100}
              height={BAR}
              trackColor={Colors.stepsLight}
              fillColor={Colors.steps}
            />
          }
          onPress={onOpenSteps}
          a11yLabel={`Steps, ${steps} of ${stepGoal}. Opens step tracker`}
        />
        <Tile
          testID="today-tile-water"
          label="Water"
          icon={<DropIcon size={ICON} color={Colors.water} />}
          tint={Colors.waterTrack}
          value={currentWaterMl.toLocaleString()}
          unit="mL"
          context={`of ${targetWaterMl.toLocaleString()} mL`}
          bar={
            <AnimatedProgressBar
              progress={percentage / 100}
              height={BAR}
              trackColor={Colors.waterTrack}
              fillColor={Colors.water}
            />
          }
          onPress={onOpenWater}
          a11yLabel={`Water, ${currentWaterMl} of ${targetWaterMl} millilitres. Opens water tracker`}
        />
      </View>
      <View style={styles.row}>
        <Tile
          testID="today-tile-weight"
          label="Weight"
          icon={<ScaleIcon size={ICON} color={Colors.weight} />}
          tint={Colors.weightTrack}
          value={displayCurrentWeight}
          unit={unit}
          context={hasDelta ? `${isLoss ? '▼' : '▲'} ${displayDelta} · ${goalText}` : goalText}
          bar={
            <AnimatedProgressBar
              progress={progressPercent / 100}
              height={BAR}
              trackColor={Colors.weightTrack}
              fillColor={Colors.weight}
            />
          }
          onPress={onOpenWeight}
          a11yLabel={`Weight ${displayCurrentWeight} ${unitWord}${
            hasDelta ? `, ${isLoss ? 'down' : 'up'} ${displayDelta}` : ''
          }. ${goalText}. Opens weight tracker`}
        />
        <Tile
          testID="today-tile-bmi"
          label="BMI"
          icon={<BodyIcon size={ICON} color={bmiColor} />}
          // BMI colour follows the category, so its badge is the same hue at 10%
          tint={`${bmiColor}1A`}
          value={hasHeight ? bmi.toFixed(1) : '—'}
          context={hasHeight ? bmiCategory.name : 'Add your height'}
          bar={<BmiBar bmi={hasHeight ? bmi : null} />}
          onPress={hasHeight ? onOpenWeight : (onEditGoal ?? onOpenWeight)}
          a11yLabel={
            hasHeight
              ? `BMI ${bmi.toFixed(1)}, ${bmiCategory.name}. Opens weight tracker`
              : 'BMI, add your height to see it. Opens goals'
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // No top margin: the meal card above already leaves 16
  grid: {
    marginHorizontal: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    ...ArchitecturalSurfaces.card,
    flex: 1,
    padding: 14,
  },
  tilePressed: {
    transform: [{ scale: 0.985 }],
  },
  // Same heading style as MealSection's "Meals" title
  sectionTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: -0.4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textPrimary,
  },
  value: {
    marginTop: 12,
    fontFamily: Fonts.urbanist.bold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  unit: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    letterSpacing: 0,
    color: Colors.textSecondary,
  },
  context: {
    ...Typography.bodySm,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  bar: {
    marginTop: 12,
  },
  bmiTrack: {
    flexDirection: 'row',
    height: BAR,
    gap: 2,
  },
  bmiSegment: {
    height: BAR,
    borderRadius: BAR / 2,
  },
  bmiMarker: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    marginLeft: -6,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
    backgroundColor: Colors.card,
    elevation: 0,
  },
});
