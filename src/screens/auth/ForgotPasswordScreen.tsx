import React, { useState } from 'react';
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
import { auth } from '@/services/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onBack,
  onSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const handleSendResetEmail = async (isResend = false) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (isResend) {
      setResending(true);
    } else {
      setLoading(true);
    }
    setErrorMessage(null);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setIsSent(true);
    } catch (err: any) {
      console.log('Firebase password reset error:', err.code, err.message);
      if (err.code === 'auth/user-not-found') {
        setErrorMessage('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setErrorMessage('Please enter a valid email address.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMessage('Too many reset attempts. Please wait a few minutes and try again.');
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage('Network error. Please check your internet connection and try again.');
      } else {
        setErrorMessage(err.message || 'Failed to send password reset email. Please try again.');
      }
    } finally {
      setLoading(false);
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed ? styles.pressedBack : null]}
            onPress={isSent ? () => setIsSent(false) : onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="btn-forgot-back"
          >
            <Ionicons name="arrow-back" size={22} color="#1C274C" />
          </Pressable>

          <View style={styles.logoBadgeContainer}>
            <View style={styles.logoDot} />
            <Text style={styles.logoBadgeText}>Calori</Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

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
            {!isSent ? (
              /* Request Reset Link State */
              <View>
                {/* Title Section */}
                <View style={styles.titleSection}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="key-outline" size={26} color={Colors.primary} />
                  </View>
                  <Text style={styles.titleText}>Forgot Password</Text>
                  <Text style={styles.subtitleText}>
                    Enter your registered email address and we'll send you a secure link to reset your password.
                  </Text>
                </View>

                {/* Error Alert */}
                {errorMessage ? (
                  <View style={styles.errorAlert}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <Text style={styles.errorAlertText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="name@example.com"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      returnKeyType="done"
                      onSubmitEditing={() => handleSendResetEmail(false)}
                      testID="input-forgot-email"
                      accessibilityLabel="Email Address"
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed ? styles.pressedButton : null,
                    loading ? styles.disabledButton : null,
                  ]}
                  onPress={() => handleSendResetEmail(false)}
                  disabled={loading}
                  testID="btn-forgot-send-link"
                  accessibilityRole="button"
                  accessibilityLabel="Send Password Reset Link"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <View style={styles.btnContentRow}>
                      <Text style={styles.submitButtonText}>Send Reset Link</Text>
                      <Ionicons name="paper-plane-outline" size={18} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>

                {/* Back to sign in link */}
                <Pressable
                  style={styles.textLinkButton}
                  onPress={onBack}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Remember your password? Sign in"
                >
                  <Text style={styles.textLinkMuted}>Remember your password? </Text>
                  <Text style={styles.textLinkPrimary}>Sign In</Text>
                </Pressable>
              </View>
            ) : (
              /* Confirmation Link Sent State */
              <View style={styles.confirmationContainer}>
                <View style={[styles.iconCircle, styles.successCircle]}>
                  <Ionicons name="mail-unread-outline" size={32} color="#059669" />
                </View>

                <Text style={styles.titleText}>Check Your Email</Text>
                <Text style={styles.confirmationDescription}>
                  We've sent a password reset link to:
                </Text>
                <View style={styles.emailHighlightBox}>
                  <Text style={styles.emailHighlightText}>{email.trim().toLowerCase()}</Text>
                </View>
                <Text style={styles.subtitleTextCenter}>
                  Click the link inside the email to securely choose a new password, then return here to log in.
                </Text>

                {/* Error Alert on Resend */}
                {errorMessage ? (
                  <View style={styles.errorAlert}>
                    <Ionicons name="alert-circle" size={18} color="#DC2626" />
                    <Text style={styles.errorAlertText}>{errorMessage}</Text>
                  </View>
                ) : null}

                {/* Primary Action: Return to Sign In */}
                <Pressable
                  style={({ pressed }) => [
                    styles.submitButton,
                    pressed ? styles.pressedButton : null,
                  ]}
                  onPress={onSuccess}
                  testID="btn-forgot-back-to-signin"
                  accessibilityRole="button"
                  accessibilityLabel="Back to Sign In"
                >
                  <View style={styles.btnContentRow}>
                    <Text style={styles.submitButtonText}>Back to Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </View>
                </Pressable>

                {/* Secondary Action: Resend Link */}
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed ? styles.pressedSecondary : null,
                    resending ? styles.disabledButton : null,
                  ]}
                  onPress={() => handleSendResetEmail(true)}
                  disabled={resending}
                  accessibilityRole="button"
                  accessibilityLabel="Resend Email Link"
                >
                  {resending ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <View style={styles.btnContentRow}>
                      <Ionicons name="refresh-outline" size={18} color={Colors.primary} />
                      <Text style={styles.secondaryButtonText}>Resend Email Link</Text>
                    </View>
                  )}
                </Pressable>

                {/* Change Email Action */}
                <Pressable
                  style={styles.textLinkButton}
                  onPress={() => setIsSent(false)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Use a different email address"
                >
                  <Text style={styles.textLinkMuted}>Wrong email address? </Text>
                  <Text style={styles.textLinkPrimary}>Change Email</Text>
                </Pressable>
              </View>
            )}
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successCircle: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    alignSelf: 'center',
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
  subtitleTextCenter: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmationContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  confirmationDescription: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 8,
  },
  emailHighlightBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 14,
  },
  emailHighlightText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#0F172A',
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
    marginBottom: 18,
    width: '100%',
  },
  errorAlertText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#B91C1C',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 8,
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
    marginBottom: 16,
    width: '100%',
  },
  secondaryButton: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FFEDD5',
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  pressedButton: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  pressedSecondary: {
    backgroundColor: '#FFEDD5',
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
  secondaryButtonText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: Colors.primary,
  },
  textLinkButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  textLinkMuted: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 14,
    color: '#64748B',
  },
  textLinkPrimary: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: Colors.primary,
  },
});
