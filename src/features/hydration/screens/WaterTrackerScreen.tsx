import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import {
  TopDateStrip,
  HeroDropletCard,
  DailyWaterGoalModal,
  WaterHistoryCard,
  CupSizeModal,
  HydrationSettingsModal,
  SlideInSubScreen,
} from '@/components';
import { HeroDropletCardRef } from '../components/HeroDropletCard';
import { WaterIntakeHistoryScreen } from './WaterIntakeHistoryScreen';
import { WaterReportScreen } from './WaterReportScreen';
import { useDailyLog } from '@/context/HealthContext';
import { getBeverageName } from '@/utils/beverageUtils';

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export interface WaterTrackerScreenProps {
  onBack: () => void;
  onOpenSettings?: () => void;
}

export const WaterTrackerScreen: React.FC<WaterTrackerScreenProps> = ({
  onBack,
  onOpenSettings,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { selectedDate, dailyLogs, addWater } = useDailyLog();
  const heroDropletRef = useRef<HeroDropletCardRef>(null);

  const currentWater = dailyLogs[selectedDate]?.waterMl ?? 0;

  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [isCupModalVisible, setIsCupModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [undoToast, setUndoToast] = useState<{
    amount: number;
    beverage: string;
  } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [cupSize, setCupSize] = useState<number>(300);
  const [beverageType, setBeverageType] = useState<string>('water');

  // Load saved container preferences (cupSize & beverageType)
  useEffect(() => {
    AsyncStorage.getItem('@calori_water_cup_pref')
      .then(val => {
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (typeof parsed.size === 'number' && parsed.size > 0) {
              setCupSize(parsed.size);
            }
            if (typeof parsed.beverage === 'string' && parsed.beverage) {
              setBeverageType(parsed.beverage);
            }
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectCup = (newSize: number, newBev: string) => {
    setCupSize(newSize);
    setBeverageType(newBev);
    AsyncStorage.setItem(
      '@calori_water_cup_pref',
      JSON.stringify({ size: newSize, beverage: newBev })
    ).catch(() => {});
  };

  // Real-world today reference to guard against future date logging
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const isFutureDate = selectedDate > todayStr;

  // Dedicated Full-Screen Water Intake History sub-screen
  const [isHistoryScreenVisible, setIsHistoryScreenVisible] = useState(false);
  const [isClosingHistory, setIsClosingHistory] = useState(false);

  // Dedicated Full-Screen Water Report sub-screen
  const [isReportScreenVisible, setIsReportScreenVisible] = useState(false);
  const [isClosingReport, setIsClosingReport] = useState(false);

  // Handle Android hardware back button
  useEffect(() => {
    const handleHardwareBack = () => {
      if (isReportScreenVisible) {
        setIsClosingReport(true);
        return true;
      }
      if (isHistoryScreenVisible) {
        setIsClosingHistory(true);
        return true;
      }
      onBack();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => subscription.remove();
  }, [onBack, isHistoryScreenVisible, isReportScreenVisible]);

  // Cleanup undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const handleDrink = (amount: number, beverage: string) => {
    if (isFutureDate) return;
    addWater(amount, beverage);

    // Show floating Undo toast for 4.5 seconds
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setUndoToast({ amount, beverage });
    undoTimeoutRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 4500);
  };

  const handleUndo = () => {
    if (!undoToast) return;
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    addWater(-undoToast.amount, undoToast.beverage);
    setUndoToast(null);
  };

  const handleDeduct = (amount: number, beverage?: string) => {
    if (isFutureDate || currentWater <= 0) return;
    const targetBev = beverage || beverageType;
    addWater(-amount, targetBev);
  };

  const handlePressSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setIsSettingsModalVisible(true);
    }
  };

  return (
    <View style={[styles.rootContainer, { paddingTop: 6 }]}>
      {/* 1. Top Navigation Bar */}
      <View style={styles.headerContainer}>
        <View style={styles.headerMainRow}>
          <Pressable
            style={({ pressed }) => [styles.circleNavBtn, pressed && styles.circleNavBtnPressed]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Back to today dashboard"
          >
            <Ionicons name="chevron-back" size={22} color={Colors.iconNavy} />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Water Tracker
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.circleNavBtn, pressed && styles.circleNavBtnPressed]}
            onPress={handlePressSettings}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Hydration settings and goals"
          >
            <Ionicons name="settings-outline" size={20} color={Colors.iconNavy} />
          </Pressable>
        </View>
      </View>

      {/* 2. Main Scrollable Dashboard Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Reusable Top Date Strip in Water Mode */}
        <TopDateStrip metric="water" />

        {/* Scaled Hero Droplet Card with Symmetrical Stepper Trio */}
        <HeroDropletCard
          ref={heroDropletRef}
          cupSize={cupSize}
          beverageType={beverageType}
          isFutureDate={isFutureDate}
          onDrink={handleDrink}
          onDeduct={handleDeduct}
          onOpenGoalModal={() => setIsGoalModalVisible(true)}
          onOpenCupSelector={() => setIsCupModalVisible(true)}
        />

        {/* Compact History Card Preview (3 items + View All) */}
        <WaterHistoryCard onViewAll={() => setIsHistoryScreenVisible(true)} />
      </ScrollView>

      {/* 5. Daily Goal Editor Modal Sheet */}
      <DailyWaterGoalModal
        visible={isGoalModalVisible}
        onClose={() => setIsGoalModalVisible(false)}
      />

      {/* 6. Switch Cup Size & Beverage Picker Modal */}
      <CupSizeModal
        visible={isCupModalVisible}
        currentCupSize={cupSize}
        currentBeverage={beverageType}
        onClose={() => setIsCupModalVisible(false)}
        onSelect={handleSelectCup}
      />

      {/* 7. Hydration Settings & Preferences Modal */}
      <HydrationSettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
        onOpenGoalModal={() => setIsGoalModalVisible(true)}
      />

      {/* 8. Dedicated Full-Screen Water Intake History Screen */}
      {isHistoryScreenVisible && (
        <SlideInSubScreen
          isClosing={isClosingHistory}
          onClosed={() => {
            setIsHistoryScreenVisible(false);
            setIsClosingHistory(false);
          }}
          screenWidth={Math.min(screenWidth, 480)}
          zIndex={200}
        >
          <WaterIntakeHistoryScreen
            onBack={() => setIsClosingHistory(true)}
            onOpenReport={() => setIsReportScreenVisible(true)}
          />
        </SlideInSubScreen>
      )}

      {/* 9. Dedicated Full-Screen Water Report Screen */}
      {isReportScreenVisible && (
        <SlideInSubScreen
          isClosing={isClosingReport}
          onClosed={() => {
            setIsReportScreenVisible(false);
            setIsClosingReport(false);
          }}
          screenWidth={Math.min(screenWidth, 480)}
          zIndex={220}
        >
          <WaterReportScreen onBack={() => setIsClosingReport(true)} />
        </SlideInSubScreen>
      )}

      {/* 4. Floating Undo Toast (Waterllama / Industry Standard) */}
      {undoToast && (
        <View style={[styles.undoToastWrapper, { pointerEvents: 'box-none' as any }]}>
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOutDown.duration(180)}
            style={styles.undoToastCard}
          >
            <View style={styles.undoToastInfo}>
              <Ionicons name="checkmark-circle" size={17} color="#059669" />
              <Text style={styles.undoToastText} numberOfLines={1}>
                Added {undoToast.amount} mL {getBeverageName(undoToast.beverage)}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.undoBtn, pressed && styles.btnPressed]}
              onPress={handleUndo}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Undo adding ${undoToast.amount} mL ${getBeverageName(undoToast.beverage)}`}
            >
              <Ionicons name="arrow-undo" size={13} color="#38BDF8" />
              <Text style={styles.undoBtnText}>Undo</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: Colors.background,
  },
  headerMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  circleNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  circleNavBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    color: '#0F172A',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    gap: 12,
  },
  undoToastWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  undoToastCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  undoToastInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  undoToastText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  undoBtnText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#38BDF8',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
