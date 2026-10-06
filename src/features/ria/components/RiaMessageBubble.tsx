/**
 * RiaMessageBubble.tsx
 * 
 * Renders individual chat bubbles in Ria Space:
 * - User bubbles on right (Terracotta fill, white text)
 * - Ria bubbles on left (White card, subtle border, Markdown formatting, 32dp Ria avatar)
 * - Thinking indicator with 15s soft notice
 * - Streaming live text with pulsing cursor
 * - Error and interrupted state affordances with tap-to-retry
 * - Long-press to copy to clipboard
 * 
 * Spec: RIA_Chat.md section 5, 6, 7, 14.
 */

import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import {
  RiaMessage,
  MealCardData,
  WaterCardData,
  WeightCardData,
  SuggestionOption,
  PlanChangeCardData,
} from '@/services/ai/types/ai.types';
import { MarkdownText } from '@/components/common/MarkdownText';
import { RiaActionCard } from '../cards/RiaActionCard';

export interface RiaMessageBubbleProps {
  message: RiaMessage;
  isStreaming?: boolean;
  isThinking?: boolean;
  thinkingNotice?: string | null;
  onRetry?: (message: RiaMessage) => void;
  onCopy?: (text: string) => void;
  onConfirmMeal?: (messageId: string, data: MealCardData) => void;
  onUndoMeal?: (messageId: string, data: MealCardData) => void;
  onEditMeal?: (messageId: string, data: MealCardData) => void;
  onDismissMeal?: (messageId: string, data: MealCardData) => void;
  onConfirmWater?: (messageId: string, amountMl: number, data: WaterCardData) => void;
  onUndoWater?: (messageId: string, data: WaterCardData) => void;
  onDismissWater?: (messageId: string, data: WaterCardData) => void;
  onConfirmWeight?: (messageId: string, data: WeightCardData) => void;
  onDismissWeight?: (messageId: string, data: WeightCardData) => void;
  onLogSuggestionOption?: (messageId: string, option: SuggestionOption) => void;
  onApplyPlanChange?: (messageId: string, data: PlanChangeCardData) => void;
  onDismissPlanChange?: (messageId: string, data: PlanChangeCardData) => void;
  testID?: string;
}

const RiaAvatar = memo(() => (
  <View style={styles.avatarContainer}>
    <Image
      source={require('../../../../assets/ria_avatar.webp')}
      style={styles.avatarImage}
      contentFit="cover"
      cachePolicy="memory-disk"
    />
  </View>
));

export const RiaMessageBubble: React.FC<RiaMessageBubbleProps> = memo(({
  message,
  isStreaming = false,
  isThinking = false,
  thinkingNotice,
  onRetry,
  onCopy,
  onConfirmMeal,
  onUndoMeal,
  onEditMeal,
  onDismissMeal,
  onConfirmWater,
  onUndoWater,
  onDismissWater,
  onConfirmWeight,
  onDismissWeight,
  onLogSuggestionOption,
  onApplyPlanChange,
  onDismissPlanChange,
  testID = `message-bubble-${message.id}`,
}) => {
  const isUser = message.role === 'user';
  const isFailed = message.status === 'failed';
  const isInterrupted = message.status === 'interrupted';

  const handleLongPress = async () => {
    if (!message.text) return;
    await haptics.impactLight();
    await Clipboard.setStringAsync(message.text);
    onCopy?.(message.text);
  };

  const handleRetryPress = () => {
    haptics.selection();
    onRetry?.(message);
  };

  if (isUser) {
    return (
      <View style={[styles.bubbleRow, styles.userBubbleRow]} testID={testID}>
        <Pressable
          style={({ pressed }) => [
            styles.userBubble,
            Boolean(message.photoThumbUri) && styles.userPhotoBubble,
            pressed && styles.userBubblePressed,
          ]}
          onLongPress={handleLongPress}
          delayLongPress={300}
          accessibilityRole="text"
          accessibilityLabel={`Your message: ${message.text || 'Photo'}`}
        >
          {Boolean(message.photoThumbUri) && (
            <View style={styles.userPhotoThumbContainer} testID="user-photo-thumbnail">
              <Image
                source={{ uri: message.photoThumbUri }}
                style={styles.userPhotoThumb}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
              <View style={styles.userPhotoBadge}>
                <Ionicons name="camera" size={10} color="#FFFFFF" />
                <Text style={styles.userPhotoBadgeText}>Scanned plate</Text>
              </View>
            </View>
          )}
          {Boolean(message.text) && (
            <Text style={[styles.userText, Boolean(message.photoThumbUri) && styles.userPhotoCaption]}>
              {message.text}
            </Text>
          )}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, styles.riaBubbleRow]} testID={testID}>
      <RiaAvatar />
      <View style={styles.riaBubbleWrapper}>
        <Pressable
          style={({ pressed }) => [
            styles.riaBubble,
            isFailed && styles.failedBubble,
            pressed && styles.riaBubblePressed,
          ]}
          onLongPress={handleLongPress}
          delayLongPress={300}
          accessibilityRole="text"
          accessibilityLabel={`Ria says: ${message.text || ''}`}
        >
          {/* Thinking state (three dots / loading) */}
          {isThinking && (
            <View style={styles.thinkingContainer} testID="thinking-indicator">
              <View style={styles.dotsRow}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
              {thinkingNotice && (
                <Text style={styles.thinkingNoticeText}>{thinkingNotice}</Text>
              )}
            </View>
          )}

          {/* Normal text or streaming output */}
          {Boolean(message.text) && (
            <View style={styles.markdownWrapper}>
              <MarkdownText
                content={message.text || ''}
                baseStyle={{ fontSize: 13.5, color: '#0F172A' }}
              />
              {isStreaming && (
                <View style={styles.streamingCursor} testID="streaming-cursor" />
              )}
            </View>
          )}

          {/* Interrupted partial note */}
          {isInterrupted && (
            <View style={styles.interruptedBadge}>
              <Ionicons name="alert-circle-outline" size={13} color="#94A3B8" />
              <Text style={styles.interruptedText}>Response interrupted</Text>
            </View>
          )}

          {/* Failed / Unsent status */}
          {isFailed && (
            <View style={styles.failedContainer}>
              <Ionicons name="alert-circle" size={14} color={Colors.error} />
              <Text style={styles.failedText}>Not sent</Text>
            </View>
          )}
        </Pressable>

        {/* Action Card Renderer */}
        {Boolean(message.card) && (
          <View style={styles.actionCardWrapper} testID={`card-wrapper-${message.id}`}>
            <RiaActionCard
              card={message.card!}
              messageId={message.id}
              onConfirmMeal={onConfirmMeal}
              onUndoMeal={onUndoMeal}
              onEditMeal={onEditMeal}
              onDismissMeal={onDismissMeal}
              onConfirmWater={onConfirmWater}
              onUndoWater={onUndoWater}
              onDismissWater={onDismissWater}
              onConfirmWeight={onConfirmWeight}
              onDismissWeight={onDismissWeight}
              onLogSuggestionOption={onLogSuggestionOption}
              onApplyPlanChange={onApplyPlanChange}
              onDismissPlanChange={onDismissPlanChange}
            />
          </View>
        )}

        {/* Retry button for failed or interrupted messages */}
        {(isFailed || isInterrupted) && onRetry && (
          <Pressable
            style={styles.retryPill}
            onPress={handleRetryPress}
            testID={`retry-btn-${message.id}`}
            accessibilityRole="button"
            accessibilityLabel="Retry message"
          >
            <Ionicons name="refresh-outline" size={12} color={Colors.primary} />
            <Text style={styles.retryPillText}>Retry</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bubbleRow: {
    marginVertical: 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  userBubbleRow: {
    justifyContent: 'flex-end',
  },
  riaBubbleRow: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 8,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFE9E1',
    marginTop: 2,
  },
  avatarImage: {
    width: 32,
    height: 32,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    maxWidth: '82%',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  userBubblePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  userText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 20,
    color: '#FFFFFF',
  },
  userPhotoBubble: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    borderRadius: 20,
    maxWidth: '85%',
  },
  userPhotoThumbContainer: {
    width: 200,
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#EA580C',
  },
  userPhotoThumb: {
    width: '100%',
    height: '100%',
  },
  userPhotoBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  userPhotoBadgeText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  userPhotoCaption: {
    marginTop: 6,
    marginHorizontal: 4,
    fontSize: 13,
  },
  riaBubbleWrapper: {
    maxWidth: '88%',
    flex: 1,
    alignItems: 'flex-start',
  },
  actionCardWrapper: {
    width: '100%',
    marginTop: 4,
  },
  riaBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  riaBubblePressed: {
    backgroundColor: '#FAF9F6',
  },
  failedBubble: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  markdownWrapper: {
    flexDirection: 'column',
  },
  streamingCursor: {
    width: 6,
    height: 14,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    marginTop: 4,
    opacity: 0.8,
  },
  thinkingContainer: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.7 },
  dot3: { opacity: 1.0 },
  thinkingNoticeText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  interruptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  interruptedText: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  failedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  failedText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 11,
    color: Colors.error,
  },
  retryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF5F1',
    borderWidth: 1,
    borderColor: '#FFD5C6',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: 4,
  },
  retryPillText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 11,
    color: Colors.primaryDark,
  },
});
