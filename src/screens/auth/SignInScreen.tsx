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
import { BouncingDotsLoader } from '@/components';

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

          <View style={styles.headerCenterBrand}>
            <View style={styles.headerLogoBadge}>
              <Ionicons name="flame" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.headerBrandText}>Calori</Text>
          </View>

          {/* Symmetrical placeholder balancing the 44px back button */}
          <View style={styles.headerRightPlaceholder} />
        </View>

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
                  onChangeText={(text) => {
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
                <Text style={styles.inputLabel}>Password</Text>
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
                  autoComplete={Platform.OS === 'android' ? 'off' : 'password'}
                  textContentType={Platform.OS === 'ios' ? 'password' : undefined}
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
                <BouncingDotsLoader color="#FFFFFF" size={6} gap={5} />
              ) : (
                <Text style={styles.submitButtonText}>Sign In</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
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
  headerCenterBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBrandText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  headerRightPlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginTop: 8,
    marginBottom: 28,
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
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#334155',
    marginBottom: 6,
  },
  forgotPasswordText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
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
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.poppins.regular,
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
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
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
});
