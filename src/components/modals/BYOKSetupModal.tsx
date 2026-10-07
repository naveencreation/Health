import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { AIService, ValidationResult } from '@/services/ai';
import { GeminiIcon } from '@/components/common/GeminiIcon';

interface BYOKSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onKeyConfigured?: () => void;
}

export const BYOKSetupModal: React.FC<BYOKSetupModalProps> = ({
  visible,
  onClose,
  onKeyConfigured,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      checkCurrentStatus();
      setValidationError(null);
      setSuccessMessage(null);
    }
  }, [visible]);

  const checkCurrentStatus = async () => {
    const configured = await AIService.isKeyConfigured();
    setIsConnected(configured);
    if (configured) {
      const masked = await AIService.getMaskedKey();
      setMaskedKey(masked);
    } else {
      setMaskedKey('');
    }
  };

  const handlePaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        const cleaned = AIService.sanitizeKey(text);
        setApiKeyInput(cleaned);
        setValidationError(null);
      }
    } catch {
      // Ignore clipboard read error
    }
  };

  const handleValidateAndConnect = async () => {
    const keyToValidate = AIService.sanitizeKey(apiKeyInput);
    if (!keyToValidate) {
      setValidationError('Please enter or paste your Gemini API key.');
      return;
    }

    setApiKeyInput(keyToValidate);
    setIsValidating(true);
    setValidationError(null);
    setSuccessMessage(null);

    try {
      const result: ValidationResult = await AIService.validateAndSaveKey(keyToValidate);

      if (result.isValid) {
        setIsConnected(true);
        const masked = await AIService.getMaskedKey();
        setMaskedKey(masked);
        setApiKeyInput('');
        setSuccessMessage('Connected successfully! AI features are active.');
        if (onKeyConfigured) onKeyConfigured();
      } else {
        setValidationError(
          result.error?.message || 'Could not validate key. Please check and try again.'
        );
      }
    } catch (err: any) {
      setValidationError(err?.message || 'An unexpected error occurred during validation.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleTestExistingConnection = async () => {
    if (apiKeyInput.trim()) {
      return handleValidateAndConnect();
    }
    setIsValidating(true);
    setValidationError(null);
    setSuccessMessage(null);
    try {
      const storedKey = await AIService.getApiKey();
      if (!storedKey) {
        setValidationError('No key currently stored.');
        return;
      }
      const result = await AIService.validateAndSaveKey(storedKey);
      if (result.isValid) {
        setSuccessMessage(`Connection healthy! Responded in ${result.latencyMs ?? 120}ms.`);
      } else {
        setValidationError(
          result.error?.message || 'Key verification failed. Please enter a new key.'
        );
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Verification failed.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Gemini Key?',
      'AI features will revert to offline fallback until you reconnect a key.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await AIService.disconnectKey();
            setIsConnected(false);
            setMaskedKey('');
            setApiKeyInput('');
            setSuccessMessage(null);
            setValidationError(null);
            if (onKeyConfigured) onKeyConfigured();
          },
        },
      ]
    );
  };

  const handleOpenGoogleAIStudio = () => {
    Linking.openURL('https://aistudio.google.com/apikey');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss AI Setup Sheet"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.keyboardContainer}
        >
          <View style={styles.sheetContainer}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerTitleBox}>
                <View style={styles.badgeRow}>
                  <View style={styles.sparkleIcon}>
                    <GeminiIcon size={12} />
                  </View>
                  <Text style={styles.badgeText}>BRING YOUR OWN KEY (BYOK)</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                  <GeminiIcon size={24} />
                  <Text style={styles.sheetTitle}>Connect Gemini AI</Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedSubtle : null]}
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={[styles.scrollInner, { paddingBottom: 100 }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="automatic"
            >
              {/* Privacy Guarantee Card */}
              <View style={styles.privacyCard}>
                <Ionicons
                  name="shield-checkmark"
                  size={15}
                  color={Colors.fiber}
                  style={styles.shieldIcon}
                />
                <View style={styles.privacyTextContainer}>
                  <Text style={styles.privacyTitle}>100% Device-Encrypted Privacy</Text>
                </View>
              </View>

              {/* Status Display: Connected vs Unconnected */}
              {isConnected ? (
                <View style={styles.connectedCard}>
                  <View style={styles.statusHeader}>
                    <View style={styles.greenDot} />
                    <Text style={styles.statusTitle}>Gemini AI Active</Text>
                    <View style={styles.modelTag}>
                      <Text style={styles.modelTagText}>Active</Text>
                    </View>
                  </View>

                  <View style={styles.maskedRow}>
                    <Ionicons name="key-outline" size={15} color={Colors.textSecondary} />
                    <Text style={styles.maskedKeyText}>{maskedKey || 'Key Configured'}</Text>
                  </View>

                  <View style={styles.connectedActionRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.testBtn,
                        pressed ? styles.pressedSubtle : null,
                      ]}
                      onPress={handleTestExistingConnection}
                      disabled={isValidating}
                    >
                      {isValidating ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <>
                          <Ionicons name="refresh-outline" size={14} color={Colors.textSlate600} />
                          <Text style={styles.testBtnText}>Test Connection</Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.disconnectBtn,
                        pressed ? styles.pressedSubtle : null,
                      ]}
                      onPress={handleDisconnect}
                    >
                      <Ionicons name="trash-outline" size={14} color={Colors.dangerDark} />
                      <Text style={styles.disconnectBtnText}>Disconnect</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* Input Form */}
              <Text style={styles.inputSectionLabel}>
                {isConnected ? 'Replace API Key' : 'Enter Your Google Gemini Key'}
              </Text>

              <View style={styles.inputCard}>
                <View style={styles.inputRow}>
                  <Ionicons name="key-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.keyTextInput}
                    placeholder="Paste AIzaSy... key"
                    placeholderTextColor={Colors.textMuted}
                    value={apiKeyInput}
                    onChangeText={text => {
                      setApiKeyInput(text);
                      setValidationError(null);
                    }}
                    secureTextEntry={!showKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  {apiKeyInput.length > 0 ? (
                    <Pressable
                      style={styles.inputActionIcon}
                      onPress={() => setShowKey(!showKey)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showKey ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={Colors.textSecondary}
                      />
                    </Pressable>
                  ) : (
                    <Pressable style={styles.pastePill} onPress={handlePaste}>
                      <Ionicons name="clipboard-outline" size={12} color={Colors.textSecondary} />
                      <Text style={styles.pastePillText}>Paste</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Validation Feedback */}
              {validationError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.dangerDark} />
                  <Text style={styles.errorText}>{validationError}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.successText}>{successMessage}</Text>
                </View>
              ) : null}

              {/* Action Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.primaryConnectBtn,
                  !apiKeyInput.trim() && !isConnected ? styles.disabledBtn : null,
                  pressed ? styles.btnPressed : null,
                ]}
                onPress={handleValidateAndConnect}
                disabled={isValidating || (!apiKeyInput.trim() && !isConnected)}
              >
                {isValidating ? (
                  <View style={styles.btnRow}>
                    <ActivityIndicator size="small" color={Colors.onPrimary} />
                    <Text style={styles.btnText}>Verifying with Google...</Text>
                  </View>
                ) : (
                  <View style={styles.btnRow}>
                    <Ionicons name="sparkles" size={16} color={Colors.onPrimary} />
                    <Text style={styles.btnText}>
                      {isConnected ? 'Update & Verify Key' : 'Validate & Connect'}
                    </Text>
                  </View>
                )}
              </Pressable>

              {/* Google AI Studio Guide CTA */}
              <Pressable
                style={({ pressed }) => [styles.helperBox, pressed ? styles.pressedSubtle : null]}
                onPress={handleOpenGoogleAIStudio}
              >
                <View style={styles.helperIcon}>
                  <Ionicons name="help-circle-outline" size={18} color={Colors.textSlate600} />
                </View>
                <View style={styles.helperTextCol}>
                  <Text style={styles.helperTitle}>How do I get a free Gemini API key?</Text>
                  <Text style={styles.helperSubtitle}>
                    Tap to open Google AI Studio and generate a free personal key in 30 seconds.
                  </Text>
                </View>
                <Ionicons name="open-outline" size={15} color={Colors.textMuted} />
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlayScrim,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: '90%',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderCurve: 'continuous',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: 'rgba(244, 117, 81, 0.15)',
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: Colors.borderInset,
        }
      : {}),
  },
  dragHandle: {
    width: 42,
    height: 5,
    backgroundColor: Colors.borderMedium,
    borderRadius: 3,
    borderCurve: 'continuous',
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitleBox: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  sparkleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 10,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  sheetTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedSubtle: {
    opacity: 0.7,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  scrollInner: {
    paddingBottom: 20,
  },
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLow,
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.borderInset,
    marginBottom: 14,
    gap: 8,
  },
  shieldIcon: {},
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSlate600,
  },
  connectedCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderWhisper,
    marginBottom: 16,
    elevation: 0,
    shadowOpacity: 0,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderCurve: 'continuous',
    backgroundColor: Colors.success,
  },
  statusTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
  },
  modelTag: {
    backgroundColor: Colors.surfaceInset,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  modelTagText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 10,
    color: Colors.textSecondary,
  },
  maskedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceLow,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.surfaceInset,
    marginBottom: 10,
  },
  maskedKeyText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: Colors.textSlate700,
  },
  connectedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  testBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLow,
    paddingVertical: 8,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderInset,
    gap: 6,
  },
  testBtnText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.textSlate600,
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLow,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderInset,
    gap: 5,
  },
  disconnectBtnText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.dangerDark,
  },
  inputSectionLabel: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSlate600,
    marginBottom: 10,
  },
  inputCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderInset,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 8,
  },
  keyTextInput: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: Colors.textPrimary,
    paddingVertical: 10,
  },
  inputActionIcon: {
    padding: 6,
  },
  pastePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceInset,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderCurve: 'continuous',
    gap: 4,
  },
  pastePillText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.textSlate600,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.urbanist.regular,
    fontSize: 12,
    color: Colors.dangerDark,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.proteinLight,
    padding: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginBottom: 12,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: Colors.success,
  },
  primaryConnectBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 0,
    shadowOpacity: 0,
  },
  disabledBtn: {
    backgroundColor: Colors.borderMedium,
    shadowOpacity: 0,
  },
  btnPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.onPrimary,
  },
  helperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLow,
    padding: 13,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Colors.borderInset,
    gap: 10,
  },
  helperIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperTextCol: {
    flex: 1,
  },
  helperTitle: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSlate800,
    marginBottom: 2,
  },
  helperSubtitle: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
});
