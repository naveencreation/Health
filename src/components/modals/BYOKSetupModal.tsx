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
        setValidationError(result.error?.message || 'Could not validate key. Please check and try again.');
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
        setValidationError(result.error?.message || 'Key verification failed. Please enter a new key.');
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.backdropPressable}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss AI Setup Sheet"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
                    <Ionicons name="sparkles" size={14} color="#F47551" />
                  </View>
                  <Text style={styles.badgeText}>BRING YOUR OWN KEY (BYOK)</Text>
                </View>
                <Text style={styles.sheetTitle}>Connect Gemini AI</Text>
              </View>

              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed ? styles.pressedSubtle : null]}
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollInner}
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="automatic"
            >
              {/* Privacy Guarantee Card */}
              <View style={styles.privacyCard}>
                <Ionicons name="shield-checkmark" size={22} color="#16A34A" style={styles.shieldIcon} />
                <View style={styles.privacyTextContainer}>
                  <Text style={styles.privacyTitle}>100% Device-Encrypted Privacy</Text>
                  <Text style={styles.privacyDesc}>
                    Your key is stored exclusively in your device's hardware KeyStore / Keychain. It is never sent to Calorify servers or shared with other users.
                  </Text>
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
                    <Ionicons name="key-outline" size={16} color="#475569" />
                    <Text style={styles.maskedKeyText}>{maskedKey || 'Key Configured'}</Text>
                  </View>

                  <View style={styles.connectedActionRow}>
                    <Pressable
                      style={({ pressed }) => [styles.testBtn, pressed ? styles.pressedSubtle : null]}
                      onPress={handleTestExistingConnection}
                      disabled={isValidating}
                    >
                      {isValidating ? (
                        <ActivityIndicator size="small" color="#F47551" />
                      ) : (
                        <>
                          <Ionicons name="refresh-outline" size={15} color="#F47551" />
                          <Text style={styles.testBtnText}>Test Connection</Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [styles.disconnectBtn, pressed ? styles.pressedSubtle : null]}
                      onPress={handleDisconnect}
                    >
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      <Text style={styles.disconnectBtnText}>Disconnect</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* Input Form */}
              <Text style={styles.inputSectionLabel}>
                {isConnected ? 'Replace API Key' : 'Enter Your Google Gemini Key'}
              </Text>
              <Text style={styles.inputHelperNote}>
                Personal Gemini keys start with "AIza...". Quotes and prefixes are cleaned automatically.
              </Text>

              <View style={styles.inputCard}>
                <View style={styles.inputRow}>
                  <Ionicons name="key-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.keyTextInput}
                    placeholder="Paste AIzaSy... key"
                    placeholderTextColor="#94A3B8"
                    value={apiKeyInput}
                    onChangeText={(text) => {
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
                        color="#64748B"
                      />
                    </Pressable>
                  ) : (
                    <Pressable style={styles.pastePill} onPress={handlePaste}>
                      <Ionicons name="clipboard-outline" size={12} color="#F47551" />
                      <Text style={styles.pastePillText}>Paste</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Validation Feedback */}
              {validationError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorText}>{validationError}</Text>
                </View>
              ) : null}

              {successMessage ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle" size={16} color="#16A34A" />
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
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.btnText}>Verifying with Google...</Text>
                  </View>
                ) : (
                  <View style={styles.btnRow}>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
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
                  <Ionicons name="help-circle-outline" size={20} color="#0284C7" />
                </View>
                <View style={styles.helperTextCol}>
                  <Text style={styles.helperTitle}>How do I get a free Gemini API key?</Text>
                  <Text style={styles.helperSubtitle}>
                    Tap to open Google AI Studio and generate a free personal key in 30 seconds.
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#0284C7" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
    backgroundColor: '#FAF9F6',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderCurve: 'continuous',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderWidth: 1,
    borderColor: 'rgba(244, 117, 81, 0.15)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: '#E2E8F0',
        }
      : {}),
  },
  dragHandle: {
    width: 42,
    height: 5,
    backgroundColor: '#CBD5E1',
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
    backgroundColor: 'rgba(244, 117, 81, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#F47551',
    letterSpacing: 0.5,
  },
  sheetTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderCurve: 'continuous',
    backgroundColor: '#F1F5F9',
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
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    marginBottom: 16,
    gap: 12,
  },
  shieldIcon: {
    marginTop: 2,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 2,
  },
  privacyDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#15803D',
    lineHeight: 16,
  },
  connectedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderCurve: 'continuous',
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
    marginBottom: 16,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderCurve: 'continuous',
    backgroundColor: '#16A34A',
  },
  statusTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  modelTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  modelTagText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#475569',
  },
  maskedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginBottom: 10,
  },
  maskedKeyText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: '#334155',
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
    backgroundColor: 'rgba(244, 117, 81, 0.1)',
    paddingVertical: 8,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 6,
  },
  testBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#F47551',
    fontWeight: '600',
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    gap: 6,
  },
  disconnectBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  inputSectionLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  inputHelperNote: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 16,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#0F172A',
    paddingVertical: 10,
  },
  inputActionIcon: {
    padding: 6,
  },
  pastePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 117, 81, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderCurve: 'continuous',
    gap: 4,
  },
  pastePillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#F47551',
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#DC2626',
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginBottom: 12,
    gap: 8,
  },
  successText: {
    flex: 1,
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#16A34A',
  },
  primaryConnectBtn: {
    backgroundColor: '#F47551',
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#F47551',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledBtn: {
    backgroundColor: '#CBD5E1',
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
    fontFamily: Fonts.poppins.bold,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  helperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 14,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    gap: 12,
  },
  helperIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderCurve: 'continuous',
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helperTextCol: {
    flex: 1,
  },
  helperTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 2,
  },
  helperSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#0284C7',
    lineHeight: 15,
  },
});
