import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  BackHandler,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useReducedMotion,
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ControlHeights, ControlRadii } from '@/theme/controls';
import { MotionCurves, MotionDurations } from '@/theme/motion';
import { useAuth } from '@/context/HealthContext';
import { ScreenTransitionContainer } from '@/components/common/ScreenTransitionContainer';
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
  'welcome' | 'onboarding' | 'signin' | 'signup' | 'forgot_password' | 'age';

interface WelcomeScreenProps {
  onLoginSuccess?: () => void;
  initialMode?: AuthScreenMode;
  onClose?: () => void;
  onOnboardingStart?: () => void;
  onOnboardingEnd?: () => void;
}

const HERO_IMAGE = require('../../../assets/welcome/thali_arch.jpg');
const HERO_ASPECT = 1200 / 1350;

// Positions are fractions of the hero illustration so the labels track the dishes at any size.
const HERO_TAGS = [
  { label: 'Dal tadka', kcal: 180, x: 0.06, y: 0.575, align: 'left' },
  { label: 'Paneer', kcal: 290, x: 0.92, y: 0.474, align: 'right' },
  { label: '2 Roti', kcal: 240, x: 0.945, y: 0.883, align: 'right' },
] as const;

const Reveal: React.FC<{
  delay?: number;
  rise?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}> = ({ delay = 0, rise = 10, style, children }) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: MotionDurations.sheet, easing: MotionCurves.decelerate })
    );
  }, [delay, progress, reduceMotion]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * rise }],
  }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onLoginSuccess,
  initialMode = 'welcome',
  onClose,
  onOnboardingStart,
  onOnboardingEnd,
}) => {
  const { applyOnboardingPlan } = useAuth();
  const normalizeMode = (m: AuthScreenMode): AuthScreenMode => (m === 'age' ? 'onboarding' : m);
  const [history, setHistory] = useState<AuthScreenMode[]>([normalizeMode(initialMode)]);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const mode = history[history.length - 1] || 'welcome';
  const [heroSize, setHeroSize] = useState({ width: 0, height: 0 });
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
    const draftName = draft?.name?.trim();

    // Rendered rect of the illustration: contain-fitted and bottom-anchored in the hero box.
    const heroWidth = Math.min(heroSize.width, heroSize.height * HERO_ASPECT);
    const heroHeight = heroWidth / HERO_ASPECT;
    const heroLeft = (heroSize.width - heroWidth) / 2;
    const heroTop = heroSize.height - heroHeight;

    // Default: Welcome Landing Screen
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.container}>
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
                  <Ionicons name="close" size={20} color={Colors.textSecondary} />
                </Pressable>
              ) : null}
              <View style={styles.logoRow} accessible accessibilityRole="header">
                <ExpoImage
                  source={require('../../../assets/flame-icon.png')}
                  style={styles.logoFlame}
                  contentFit="contain"
                  priority="high"
                />
                <Text style={styles.logoText} maxFontSizeMultiplier={1.2}>
                  Calorify
                </Text>
              </View>
            </View>

            <Reveal style={styles.heroSection} rise={16}>
              <View
                style={styles.heroFrame}
                onLayout={e => {
                  const { width, height } = e.nativeEvent.layout;
                  setHeroSize({ width, height });
                }}
              >
                <ExpoImage
                  source={HERO_IMAGE}
                  style={StyleSheet.absoluteFill}
                  contentFit="contain"
                  contentPosition="bottom"
                  priority="high"
                  cachePolicy="memory-disk"
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel="A thali with dal, paneer, raita, rice and roti, each labelled with its calories"
                />
                {heroWidth > 0
                  ? HERO_TAGS.map((tag, index) => (
                      <Reveal
                        key={tag.label}
                        delay={MotionDurations.sheet + index * 80}
                        rise={6}
                        style={[
                          styles.tag,
                          { top: heroTop + heroHeight * tag.y },
                          tag.align === 'left'
                            ? { left: Math.max(4, heroLeft + heroWidth * tag.x) }
                            : {
                                right: Math.max(4, heroSize.width - (heroLeft + heroWidth * tag.x)),
                              },
                        ]}
                      >
                        <View
                          style={styles.tagInner}
                          importantForAccessibility="no-hide-descendants"
                          accessibilityElementsHidden
                        >
                          <View style={styles.tagDot} />
                          <Text style={styles.tagLabel} maxFontSizeMultiplier={1.2}>
                            {tag.label}
                          </Text>
                          <Text style={styles.tagKcal} maxFontSizeMultiplier={1.2}>
                            {tag.kcal} kcal
                          </Text>
                        </View>
                      </Reveal>
                    ))
                  : null}
              </View>
            </Reveal>

            <Reveal delay={MotionDurations.sheet * 2} style={styles.contentSection}>
              <Text
                style={styles.mainHeading}
                accessibilityRole="header"
                maxFontSizeMultiplier={1.3}
              >
                {hasActiveDraft ? (
                  draftName ? (
                    `Welcome back, ${draftName}`
                  ) : (
                    'Welcome back'
                  )
                ) : (
                  <>
                    Your thali, <Text style={styles.mainHeadingAccent}>counted.</Text>
                  </>
                )}
              </Text>
              <Text style={styles.subHeading} maxFontSizeMultiplier={1.4}>
                {hasActiveDraft
                  ? 'Your answers are saved. Pick up where you left off.'
                  : 'From dal to dosa, log what you really eat and get a calorie plan made for you.'}
              </Text>
            </Reveal>

            <Reveal delay={MotionDurations.sheet * 2 + 80} style={styles.ctaSection}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed ? styles.pressedButton : null,
                ]}
                onPress={() => pushMode('onboarding')}
                testID="btn-welcome-get-started"
                accessibilityRole="button"
                accessibilityLabel={hasActiveDraft ? 'Continue setup' : 'Get Started with Calorify'}
              >
                <Text style={styles.primaryButtonText} maxFontSizeMultiplier={1.3}>
                  {hasActiveDraft ? 'Continue setup' : 'Get started'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
              </Pressable>

              {hasActiveDraft ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.textButton,
                    pressed ? styles.pressedSubtle : null,
                  ]}
                  onPress={handleStartOver}
                  testID="btn-welcome-start-over"
                  accessibilityRole="button"
                  accessibilityLabel="Start over onboarding from the beginning"
                >
                  <Text style={styles.startOverButtonText} maxFontSizeMultiplier={1.3}>
                    Start over
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => pushMode('signin')}
                style={({ pressed }) => [styles.textButton, pressed ? styles.pressedSubtle : null]}
                testID="btn-welcome-signin"
                accessibilityRole="button"
                accessibilityLabel="Sign in to existing account"
              >
                <Text style={styles.signInPromptText} maxFontSizeMultiplier={1.3}>
                  Have an account? <Text style={styles.signInLinkText}>Sign in</Text>
                </Text>
              </Pressable>
            </Reveal>
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
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 8,
    paddingBottom: 12,
  },
  topHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 44,
    paddingHorizontal: 20,
  },
  headerCloseBtn: {
    position: 'absolute',
    right: 20,
    top: 3,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    zIndex: 10,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoFlame: {
    width: 21,
    height: 29,
  },
  logoText: {
    fontFamily: Fonts.kurale,
    fontSize: 26,
    lineHeight: 34,
    color: Colors.textPrimary,
  },
  heroSection: {
    flex: 1,
    minHeight: 260,
    marginTop: 4,
  },
  heroFrame: {
    flex: 1,
  },
  tag: {
    position: 'absolute',
  },
  tagInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 30,
    paddingLeft: 9,
    paddingRight: 12,
    borderRadius: ControlRadii.pill,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.card,
    elevation: 0,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  tagLabel: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  tagKcal: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  contentSection: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 16,
  },
  mainHeading: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 32,
    lineHeight: 38,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.8,
  },
  mainHeadingAccent: {
    color: Colors.primaryDeep,
  },
  subHeading: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 340,
  },
  ctaSection: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.textPrimary,
    height: ControlHeights.button + 4,
    borderRadius: ControlRadii.button,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    elevation: 0,
    shadowOpacity: 0,
  },
  pressedButton: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.textInverse,
  },
  textButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInPromptText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  signInLinkText: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.textPrimary,
  },
  startOverButtonText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  pressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
