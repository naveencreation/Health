import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { useWeight } from '../hooks/useWeight';
import { Fonts } from '@/theme/typography';
import { LogWeightModal } from '@/components/modals/LogWeightModal';

import {
  BMICategoryItem,
  BMI_SPECTRUM_CATEGORIES,
  getTodayBMICategory,
} from '../utils/bmiCalculator';

export {
  BMICategoryItem,
  BMI_SPECTRUM_CATEGORIES,
  getTodayBMICategory,
};

const TOTAL_SPAN = 27.0; // 15.0 to 42.0
const MIN_BMI = 15.0;
const MAX_BMI = 42.0;
const POINTER_WIDTH = 14;

export interface TodayBMICardProps {
  onOpenLogModal?: () => void;
  style?: StyleProp<ViewStyle>;
}

const TodayBMICardComponent: React.FC<TodayBMICardProps> = ({
  onOpenLogModal,
  style,
}) => {
  const { bmi, bmiCategory: activeCategory } = useWeight();
  const [internalModalVisible, setInternalModalVisible] = useState(false);
  const [barWidth, setBarWidth] = useState<number>(0);

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

  const handleBarLayout = useCallback((e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && width !== barWidth) {
      setBarWidth(width);
    }
  }, [barWidth]);

  const handleEditPress = useCallback(() => {
    if (onOpenLogModal) {
      onOpenLogModal();
    } else {
      setInternalModalVisible(true);
    }
  }, [onOpenLogModal]);

  return (
    <>
      <View style={[styles.card, style]}>
        {/* 1. Header: Semantic Icon Badge, Title, Unit Tag & Circular Edit Button */}
        <View style={styles.headerRow}>
          <View style={styles.titleLeft}>
            <View style={styles.iconBadge}>
              <Ionicons name="speedometer-outline" size={14} color="#059669" />
            </View>
            <Text style={styles.headerTitle}>BMI</Text>
            <View style={styles.unitTag}>
              <Text style={styles.unitTagText}>kg/m²</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editCircleBtn, pressed && styles.btnPressed]}
            onPress={handleEditPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Update weight to recalculate BMI"
          >
            <Feather name="edit-2" size={13} color="#64748B" />
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
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 0,
    shadowOpacity: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderCurve: 'continuous',
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  unitTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderCurve: 'continuous',
    marginLeft: 2,
  },
  unitTagText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: '#64748B',
  },
  editCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    fontFamily: Fonts.urbanist.bold,
    fontSize: 32,
    color: '#0F172A',
    lineHeight: 38,
    letterSpacing: -0.6,
  },
  categoryName: {
    fontFamily: Fonts.urbanist.medium,
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

export const TodayBMICard = React.memo(TodayBMICardComponent);

