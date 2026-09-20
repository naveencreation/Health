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
        {/* Frame 12: Top Navigation Bar */}
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed ? styles.btnPressedSubtle : null]}
            onPress={onBack}
            hitSlop={HIT_SLOP_12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#1C274C" />
          </Pressable>

          <View style={styles.logoBadgeContainer}>
            <View style={styles.logoDot} />
            <Text style={styles.logoBadgeText}>Calori</Text>
          </View>

          <View style={styles.stepBadge}>
            <Text style={styles.stepIndicatorText}>Step 5 of 5</Text>
          </View>
        </View>

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
            <Ionicons name="arrow-forward" size={18} color="#0F172A" />
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
    maxWidth: 375,
    height: 812,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 16,
    paddingBottom: 28,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 12px 30px rgba(0, 0, 0, 0.08)',
        } as any)
      : {}),
  },

  // Header Bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CDE26D',
  },
  logoBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#0F172A',
  },
  stepBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepIndicatorText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 0.2,
  },

  // Title & Context
  titleContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 36,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontFamily: 'Poppins_400Regular',
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
    borderRadius: 16,
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
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 8px 20px rgba(244, 117, 81, 0.14)',
        } as any)
      : {
          shadowColor: '#F47551',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 4,
        }),
  },
  genderCardUnselected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
        } as any)
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4,
          elevation: 1,
        }),
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
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
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 22,
    color: '#334155',
  },
  genderTitleSelected: {
    color: '#0F172A',
  },
  genderSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
    marginTop: 2,
  },
  radioCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 2px 6px rgba(244, 117, 81, 0.3)',
        } as any)
      : {
          shadowColor: '#F47551',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 4,
          elevation: 2,
        }),
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
    backgroundColor: '#CDE26D',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#CDE26D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          boxShadow: '0px 6px 18px rgba(205, 226, 109, 0.45)',
        } as any)
      : {}),
  },
  continueButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  continueButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  skipContainer: {
    paddingVertical: 6,
  },
  skipText: {
    fontFamily: 'Poppins_500Medium',
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#64748B',
  },
  signInLinkBold: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#F47551',
  },
});
