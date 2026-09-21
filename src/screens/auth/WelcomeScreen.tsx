import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
  BackHandler,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';
import { ScreenTransitionContainer } from '@/components/common/ScreenTransitionContainer';
import { BouncingDotsLoader } from '@/components/common/BouncingDotsLoader';
import { SignInScreen } from './SignInScreen';
import { SignUpScreen } from './SignUpScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { AgeSelectionScreen } from '../onboarding/AgeSelectionScreen';
import { WeightSelectionScreen } from '../onboarding/WeightSelectionScreen';
import { HeightSelectionScreen, HeightUnit } from '../onboarding/HeightSelectionScreen';
import { GoalSelectionScreen, FitnessGoal } from '../onboarding/GoalSelectionScreen';
import { GenderSelectionScreen, GenderType } from '../onboarding/GenderSelectionScreen';

type AuthScreenMode =
  | 'welcome'
  | 'signin'
  | 'signup'
  | 'forgot_password'
  | 'age'
  | 'weight'
  | 'height'
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
  const [history, setHistory] = useState<AuthScreenMode[]>([initialMode]);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const mode = history[history.length - 1] || 'welcome';
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  useEffect(() => {
    setHistory([initialMode]);
  }, [initialMode]);

  const pushMode = (nextMode: AuthScreenMode) => {
    setTransitionDirection('forward');
    setHistory((prev) => (prev[prev.length - 1] === nextMode ? prev : [...prev, nextMode]));
  };

  const popMode = () => {
    setTransitionDirection('backward');
    setHistory((prev) => {
      if (prev.length > 1) {
        return prev.slice(0, -1);
      }
      if (onClose) {
        onClose();
        return prev;
      }
      if (prev[0] !== 'welcome') {
        return ['welcome'];
      }
      return prev;
    });
  };

  // Android Hardware Back Handler for Auth & Onboarding Flow
  useEffect(() => {
    const onHardwareBackPress = () => {
      if (history.length > 1) {
        popMode();
        return true;
      }
      if (mode !== 'welcome') {
        if (onClose) {
          onClose();
          return true;
        }
        setHistory(['welcome']);
        return true;
      }
      if (onClose) {
        onClose();
        return true;
      }
      // On welcome landing root: allow native exit
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => subscription.remove();
  }, [history, mode, onClose]);

  const [biometrics, setBiometrics] = useState<{
    age: number;
    weight: number;
    weightUnit: 'kg' | 'lbs';
    height: number;
    heightUnit: HeightUnit;
    goal: FitnessGoal;
    gender: GenderType;
  }>({
    age: 24,
    weight: 68,
    weightUnit: 'kg',
    height: 170,
    heightUnit: 'cm',
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

  const renderContent = () => {
    // 1. Sign In Screen
    if (mode === 'signin') {
      return (
        <SignInScreen
          onBack={popMode}
          onSuccess={onLoginSuccess}
          onSwitchToRegister={() => pushMode('age')}
          onForgotPassword={() => pushMode('forgot_password')}
        />
      );
    }

    // 2. Sign Up Screen
    if (mode === 'signup') {
      return (
        <SignUpScreen
          onBack={popMode}
          onSuccess={onLoginSuccess}
          onSwitchToSignIn={() => pushMode('signin')}
          initialData={{
            age: biometrics.age,
            weight: biometrics.weight,
            weightUnit: biometrics.weightUnit,
            height: biometrics.height,
            heightUnit: biometrics.heightUnit,
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
          onBack={popMode}
          onSuccess={popMode}
        />
      );
    }

    // 4. Onboarding Step 1: Age
    if (mode === 'age') {
      return (
        <AgeSelectionScreen
          initialAge={biometrics.age}
          onBack={popMode}
          onContinue={(age) => {
            setBiometrics((prev) => ({ ...prev, age }));
            pushMode('weight');
          }}
          onSkip={() => pushMode('signup')}
          onSignIn={() => pushMode('signin')}
        />
      );
    }

    // 5. Onboarding Step 2: Weight
    if (mode === 'weight') {
      return (
        <WeightSelectionScreen
          initialWeightKg={biometrics.weight}
          onBack={popMode}
          onContinue={(weight, weightUnit) => {
            setBiometrics((prev) => ({ ...prev, weight, weightUnit }));
            pushMode('height');
          }}
          onSkip={() => pushMode('signup')}
          onSignIn={() => pushMode('signin')}
        />
      );
    }

    // 6. Onboarding Step 3: Height
    if (mode === 'height') {
      return (
        <HeightSelectionScreen
          initialHeightCm={biometrics.height}
          onBack={popMode}
          onContinue={(height, heightUnit) => {
            setBiometrics((prev) => ({ ...prev, height, heightUnit }));
            pushMode('goal');
          }}
          onSkip={() => pushMode('signup')}
          onSignIn={() => pushMode('signin')}
        />
      );
    }

    // 7. Onboarding Step 4: Goal
    if (mode === 'goal') {
      return (
        <GoalSelectionScreen
          initialGoal={biometrics.goal}
          onBack={popMode}
          onContinue={(goal) => {
            setBiometrics((prev) => ({ ...prev, goal }));
            pushMode('gender');
          }}
          onSkip={() => pushMode('signup')}
          onSignIn={() => pushMode('signin')}
        />
      );
    }

    // 8. Onboarding Step 5: Gender
    if (mode === 'gender') {
      return (
        <GenderSelectionScreen
          initialGender={biometrics.gender}
          onBack={popMode}
          onContinue={(gender) => {
            setBiometrics((prev) => ({ ...prev, gender }));
            pushMode('signup');
          }}
          onSkip={() => pushMode('signup')}
          onSignIn={() => pushMode('signin')}
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
              {onClose ? (
                <Pressable
                  style={({ pressed }) => [styles.headerCloseBtn, pressed ? styles.pressedSubtle : null]}
                  onPress={onClose}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Close welcome screen"
                >
                  <Ionicons name="close" size={22} color="#64748B" />
                </Pressable>
              ) : null}
              <View style={styles.logoRow}>
                <View style={styles.logoIconBadge}>
                  <Ionicons name="flame" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.logoText}>Calori</Text>
              </View>
            </View>

            {/* Hero Visual Area */}
            <View style={styles.heroSection}>
              <View style={styles.heroGlowRing}>
                <View style={styles.heroImageContainer}>
                  <ExpoImage
                    source={require('../../../assets/ria_avatar.png')}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                    priority="high"
                  />
                </View>
              </View>
            </View>

            {/* Messaging & Value Proposition */}
            <View style={styles.contentSection}>
              <Text style={styles.mainHeading}>Your Personal Nutrition Coach</Text>
              <Text style={styles.headlineTagline}>Built around the food you actually eat.</Text>
              <Text style={styles.subHeading}>
                Track Indian meals, understand your nutrition, and get simple daily guidance that fits your lifestyle.
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
                style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressedButton : null]}
                onPress={() => pushMode('age')}
                testID="btn-welcome-get-started"
                accessibilityRole="button"
                accessibilityLabel="Get Started with Calori"
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </Pressable>

              {/* Secondary CTA */}
              <Pressable
                style={({ pressed }) => [styles.demoButton, pressed ? styles.pressedSecondary : null]}
                onPress={handleDemoSignIn}
                disabled={isDemoLoading}
                testID="btn-welcome-demo"
                accessibilityRole="button"
                accessibilityLabel="Explore as guest"
              >
                {isDemoLoading ? (
                  <BouncingDotsLoader color={Colors.primary} size={6} gap={5} />
                ) : (
                  <Text style={styles.demoButtonText}>Explore as Guest</Text>
                )}
              </Pressable>

              {/* Returning User Access Link */}
              <View style={styles.signInRow}>
                <Text style={styles.signInPromptText}>Already have an account? </Text>
                <Pressable
                  onPress={() => pushMode('signin')}
                  style={({ pressed }) => [pressed ? styles.pressedSubtle : null]}
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

  return (
    <ScreenTransitionContainer
      transitionKey={mode}
      direction={transitionDirection}
      duration={220}
      style={styles.transitionContainer}
    >
      {renderContent()}
    </ScreenTransitionContainer>
  );
};

const styles = StyleSheet.create({
  transitionContainer: {
    flex: 1,
    width: '100%',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    alignItems: 'center',
  },
  topHeader: {
    alignItems: 'center',
    position: 'relative',
    width: '100%',
    marginBottom: 16,
  },
  headerCloseBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
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
    marginBottom: 20,
  },
  heroGlowRing: {
    padding: 10,
    borderRadius: 125,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FFEDD5',
  },
  heroImageContainer: {
    width: 216,
    height: 216,
    borderRadius: 108,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 6,
    backgroundColor: '#FED7AA',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  contentSection: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginBottom: 26,
  },
  mainHeading: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 25,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
    lineHeight: 33,
  },
  headlineTagline: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  subHeading: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
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
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  pressedButton: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  demoButton: {
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  pressedSecondary: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    transform: [{ scale: 0.985 }],
  },
  demoButtonText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#334155',
  },
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 4,
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
