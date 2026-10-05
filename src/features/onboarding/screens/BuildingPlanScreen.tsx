import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

interface BuildingPlanScreenProps {
  name?: string;
  onComplete: () => void;
}

interface StepItem {
  id: number;
  text: string;
}

export const BuildingPlanScreen: React.FC<BuildingPlanScreenProps> = ({
  name,
  onComplete,
}) => {
  const displayName = name?.trim() ? name.trim() : 'friend';
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const steps: StepItem[] = [
    { id: 1, text: `Reading your answers, ${displayName}` },
    { id: 2, text: 'Working out your metabolism' },
    { id: 3, text: 'Balancing protein, carbs and fat' },
    { id: 4, text: 'Setting a pace for your goal' },
  ];

  // Rotation animation for the circular loader
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1800,
        easing: Easing.linear,
      }),
      -1
    );
  }, [rotation]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      onComplete();
      return;
    }

    const t1 = setTimeout(() => {
      setActiveStepIndex(1);
      haptics.selection();
    }, 600);

    const t2 = setTimeout(() => {
      setActiveStepIndex(2);
      haptics.selection();
    }, 1200);

    const t3 = setTimeout(() => {
      setActiveStepIndex(3);
      haptics.selection();
    }, 1800);

    const t4 = setTimeout(() => {
      setActiveStepIndex(4);
      haptics.selection();
    }, 2400);

    const tEnd = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(tEnd);
    };
  }, [onComplete]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {/* Animated Central Loader */}
        <View style={styles.centerContainer}>
          <View style={styles.ringWrapper}>
            <Animated.View style={[styles.rotatingRing, animatedRingStyle]}>
              <Svg width={110} height={110} viewBox="0 0 110 110">
                <Circle
                  cx="55"
                  cy="55"
                  r="48"
                  stroke="#FED7AA"
                  strokeWidth="5"
                  fill="none"
                />
                <Circle
                  cx="55"
                  cy="55"
                  r="48"
                  stroke="#F47551"
                  strokeWidth="5"
                  strokeDasharray="90 200"
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            </Animated.View>

            <View style={styles.centerIconWrap}>
              <Ionicons name="flame" size={36} color="#F47551" />
            </View>
          </View>

          <Text style={styles.title}>Crafting your plan</Text>
          <Text style={styles.subtitle}>
            Calibrating science-backed targets tailored specifically to your body.
          </Text>

          {/* Sequential Checklist */}
          <View style={styles.checklistCard}>
            {steps.map((step, idx) => {
              const isDone = activeStepIndex > idx;
              const isCurrent = activeStepIndex === idx;

              return (
                <View key={step.id} style={styles.checkRow}>
                  <View
                    style={[
                      styles.statusDot,
                      isDone
                        ? styles.statusDotDone
                        : isCurrent
                        ? styles.statusDotCurrent
                        : styles.statusDotPending,
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    ) : (
                      <View
                        style={[
                          styles.innerDot,
                          isCurrent && styles.innerDotCurrent,
                        ]}
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.stepText,
                      isDone
                        ? styles.stepTextDone
                        : isCurrent
                        ? styles.stepTextCurrent
                        : styles.stepTextPending,
                    ]}
                  >
                    {step.text}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  ringWrapper: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 24,
  },
  rotatingRing: {
    width: 110,
    height: 110,
    position: 'absolute',
  },
  centerIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    lineHeight: 34,
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  checklistCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statusDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDotDone: {
    backgroundColor: '#16A34A',
  },
  statusDotCurrent: {
    backgroundColor: '#FFEDD5',
    borderWidth: 2,
    borderColor: '#F47551',
  },
  statusDotPending: {
    backgroundColor: '#F1F5F9',
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  innerDotCurrent: {
    backgroundColor: '#F47551',
  },
  stepText: {
    fontSize: 15,
    flex: 1,
  },
  stepTextDone: {
    fontFamily: Fonts.urbanist.semiBold,
    color: '#1E293B',
  },
  stepTextCurrent: {
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
  },
  stepTextPending: {
    fontFamily: Fonts.urbanist.medium,
    color: '#94A3B8',
  },
});
