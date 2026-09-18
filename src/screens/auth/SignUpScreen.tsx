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
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

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
  };
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onBack,
  onSuccess,
  onSwitchToSignIn,
  initialData,
}) => {
  const { register } = useHealth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'password' | 'confirm' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

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
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.pressedBack]}
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="btn-signup-back"
          >
            <Ionicons name="arrow-back" size={20} color="#1C274C" />
          </Pressable>

          <View style={styles.logoBadgeContainer}>
            <View style={styles.logoDot} />
            <Text style={styles.logoBadgeText}>Calori</Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        {/* Keyboard Avoiding Container */}
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
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>FULL NAME</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'name' && styles.inputWrapperFocused,
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
                  returnKeyType="next"
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => emailRef.current?.focus()}
                  testID="input-signup-name"
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
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
                  returnKeyType="next"
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  testID="input-signup-email"
                />
                {email.length > 0 ? (
                  <Pressable
                    onPress={() => setEmail('')}
                    hitSlop={8}
                    style={({ pressed }) => [pressed && styles.pressedSubtle]}
                  >
                    <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                  </Pressable>
                ) : null}
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
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
                    Platform.OS === 'android' && !showPassword && styles.androidPasswordInput,
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
                  returnKeyType="next"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  testID="input-signup-password"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
                  style={({ pressed }) => [pressed && styles.pressedSubtle]}
                  testID="btn-signup-toggle-password"
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
                  <Text style={[styles.reqText, hasMinLength && styles.reqTextActive]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={hasNumber ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasNumber ? '#10B981' : '#94A3B8'}
                  />
                  <Text style={[styles.reqText, hasNumber && styles.reqTextActive]}>
                    Contains a number
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={hasUpper ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasUpper ? '#10B981' : '#94A3B8'}
                  />
                  <Text style={[styles.reqText, hasUpper && styles.reqTextActive]}>
                    Uppercase letter
                  </Text>
                </View>
                <View style={styles.reqRow}>
                  <Ionicons
                    name={hasSpecial ? 'checkmark-circle' : 'ellipse-outline'}
                    size={14}
                    color={hasSpecial ? '#10B981' : '#94A3B8'}
                  />
                  <Text style={[styles.reqText, hasSpecial && styles.reqTextActive]}>
                    Special character (!@#$)
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Confirm Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'confirm' && styles.inputWrapperFocused,
                  passwordsMatch && styles.inputWrapperSuccess,
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
                    Platform.OS === 'android' && !showConfirmPassword && styles.androidPasswordInput,
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
                  returnKeyType="done"
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={handleRegister}
                  testID="input-signup-confirm-password"
                />
                <Pressable
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  hitSlop={8}
                  style={({ pressed }) => [pressed && styles.pressedSubtle]}
                  testID="btn-signup-toggle-confirm-password"
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
                pressed && styles.pressedButton,
                loading && styles.disabledButton,
              ]}
              onPress={handleRegister}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Create Account"
              testID="btn-signup-submit"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Text style={styles.submitButtonText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={18} color="#0F172A" />
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
                  style={({ pressed }) => [pressed && styles.pressedSubtle]}
                  testID="btn-signup-switch-signin"
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
    paddingBottom: 20,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 12px 30px rgba(0, 0, 0, 0.08)',
        } as any)
      : {}),
  },
  flexOne: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedBack: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
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
  headerPlaceholder: {
    width: 36,
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
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 50,
  },
  inputWrapperFocused: {
    borderColor: '#0F172A',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 2px 8px rgba(15, 23, 42, 0.08)',
        } as any)
      : {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
          elevation: 2,
        }),
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
    height: '100%',
    paddingVertical: 0,
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
  requirementsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
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

  // Standardized 52px CTA Button (#CDE26D / #0F172A)
  submitButton: {
    backgroundColor: '#CDE26D',
    height: 52,
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
    marginTop: 8,
    marginBottom: 16,
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          boxShadow: '0px 6px 18px rgba(205, 226, 109, 0.45)',
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
    color: '#0F172A',
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
