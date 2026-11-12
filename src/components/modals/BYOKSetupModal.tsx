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
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { AIService, ValidationResult } from '@/services/ai';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';
import {
  ProfileButton,
  SettingsRow,
  SettingsSection,
  SheetHeader,
  SheetNotice,
  profileCard,
  sheetStyles,
  sheetSurface,
} from '@/components/profile/ProfileUI';

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
  // Alert.alert has no buttons on web, so disconnect confirms in-app on every platform
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  // A typed key must not linger in state after the sheet closes
  const handleClose = () => {
    setApiKeyInput('');
    setShowKey(false);
    setConfirmDisconnect(false);
    onClose();
  };

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
        setSuccessMessage(
          result.latencyMs
            ? `Connection healthy! Responded in ${result.latencyMs}ms.`
            : 'Connection healthy!'
        );
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

  const handleDisconnect = () => setConfirmDisconnect(true);

  const handleConfirmDisconnect = async () => {
    await AIService.disconnectKey();
    setConfirmDisconnect(false);
    setIsConnected(false);
    setMaskedKey('');
    setApiKeyInput('');
    setSuccessMessage(null);
    setValidationError(null);
    if (onKeyConfigured) onKeyConfigured();
  };

  const handleOpenGoogleAIStudio = () => {
    Linking.openURL('https://aistudio.google.com/apikey');
  };

  const typed = apiKeyInput.trim().length > 0;
  // Connected with nothing typed: the footer offers Disconnect; otherwise it verifies the typed key
  const showDisconnect = isConnected && !typed;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={sheetStyles.scrim}>
        <Pressable
          style={sheetStyles.backdrop}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss AI Setup Sheet"
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboard}
        >
          <View style={[sheetSurface, styles.sheet]} accessibilityViewIsModal>
            <View style={sheetStyles.handle} />
            <SheetHeader
              title={isConnected ? 'Gemini key' : 'Connect Gemini'}
              subtitle={
                isConnected
                  ? 'Ria and food photos are on'
                  : 'Your own key powers Ria and food photos'
              }
              onClose={handleClose}
            />

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={sheetStyles.body}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
            >
              {isConnected ? (
                <SettingsSection title="Status">
                  <SettingsRow
                    icon="checkmark"
                    iconColor={Colors.primary}
                    iconBackground={Colors.primaryLight}
                    title="Connected"
                    subtitle={maskedKey ? `Key ${maskedKey}` : 'Key saved on this device'}
                  />
                  <SettingsRow
                    icon="refresh-outline"
                    title="Test connection"
                    subtitle="Sends one small request to Google"
                    onPress={handleTestExistingConnection}
                    disabled={isValidating}
                    trailing={
                      isValidating && !typed ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : undefined
                    }
                  />
                </SettingsSection>
              ) : null}

              <View>
                <Text style={styles.label}>{isConnected ? 'Replace key' : 'Gemini API key'}</Text>
                <View style={[profileCard, styles.inputCard]}>
                  <Ionicons name="key-outline" size={18} color={Colors.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder={isConnected ? 'Paste a new key' : 'Paste your key'}
                    placeholderTextColor={Colors.textMuted}
                    value={apiKeyInput}
                    onChangeText={text => {
                      setApiKeyInput(text);
                      setValidationError(null);
                    }}
                    secureTextEntry={!showKey}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isValidating}
                    accessibilityLabel={isConnected ? 'Replace Gemini API key' : 'Gemini API key'}
                  />
                  {typed ? (
                    <Pressable
                      style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                      onPress={() => setShowKey(!showKey)}
                      accessibilityRole="button"
                      accessibilityLabel={showKey ? 'Hide key' : 'Show key'}
                    >
                      <Ionicons
                        name={showKey ? 'eye-off-outline' : 'eye-outline'}
                        size={18}
                        color={Colors.textSlate700}
                      />
                    </Pressable>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                      onPress={handlePaste}
                      accessibilityRole="button"
                      accessibilityLabel="Paste key from clipboard"
                    >
                      <Ionicons name="clipboard-outline" size={16} color={Colors.textSlate700} />
                      <Text style={styles.chipText}>Paste</Text>
                    </Pressable>
                  )}
                </View>
                {validationError ? <SheetNotice kind="error" text={validationError} /> : null}
                {successMessage ? <SheetNotice kind="ok" text={successMessage} /> : null}
                {!isConnected ? (
                  <View style={styles.privacy}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={16}
                      color={Colors.textSecondary}
                      style={styles.privacyIcon}
                    />
                    <Text style={styles.privacyText}>
                      {Platform.OS === 'web'
                        ? 'Stored only in this browser. It goes straight to Google, never to Calorify.'
                        : 'Stored encrypted on this phone only. It goes straight to Google, never to Calorify.'}
                    </Text>
                  </View>
                ) : null}
              </View>

              {!isConnected ? (
                <SettingsSection title="Need a key?">
                  <SettingsRow
                    icon="help-circle-outline"
                    title="Get a free key"
                    subtitle="Opens Google AI Studio, takes about a minute"
                    onPress={handleOpenGoogleAIStudio}
                    trailing={<Ionicons name="open-outline" size={16} color={Colors.textMuted} />}
                  />
                </SettingsSection>
              ) : null}
            </ScrollView>

            <View style={[sheetStyles.footer, styles.footer]}>
              {showDisconnect ? (
                <ProfileButton label="Disconnect key" variant="danger" onPress={handleDisconnect} />
              ) : (
                <ProfileButton
                  label={isConnected ? 'Verify and replace' : 'Verify and connect'}
                  variant="primary"
                  onPress={handleValidateAndConnect}
                  disabled={!typed}
                  loading={isValidating}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
      <ConfirmationModal
        visible={confirmDisconnect}
        title="Disconnect Gemini key?"
        message="Ria and food photo analysis stop working until you connect a key again."
        confirmText="Disconnect"
        confirmStyle="destructive"
        iconName="key-outline"
        onConfirm={handleConfirmDisconnect}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboard: { width: '100%', maxWidth: 480, alignSelf: 'center', maxHeight: '90%' },
  sheet: { maxHeight: '100%' },
  scroll: { flexGrow: 0 },
  label: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 14,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 44,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  chip: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  chipText: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.textSlate700 },
  pressed: { opacity: 0.85 },
  privacy: { flexDirection: 'row', gap: 6, marginTop: 8, marginHorizontal: 4 },
  privacyIcon: { marginTop: 2 },
  privacyText: {
    flex: 1,
    fontFamily: Fonts.urbanist.regular,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  footer: { paddingBottom: Platform.OS === 'ios' ? 32 : 20 },
});

