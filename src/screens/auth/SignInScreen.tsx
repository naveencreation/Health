import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useAuth, useDailyLog } from '@/context/HealthContext';
import { ProfileButton, sheetStyles, sheetSurface } from '@/components/profile/ProfileUI';
import { MotionCurves, MotionDurations } from '@/theme/motion';
import { countGuestLoggedDays } from '@/utils/guestData';
import { BouncingDotsLoader, OnboardingHeader } from '@/components';

interface SignInScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

const SHEET_OFFSET = 420;

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onBack,
  onSuccess,
  onSwitchToRegister,
  onForgotPassword,
}) => {
  const { login, loginDemo, currentUser } = useAuth();
  const { dailyLogs } = useDailyLog();
  const guestDays = currentUser?.isGuest ? countGuestLoggedDays(dailyLogs) : 0;
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const progress = useSharedValue(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!sheetOpen) return;
    progress.set(
      reduceMotion
        ? 1
        : withTiming(1, { duration: MotionDurations.sheet, easing: MotionCurves.decelerate })
    );
  }, [sheetOpen, reduceMotion, progress]);

  const closeSheet = (after?: () => void) => {
    const finish = () => {
      setSheetOpen(false);
      after?.();
    };
    if (reduceMotion) {
      finish();
      return;
    }
    progress.set(
      withTiming(0, { duration: MotionDurations.emphasized, easing: MotionCurves.easeIn })
    );
    setTimeout(finish, MotionDurations.emphasized);
  };

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheetAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.get()) * SHEET_OFFSET }],
  }));

  const handleLogin = async (confirmedReplace = false) => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    if (guestDays > 0 && confirmedReplace !== true) {
      setSheetOpen(true);
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Login failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {/* Top Header Navigation */}
        <OnboardingHeader onBack={onBack} testID="btn-signin-back" />

        {/* Keyboard Avoiding Container */}
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.titleText}>Welcome Back</Text>
              <Text style={styles.subtitleText}>
                Pick up right where you left off with your daily nutrition.
              </Text>
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' ? styles.inputWrapperFocused : null,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={focusedField === 'email' ? Colors.primary : '#94A3B8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={text => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  keyboardType="email-address"
                  autoComplete={Platform.OS === 'android' ? 'off' : 'email'}
                  textContentType={Platform.OS === 'ios' ? 'emailAddress' : undefined}
                  returnKeyType="next"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  testID="input-signin-email"
                  accessibilityLabel="Email Address"
                />
                {email.length > 0 ? (
                  <Pressable
                    onPress={() => setEmail('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={({ pressed }) => [pressed ? styles.pressedSubtle : null]}
                    accessibilityRole="button"
                    accessibilityLabel="Clear email"
                  >
                    <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                {onForgotPassword ? (
                  <Pressable
                    onPress={onForgotPassword}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={({ pressed }) => [pressed ? styles.pressedSubtle : null]}
                    testID="btn-signin-forgot-password"
                    accessibilityRole="button"
                    accessibilityLabel="Forgot Password"
                  >
                    <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                  </Pressable>
                ) : null}
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' ? styles.inputWrapperFocused : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedField === 'password' ? Colors.primary : '#94A3B8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[
                    styles.textInput,
                    Platform.OS === 'android' && !showPassword ? styles.androidPasswordInput : null,
                  ]}
                  placeholder="Enter your password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoComplete={Platform.OS === 'android' ? 'off' : 'password'}
                  textContentType={Platform.OS === 'ios' ? 'password' : undefined}
                  returnKeyType="done"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => handleLogin()}
                  testID="input-signin-password"
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => [pressed ? styles.pressedSubtle : null]}
                  testID="btn-signin-toggle-password"
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={focusedField === 'password' ? Colors.primary : '#94A3B8'}
                  />
                </Pressable>
              </View>
            </View>

            {/* Sign In CTA Button */}
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed ? styles.pressedButton : null,
                loading ? styles.disabledButton : null,
              ]}
              onPress={() => handleLogin()}
              disabled={loading}
              testID="btn-signin-submit"
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              {loading ? (
                <BouncingDotsLoader color="#FFFFFF" size={6} gap={5} />
              ) : (
                <Text style={styles.submitButtonText}>Sign In</Text>
              )}
            </Pressable>

            {/* Switch to Register */}
            {onSwitchToRegister ? (
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>{"Don't have an account? "}</Text>
                <Pressable
                  onPress={onSwitchToRegister}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={({ pressed }) => [pressed ? styles.pressedSubtle : null]}
                  testID="btn-signin-switch-register"
                  accessibilityRole="button"
                  accessibilityLabel="Create Account"
                >
                  <Text style={styles.footerLinkText}>Create Account</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {sheetOpen ? (
        <Modal
          transparent
          visible
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => closeSheet()}
        >
          <View style={styles.sheetRoot}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]} />
            <Pressable
              style={sheetStyles.backdrop}
              onPress={() => closeSheet()}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            />
            <Animated.View
              style={[sheetSurface, styles.sheet, { paddingBottom: 24 + insets.bottom }, sheetAnim]}
              accessibilityViewIsModal
            >
              <View style={sheetStyles.handle} />
              <Text style={styles.sheetTitle} accessibilityRole="header">
                Replace this phone’s guest logs?
              </Text>
              <Text style={styles.sheetBody}>
                {`You have ${guestDays} ${guestDays === 1 ? 'day' : 'days'} logged as a guest. Signing in shows ${email.trim()}’s data instead, and the guest logs are removed from this phone.`}
              </Text>
              <ProfileButton
                label="Sign in anyway"
                variant="danger"
                testID="btn-guest-signin-anyway"
                onPress={() => closeSheet(() => handleLogin(true))}
                style={styles.sheetBtn}
              />
              {onSwitchToRegister ? (
                <ProfileButton
                  label="Create an account instead"
                  variant="secondary"
                  testID="btn-guest-create-instead"
                  onPress={() => closeSheet(onSwitchToRegister)}
                  style={styles.sheetBtnGap}
                />
              ) : null}
              <Pressable
                testID="btn-guest-signin-cancel"
                style={({ pressed }) => [styles.sheetCancel, pressed && styles.pressedSubtle]}
                onPress={() => closeSheet()}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  sheetRoot: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  scrim: { backgroundColor: Colors.overlayScrim },
  sheet: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },
  sheetTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.textPrimary,
    marginTop: 16,
  },
  sheetBody: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  sheetBtn: { marginTop: 16 },
  sheetBtnGap: { marginTop: 8 },
  sheetCancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetCancelText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  phoneFrame: {
    flex: 1,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 24,
  },
  flexOne: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingTop: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginTop: 8,
    marginBottom: 28,
  },
  titleText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 26,
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitleText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 10,
    marginBottom: 20,
  },
  errorAlertText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#B91C1C',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: '#334155',
    marginBottom: 6,
  },
  forgotPasswordText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLow,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderInset,
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.urbanist.regular,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: Platform.OS === 'android' ? 6 : 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
        } as any)
      : {}),
  },
  androidPasswordInput: {
    fontFamily: undefined,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
    marginTop: 8,
    marginBottom: 20,
  },
  pressedButton: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  disabledButton: {
    opacity: 0.65,
  },
  submitButtonText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  footerText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    color: '#64748B',
  },
  footerLinkText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  pressedSubtle: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
