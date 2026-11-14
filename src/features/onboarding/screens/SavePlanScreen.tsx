import React, { useState, useEffect, useRef } from 'react';
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
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ControlHeights, ControlRadii } from '@/theme/controls';
import { MotionDurations } from '@/theme/motion';
import { haptics } from '@/utils/haptics';
import { BouncingDotsLoader } from '@/components/common/BouncingDotsLoader';
import { OnboardingHeader } from '../components/OnboardingHeader';
import { useAuth } from '@/context/HealthContext';
import { CalculatedHealthPlan } from '../services/onboardingCalculator';
import { OnboardingDraft } from '../services/onboardingDraft';
import { migrateOnboardingData } from '../services/onboardingMigration';
import { planGoalLine } from './PlanRevealScreen';
import { auth } from '@/services/firebase';

export interface SavePlanScreenProps {
  name?: string;
  plan: CalculatedHealthPlan;
  draft: OnboardingDraft;
  targetWeightKg?: number;
  weightUnit?: 'kg' | 'lbs';
  onBack: () => void;
  onSuccess: () => void;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

const isCollisionError = (err?: string) => {
  const e = err?.toLowerCase() || '';
  return (
    e.includes('already registered') ||
    e.includes('email-already-in-use') ||
    e.includes('already in use') ||
    e.includes('already exists')
  );
};

// A context id that is a local placeholder is not proof of a signed-in account.
const isRealId = (id?: string) => !!id && !id.startsWith('guest_') && !id.startsWith('demo_');

export const SavePlanScreen: React.FC<SavePlanScreenProps> = ({
  name = '',
  plan,
  draft,
  targetWeightKg,
  weightUnit = 'kg',
  onBack,
  onSuccess,
  sectionIndex = 3,
  totalSections = 4,
  sectionProgress = 1.0,
}) => {
  const { register, login, loginAnonymous, currentUser } = useAuth();
  const reduceMotion = useReducedMotion();

  const wizardName = (name || draft.name || '').trim();
  const needsNameField = wizardName.length === 0;

  const [formMode, setFormMode] = useState<'signup' | 'signin'>('signup');
  const [typedName, setTypedName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showFounderNote, setShowFounderNote] = useState(false);
  const founderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayName = wizardName || typedName.trim();
  const isSignup = formMode === 'signup';

  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const isFormValid = isSignup
    ? displayName.length > 0 && email.trim().length > 3 && hasMinLength && hasNumber
    : email.trim().length > 3 && password.length >= 6;

  const goalLine = planGoalLine(plan, {
    weightUnit,
    targetWeightKg,
    weightKg: draft.weightKg,
  });
  const kcal = plan.dailyCalorieBudget.toLocaleString('en-US');

  useEffect(() => {
    return () => {
      if (founderTimerRef.current) clearTimeout(founderTimerRef.current);
    };
  }, []);

  const handleProceedToNext = () => {
    if (founderTimerRef.current) {
      clearTimeout(founderTimerRef.current);
      founderTimerRef.current = null;
    }
    setShowFounderNote(false);
    onSuccess();
  };

  const handleAuthSuccess = async (uid: string, authEmail: string, isGuest = false) => {
    try {
      await migrateOnboardingData(uid, authEmail, draft, plan, isGuest);
    } catch (err) {
      console.warn('[SavePlanScreen] Migration warning:', err);
    }
    haptics.success();
    setShowFounderNote(true);
    founderTimerRef.current = setTimeout(handleProceedToNext, 4000);
  };

  const switchMode = (mode: 'signup' | 'signin') => {
    haptics.selection();
    setFormMode(mode);
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    if (!isFormValid || isLoading) return;
    haptics.impactMedium();
    setIsLoading(true);
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = isSignup
        ? await register({
            name: displayName,
            email: cleanEmail,
            password,
            age: draft.age,
            weight: draft.weightKg,
            weightUnit: draft.units?.weight || 'kg',
            goal: draft.goal,
            gender: draft.sex || 'male',
            heightCm: draft.heightCm,
          })
        : await login(cleanEmail, password);

      if (res.success) {
        const uid = auth.currentUser?.uid || (isRealId(currentUser?.id) ? currentUser?.id : '');
        if (!uid) {
          setErrorMessage('Couldn’t finish signing in. Please try again.');
        } else {
          await handleAuthSuccess(uid, cleanEmail, false);
        }
      } else if (isSignup && isCollisionError(res.error)) {
        setFormMode('signin');
        setErrorMessage(
          'There’s already an account with this email. Enter its password to sign in.'
        );
      } else {
        setErrorMessage(
          res.error ||
            (isSignup
              ? 'Registration failed. Please check your details.'
              : 'Incorrect email or password.')
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    haptics.impactLight();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await loginAnonymous(displayName || 'Friend');
      if (res.success) {
        // Anonymous auth may be off; then the context holds a local guest_<ts> id.
        const uid = auth.currentUser?.uid || currentUser?.id;
        if (!uid) {
          setErrorMessage('Couldn’t finish signing in. Please try again.');
        } else {
          await handleAuthSuccess(uid, '', true);
        }
      } else {
        setErrorMessage(res.error || 'Could not continue as guest.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Guest login error.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitDisabled = !isFormValid || isLoading;
  const submitLabel = isSignup ? 'Create account' : 'Sign in';

  const reqChip = (met: boolean, label: string, testID: string) => (
    <View style={[styles.reqChip, met && styles.reqChipMet]} testID={testID}>
      <Ionicons
        name={met ? 'checkmark' : 'ellipse-outline'}
        size={12}
        color={met ? Colors.successDark : Colors.textMuted}
      />
      <Text
        style={[styles.reqText, met && styles.reqTextMet]}
        maxFontSizeMultiplier={1.3}
        accessibilityLabel={`${label}, ${met ? 'met' : 'not met'}`}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.phoneFrame}>
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
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
              {(isSignup ? 'Save your plan' : 'Welcome back') +
                (displayName ? `, ${displayName}` : '')}
            </Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={1.3}>
              {isSignup
                ? 'An account backs up your plan and logs, and brings them to a new phone.'
                : 'Sign in and we’ll save this plan to your account.'}
            </Text>

            <View
              style={styles.summaryCard}
              accessible
              accessibilityLabel={`${kcal} calories a day${goalLine ? `. ${goalLine}` : ''}`}
              testID="plan-summary-card"
            >
              <Text style={styles.summaryKcal} maxFontSizeMultiplier={1.2}>
                {kcal} <Text style={styles.summaryUnit}>kcal a day</Text>
              </Text>
              {goalLine ? (
                <View style={styles.goalPill} testID="plan-goal-pill">
                  <Ionicons name="flag-outline" size={14} color={Colors.primaryDeep} />
                  <Text style={styles.goalPillText} maxFontSizeMultiplier={1.3}>
                    {goalLine}
                  </Text>
                </View>
              ) : null}
            </View>

            {errorMessage ? (
              <View style={styles.errorBox} accessibilityRole="alert" testID="alert-error-box">
                <Text style={styles.errorText} maxFontSizeMultiplier={1.3}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {isSignup && needsNameField ? (
              <>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  style={[styles.input, focusedField === 'name' && styles.inputFocused]}
                  value={typedName}
                  onChangeText={setTypedName}
                  placeholder="Your name"
                  placeholderTextColor={Colors.textMuted}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                  accessibilityLabel="Name"
                  testID="input-user-name"
                />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.input, focusedField === 'email' && styles.inputFocused]}
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              accessibilityLabel="Email"
              testID="input-user-email"
            />

            <Text style={styles.fieldLabel}>Password</Text>
            <View
              style={[
                styles.input,
                styles.passwordRow,
                focusedField === 'password' && styles.inputFocused,
              ]}
            >
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder={isSignup ? 'Create a password' : 'Your password'}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                accessibilityLabel="Password"
                testID="input-user-password"
              />
              <Pressable
                onPress={() => {
                  haptics.selection();
                  setShowPassword(prev => !prev);
                }}
                style={styles.eyeButton}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                testID="btn-toggle-password-visibility"
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </Pressable>
            </View>

            {isSignup ? (
              <View style={styles.reqRow}>
                {reqChip(hasMinLength, '8+ characters', 'req-length')}
                {reqChip(hasNumber, '1 number', 'req-number')}
              </View>
            ) : null}

            <View style={styles.privacyRow}>
              <Ionicons name="lock-closed-outline" size={13} color={Colors.textSecondary} />
              <Text style={styles.privacyText} maxFontSizeMultiplier={1.3}>
                Your data stays private. We never sell it.{' '}
                <Text
                  style={styles.privacyLink}
                  accessibilityRole="link"
                  onPress={() => Linking.openURL('https://calorify.app/privacy')}
                >
                  Privacy
                </Text>{' '}
                &{' '}
                <Text
                  style={styles.privacyLink}
                  accessibilityRole="link"
                  onPress={() => Linking.openURL('https://calorify.app/terms')}
                >
                  Terms
                </Text>
                .
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={handleSubmit}
              disabled={submitDisabled}
              style={({ pressed }) => [
                styles.submitButton,
                submitDisabled && styles.submitButtonDisabled,
                pressed && !submitDisabled && styles.submitButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={submitLabel}
              accessibilityState={{ disabled: submitDisabled, busy: isLoading }}
              testID="btn-submit-auth"
            >
              {isLoading ? (
                <BouncingDotsLoader color={Colors.textInverse} size={5} gap={4} />
              ) : (
                <Text style={styles.submitText}>{submitLabel}</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => switchMode(isSignup ? 'signin' : 'signup')}
              style={styles.linkButton}
              accessibilityRole="button"
              testID="btn-toggle-auth-mode"
            >
              <Text style={styles.linkText} maxFontSizeMultiplier={1.3}>
                {isSignup ? 'Already have an account? ' : 'New here? '}
                <Text style={styles.linkStrong}>{isSignup ? 'Sign in' : 'Create an account'}</Text>
              </Text>
            </Pressable>

            {isSignup ? (
              <Pressable
                onPress={handleGuestContinue}
                disabled={isLoading}
                style={styles.guestButton}
                accessibilityRole="button"
                accessibilityLabel="Continue without an account. Your plan stays on this phone and isn’t backed up."
                testID="btn-continue-guest"
              >
                <Text style={styles.guestTitle} maxFontSizeMultiplier={1.3}>
                  Continue without an account
                </Text>
                <Text style={styles.guestSub} maxFontSizeMultiplier={1.3}>
                  Your plan stays on this phone and isn’t backed up.
                </Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal visible={showFounderNote} transparent animationType="fade">
        <Pressable
          style={styles.scrim}
          onPress={handleProceedToNext}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          testID="founder-note-backdrop"
        >
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.duration(MotionDurations.sheet)}
            style={styles.note}
          >
            <Text style={styles.noteBadge}>A QUICK NOTE FROM THE MAKER</Text>
            <Text style={styles.noteTitle}>{displayName ? `Hi ${displayName},` : 'Hi,'}</Text>
            <Text style={styles.noteBody}>
              Thanks for trusting Calorify with your food. I built it because tracking nutrition
              should take seconds, not minutes.
            </Text>
            <Text style={styles.noteBody}>
              Your plan is saved. Tell me what’s missing as you go.
            </Text>
            <Text style={styles.noteSig}>
              — Naveen <Text style={styles.noteRole}>· Founder, Calorify</Text>
            </Text>
            <Text style={styles.noteTap}>Tap anywhere to continue</Text>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const cardBase = {
  backgroundColor: Colors.card,
  borderWidth: 1,
  borderColor: Colors.borderSubtle,
  borderRadius: 10,
  borderCurve: 'continuous',
  elevation: 0,
} as const;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  flexOne: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 22, paddingBottom: 20 },
  question: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  summaryCard: {
    ...cardBase,
    marginTop: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryKcal: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: Colors.textPrimary,
  },
  summaryUnit: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13.5,
    letterSpacing: 0,
    color: Colors.textSecondary,
  },
  goalPill: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: Colors.primaryLight,
  },
  goalPillText: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: Colors.primaryDeep,
  },
  errorBox: {
    ...cardBase,
    marginTop: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: Colors.primaryLight,
  },
  errorText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.primaryDeep,
  },
  fieldLabel: {
    marginTop: 14,
    marginBottom: 6,
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13.5,
    color: Colors.textPrimary,
  },
  input: {
    ...cardBase,
    height: 48,
    paddingHorizontal: 14,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  inputFocused: { borderColor: Colors.primary },
  passwordRow: { flexDirection: 'row', alignItems: 'center', paddingRight: 2 },
  passwordInput: {
    flex: 1,
    height: 48,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  eyeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reqChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: Colors.surfaceInset,
  },
  reqChipMet: { backgroundColor: Colors.successLight },
  reqText: { fontFamily: Fonts.urbanist.bold, fontSize: 12.5, color: Colors.textSecondary },
  reqTextMet: { color: Colors.successDark },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 12,
  },
  privacyText: {
    flexShrink: 1,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  privacyLink: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.textPrimary,
    textDecorationLine: 'underline',
  },
  footer: { paddingTop: 12, paddingBottom: 12 },
  submitButton: {
    height: ControlHeights.button + 4,
    borderRadius: ControlRadii.button,
    borderCurve: 'continuous',
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
  },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  submitText: { fontFamily: Fonts.urbanist.bold, fontSize: 17, color: Colors.textInverse },
  linkButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  linkText: { fontFamily: Fonts.urbanist.bold, fontSize: 14.5, color: Colors.textSecondary },
  linkStrong: { color: Colors.primaryDeep },
  guestButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  guestTitle: { fontFamily: Fonts.urbanist.bold, fontSize: 14.5, color: Colors.textPrimary },
  guestSub: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12.5,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  scrim: {
    flex: 1,
    backgroundColor: Colors.overlayScrim,
    justifyContent: 'flex-end',
    padding: 16,
  },
  note: { ...cardBase, width: '100%', maxWidth: 448, alignSelf: 'center', padding: 18 },
  noteBadge: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 11.5,
    letterSpacing: 0.6,
    color: Colors.primaryDeep,
  },
  noteTitle: {
    marginTop: 10,
    marginBottom: 6,
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  noteBody: {
    marginBottom: 8,
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14.5,
    lineHeight: 21,
    color: Colors.textSecondary,
  },
  noteSig: {
    marginTop: 6,
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  noteRole: { fontFamily: Fonts.urbanist.semiBold, fontSize: 13, color: Colors.textSecondary },
  noteTap: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12.5,
    color: Colors.textMuted,
  },
});
