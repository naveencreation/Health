import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

const CIRCLE_SIZE = 190;
const STROKE_WIDTH = 14;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const HIT_SLOP_8 = { top: 8, bottom: 8, left: 8, right: 8 };
const HIT_SLOP_MINUS = { top: 8, bottom: 8, left: 6, right: 6 };

export const HydrationTracker: React.FC = () => {
  const { currentLog, userGoals, addWater, resetWater } = useHealth();

  const currentMl = currentLog.waterMl || 0;
  const targetMl = userGoals.waterGoalMl || 2000;
  const progressRatio = Math.min(1, Math.max(0, currentMl / targetMl));
  const progressPercent = Math.min(100, Math.round((currentMl / targetMl) * 100));

  const strokeDashoffset = CIRCUMFERENCE - CIRCUMFERENCE * progressRatio;

  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionHeading}>Today's Progress</Text>
        {currentMl > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.resetBtn, pressed ? styles.btnPressedSubtle : null]}
            onPress={resetWater}
            hitSlop={HIT_SLOP_8}
            accessibilityRole="button"
            accessibilityLabel="Reset water intake"
          >
            <Ionicons name="refresh-outline" size={16} color="#64748B" />
          </Pressable>
        ) : null}
      </View>

      {/* Center Circular Progress Ring */}
      <View style={styles.gaugeWrapper}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          {/* Background Neutral Track */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke="#E2E8F0"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />

          {/* Active Water Azure Arc */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke="#2563EB"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
            rotation="-90"
          />
        </Svg>

        {/* Centered Content: Droplet + Current ml + Goal ml */}
        <View style={styles.centerContent}>
          <View style={styles.dropletWrapper}>
            <Ionicons name="water" size={26} color="#2563EB" />
          </View>

          <Text style={styles.volumeMainText}>
            {currentMl.toLocaleString()} ml
          </Text>

          <Text style={styles.volumeSubText}>
            of {targetMl.toLocaleString()} ml
          </Text>
        </View>
      </View>

      {/* Bottom Percentage Display */}
      <View style={styles.percentageSection}>
        <Text style={styles.percentText}>{progressPercent}%</Text>
        <Text style={styles.goalLabel}>Daily Goal</Text>
      </View>

      {/* Ergonomic Quick-Log Buttons */}
      <View style={styles.quickActionRow}>
        <Pressable
          style={({ pressed }) => [styles.quickAddBtn, pressed ? styles.btnPressedSubtle : null]}
          onPress={() => addWater(250)}
          accessibilityRole="button"
          accessibilityLabel="Add 250 milliliters glass of water"
        >
          <Ionicons name="water-outline" size={16} color="#1D4ED8" />
          <Text style={styles.quickAddBtnText}>+250 ml (Glass)</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.quickAddBtn, pressed ? styles.btnPressedSubtle : null]}
          onPress={() => addWater(500)}
          accessibilityRole="button"
          accessibilityLabel="Add 500 milliliters bottle of water"
        >
          <Ionicons name="add" size={16} color="#1D4ED8" />
          <Text style={styles.quickAddBtnText}>+500 ml (Bottle)</Text>
        </Pressable>

        {currentMl > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.minusBtn, pressed ? styles.btnPressedSubtle : null]}
            onPress={() => addWater(-250)}
            hitSlop={HIT_SLOP_MINUS}
            accessibilityRole="button"
            accessibilityLabel="Subtract 250 milliliters of water"
          >
            <Ionicons name="remove" size={16} color="#64748B" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  // "Today's Progress" Header (Clean, bold Poppins)
  sectionHeading: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  resetBtn: {
    position: 'absolute',
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Circular Gauge Canvas
  gaugeWrapper: {
    position: 'relative',
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropletWrapper: {
    marginBottom: 4,
  },
  // 1,500 ml (Figma/Reference: Poppins 24px, #0F172A)
  volumeMainText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  // of 2,000 ml (Reference: Poppins 13px, #64748B)
  volumeSubText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  // Bottom Percentage Section
  percentageSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 18,
  },
  // 75% (Reference: Poppins 34px, #2563EB)
  percentText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 34,
    fontWeight: '700',
    color: '#2563EB',
    lineHeight: 38,
  },
  // Daily Goal (Reference: Poppins 13px, #64748B)
  goalLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  // Quick-Log Action Row
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  quickAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 5,
  },
  quickAddBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  minusBtn: {
    width: 36,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnPressedSubtle: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
});
