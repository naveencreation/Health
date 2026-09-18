import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Image,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';
import { SignInScreen } from './SignInScreen';
import { SignUpScreen } from './SignUpScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { AgeSelectionScreen } from '../onboarding/AgeSelectionScreen';
import { WeightSelectionScreen } from '../onboarding/WeightSelectionScreen';
import { GoalSelectionScreen, FitnessGoal } from '../onboarding/GoalSelectionScreen';
import { GenderSelectionScreen, GenderType } from '../onboarding/GenderSelectionScreen';

type AuthScreenMode =
  | 'welcome'
  | 'signin'
  | 'signup'
  | 'forgot_password'
  | 'age'
  | 'weight'
  | 'goal'
  | 'gender';

interface WelcomeScreenProps {
  onLoginSuccess?: () => void;
  initialMode?: AuthScreenMode;
  onClose?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onLoginSuccess,
  initialMode = 'welcome',
  onClose,
}) => {
  const { loginDemo } = useHealth();
  const [mode, setMode] = useState<AuthScreenMode>(initialMode);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const [biometrics, setBiometrics] = useState<{
    age: number;
    weight: number;
    weightUnit: 'kg' | 'lbs';
    goal: FitnessGoal;
    gender: GenderType;
  }>({
    age: 24,
    weight: 68,
    weightUnit: 'kg',
    goal: 'maintain',
    gender: 'male',
  });

  const handleDemoSignIn = async () => {
    setIsDemoLoading(true);
    setDemoError(null);
    try {
      await loginDemo();
      if (onLoginSuccess) onLoginSuccess();
    } catch (e: any) {
      setDemoError(e.message || 'Demo login failed');
    } finally {
      setIsDemoLoading(false);
    }
  };

  // 1. Sign In Screen
  if (mode === 'signin') {
    return (
      <SignInScreen
        onBack={() => {
          if (onClose) {
            onClose();
          } else {
            setMode('welcome');
          }
        }}
        onSuccess={onLoginSuccess}
        onSwitchToRegister={() => setMode('signup')}
        onForgotPassword={() => setMode('forgot_password')}
      />
    );
  }

  // 2. Sign Up Screen
  if (mode === 'signup') {
    return (
      <SignUpScreen
        onBack={() => setMode('welcome')}
        onSuccess={onLoginSuccess}
        onSwitchToSignIn={() => setMode('signin')}
        initialData={{
          age: biometrics.age,
          weight: biometrics.weight,
          weightUnit: biometrics.weightUnit,
          goal: biometrics.goal,
          gender: biometrics.gender,
        }}
      />
    );
  }

  // 3. Forgot Password Screen
  if (mode === 'forgot_password') {
    return (
      <ForgotPasswordScreen
        onBack={() => setMode('signin')}
        onSuccess={() => setMode('signin')}
      />
    );
  }

  // 4. Onboarding Step 1: Age
  if (mode === 'age') {
    return (
      <AgeSelectionScreen
        initialAge={biometrics.age}
        onBack={() => setMode('welcome')}
        onContinue={(age) => {
          setBiometrics((prev) => ({ ...prev, age }));
          setMode('weight');
        }}
        onSkip={() => setMode('signup')}
        onSignIn={() => setMode('signin')}
      />
    );
  }

  // 5. Onboarding Step 2: Weight
  if (mode === 'weight') {
    return (
      <WeightSelectionScreen
        initialWeightKg={biometrics.weight}
        onBack={() => setMode('age')}
        onContinue={(weight, weightUnit) => {
          setBiometrics((prev) => ({ ...prev, weight, weightUnit }));
          setMode('goal');
        }}
        onSkip={() => setMode('signup')}
        onSignIn={() => setMode('signin')}
      />
    );
  }

  // 6. Onboarding Step 3: Goal
  if (mode === 'goal') {
    return (
      <GoalSelectionScreen
        initialGoal={biometrics.goal}
        onBack={() => setMode('weight')}
        onContinue={(goal) => {
          setBiometrics((prev) => ({ ...prev, goal }));
          setMode('gender');
        }}
        onSkip={() => setMode('signup')}
        onSignIn={() => setMode('signin')}
      />
    );
  }

  // 7. Onboarding Step 4: Gender
  if (mode === 'gender') {
    return (
      <GenderSelectionScreen
        initialGender={biometrics.gender}
        onBack={() => setMode('goal')}
        onContinue={(gender) => {
          setBiometrics((prev) => ({ ...prev, gender }));
          setMode('signup');
        }}
        onSkip={() => setMode('signup')}
        onSignIn={() => setMode('signin')}
      />
    );
  }

  // Default: Welcome Landing Screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.container}>
          {/* Top Header Wordmark */}
          <View style={styles.topHeader}>
            {onClose && (
              <Pressable
                style={({ pressed }) => [styles.headerCloseBtn, pressed && styles.pressedSubtle]}
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close welcome screen"
              >
                <Ionicons name="close" size={22} color="#64748B" />
              </Pressable>
            )}
            <View style={styles.logoRow}>
              <View style={styles.logoIconBadge}>
                <Ionicons name="flame" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.logoText}>Calori</Text>
            </View>
          </View>

          {/* Hero Visual Area */}
          <View style={styles.heroSection}>
            <View style={styles.heroImageContainer}>
              <Image
                source={require('../../../assets/ria_avatar.jpg')}
                style={styles.heroImage}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Messaging & Value Proposition */}
          <View style={styles.contentSection}>
            <Text style={styles.mainHeading}>Your Personal Nutrition Coach</Text>
            <Text style={styles.subHeading}>
              Track authentic Indian meals, balance your macros, and receive daily coaching tailored to your lifestyle.
            </Text>
          </View>

          {/* Action Controls */}
          <View style={styles.ctaSection}>
            {demoError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorText}>{demoError}</Text>
              </View>
            ) : null}

            {/* Primary CTA */}
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressedButton]}
              onPress={() => setMode('age')}
              testID="btn-welcome-get-started"
              accessibilityRole="button"
              accessibilityLabel="Get Started with Calori"
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </Pressable>

            {/* Secondary CTA */}
            <Pressable
              style={({ pressed }) => [styles.demoButton, pressed && styles.pressedSubtle]}
              onPress={handleDemoSignIn}
              disabled={isDemoLoading}
              testID="btn-welcome-demo"
              accessibilityRole="button"
              accessibilityLabel="Explore as guest"
            >
              {isDemoLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.demoButtonText}>Explore as Guest</Text>
              )}
            </Pressable>

            {/* Returning User Access Link */}
            <View style={styles.signInRow}>
              <Text style={styles.signInPromptText}>Already have an account? </Text>
              <Pressable
                onPress={() => setMode('signin')}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                testID="btn-welcome-signin"
                accessibilityRole="button"
                accessibilityLabel="Sign in to existing account"
              >
                <Text style={styles.signInLinkText}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  container: {
    flex: 1,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
  },
  topHeader: {
    paddingTop: 12,
    alignItems: 'center',
    position: 'relative',
    width: '100%',
  },
  headerCloseBtn: {
    position: 'absolute',
    right: 0,
    top: 10,
    padding: 6,
    zIndex: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 22,
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  heroImageContainer: {
    width: 190,
    height: 190,
    borderRadius: 95,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  contentSection: {
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 28,
  },
  mainHeading: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 26,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.6,
  },
  subHeading: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 23,
    maxWidth: 360,
  },
  ctaSection: {
    width: '100%',
    gap: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  errorText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  pressedButton: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  demoButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  demoButtonText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 15,
    color: '#475569',
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  signInPromptText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
  },
  signInLinkText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  pressedSubtle: {
    opacity: 0.7,
  },
});
