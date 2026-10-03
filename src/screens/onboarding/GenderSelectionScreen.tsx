import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { OnboardingHeader } from '@/components/onboarding';

export type GenderType = 'female' | 'male' | 'other';

interface GenderSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (gender: GenderType) => void;
  onSkip?: () => void;
  onSignIn?: () => void;
  initialGender?: GenderType;
}

interface GenderOption {
  id: GenderType;
  title: string;
  subtitle: string;
  iconName: string;
  iconColor: string;
}

const GENDER_OPTIONS: GenderOption[] = [
  {
    id: 'female',
    title: 'Female',
    subtitle: 'Calibrates metabolic rate formula for female biology',
    iconName: 'female',
    iconColor: '#EC4899',
  },
  {
    id: 'male',
    title: 'Male',
    subtitle: 'Calibrates metabolic rate formula for male biology',
    iconName: 'male',
    iconColor: '#2563EB',
  },
  {
    id: 'other',
    title: 'Other',
    subtitle: 'Uses a balanced metabolic median for your calculations',
    iconName: 'sparkles',
    iconColor: '#7C3AED',
  },
];

const HIT_SLOP_12 = { top: 12, bottom: 12, left: 12, right: 12 };

export const GenderSelectionScreen: React.FC<GenderSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  onSignIn,
  initialGender = 'male',
}) => {
  const [selectedGender, setSelectedGender] = useState<GenderType>(initialGender);

  const handleContinuePress = () => {
    if (onContinue) onContinue(selectedGender);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {/* Top Navigation Bar */}
        <OnboardingHeader onBack={onBack} stepText="Step 5 of 5" />

        {/* Header Title & Cognitive Context */}
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>What’s your gender?</Text>
          <Text style={styles.screenSubtitle}>
            Calibrates your basal metabolic rate (BMR) calculation
          </Text>
        </View>

        {/* Gender Selection Cards */}
        <View style={styles.cardsContainer}>
          {GENDER_OPTIONS.map((option) => {
            const isSelected = selectedGender === option.id;

            return (
              <Pressable
                key={option.id}
                onPress={() => setSelectedGender(option.id)}
                style={({ pressed }) => [
                  styles.genderCard,
                  isSelected ? styles.genderCardSelected : styles.genderCardUnselected,
                  pressed ? styles.genderCardPressed : null,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${option.title}: ${option.subtitle}`}
              >
                {/* Left Visual Icon Badge */}
                <View style={[styles.iconBadge, getGenderIconBgStyle(option.id)]}>
                  <Ionicons name={option.iconName as any} size={22} color={option.iconColor} />
                </View>

                {/* Option Content: Title & Benefit Subtitle */}
                <View style={styles.cardTextContent}>
                  <Text
                    style={[
                      styles.genderTitle,
                      isSelected ? styles.genderTitleSelected : null,
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text style={styles.genderSubtitle}>{option.subtitle}</Text>
                </View>

                {/* Accessible Radio Indicator */}
                <View
                  style={[
                    styles.radioCircle,
                    isSelected ? styles.radioSelected : styles.radioUnselected,
                  ]}
                >
                  {isSelected ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Frame 9: Standardized Continue CTA */}
        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [styles.continueButton, pressed ? styles.continueButtonPressed : null]}
            onPress={handleContinuePress}
            accessibilityRole="button"
            accessibilityLabel="Continue with selected gender"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          {/* Skip & Sign In Actions */}
          <View style={styles.footerLinksRow}>
            <Pressable
              style={({ pressed }) => [styles.skipContainer, pressed ? styles.btnPressedSubtle : null]}
              onPress={onSkip}
              hitSlop={HIT_SLOP_12}
              accessibilityRole="button"
              accessibilityLabel="Skip gender selection"
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>

            {onSignIn ? (
              <Pressable
                onPress={onSignIn}
                hitSlop={HIT_SLOP_12}
                style={({ pressed }) => [styles.signInBottomBtn, pressed ? styles.btnPressedSubtle : null]}
                accessibilityRole="button"
                accessibilityLabel="Sign in to existing account"
              >
                <Text style={styles.signInLinkText}>
                  Have an account? <Text style={styles.signInLinkBold}>Sign In</Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const getGenderIconBgStyle = (id: GenderType) => {
  switch (id) {
    case 'female':
      return styles.iconBadgeFemale;
    case 'male':
      return styles.iconBadgeMale;
    case 'other':
      return styles.iconBadgeOther;
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 440,
    flex: 1,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 24,
    justifyContent: 'space-between',
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },

  // Title & Context
  titleContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 28,
    lineHeight: 36,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 290,
  },

  // Cards Container
  cardsContainer: {
    width: '100%',
    maxWidth: 335,
    alignSelf: 'center',
    gap: 14,
    marginVertical: 12,
  },
  genderCard: {
    width: '100%',
    height: 76,
    borderRadius: 10,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        } as any)
      : {}),
  },
  genderCardSelected: {
    backgroundColor: '#FFFBF9',
    borderWidth: 1.5,
    borderColor: '#F47551',
    elevation: 0,
    shadowOpacity: 0,
  },
  genderCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    elevation: 0,
    shadowOpacity: 0,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeFemale: {
    backgroundColor: '#FDF2F8',
  },
  iconBadgeMale: {
    backgroundColor: '#EFF6FF',
  },
  iconBadgeOther: {
    backgroundColor: '#F5F3FF',
  },
  btnPressedSubtle: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
  genderCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  cardTextContent: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
    justifyContent: 'center',
  },
  genderTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: '#334155',
  },
  genderTitleSelected: {
    color: '#0F172A',
  },
  genderSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    marginTop: 2,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioUnselected: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  radioSelected: {
    backgroundColor: '#F47551',
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },

  // Footer & Continue CTA
  footerContainer: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 4,
  },
  continueButton: {
    width: 220,
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 0,
    shadowOpacity: 0,
  },
  continueButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  continueButtonText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  skipContainer: {
    paddingVertical: 6,
  },
  skipText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: '#64748B',
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 4,
  },
  signInBottomBtn: {
    paddingVertical: 6,
  },
  signInLinkText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    color: '#64748B',
  },
  signInLinkBold: {
    fontFamily: Fonts.urbanist.semiBold,
    color: '#F47551',
  },
});
