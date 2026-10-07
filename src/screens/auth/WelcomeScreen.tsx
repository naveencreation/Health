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
import { useAuth } from '@/context/HealthContext';
import { ScreenTransitionContainer } from '@/components/common/ScreenTransitionContainer';
import { BouncingDotsLoader } from '@/components/common/BouncingDotsLoader';
import { SignInScreen } from './SignInScreen';
import { SignUpScreen } from './SignUpScreen';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import {
  OnboardingWizardScreen,
  HeightUnit,
  FitnessGoal,
  GenderType,
  loadOnboardingDraft,
  clearOnboardingDraft,
  OnboardingDraft,
} from '@/features/onboarding';

export type AuthScreenMode =
  | 'welcome'
  | 'onboarding'
  | 'signin'
  | 'signup'
  | 'forgot_password'
  | 'age';

interface WelcomeScreenProps {
  onLoginSuccess?: () => void;
  initialMode?: AuthScreenMode;
  onClose?: () => void;
  onOnboardingStart?: () => void;
  onOnboardingEnd?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onLoginSuccess,
  initialMode = 'welcome',
  onClose,
  onOnboardingStart,
  onOnboardingEnd,
}) => {
  const { loginDemo, applyOnboardingPlan } = useAuth();
  const normalizeMode = (m: AuthScreenMode): AuthScreenMode => (m === 'age' ? 'onboarding' : m);
  const [history, setHistory] = useState<AuthScreenMode[]>([normalizeMode(initialMode)]);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const mode = history[history.length - 1] || 'welcome';
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (mode === 'welcome') {
      loadOnboardingDraft().then(d => {
        if (isMounted) setDraft(d);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [mode]);

  const handleStartOver = async () => {
    await clearOnboardingDraft();
    setDraft(null);
    pushMode('onboarding');
  };

  const onOnboardingStartRef = useRef(onOnboardingStart);
  onOnboardingStartRef.current = onOnboardingStart;
  const onOnboardingEndRef = useRef(onOnboardingEnd);
  onOnboardingEndRef.current = onOnboardingEnd;

  const prevInitialModeRef = useRef(initialMode);
  useEffect(() => {
    if (prevInitialModeRef.current !== initialMode) {
      prevInitialModeRef.current = initialMode;
      const resolved = normalizeMode(initialMode);
      if (resolved === 'onboarding') {
        onOnboardingStartRef.current?.();
      }
      setHistory([resolved]);
    }
  }, [initialMode]);

  const pushMode = (nextMode: AuthScreenMode) => {
    const resolvedMode = normalizeMode(nextMode);
    if (resolvedMode === 'onboarding') {
      onOnboardingStartRef.current?.();
    }
    setTransitionDirection('forward');
    setHistory(prev => (prev[prev.length - 1] === resolvedMode ? prev : [...prev, resolvedMode]));
  };

  const popMode = () => {
    setTransitionDirection('backward');
    const current = history[history.length - 1];
    if (current === 'onboarding') {
      onOnboardingEndRef.current?.();
    }
    if (history.length > 1) {
      setHistory(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
      return;
    }
    if (onClose) {
      onClose();
      return;
    }
    if (history[0] !== 'welcome') {
      setHistory(['welcome']);
    }
  };

  // Android Hardware Back Handler for Auth & Onboarding Flow
  useEffect(() => {
    const onHardwareBackPress = () => {
      // If onboarding is active, OnboardingWizardScreen's own BackHandler handles internal step history.
      if (mode === 'onboarding') {
        return false;
      }
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
          onSwitchToRegister={() => pushMode('onboarding')}
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
      return <ForgotPasswordScreen onBack={popMode} onSuccess={popMode} />;
    }

    // 4. Onboarding Wizard (Single Master Orchestrator)
    if (mode === 'onboarding') {
      return (
        <OnboardingWizardScreen
          onComplete={async data => {
            setBiometrics({
              age: data.biometrics.age,
              weight: data.biometrics.weightKg,
              weightUnit: data.biometrics.weightUnit || 'kg',
              height: data.biometrics.heightCm,
              heightUnit: data.biometrics.heightUnit || 'cm',
              goal:
                data.biometrics.goal === 'lose_weight'
                  ? 'lose'
                  : data.biometrics.goal === 'gain_muscle'
                    ? 'gain'
                    : 'maintain',
              gender:
                data.biometrics.gender === 'female'
                  ? 'female'
                  : data.biometrics.gender === 'male'
                    ? 'male'
                    : 'other',
            });
            if (applyOnboardingPlan) {
              await applyOnboardingPlan(data);
            }
            onOnboardingEnd?.();
            if (onLoginSuccess) {
              onLoginSuccess();
            } else {
              pushMode('signup');
            }
          }}
          onBackToWelcome={() => {
            popMode();
          }}
          onSignIn={() => {
            onOnboardingEnd?.();
            pushMode('signin');
          }}
          onSkip={() => {
            onOnboardingEnd?.();
            if (onLoginSuccess) {
              onLoginSuccess();
            } else {
              pushMode('signup');
            }
          }}
          initialBiometrics={{
            age: biometrics.age,
            weightKg: biometrics.weight,
            weightUnit: biometrics.weightUnit,
            heightCm: biometrics.height,
            heightUnit: biometrics.heightUnit,
            goal:
              biometrics.goal === 'lose'
                ? 'lose_weight'
                : biometrics.goal === 'gain'
                  ? 'gain_muscle'
                  : 'maintain',
            gender:
              biometrics.gender === 'female'
                ? 'female'
                : biometrics.gender === 'male'
                  ? 'male'
                  : 'other',
          }}
        />
      );
    }

    const hasActiveDraft = Boolean(draft?.step && draft.step !== 'name');

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
                  style={({ pressed }) => [
                    styles.headerCloseBtn,
                    pressed ? styles.pressedSubtle : null,
                  ]}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close welcome screen"
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </Pressable>
              ) : null}
              <View style={styles.logoRow}>
                <View style={styles.logoIconBadge}>
                  <Ionicons name="flame" size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.logoText}>Calorify</Text>
              </View>
            </View>

            {/* Hero Visual Area */}
            <View style={styles.heroSection}>
              <View style={styles.heroGlowRing}>
                <View style={styles.heroImageContainer}>
                  <ExpoImage
                    source={require('../../../assets/ria_avatar.webp')}
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
                Track Indian meals, understand your nutrition, and get simple daily guidance that
                fits your lifestyle.
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
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.pressedButton : null,
                ]}
                onPress={() => pushMode('onboarding')}
                testID="btn-welcome-get-started"
                accessibilityRole="button"
                accessibilityLabel={
                  hasActiveDraft ? 'Continue setup' : 'Get Started with Calorify'
                }
              >
                <Text style={styles.primaryButtonText}>
                  {hasActiveDraft
                    ? draft?.name?.trim()
                      ? `Continue setup (${draft.name.trim()})`
                      : 'Continue setup'
                    : 'Get Started'}
                </Text>
              </Pressable>

              {/* Start Over Button if active draft exists */}
              {hasActiveDraft ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.startOverButton,
                    pressed ? styles.pressedSubtle : null,
                  ]}
                  onPress={handleStartOver}
                  testID="btn-welcome-start-over"
                  accessibilityRole="button"
                  accessibilityLabel="Start over onboarding from the beginning"
                >
                  <Text style={styles.startOverButtonText}>Start over</Text>
                </Pressable>
              ) : null}

              {/* Secondary CTA */}
              <Pressable
                style={({ pressed }) => [
                  styles.demoButton,
                  pressed ? styles.pressedSecondary : null,
                ]}
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
    paddingHorizontal: 24,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: Fonts.urbanist.bold,
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
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    elevation: 0,
    shadowOpacity: 0,
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
    fontFamily: Fonts.urbanist.bold,
    fontSize: 25,
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
    lineHeight: 33,
  },
  headlineTagline: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  subHeading: {
    fontFamily: Fonts.urbanist.regular,
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
    borderCurve: 'continuous',
    gap: 8,
  },
  errorText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  pressedButton: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  demoButton: {
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  pressedSecondary: {
    backgroundColor: Colors.surfaceLow,
    borderColor: Colors.borderMedium,
    transform: [{ scale: 0.985 }],
  },
  demoButtonText: {
    fontFamily: Fonts.urbanist.semiBold,
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
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    color: '#64748B',
  },
  signInLinkText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  startOverButton: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  startOverButtonText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: '#64748B',
    textDecorationLine: 'underline',
  },
  pressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
