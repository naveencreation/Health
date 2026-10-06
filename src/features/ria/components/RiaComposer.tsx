/**
 * RiaComposer.tsx
 * 
 * Multiline input composer for Ria Space:
 * - 500 characters max with remaining counter indicator
 * - Camera/photo icon on the left
 * - Dynamic Send / Stop streaming action on the right
 * - Double-bezel aesthetic with high-end micro-interactions
 * 
 * Spec: RIA_Chat.md section 5, 6, 10.
 */

import React, { useRef } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

export interface RiaComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
  onStop?: () => void;
  onPhotoPress?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
  testID?: string;
}

const MAX_CHAR_COUNT = 500;
const WARN_CHAR_COUNT = 400;

export const RiaComposer: React.FC<RiaComposerProps> = ({
  value,
  onChangeText,
  onSend,
  onStop,
  onPhotoPress,
  isStreaming = false,
  disabled = false,
  placeholder = 'Ask Ria anything about food, nutrition...',
  testID = 'ria-composer',
}) => {
  const inputRef = useRef<TextInput>(null);

  const canSend = Boolean(value.trim()) && !disabled && !isStreaming;
  const isApproachingLimit = value.length >= WARN_CHAR_COUNT;

  const handleSendPress = () => {
    if (!canSend) return;
    haptics.impactLight();
    onSend(value.trim());
  };

  const handleStopPress = () => {
    haptics.selection();
    onStop?.();
  };

  const handlePhotoPress = () => {
    haptics.impactLight();
    onPhotoPress?.();
  };

  return (
    <View style={styles.outerShell} testID={testID}>
      {isApproachingLimit && (
        <View style={styles.charCounterContainer}>
          <Text
            style={[
              styles.charCounterText,
              value.length >= MAX_CHAR_COUNT && styles.charCounterLimit,
            ]}
          >
            {value.length}/{MAX_CHAR_COUNT}
          </Text>
        </View>
      )}

      <View style={styles.innerCore}>
        {/* Left: Camera / Vision Trigger */}
        {onPhotoPress && (
          <Pressable
            style={({ pressed }) => [styles.photoButton, pressed && styles.btnPressed]}
            onPress={handlePhotoPress}
            disabled={disabled || isStreaming}
            testID="composer-photo-btn"
            accessibilityRole="button"
            accessibilityLabel="Scan or select food photo"
          >
            <Ionicons name="camera-outline" size={21} color="#64748B" />
          </Pressable>
        )}

        {/* Center: Multiline TextInput */}
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={value}
          onChangeText={text => onChangeText(text.slice(0, MAX_CHAR_COUNT))}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={MAX_CHAR_COUNT}
          editable={!disabled}
          testID="composer-text-input"
          accessibilityLabel="Message input"
        />

        {/* Right: Send or Stop Action Button */}
        {isStreaming ? (
          <Pressable
            style={({ pressed }) => [styles.stopButton, pressed && styles.btnPressed]}
            onPress={handleStopPress}
            testID="composer-stop-btn"
            accessibilityRole="button"
            accessibilityLabel="Stop response generation"
          >
            <Ionicons name="square" size={14} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              !canSend && styles.sendButtonDisabled,
              pressed && canSend && styles.btnPressed,
            ]}
            onPress={handleSendPress}
            disabled={!canSend}
            testID="composer-send-btn"
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={canSend ? '#FFFFFF' : '#CBD5E1'}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShell: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FAF9F6',
  },
  charCounterContainer: {
    alignItems: 'flex-end',
    marginBottom: 4,
    marginRight: 4,
  },
  charCounterText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 10.5,
    color: '#94A3B8',
  },
  charCounterLimit: {
    color: Colors.error,
    fontFamily: Fonts.urbanist.bold,
  },
  innerCore: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 48,
    maxHeight: 120,
  },
  photoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  textInput: {
    flex: 1,
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#0F172A',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginLeft: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#F1F5F9',
  },
  stopButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    marginLeft: 4,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }],
  },
});
