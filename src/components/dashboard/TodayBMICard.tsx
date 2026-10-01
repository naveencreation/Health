import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  LayoutChangeEvent,
  AccessibilityInfo,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { useDailyLog, useGoals } from '@/context/HealthContext';
import { Fonts } from '@/theme/typography';
import { LogWeightModal } from '@/components/modals/LogWeightModal';

export interface BMICategoryItem {
  id: string;
  name: string;
  color: string;
  minBMI: number;
  maxBMI: number;
  span: number;
}

export const BMI_SPECTRUM_CATEGORIES: BMICategoryItem[] = [
  { id: 'very_underweight', name: 'Very severely underweight', color: '#0284C7', minBMI: 0, maxBMI: 16.0, span: 1.0 },
  { id: 'severely_underweight', name: 'Severely underweight', color: '#0EA5E9', minBMI: 16.0, maxBMI: 17.0, span: 1.0 },
  { id: 'underweight', name: 'Underweight', color: '#06B6D4', minBMI: 17.0, maxBMI: 18.5, span: 1.5 },
  { id: 'normal', name: 'Normal', color: '#22C55E', minBMI: 18.5, maxBMI: 25.0, span: 6.5 },
  { id: 'overweight', name: 'Overweight', color: '#EAB308', minBMI: 25.0, maxBMI: 30.0, span: 5.0 },
  { id: 'obese_1', name: 'Obese Class I', color: '#F97316', minBMI: 30.0, maxBMI: 35.0, span: 5.0 },
  { id: 'obese_2', name: 'Obese Class II', color: '#EF4444', minBMI: 35.0, maxBMI: 40.0, span: 5.0 },
  { id: 'obese_3', name: 'Obese Class III', color: '#DC2626', minBMI: 40.0, maxBMI: 100, span: 2.0 },
];

export function getTodayBMICategory(bmi: number): BMICategoryItem {
  if (bmi < 16.0) return BMI_SPECTRUM_CATEGORIES[0];
  if (bmi < 17.0) return BMI_SPECTRUM_CATEGORIES[1];
  if (bmi < 18.5) return BMI_SPECTRUM_CATEGORIES[2];
  if (bmi < 25.0) return BMI_SPECTRUM_CATEGORIES[3];
  if (bmi < 30.0) return BMI_SPECTRUM_CATEGORIES[4];
  if (bmi < 35.0) return BMI_SPECTRUM_CATEGORIES[5];
  if (bmi < 40.0) return BMI_SPECTRUM_CATEGORIES[6];
  return BMI_SPECTRUM_CATEGORIES[7];
}

const TOTAL_SPAN = 27.0; // 15.0 to 42.0
const MIN_BMI = 15.0;
const MAX_BMI = 42.0;
const POINTER_WIDTH = 14;

export interface TodayBMICardProps {
  onOpenLogModal?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const TodayBMICard: React.FC<TodayBMICardProps> = ({
  onOpenLogModal,
  style,
}) => {
  const { currentLog } = useDailyLog();
  const { userGoals } = useGoals();
  const [internalModalVisible, setInternalModalVisible] = useState(false);
  const [barWidth, setBarWidth] = useState<number>(0);

  // Compute weight and height with clinical fallbacks
  const safeWeight = currentLog?.weightKg ?? userGoals.currentWeightKg ?? 72.5;
  const safeHeight = userGoals.heightCm ?? 178;

  const heightM = safeHeight / 100;
  const bmi = Number((safeWeight / (heightM * heightM)).toFixed(1));
  const activeCategory = getTodayBMICategory(bmi);

  // Calculate pointer target X coordinate
  const clampedBMI = Math.max(MIN_BMI, Math.min(MAX_BMI, bmi));
  const progressRatio = (clampedBMI - MIN_BMI) / TOTAL_SPAN;

  // Pointer animation
  const pointerAnim = useRef(new Animated.Value(0)).current;
  const isReducedMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      isReducedMotion.current = enabled;
    });
  }, []);

  useEffect(() => {
    if (barWidth <= 0) return;
    const targetX = Math.max(
      0,
      Math.min(barWidth - POINTER_WIDTH, progressRatio * barWidth - POINTER_WIDTH / 2)
    );

    if (isReducedMotion.current) {
      pointerAnim.setValue(targetX);
      return;
    }

    Animated.spring(pointerAnim, {
      toValue: targetX,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [progressRatio, barWidth, pointerAnim]);

  const handleBarLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== barWidth) {
      setBarWidth(width);
    }
  };

  const handleEditPress = () => {
    if (onOpenLogModal) {
      onOpenLogModal();
    } else {
      setInternalModalVisible(true);
    }
  };

  return (
    <>
      <View style={[styles.card, style]}>
        {/* 1. Header: Title & Circular Edit Button */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>BMI (kg/m2)</Text>
          <Pressable
            style={({ pressed }) => [styles.editCircleBtn, pressed && styles.btnPressed]}
            onPress={handleEditPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Update weight to recalculate BMI"
          >
            <Feather name="edit-2" size={14} color="#64748B" />
          </Pressable>
        </View>

        {/* 2. Numeric Readout & Inline Category Label */}
        <View style={styles.metricRow}>
          <Text style={styles.bmiNumber}>{bmi.toFixed(1)}</Text>
          <Text style={styles.categoryName}>{activeCategory.name}</Text>
        </View>

        {/* 3. 8-Segment Horizontal Spectrum Bar */}
        <View style={styles.spectrumTrack} onLayout={handleBarLayout}>
          {BMI_SPECTRUM_CATEGORIES.map((cat, idx) => (
            <View
              key={cat.id}
              style={[
                styles.segment,
                {
                  flex: cat.span,
                  backgroundColor: cat.color,
                  marginRight: idx === BMI_SPECTRUM_CATEGORIES.length - 1 ? 0 : 5,
                },
              ]}
            />
          ))}
        </View>

        {/* 4. Sliding Upward Indicator Caret */}
        <View style={styles.pointerTrack}>
          {barWidth > 0 && (
            <Animated.View
              style={[
                styles.pointerWrapper,
                { transform: [{ translateX: pointerAnim }] },
              ]}
            >
              <Svg width={14} height={10} viewBox="0 0 14 10">
                <Path
                  d="M 6.13 1.5 C 6.52 0.83 7.48 0.83 7.87 1.5 L 12.2 9 C 12.58 9.67 12.1 10.5 11.33 10.5 L 2.67 10.5 C 1.9 10.5 1.42 9.67 1.8 9 Z"
                  fill={activeCategory.color}
                />
              </Svg>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Internal Weight Modal fallback if onOpenLogModal not provided */}
      {!onOpenLogModal && (
        <LogWeightModal
          visible={internalModalVisible}
          onClose={() => setInternalModalVisible(false)}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  editCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    marginBottom: 14,
  },
  bmiNumber: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 32,
    color: '#0F172A',
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  categoryName: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 15,
    color: '#64748B',
    marginLeft: 8,
    lineHeight: 22,
  },
  spectrumTrack: {
    flexDirection: 'row',
    height: 8,
    width: '100%',
    alignItems: 'center',
  },
  segment: {
    height: 8,
    borderRadius: 4,
  },
  pointerTrack: {
    height: 12,
    width: '100%',
    marginTop: 3,
    position: 'relative',
  },
  pointerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: POINTER_WIDTH,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
