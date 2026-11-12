import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { ControlHeights, ControlRadii } from '@/theme/controls';
import { MotionCurves, MotionDurations } from '@/theme/motion';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';

const RIA_AVATAR = require('../../../../assets/ria_avatar.webp');
const GREETING_DELAY_MS = 800;

interface NameInputScreenProps {
  onBack?: () => void;
  onContinue: (name: string) => void;
  onSkip?: () => void;
  initialName?: string;
  sectionIndex?: number;
  totalSections?: number;
  sectionProgress?: number;
}

export const NameInputScreen: React.FC<NameInputScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  initialName = '',
  sectionIndex = 0,
  totalSections = 4,
  sectionProgress = 0.2,
}) => {
  const [name, setName] = useState(initialName);
  const [focused, setFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const bubble = useSharedValue(0);

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 250);
    return () => {
      clearTimeout(focusTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubble.value,
    transform: [{ translateY: (1 - bubble.value) * 8 }],
  }));

  const trimmed = name.trim();
  const isNameEmpty = trimmed.length === 0;

  // Fires onContinue exactly once, whichever path (timer, tap, reduced motion) gets here first.
  const finish = (finalName: string) => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onContinue(finalName);
  };

  const handleProceed = () => {
    if (isNameEmpty || submitted) return;
    haptics.selection();
    Keyboard.dismiss();
    if (reduceMotion) {
      finish(trimmed);
      return;
    }
    setSubmitted(true);
    bubble.value = withTiming(1, {
      duration: MotionDurations.sheet,
      easing: MotionCurves.decelerate,
    });
    timerRef.current = setTimeout(() => finish(trimmed), GREETING_DELAY_MS);
  };

  const handleSkip = () => {
    if (onSkip) onSkip();
    else finish('friend');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <Pressable
          style={styles.flex}
          disabled={!submitted}
          onPress={() => finish(trimmed)}
          accessible={false}
          testID="name-screen-tap"
        >
          <View style={styles.phoneFrame}>
            <OnboardingHeader
              onBack={onBack}
              onSkip={submitted ? undefined : handleSkip}
              sectionIndex={sectionIndex}
              totalSections={totalSections}
              sectionProgress={sectionProgress}
            />

            <View style={styles.content}>
              <View style={styles.riaRow}>
                <Image source={RIA_AVATAR} style={styles.avatarLarge} contentFit="cover" />
                <View>
                  <Text style={styles.riaName}>Hi, I&apos;m Ria</Text>
                  <Text style={styles.riaRole}>Your food coach</Text>
                </View>
              </View>

              <Text style={styles.question} accessibilityRole="header" maxFontSizeMultiplier={1.3}>
                What should I call you?
              </Text>

              <TextInput
                ref={inputRef}
                style={[styles.input, focused && !submitted && styles.inputFocused]}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                editable={!submitted}
                placeholder="First name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="given-name"
                textContentType="givenName"
                maxLength={40}
                returnKeyType="next"
                onSubmitEditing={handleProceed}
                accessibilityLabel="Your first name"
                maxFontSizeMultiplier={1.3}
                testID="name-input-field"
              />
              <Text style={styles.helper}>A first name or nickname is perfect.</Text>

              {submitted ? (
                <Animated.View style={[styles.replyRow, bubbleStyle]}>
                  <Image source={RIA_AVATAR} style={styles.avatarSmall} contentFit="cover" />
                  <View
                    style={styles.bubble}
                    accessibilityLiveRegion="polite"
                    testID="name-greeting-bubble"
                  >
                    <Text style={styles.bubbleText}>
                      Lovely to meet you, <Text style={styles.bubbleName}>{trimmed}</Text>!
                      Let&apos;s build your plan.
                    </Text>
                  </View>
                </Animated.View>
              ) : null}
            </View>

            <View style={[styles.footer, submitted && styles.footerHidden]}>
              <Pressable
                onPress={handleProceed}
                disabled={isNameEmpty || submitted}
                style={({ pressed }) => [
                  styles.continueButton,
                  isNameEmpty && styles.continueButtonDisabled,
                  pressed && styles.continueButtonPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Continue"
                accessibilityState={{ disabled: isNameEmpty }}
                testID="name-continue-button"
              >
                <Text style={[styles.continueText, isNameEmpty && styles.continueTextDisabled]}>
                  Continue
                </Text>
                {!isNameEmpty ? (
                  <Ionicons name="arrow-forward" size={18} color={Colors.textInverse} />
                ) : null}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  content: {
    flex: 1,
    paddingTop: 24,
  },
  riaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  riaName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  riaRole: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12.5,
    color: Colors.textSecondary,
  },
  question: {
    marginTop: 18,
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: Colors.textPrimary,
  },
  input: {
    marginTop: 26,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: Colors.borderInset,
    fontFamily: Fonts.urbanist.bold,
    fontSize: 30,
    color: Colors.textPrimary,
  },
  inputFocused: {
    borderBottomColor: Colors.primary,
  },
  helper: {
    marginTop: 10,
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  replyRow: {
    marginTop: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
  },
  bubble: {
    flexShrink: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    lineHeight: 21,
    color: Colors.textPrimary,
  },
  bubbleName: {
    fontFamily: Fonts.urbanist.bold,
    color: Colors.primaryDeep,
  },
  footer: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  footerHidden: {
    opacity: 0,
  },
  continueButton: {
    height: ControlHeights.button + 4,
    borderRadius: ControlRadii.button,
    borderCurve: 'continuous',
    backgroundColor: Colors.textPrimary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 0,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.borderInset,
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  continueText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 17,
    color: Colors.textInverse,
  },
  continueTextDisabled: {
    color: Colors.textMuted,
  },
});
