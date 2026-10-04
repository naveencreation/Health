import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  BackHandler,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import {
  HeroWeightCard,
  WeightHistoryCard,
  WeightHistoryItem,
  LogWeightModal,
  WeightGoalSettingsModal,
  SlideInSubScreen,
} from '@/components';
import { WeightHistoryScreen } from './WeightHistoryScreen';
import { WeightReportScreen } from './WeightReportScreen';
import { useDailyLog } from '@/context/HealthContext';

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export interface WeightTrackerScreenProps {
  onBack: () => void;
  onOpenSettings?: () => void;
}

export const WeightTrackerScreen: React.FC<WeightTrackerScreenProps> = ({
  onBack,
  onOpenSettings,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { selectedDate, dailyLogs, logWeight, deleteWeightEntry } = useDailyLog();

  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<WeightHistoryItem | null>(null);

  // Dedicated Full-Screen Weight History sub-screen
  const [isHistoryScreenVisible, setIsHistoryScreenVisible] = useState(false);
  const [isClosingHistory, setIsClosingHistory] = useState(false);

  // Dedicated Full-Screen Weight Report sub-screen
  const [isReportScreenVisible, setIsReportScreenVisible] = useState(false);
  const [isClosingReport, setIsClosingReport] = useState(false);

  // Reversible Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    entry: WeightHistoryItem;
  } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      if (isLogModalVisible) {
        setIsLogModalVisible(false);
        return true;
      }
      if (isSettingsModalVisible) {
        setIsSettingsModalVisible(false);
        return true;
      }
      onBack();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => subscription.remove();
  }, [
    onBack,
    isReportScreenVisible,
    isHistoryScreenVisible,
    isLogModalVisible,
    isSettingsModalVisible,
  ]);

  // Clean up undo timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const handleEditEntry = useCallback((item: WeightHistoryItem) => {
    setEditingItem(item);
    setIsLogModalVisible(true);
  }, []);

  const handleDeleteEntry = useCallback(
    (item: WeightHistoryItem) => {
      // 1. Delete from state/context
      deleteWeightEntry(item.id, item.date);

      // 2. Clear prior undo timer
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }

      // 3. Show undo toast for 4.5 seconds
      setUndoToast({ entry: item });
      undoTimeoutRef.current = setTimeout(() => {
        setUndoToast(null);
      }, 4500);
    },
    [deleteWeightEntry]
  );

  const handleUndoDelete = useCallback(() => {
    if (!undoToast) return;
    const { entry } = undoToast;
    logWeight(entry.weightKg, entry.date, entry.note);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setUndoToast(null);
  }, [undoToast, logWeight]);

  const handlePressSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setIsSettingsModalVisible(true);
    }
  };

  return (
    <View style={[styles.screenContainer, { paddingTop: 6 }]}>
      {/* 1. Header Toolbar (Back Arrow, Title, Settings Gear) */}
      <View style={styles.navBar}>
        <View style={styles.navSideWrapper}>
          <Pressable
            style={({ pressed }) => [styles.circleNavBtn, pressed && styles.circleNavBtnPressed]}
            onPress={onBack}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Back to today dashboard"
          >
            <Ionicons name="arrow-back" size={21} color={Colors.iconNavy} />
          </Pressable>
        </View>

        <View style={styles.navCenterWrapper}>
          <Text style={styles.navTitleText}>Weight Tracker</Text>
        </View>

        <View style={styles.navSideWrapperRight}>
          <Pressable
            style={({ pressed }) => [styles.circleNavBtn, pressed && styles.circleNavBtnPressed]}
            onPress={() => setIsReportScreenVisible(true)}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Weight Report and Analytics"
          >
            <Ionicons name="stats-chart-outline" size={19} color={Colors.iconNavy} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.circleNavBtn, pressed && styles.circleNavBtnPressed]}
            onPress={handlePressSettings}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Weight tracker goals and settings"
          >
            <Ionicons name="settings-outline" size={20} color={Colors.iconNavy} />
          </Pressable>
        </View>
      </View>

      {/* 2. Main Scrollable Dashboard Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Mockup Card 1: "Current" Hero Weight Card */}
        <HeroWeightCard
          onOpenUpdateModal={() => {
            setEditingItem(null);
            setIsLogModalVisible(true);
          }}
        />

        {/* Mockup Card 2: "History" Component */}
        <WeightHistoryCard
          onEditEntry={handleEditEntry}
          onDeleteEntry={handleDeleteEntry}
          onViewAll={() => setIsHistoryScreenVisible(true)}
        />
      </ScrollView>

      {/* 3. Dedicated Full-Screen Weight History Sub-Screen */}
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
          <WeightHistoryScreen
            onBack={() => setIsClosingHistory(true)}
            onOpenReport={() => setIsReportScreenVisible(true)}
          />
        </SlideInSubScreen>
      )}

      {/* 4. Dedicated Full-Screen Weight Report Sub-Screen */}
      {isReportScreenVisible && (
        <SlideInSubScreen
          isClosing={isClosingReport}
          onClosed={() => {
            setIsReportScreenVisible(false);
            setIsClosingReport(false);
          }}
          screenWidth={Math.min(screenWidth, 480)}
          zIndex={300}
        >
          <WeightReportScreen onBack={() => setIsClosingReport(true)} />
        </SlideInSubScreen>
      )}

      {/* 4. Reversible Undo Floating Toast */}
      {undoToast && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutDown.duration(200)}
          style={[styles.toastContainer, { bottom: insets.bottom + 20 }]}
        >
          <View style={styles.toastCard}>
            <View style={styles.toastLeft}>
              <Ionicons name="trash-outline" size={17} color="#94A3B8" />
              <Text style={styles.toastText}>
                Deleted {undoToast.entry.weightKg.toFixed(1)} kg entry
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.undoBtn, pressed && styles.undoBtnPressed]}
              onPress={handleUndoDelete}
              hitSlop={8}
            >
              <Text style={styles.undoBtnText}>Undo</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* 5. Quick Weigh-In / Update / Edit Modal */}
      <LogWeightModal
        visible={isLogModalVisible}
        initialWeight={editingItem ? editingItem.weightKg : undefined}
        initialNote={editingItem ? editingItem.note : undefined}
        targetDate={editingItem ? editingItem.date : undefined}
        targetEntryId={editingItem ? editingItem.id : undefined}
        onClose={() => {
          setIsLogModalVisible(false);
          setEditingItem(null);
        }}
      />

      {/* 6. Weight Settings Modal */}
      <WeightGoalSettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FAF9F6', // App standard warm canvas
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  navSideWrapper: {
    minWidth: 88,
    alignItems: 'flex-start',
  },
  navSideWrapperRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  navCenterWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  navTitleText: {
    fontSize: 18,
    fontFamily: Fonts.urbanist.bold,
    color: '#0F172A',
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  circleNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleNavBtnPressed: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.94 }],
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
  },
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 100,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  toastLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toastText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.medium,
    color: '#FFFFFF',
  },
  undoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
  },
  undoBtnPressed: {
    opacity: 0.7,
  },
  undoBtnText: {
    fontSize: 13,
    fontFamily: Fonts.urbanist.bold,
    color: '#38BDF8',
  },
});
