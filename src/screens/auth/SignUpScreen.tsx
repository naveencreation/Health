import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { useAuth } from '@/context/HealthContext';
import { BouncingDotsLoader, OnboardingHeader } from '@/components';

interface SignUpScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
  onSwitchToSignIn?: () => void;
  initialData?: {
    age?: number;
    weight?: number;
    weightUnit?: 'kg' | 'lbs';
    goal?: string;
    gender?: string;
    height?: number;
    heightUnit?: 'cm' | 'ft';
  };
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onBack,
  onSuccess,
  onSwitchToSignIn,
  initialData,
}) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | 'confirm' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const fieldOffsets = useRef<{ [key: string]: number }>({});

  const scrollToField = (field: 'name' | 'email' | 'password' | 'confirm') => {
    setFocusedField(field);
    const targetY = fieldOffsets.current[field];
    if (typeof targetY === 'number') {
      const scrollY = Math.max(0, targetY - 24);
      scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
      // Android keyboard slide-in animation takes ~100-150ms to settle window layout
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
      }, 120);
    } else {
      const fallbackY = field === 'name' ? 0 : field === 'email' ? 80 : field === 'password' ? 160 : 360;
      scrollViewRef.current?.scrollTo({ y: fallbackY, animated: true });
    }
  };

  // Password requirements calculation
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleRegister = async () => {
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please create a password.');
      return;
    }
    if (!hasMinLength) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        age: initialData?.age,
        weight: initialData?.weight,
        weightUnit: initialData?.weightUnit,
        goal: initialData?.goal,
        gender: initialData?.gender,
        heightCm: initialData?.height,
      });

      if (res.success) {
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(res.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {/* Top Header Navigation */}
        <OnboardingHeader onBack={onBack} testID="btn-signup-back" />

        {/* Keyboard Avoiding Container */}
        <KeyboardAvoidingView
          style={styles.flexOne}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 280 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          >
            {/* Centered Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.titleText}>Create Account</Text>
              <Text style={styles.subtitleText}>
                Your personalized calorie & macro targets are ready to be linked to your profile
              </Text>

              {/* Endowed Progress Badge */}
              {initialData?.age ? (
                <View style={styles.biometricsPill}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                  <Text style={styles.biometricsPillText}>
                    Onboarding Complete • Targets Calibrated
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorAlert}>
                <Ionicons name="alert-circle" size={18} color="#DC2626" />
                <Text style={styles.errorAlertText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Full Name Field */}
            <View
              style={styles.inputGroup}
              onLayout={(e) => {
                fieldOffsets.current['name'] = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'name' ? styles.inputWrapperFocused : null,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={focusedField === 'name' ? '#0F172A' : '#94A3B8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder="John Doe"
                  placeholderTextColor="#94A3B8"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete={Platform.OS === 'android' ? 'off' : 'name'}
                  importantForAutofill="no"
                  underlineColorAndroid="transparent"
                  returnKeyType="next"
                  onFocus={() => scrollToField('name')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  testID="input-signup-name"
                  accessibilityLabel="Full Name"
                />
              </View>
            </View>

            {/* Email Field */}
            <View
              style={styles.inputGroup}
              onLayout={(e) => {
                fieldOffsets.current['email'] = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' ? styles.inputWrapperFocused : null,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={focusedField === 'email' ? '#0F172A' : '#94A3B8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={emailRef}
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  keyboardType="email-address"
                  autoComplete={Platform.OS === 'android' ? 'off' : 'email'}
                  importantForAutofill="no"
                  underlineColorAndroid="transparent"
                  returnKeyType="next"
                  onFocus={() => scrollToField('email')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  testID="input-signup-email"
                  accessibilityLabel="Email Address"
                />
                {email.length > 0 ? (
                  <Pressable
                    onPress={() => setEmail('')}
                    hitSlop={8}
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
            <View
              style={styles.inputGroup}
              onLayout={(e) => {
                fieldOffsets.current['password'] = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' ? styles.inputWrapperFocused : null,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={focusedField === 'password' ? '#0F172A' : '#94A3B8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={passwordRef}
                  style={[
                    styles.textInput,
                    Platform.OS === 'android' && !showPassword ? styles.androidPasswordInput : null,
                  ]}
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoComplete="off"
                  importantForAutofill="no"
                  underlineColorAndroid="transparent"
                  returnKeyType="next"
                  onFocus={() => scrollToField('password')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  testID="input-signup-password"
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                  style={({ pressed }) => [pressed ? styles.pressedSubtle : null]}
                  testID="btn-signup-toggle-password"
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={focusedField === 'password' ? '#0F172A' : '#94A3B8'}
                  />
                </Pressable>
              </View>
            </View>

            {/* Password Strength Checklist */}
            {password.length > 0 ? (
              <View style={styles.requirementsBox}>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={hasMinLength ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasMinLength ? '#10B981' : '#94A3B8'}
                  />
                  <Text style={[styles.reqText, hasMinLength ? styles.reqTextActive : null]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasNumber ? '#10B981' : '#94A3B8'}
                  />
                  <Text style={[styles.reqText, hasNumber ? styles.reqTextActive : null]}>
                    Contains a number
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={hasUpper ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasUpper ? '#10B981' : '#94A3B8'}
                  />
                  <Text style={[styles.reqText, hasUpper ? styles.reqTextActive : null]}>
                    Uppercase letter
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={hasSpecial ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasSpecial ? '#10B981' : '#94A3B8'}
                  />
                  <Text style={[styles.reqText, hasSpecial ? styles.reqTextActive : null]}>
                    Special character (!@#$)
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Confirm Password Field */}
            <View
              style={styles.inputGroup}
              onLayout={(e) => {
                fieldOffsets.current['confirm'] = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'confirm' ? styles.inputWrapperFocused : null,
                  passwordsMatch ? styles.inputWrapperSuccess : null,
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={passwordsMatch ? '#10B981' : focusedField === 'confirm' ? '#0F172A' : '#94A3B8'}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={confirmRef}
                  style={[
                    styles.textInput,
                    Platform.OS === 'android' && !showConfirmPassword ? styles.androidPasswordInput : null,
                  ]}
                  placeholder="Repeat password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  autoComplete="off"
                  importantForAutofill="no"
                  underlineColorAndroid="transparent"
                  returnKeyType="done"
                  onFocus={() => scrollToField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={handleRegister}
                  testID="input-signup-confirm-password"
                  accessibilityLabel="Confirm Password"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={8}
                  style={({ pressed }) => [pressed ? styles.pressedSubtle : null]}
                  testID="btn-signup-toggle-confirm-password"
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={focusedField === 'confirm' ? '#0F172A' : '#94A3B8'}
                  />
                </Pressable>
              </View>
            </View>

            {/* Standardized 52px High-Contrast CTA Button (Lime #CDE26D / Slate #0F172A) */}
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                pressed ? styles.pressedButton : null,
                loading ? styles.disabledButton : null,
              ]}
              onPress={handleRegister}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Create Account"
              testID="btn-signup-submit"
            >
              {loading ? (
                <BouncingDotsLoader color="#FFFFFF" size={6} gap={5} />
              ) : (
                <View style={styles.btnContentRow}>
                  <Text style={styles.submitButtonText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            {/* Switch to Sign In */}
            {onSwitchToSignIn ? (
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already have an account? </Text>
                <Pressable
                  onPress={onSwitchToSignIn}
                  hitSlop={8}
                  style={({ pressed }) => [pressed ? styles.pressedSubtle : null]}
                  testID="btn-signup-switch-signin"
                  accessibilityRole="button"
                  accessibilityLabel="Sign In"
                >
                  <Text style={styles.footerLinkText}>Sign In</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 24,
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 12px 30px rgba(0, 0, 0, 0.08)',
        } as any)
      : {}),
  },
  flexOne: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 24,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  titleText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 36,
    color: '#0F172A',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitleText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 290,
  },
  biometricsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderCurve: 'continuous',
    marginTop: 10,
  },
  biometricsPillText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 11,
    color: '#166534',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderCurve: 'continuous',
    gap: 10,
    marginBottom: 16,
  },
  errorAlertText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 13,
    color: '#B91C1C',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  inputWrapperSuccess: {
    borderColor: '#10B981',
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: 'transparent',
    height: '100%',
    paddingVertical: 0,
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          boxShadow: '0 0 0 1000px transparent inset',
        } as any)
      : {}),
  },
  androidPasswordInput: {
    fontFamily: undefined,
  },
  requirementsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 10,
    marginBottom: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  reqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reqText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: '#94A3B8',
  },
  reqTextActive: {
    color: '#10B981',
    fontFamily: 'Poppins_500Medium',
  },

  // Standardized 52px CTA Button (Colors.primary / #FFFFFF)
  submitButton: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 8,
    marginBottom: 16,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          boxShadow: '0px 6px 18px rgba(244, 117, 81, 0.4)',
        } as any)
      : {}),
  },
  pressedButton: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  disabledButton: {
    opacity: 0.65,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    paddingBottom: 8,
  },
  footerText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#64748B',
  },
  footerLinkText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#F47551',
  },
  pressedSubtle: {
    opacity: 0.7,
  },
});
