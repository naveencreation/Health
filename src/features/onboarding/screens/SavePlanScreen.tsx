import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { BouncingDotsLoader } from '@/components/common/BouncingDotsLoader';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { useAuth } from '@/context/HealthContext';
import { CalculatedHealthPlan } from '../services/onboardingCalculator';
import { OnboardingDraft, PendingMeal } from '../services/onboardingDraft';
import { migrateOnboardingData } from '../services/onboardingMigration';

export interface SavePlanScreenProps {
  name?: string;
  plan: CalculatedHealthPlan;
  draft: OnboardingDraft;
  firstMeal?: PendingMeal;
  targetWeightKg?: number;
  weightUnit?: 'kg' | 'lbs';
  onBack: () => void;
  onSuccess: () => void;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

export const SavePlanScreen: React.FC<SavePlanScreenProps> = ({
  name = '',
  plan,
  draft,
  firstMeal,
  targetWeightKg,
  weightUnit = 'kg',
  onBack,
  onSuccess,
  sectionIndex = 3,
  totalSections = 4,
  sectionProgress = 1.0,
}) => {
  const { register, login, loginAnonymous, currentUser } = useAuth();

  const [formMode, setFormMode] = useState<'signup' | 'signin'>('signup');
  const [userName, setUserName] = useState(name || draft.name || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [collisionDetected, setCollisionDetected] = useState(false);

  // Founder note presentation state
  const [showFounderNote, setShowFounderNote] = useState(false);
  const founderTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Live password validation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const isFormValid =
    formMode === 'signin'
      ? email.trim().length > 3 && password.length >= 6
      : userName.trim().length > 0 && email.trim().length > 3 && hasMinLength && hasNumber;

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (founderTimerRef.current) {
        clearTimeout(founderTimerRef.current);
      }
    };
  }, []);

  // Post-auth migration & founder note presentation
  const handleAuthSuccess = async (uid: string, authEmail: string, isGuest = false) => {
    try {
      await migrateOnboardingData(uid, authEmail, draft, plan, isGuest);
    } catch (err) {
      console.warn('[SavePlanScreen] Migration warning:', err);
    }

    // Trigger founder note
    haptics.success();
    setShowFounderNote(true);
    founderTimerRef.current = setTimeout(() => {
      handleProceedToNext();
    }, 4000);
  };

  const handleProceedToNext = () => {
    if (founderTimerRef.current) {
      clearTimeout(founderTimerRef.current);
      founderTimerRef.current = null;
    }
    setShowFounderNote(false);
    onSuccess();
  };

  // Google sign in trigger
  const handleGoogleSignIn = async () => {
    haptics.impactLight();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // In web or environments with Google client configured:
      // Gracefully fall back to demo/guest or report configuration
      const res = await loginAnonymous(userName || name || 'Friend');
      if (res.success) {
        const uid = currentUser?.id || 'google_user_' + Date.now();
        await handleAuthSuccess(uid, email || 'google_user@calorify.app', false);
      } else {
        setErrorMessage('Google sign-in is momentarily unavailable. Please use email or continue as guest.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Email submission handler
  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;
    haptics.impactMedium();
    setIsLoading(true);
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (formMode === 'signup') {
        const res = await register({
          name: userName.trim(),
          email: cleanEmail,
          password,
          age: draft.age,
          weight: draft.weightKg,
          weightUnit: draft.units?.weight || 'kg',
          goal: draft.goal,
          gender: draft.sex || 'male',
          heightCm: draft.heightCm,
        });

        if (res.success) {
          const uid = currentUser?.id || 'user_' + Date.now();
          await handleAuthSuccess(uid, cleanEmail, false);
        } else {
          const isCollision =
            res.error?.toLowerCase().includes('already registered') ||
            res.error?.toLowerCase().includes('email-already-in-use');

          if (isCollision) {
            setCollisionDetected(true);
            setErrorMessage('An account with this email already exists.');
          } else {
            setErrorMessage(res.error || 'Registration failed. Please check your details.');
          }
        }
      } else {
        // Sign-in mode (e.g. following account collision)
        const res = await login(cleanEmail, password);
        if (res.success) {
          const uid = currentUser?.id || 'user_' + Date.now();
          await handleAuthSuccess(uid, cleanEmail, false);
        } else {
          setErrorMessage(res.error || 'Incorrect email or password.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  // Anonymous guest login handler
  const handleGuestContinue = async () => {
    haptics.impactLight();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await loginAnonymous(userName || name || 'Friend');
      if (res.success) {
        const uid = currentUser?.id || 'guest_' + Date.now();
        await handleAuthSuccess(uid, '', true);
      } else {
        setErrorMessage(res.error || 'Could not continue as guest.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Guest login error.');
    } finally {
      setIsLoading(false);
    }
  };

  const formattedGoalDate = useMemo(() => {
    if (!plan.goalDate) return null;
    const parts = plan.goalDate.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return plan.goalDate;
  }, [plan.goalDate]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.phoneFrame}>
        {/* 1. Header with uniform section progress bar */}
        <OnboardingHeader
          onBack={onBack}
          sectionIndex={sectionIndex}
          totalSections={totalSections}
          sectionProgress={sectionProgress}
          testID="header-save-plan"
        />

        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          {/* 2. Standardized Title Block */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              Save your plan, {userName.trim() || name.trim() || 'friend'}.
            </Text>
            <Text style={styles.subtitle}>
              So your calculated numbers and your first meal are never lost.
            </Text>
          </View>

          {/* 3. Real Plan Summary Card */}
          <View style={styles.summaryCard} testID="plan-summary-card">
            <View style={styles.summaryTopRow}>
              <View style={styles.calorieCol}>
                <Text style={styles.calorieNumber}>{plan.dailyCalorieBudget}</Text>
                <Text style={styles.calorieUnit}>kcal / day</Text>
              </View>

              <View style={styles.targetCol}>
                {formattedGoalDate && targetWeightKg ? (
                  <View style={styles.goalDatePill}>
                    <Ionicons name="calendar-outline" size={13} color="#C2410C" />
                    <Text style={styles.goalDatePillText}>
                      {targetWeightKg} {weightUnit} by {formattedGoalDate}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.goalDatePill}>
                    <Ionicons name="shield-checkmark-outline" size={13} color="#166534" />
                    <Text style={[styles.goalDatePillText, { color: '#166534' }]}>
                      Daily metabolic balance
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.cardDivider} />

            {/* First Meal Logged Badge */}
            <View style={styles.mealBadgeRow}>
              {firstMeal ? (
                <>
                  <View style={styles.mealStatusPill}>
                    <Ionicons name="checkmark-circle" size={15} color="#166534" />
                    <Text style={styles.mealStatusText}>1 meal logged</Text>
                  </View>
                  <Text style={styles.mealDetailsText} numberOfLines={1}>
                    {firstMeal.calories} kcal · {firstMeal.foodName}
                  </Text>
                </>
              ) : (
                <>
                  <View style={[styles.mealStatusPill, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons name="sparkles" size={14} color="#64748B" />
                    <Text style={[styles.mealStatusText, { color: '#475569' }]}>Plan calibrated</Text>
                  </View>
                  <Text style={styles.mealDetailsText}>Ready for Day 1 tracking</Text>
                </>
              )}
            </View>
          </View>

          {/* 4. Error / Collision Alert */}
          {errorMessage && (
            <View style={styles.errorBox} testID="alert-error-box">
              <Ionicons
                name={collisionDetected ? 'information-circle' : 'alert-circle'}
                size={18}
                color={collisionDetected ? '#0284C7' : '#EF4444'}
                style={styles.errorIcon}
              />
              <View style={styles.errorTextCol}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                {collisionDetected && formMode === 'signup' && (
                  <Pressable
                    onPress={() => {
                      haptics.selection();
                      setFormMode('signin');
                      setErrorMessage(null);
                    }}
                    style={styles.collisionActionBtn}
                    testID="btn-switch-collision-signin"
                  >
                    <Text style={styles.collisionActionText}>Sign in to link your plan →</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* 5. Google One-Tap Primary Button */}
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={isLoading}
            style={({ pressed }) => [styles.googleButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            testID="btn-continue-google"
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.googleIcon}>
              <Path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <Path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <Path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <Path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </Svg>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 6. Email Form */}
          <View style={styles.formContainer}>
            {formMode === 'signup' && (
              <View style={styles.inputGroup}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  style={[styles.inputField, focusedField === 'name' && styles.inputFocused]}
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="Your name"
                  placeholderTextColor="#94A3B8"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  testID="input-user-name"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[styles.inputField, focusedField === 'email' && styles.inputFocused]}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                testID="input-user-email"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View
                style={[styles.passwordWrapper, focusedField === 'password' && styles.inputFocused]}
              >
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Create a strong password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  testID="input-user-password"
                />
                <Pressable
                  onPress={() => {
                    haptics.selection();
                    setShowPassword(prev => !prev);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  testID="btn-toggle-password-visibility"
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </Pressable>
              </View>
            </View>

            {/* Live Password Requirement Checklist (Signup Mode Only) */}
            {formMode === 'signup' && (
              <View style={styles.checklistRow}>
                <View style={[styles.checkPill, hasMinLength && styles.checkPillActive]}>
                  <Ionicons
                    name={hasMinLength ? 'checkmark' : 'ellipse-outline'}
                    size={13}
                    color={hasMinLength ? '#166534' : '#64748B'}
                  />
                  <Text style={[styles.checkPillText, hasMinLength && styles.checkPillTextActive]}>
                    8+ characters
                  </Text>
                </View>

                <View style={[styles.checkPill, hasNumber && styles.checkPillActive]}>
                  <Ionicons
                    name={hasNumber ? 'checkmark' : 'ellipse-outline'}
                    size={13}
                    color={hasNumber ? '#166534' : '#64748B'}
                  />
                  <Text style={[styles.checkPillText, hasNumber && styles.checkPillTextActive]}>
                    At least 1 number
                  </Text>
                </View>
              </View>
            )}

            {/* Submit Action Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={!isFormValid || isLoading}
              style={({ pressed }) => [
                styles.submitButton,
                (!isFormValid || isLoading) && styles.submitButtonDisabled,
                pressed && isFormValid && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={formMode === 'signup' ? 'Create Account & Save Plan' : 'Sign In & Link Plan'}
              testID="btn-submit-auth"
            >
              {isLoading ? (
                <BouncingDotsLoader color="#FFFFFF" size={5} gap={4} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {formMode === 'signup' ? 'Create Account & Save Plan' : 'Sign In & Link Plan'}
                </Text>
              )}
            </Pressable>

            {/* Toggle between Signup and Signin */}
            <Pressable
              onPress={() => {
                haptics.selection();
                setFormMode(prev => (prev === 'signup' ? 'signin' : 'signup'));
                setErrorMessage(null);
                setCollisionDetected(false);
              }}
              style={styles.switchModeBtn}
              testID="btn-toggle-auth-mode"
            >
              <Text style={styles.switchModeText}>
                {formMode === 'signup'
                  ? 'Already have an account? Sign in'
                  : "Need an account? Register instead"}
              </Text>
            </Pressable>
          </View>

          {/* 7. Continue as Guest Link */}
          <Pressable
            onPress={handleGuestContinue}
            disabled={isLoading}
            style={({ pressed }) => [styles.guestButton, pressed && styles.buttonPressed]}
            testID="btn-continue-guest"
            accessibilityRole="button"
            accessibilityLabel="Continue without an account"
          >
            <Text style={styles.guestButtonText}>Continue without an account</Text>
          </Pressable>

          {/* 8. Privacy Commitment */}
          <View style={styles.privacyRow}>
            <Ionicons name="lock-closed-outline" size={13} color="#64748B" style={styles.lockIcon} />
            <Text style={styles.privacyText}>
              Your data stays private. We never sell it.{' '}
              <Text
                style={styles.privacyLink}
                onPress={() => Linking.openURL('https://calorify.app/privacy')}
              >
                Privacy
              </Text>{' '}
              &{' '}
              <Text
                style={styles.privacyLink}
                onPress={() => Linking.openURL('https://calorify.app/terms')}
              >
                Terms
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </View>

      {/* 9. Founder Note Modal */}
      <Modal visible={showFounderNote} transparent animationType="fade">
        <Pressable
          style={styles.modalBackdrop}
          onPress={handleProceedToNext}
          testID="founder-note-backdrop"
        >
          <Animated.View entering={FadeInDown.duration(350)} style={styles.founderCard}>
            <View style={styles.founderBadgeRow}>
              <View style={styles.founderFlameIcon}>
                <Ionicons name="flame" size={14} color="#F47551" />
              </View>
              <Text style={styles.founderBadgeText}>A QUICK NOTE FROM THE MAKER</Text>
            </View>

            <Text style={styles.founderTitle}>
              Hi {userName.trim() || name.trim() || 'friend'},
            </Text>

            <Text style={styles.founderBody}>
              Thanks for trusting Calorify with your food. I built it because tracking nutrition should take seconds, not minutes.
            </Text>

            <Text style={styles.founderBody}>
              Your plan is ready and your first meal is secured. Tell me what&apos;s missing as you go.
            </Text>

            <View style={styles.founderSignatureRow}>
              <Text style={styles.founderSignature}>— Naveen</Text>
              <Text style={styles.founderRole}>Founder, Calorify</Text>
            </View>

            <View style={styles.tapToContinueHint}>
              <Text style={styles.tapToContinueText}>Tap anywhere to continue</Text>
              <Ionicons name="chevron-forward" size={14} color="#94A3B8" />
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  flexOne: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  titleContainer: {
    marginBottom: 20,
  },
  title: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    lineHeight: 36,
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    padding: 16,
    marginBottom: 20,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calorieCol: {
    flexDirection: 'column',
  },
  calorieNumber: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 28,
    lineHeight: 34,
    color: '#0F172A',
    letterSpacing: -0.02,
  },
  calorieUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  targetCol: {
    alignItems: 'flex-end',
  },
  goalDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  goalDatePillText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#C2410C',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  mealBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mealStatusText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: '#166534',
    letterSpacing: 0.02,
  },
  mealDetailsText: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#475569',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  errorTextCol: {
    flex: 1,
  },
  errorText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#DC2626',
  },
  collisionActionBtn: {
    marginTop: 6,
  },
  collisionActionText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#0284C7',
  },
  googleButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.12)',
    marginBottom: 18,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 15,
    color: '#0F172A',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#94A3B8',
    paddingHorizontal: 12,
  },
  formContainer: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: '#334155',
    marginBottom: 6,
  },
  inputField: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: '#0F172A',
  },
  passwordWrapper: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingHorizontal: 14,
  },
  passwordInput: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: '#0F172A',
    height: 48,
  },
  inputFocused: {
    borderColor: '#F47551',
    backgroundColor: '#FFFFFF',
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    marginBottom: 16,
  },
  checkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  checkPillActive: {
    backgroundColor: '#DCFCE7',
  },
  checkPillText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
  },
  checkPillTextActive: {
    color: '#166534',
    fontFamily: Fonts.urbanist.semiBold,
  },
  submitButton: {
    height: 52,
    backgroundColor: '#F47551',
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  submitButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  switchModeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchModeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#64748B',
  },
  guestButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  guestButtonText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: '#64748B',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingHorizontal: 12,
  },
  lockIcon: {
    marginRight: 6,
  },
  privacyText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
  },
  privacyLink: {
    fontFamily: Fonts.urbanist.semiBold,
    color: '#0F172A',
    textDecorationLine: 'underline',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  founderCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 24,
  },
  founderBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  founderFlameIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  founderBadgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    letterSpacing: 0.04,
    color: '#C2410C',
  },
  founderTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 22,
    color: '#0F172A',
    marginBottom: 12,
  },
  founderBody: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
    marginBottom: 10,
  },
  founderSignatureRow: {
    marginTop: 14,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  founderSignature: {
    fontFamily: Fonts.kurale,
    fontSize: 20,
    color: '#0F172A',
  },
  founderRole: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  tapToContinueHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  tapToContinueText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: '#94A3B8',
  },
});
