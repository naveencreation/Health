import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

interface OnboardingHeaderProps {
  onBack?: () => void;
  stepText?: string;
  rightElement?: React.ReactNode;
  backAccessibilityLabel?: string;
  testID?: string;
}

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export const OnboardingHeader: React.FC<OnboardingHeaderProps> = ({
  onBack,
  stepText,
  rightElement,
  backAccessibilityLabel = 'Go back',
  testID = 'onboarding-header',
}) => {
  return (
    <View style={styles.headerBar} testID={testID}>
      {/* Left: Back Button */}
      <View style={styles.leftContainer}>
        {onBack ? (
          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.btnPressedSubtle : null,
            ]}
            onPress={onBack}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
          >
            <Ionicons name="arrow-back" size={20} color="#1C274C" />
          </Pressable>
        ) : null}
      </View>

      {/* Center: Official Calori Brand Logo with Flame Badge & Typography (Dead-Centered) */}
      <View style={styles.centerContainer} pointerEvents="box-none">
        <View style={styles.logoRow}>
          <View style={styles.logoIconBadge}>
            <Ionicons name="flame" size={17} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>Calori</Text>
        </View>
      </View>

      {/* Right: Step Indicator or Custom Right Element */}
      <View style={styles.rightContainer}>
        {stepText ? (
          <View style={styles.stepBadge}>
            <Text style={styles.stepIndicatorText}>{stepText}</Text>
          </View>
        ) : (
          rightElement ?? null
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    position: 'relative',
    width: '100%',
    zIndex: 10,
  },
  leftContainer: {
    minWidth: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 2,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  btnPressedSubtle: {
    opacity: 0.7,
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.96 }],
  },
  centerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 2px 6px rgba(244, 117, 81, 0.35)',
        } as any)
      : {
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 2,
        }),
  },
  logoText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  rightContainer: {
    minWidth: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2,
  },
  stepBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepIndicatorText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#64748B',
  },
});
