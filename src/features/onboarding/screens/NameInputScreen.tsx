import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { OnboardingHeader } from '../components/OnboardingHeader';

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
  const [showGreeting, setShowGreeting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-focus input shortly after mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 250);
    return () => {
      clearTimeout(timer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const proceedWithFinalName = (finalName: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onContinue(finalName);
  };

  const handleProceed = (chosenName?: string) => {
    const finalName = (chosenName ?? name).trim() || 'friend';
    haptics.selection();
    setShowGreeting(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      proceedWithFinalName(finalName);
    }, 1800);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      handleProceed('friend');
    }
  };

  if (showGreeting) {
    const displayName = name.trim() || 'friend';
    return (
      <SafeAreaView style={styles.safeArea}>
        <Pressable
          style={styles.greetingTouchable}
          onPress={() => proceedWithFinalName(displayName)}
          accessibilityRole="button"
          accessibilityLabel="Continue to next step"
          testID="name-greeting-touchable"
        >
          <Animated.View
            entering={FadeInDown.duration(350).springify().damping(18)}
            exiting={FadeOut.duration(300)}
            style={styles.greetingContainer}
            testID="name-greeting-view"
          >
            <Text style={styles.greetingTitle}>Nice to meet you,</Text>
            <Text style={styles.greetingName}>{displayName}.</Text>
          </Animated.View>
        </Pressable>
      </SafeAreaView>
    );
  }

  const isNameEmpty = name.trim().length === 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.phoneFrame}>
          <OnboardingHeader
            onBack={onBack}
            onSkip={handleSkip}
            sectionIndex={sectionIndex}
            totalSections={totalSections}
            sectionProgress={sectionProgress}
          />

          <View style={styles.content}>
            <View style={styles.titleContainer}>
              <Text style={styles.screenTitle}>First things first, what should we call you?</Text>
              <Text style={styles.screenSubtitle}>
                Just a first name or nickname is fine.
              </Text>
            </View>

            <View style={styles.inputCard}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted ?? '#94A3B8'}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => handleProceed()}
                maxLength={40}
                accessibilityLabel="Enter your name"
                testID="name-input-field"
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={() => handleProceed()}
              style={({ pressed }) => [
                styles.continueButton,
                pressed && styles.continueButtonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={isNameEmpty ? 'Continue as friend' : `Continue as ${name.trim()}`}
              testID="name-continue-button"
            >
              <Text style={styles.continueButtonText}>
                {isNameEmpty ? 'Continue' : 'Continue'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  flex: {
    flex: 1,
  },
  phoneFrame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    paddingTop: 16,
  },
  titleContainer: {
    marginBottom: 20,
  },
  screenTitle: {
    fontFamily: Fonts.kurale,
    fontSize: 28,
    lineHeight: 36,
    color: Colors.textPrimary ?? '#1E293B',
    marginBottom: 8,
  },
  screenSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary ?? '#64748B',
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  input: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 20,
    color: Colors.textPrimary ?? '#1E293B',
    padding: 0,
  },
  footer: {
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    paddingTop: 12,
  },
  continueButton: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  continueButtonText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  greetingTouchable: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  greetingTitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 22,
    color: Colors.textSecondary ?? '#64748B',
    marginBottom: 6,
  },
  greetingName: {
    fontFamily: Fonts.kurale,
    fontSize: 36,
    lineHeight: 44,
    color: '#F47551',
    textAlign: 'center',
  },
});
