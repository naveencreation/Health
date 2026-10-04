import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useWeight } from '../hooks/useWeight';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { LogWeightModal } from '../modals/LogWeightModal';

export interface WeightTrackerCardProps {
  onOpenFullTracker?: () => void;
  onWeightLogged?: (weightKg: number) => void;
  style?: StyleProp<ViewStyle>;
}

const WeightTrackerCardComponent: React.FC<WeightTrackerCardProps> = ({
  onOpenFullTracker,
  onWeightLogged,
  style,
}) => {
  const {
    unit,
    currentWeightKg,
    displayCurrentWeight: displayCurrent,
    displayStartWeight: displayStart,
    displayTargetWeight: displayGoal,
    displayDelta,
    isLoss,
    isGain,
    progressPercent,
    deltaKg,
  } = useWeight();
  const [modalVisible, setModalVisible] = useState(false);

  const isZero = deltaKg === 0;
  const progressPct = progressPercent > 0 ? Math.max(4, progressPercent) : 0;



  // Smooth Reanimated fill
  const progressSV = useSharedValue(0);

  useEffect(() => {
    progressSV.value = withTiming(progressPct, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [progressPct, progressSV]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progressSV.value}%`,
  }));

  const handleSaveModal = useCallback((savedKg: number) => {
    onWeightLogged?.(savedKg);
  }, [onWeightLogged]);

  return (
    <>
      <View style={[styles.card, style]}>
        {/* 1. Header & Metric Row with Update Pill Button */}
        <View style={styles.topRow}>
          {/* Left Column: Title & Metric with inline delta badge */}
          <Pressable
            style={({ pressed }) => [styles.leftColumn, pressed && styles.pressedSubtle]}
            onPress={onOpenFullTracker}
            accessibilityRole="button"
            accessibilityLabel="Open Weight Tracker details"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={styles.titleRow}>
              <View style={styles.iconBadge}>
                <Ionicons name="scale-outline" size={14} color={Colors.weight} />
              </View>
              <Text style={styles.title}>Weight</Text>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" style={styles.titleChevron} />
            </View>

            <View style={styles.metricRow}>
              <Text style={styles.weightValueText}>{displayCurrent}</Text>
              <Text style={styles.weightUnitText}>{unit}</Text>

              {/* Inline Directional Delta Badge */}
              <View
                style={[
                  styles.deltaBadge,
                  isLoss && styles.deltaBadgeLoss,
                  isGain && styles.deltaBadgeGain,
                  isZero && styles.deltaBadgeZero,
                ]}
              >
                <View
                  style={[
                    styles.deltaCircle,
                    isLoss && styles.deltaCircleLoss,
                    isGain && styles.deltaCircleGain,
                    isZero && styles.deltaCircleZero,
                  ]}
                >
                  <Ionicons
                    name={isGain ? 'chevron-up' : isZero ? 'remove' : 'chevron-down'}
                    size={10}
                    color="#FFFFFF"
                  />
                </View>
                <Text
                  style={[
                    styles.deltaText,
                    isLoss && styles.deltaTextLoss,
                    isGain && styles.deltaTextGain,
                    isZero && styles.deltaTextZero,
                  ]}
                >
                  {isLoss ? `- ${displayDelta} ${unit}` : isGain ? `+ ${displayDelta} ${unit}` : `0.0 ${unit}`}
                </Text>
              </View>
            </View>
          </Pressable>

          {/* Right Action: Refined Pastel Rose Update Button */}
          <Pressable
            style={({ pressed }) => [
              styles.updateButton,
              pressed && styles.updateButtonPressed,
            ]}
            onPress={() => setModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Update weight"
            hitSlop={8}
          >
            <Ionicons name="add" size={14} color={Colors.weight} />
            <Text style={styles.updateButtonText}>Update</Text>
          </Pressable>
        </View>

        {/* 2. Chunky Orange Capsule Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, animatedBarStyle]} />
        </View>

        {/* 3. Range Footer: Starting Weight (Left) & Goal Weight (Right) */}
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>
            Starting: <Text style={styles.footerValue}>{displayStart} {unit}</Text>
          </Text>
          <Text style={styles.footerText}>
            Goal: <Text style={styles.footerValue}>{displayGoal} {unit}</Text>
          </Text>
        </View>
      </View>

      {/* Quick Weigh-In Modal */}
      <LogWeightModal
        visible={modalVisible}
        initialWeight={currentWeightKg}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveModal}
      />
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  pressedSubtle: {
    opacity: 0.7,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderCurve: 'continuous',
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  titleChevron: {
    marginLeft: 1,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightValueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 32,
    lineHeight: 38,
    color: '#0F172A',
    letterSpacing: -0.6,
  },
  weightUnitText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 16,
    color: '#334155',
    marginLeft: 4,
    marginRight: 10,
    lineHeight: 22,
  },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  deltaBadgeLoss: {},
  deltaBadgeGain: {},
  deltaBadgeZero: {},
  deltaCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deltaCircleLoss: {
    backgroundColor: '#22C55E',
  },
  deltaCircleGain: {
    backgroundColor: '#F43F5E',
  },
  deltaCircleZero: {
    backgroundColor: '#94A3B8',
  },
  deltaText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.medium,
  },
  deltaTextLoss: {
    color: '#16A34A',
  },
  deltaTextGain: {
    color: '#F43F5E',
  },
  deltaTextZero: {
    color: '#94A3B8',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF1F2',
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingVertical: 6,
    paddingHorizontal: 12,
    elevation: 0,
    shadowOpacity: 0,
  },
  updateButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  updateButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.weight,
    letterSpacing: -0.1,
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.weightTrack,
    overflow: 'hidden',
    marginTop: 14,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.weight,
    borderRadius: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.regular,
    color: '#64748B',
  },
  footerValue: {
    fontFamily: Fonts.urbanist.medium,
    color: '#334155',
  },
});

export const WeightTrackerCard = React.memo(WeightTrackerCardComponent);

