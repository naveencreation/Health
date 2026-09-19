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
  StatusBar as RNStatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

interface SignInScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({
  onBack,
  onSuccess,
  onSwitchToRegister,
  onForgotPassword,
}) => {
  const { login, loginDemo } = useHealth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
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
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed ? styles.pressedBack : null]}
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="btn-signin-back"
          >
            <Ionicons name="arrow-back" size={22} color="#1C274C" />
          </Pressable>

          <View style={styles.logoBadgeContainer}>
            <View style={styles.logoDot} />
            <Text style={styles.logoBadgeText}>Calori</Text>
          </View>

          {/* Placeholder view to balance the header flex spacing */}
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
            {/* Title Section */}
            <View style={styles.titleSection}>
              <View style={styles.iconCircle}>
                <Ionicons name="flame" size={26} color={Colors.primary} />
              </View>
              <Text style={styles.titleText}>Welcome Back</Text>
              <Text style={styles.subtitleText}>
                Sign in to track your calories, habits, and daily health goals
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
                  color={focusedField === 'email' ? Colors.primary : '#94A3B8'}
                  style={styles.inputIcon}
                />
                <TextInput
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
                  testID="input-signin-email"
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
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                {onForgotPassword ? (
                  <Pressable
                    onPress={onForgotPassword}
                    hitSlop={8}
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
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  textContentType="none"
                  returnKeyType="done"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onSubmitEditing={handleLogin}
                  testID="input-signin-password"
                  accessibilityLabel="Password"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={8}
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
              onPress={handleLogin}
              disabled={loading}
              testID="btn-signin-submit"
              accessibilityRole="button"
              accessibilityLabel="Sign In"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Text style={styles.submitButtonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            {/* Switch to Register */}
            {onSwitchToRegister ? (
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Pressable
                  onPress={onSwitchToRegister}
                  hitSlop={8}
                  style={({ pressed }) => [pressed ? styles.pressedSubtle : null]}
                  testID="btn-signin-switch-register"
                  accessibilityRole="button"
                  accessibilityLabel="Create Account"
                >
                  <Text style={styles.footerLinkText}>Create Account</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Quick Guest Exploration */}
            <Pressable
              style={({ pressed }) => [styles.guestRow, pressed ? styles.pressedSubtle : null]}
              onPress={async () => {
                await loginDemo();
                if (onSuccess) onSuccess();
              }}
              testID="btn-signin-guest"
              accessibilityRole="button"
              accessibilityLabel="Explore as Guest"
            >
              <Ionicons name="flash-outline" size={14} color="#D97706" />
              <Text style={styles.guestRowText}>Quick Preview / Explore as Guest</Text>
            </Pressable>
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
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  phoneFrame: {
    flex: 1,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },
  flexOne: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pressedBack: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.96 }],
  },
  logoBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 6,
  },
  logoBadgeText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: Colors.primary,
  },
  headerPlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 28,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 26,
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitleText: {
    fontFamily: Fonts.poppins.regular,
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
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  errorAlertText: {
    fontFamily: Fonts.poppins.medium,
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
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.6,
  },
  forgotPasswordText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: Colors.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.poppins.regular,
    fontSize: 15,
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
  submitButton: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
    marginTop: 10,
    marginBottom: 20,
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
    fontFamily: Fonts.poppins.semiBold,
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
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
  },
  footerLinkText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
  pressedSubtle: {
    opacity: 0.7,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 6,
  },
  guestRowText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#D97706',
  },
});
