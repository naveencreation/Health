import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export interface StepTrackerScreenProps {
  onBack: () => void;
  onOpenSettings?: () => void;
}

export const StepTrackerScreen: React.FC<StepTrackerScreenProps> = ({
  onBack,
  onOpenSettings,
}) => {
  const insets = useSafeAreaInsets();

  // Android hardware back press support
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => subscription.remove();
  }, [onBack]);

  return (
    <View style={styles.container}>
      {/* 1. Header with Back Button & Screen Title */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
        <Pressable
          style={({ pressed }) => [styles.iconBtn, pressed ? styles.btnPressed : null]}
          onPress={onBack}
          hitSlop={HIT_SLOP_10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </Pressable>

        <Text style={styles.headerTitle}>Step Tracker</Text>

        {onOpenSettings ? (
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed ? styles.btnPressed : null]}
            onPress={onOpenSettings}
            hitSlop={HIT_SLOP_10}
            accessibilityRole="button"
            accessibilityLabel="Step settings"
          >
            <Ionicons name="settings-outline" size={20} color="#0F172A" />
          </Pressable>
        ) : (
          <View style={styles.iconBtnPlaceholder} />
        )}
      </View>

      {/* 2. Scrollable Body Ready for Step & Activity Components */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.placeholderCard}>
          <Ionicons name="footsteps-outline" size={48} color={Colors.steps} />
          <Text style={styles.placeholderTitle}>Step Tracker</Text>
          <Text style={styles.placeholderSubtitle}>
            Track your daily step cadence, walking distance, active energy output, and activity streaks.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#FAF9F6',
  },
  headerTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 19,
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  scrollArea: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  placeholderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  placeholderTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
  },
});

export default StepTrackerScreen;
