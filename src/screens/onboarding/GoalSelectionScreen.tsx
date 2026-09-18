import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export type FitnessGoal = 'lose' | 'maintain' | 'gain';

interface GoalSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (goal: FitnessGoal) => void;
  onSkip?: () => void;
  onSignIn?: () => void;
  initialGoal?: FitnessGoal;
}

interface GoalOption {
  id: FitnessGoal;
  title: string;
  iconName: string;
  iconFamily: 'ionicons' | 'mci';
  iconBg: string;
  iconColor: string;
}

const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'lose',
    title: 'Lose weight',
    iconName: 'flame',
    iconFamily: 'ionicons',
    iconBg: '#FFF1EE',
    iconColor: '#F47551',
  },
  {
    id: 'maintain',
    title: 'Maintain weight',
    iconName: 'scale-balance',
    iconFamily: 'mci',
    iconBg: '#F0FDF4',
    iconColor: '#16A34A',
  },
  {
    id: 'gain',
    title: 'Gain weight',
    iconName: 'barbell',
    iconFamily: 'ionicons',
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
  },
];

export const GoalSelectionScreen: React.FC<GoalSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  onSignIn,
  initialGoal = 'maintain',
}) => {
  const [selectedGoal, setSelectedGoal] = useState<FitnessGoal>(initialGoal);

  const handleContinuePress = () => {
    if (onContinue) onContinue(selectedGoal);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {/* Frame 12: Top Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={22} color="#1C274C" />
          </TouchableOpacity>

          <View style={styles.logoBadgeContainer}>
            <View style={styles.logoDot} />
            <Text style={styles.logoBadgeText}>Calori</Text>
          </View>

          {onSignIn ? (
            <TouchableOpacity onPress={onSignIn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.headerSignInLink}>Sign In</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.stepIndicatorText}>3 of 4</Text>
          )}
        </View>

        {/* Title: What goal do you have in mind? */}
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>
            What goal do you{'\n'}have in mind?
          </Text>
        </View>

        {/* Goal Selection Cards (3 Options) */}
        <View style={styles.cardsContainer}>
          {GOAL_OPTIONS.map((option) => {
            const isSelected = selectedGoal === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                activeOpacity={0.85}
                onPress={() => setSelectedGoal(option.id)}
                style={[
                  styles.goalCard,
                  isSelected ? styles.goalCardSelected : styles.goalCardUnselected,
                ]}
              >
                {/* Left Visual Icon Badge */}
                <View style={[styles.iconBadge, { backgroundColor: option.iconBg }]}>
                  {option.iconFamily === 'ionicons' ? (
                    <Ionicons name={option.iconName as any} size={24} color={option.iconColor} />
                  ) : (
                    <MaterialCommunityIcons name={option.iconName as any} size={24} color={option.iconColor} />
                  )}
                </View>

                {/* Option Title */}
                <Text
                  style={[
                    styles.goalTitle,
                    isSelected && styles.goalTitleSelected,
                  ]}
                >
                  {option.title}
                </Text>

                {/* Radio Indicator (Ellipse 6, 7, 8) */}
                <View
                  style={[
                    styles.radioCircle,
                    isSelected ? styles.radioSelected : styles.radioUnselected,
                  ]}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Frame 9: Continue CTA Button (Coral #F47551 in Figma) */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinuePress}
            activeOpacity={0.88}
          >
            <Text style={styles.continueButtonText}>Continue</Text>

            {/* Decorative Ellipses and Stars from Figma */}
            <View style={styles.decorCluster}>
              <View style={styles.decorCircleOuter}>
                <View style={styles.decorCircleInner} />
              </View>
              <View style={styles.starsRow}>
                <Ionicons name="sparkles" size={13} color="#FFFFFF" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Skip & Sign In Actions */}
          <View style={styles.footerLinksRow}>
            <TouchableOpacity
              style={styles.skipContainer}
              onPress={onSkip}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            {onSignIn && (
              <TouchableOpacity
                onPress={onSignIn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.signInBottomBtn}
              >
                <Text style={styles.signInLinkText}>
                  Have an account? <Text style={styles.signInLinkBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
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

  // Frame 12: Header
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
    backgroundColor: '#F47551',
  },
  logoBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#0F172A',
  },
  stepIndicatorText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: '#626262',
    lineHeight: 22,
  },

  // Title: What goal do you have in mind?
  titleContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 30,
    lineHeight: 38,
    color: '#000000',
    textAlign: 'center',
  },

  // Cards Container: 316px wide cards
  cardsContainer: {
    width: 316,
    alignSelf: 'center',
    gap: 22,
    marginTop: 28,
  },
  goalCard: {
    width: 316,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  goalCardSelected: {
    borderWidth: 1.5,
    borderColor: '#F47551',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 10px 24px rgba(244, 117, 81, 0.16)',
        } as any)
      : {
          shadowColor: '#F47551',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
          elevation: 5,
        }),
  },
  goalCardUnselected: {
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.18)',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.04)',
        } as any)
      : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
          elevation: 2,
        }),
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 26,
    color: 'rgba(0, 0, 0, 0.8)',
    marginLeft: 14,
  },
  goalTitleSelected: {
    color: '#000000',
  },
  radioCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioUnselected: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.32)',
  },
  radioSelected: {
    backgroundColor: '#F47551',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 4px 10px rgba(244, 117, 81, 0.4)',
        } as any)
      : {
          shadowColor: '#F47551',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.35,
          shadowRadius: 4,
          elevation: 3,
        }),
  },

  // Frame 9: Continue CTA Button (Figma coral: #F47551)
  footerContainer: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 8,
  },
  continueButton: {
    width: 195,
    height: 48,
    backgroundColor: '#F47551', // Coral from Figma Frame 9 on Screen 3
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 10px 24px rgba(244, 117, 81, 0.35)',
        } as any)
      : {
          shadowColor: '#F47551',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.35,
          shadowRadius: 14,
          elevation: 5,
        }),
  },
  continueButtonText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: '#FFFDFD',
    lineHeight: 24,
  },
  decorCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  decorCircleOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFB29C', // Figma Ellipse 1 on Screen 3
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorCircleInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF', // Figma Ellipse 2 on Screen 3
  },
  starsRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Skip Action
  skipContainer: {
    paddingVertical: 6,
  },
  skipText: {
    fontFamily: 'Kurale_400Regular',
    fontSize: 20,
    lineHeight: 30,
    color: 'rgba(0, 0, 0, 0.5)',
    letterSpacing: 0.2,
  },
  headerSignInLink: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#F47551',
    paddingHorizontal: 6,
    paddingVertical: 4,
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
