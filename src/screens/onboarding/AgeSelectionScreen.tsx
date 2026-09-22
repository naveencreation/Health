import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { OnboardingHeader } from '@/components/onboarding';

interface AgeSelectionScreenProps {
  onBack?: () => void;
  onContinue?: (age: number) => void;
  onSkip?: () => void;
  onSignIn?: () => void;
  initialAge?: number;
}

const MIN_AGE = 12;
const MAX_AGE = 99;
const ITEM_HEIGHT = 80;
const CONTAINER_HEIGHT = 400;
const PADDING = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // 160px
const AGES = Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => MIN_AGE + i);
const SNAP_OFFSETS = AGES.map((_, i) => i * ITEM_HEIGHT);
const HIT_SLOP_12 = { top: 12, bottom: 12, left: 12, right: 12 };

interface AgeItemProps {
  age: number;
  selectedAge: number;
  onSelect: (age: number) => void;
}

const AgeItem = React.memo<AgeItemProps>(
  ({ age, selectedAge, onSelect }) => {
    const diff = Math.abs(age - selectedAge);
    let textStyle = styles.ageTextDim;
    if (diff === 0) {
      textStyle = styles.selectedAgeText;
    } else if (diff === 1) {
      textStyle = styles.ageTextMid;
    }
    const isFar = diff > 2;

    const handlePress = useCallback(() => {
      onSelect(age);
    }, [age, onSelect]);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.numberRow,
          isFar ? styles.numberRowFar : null,
          pressed && !isFar && diff !== 0 ? styles.numberRowPressed : null,
        ]}
        onPress={handlePress}
        disabled={isFar}
        accessibilityRole="button"
        accessibilityLabel={`Age ${age}`}
        accessibilityState={{ selected: diff === 0 }}
      >
        <Text style={textStyle}>{age}</Text>
      </Pressable>
    );
  },
  (prev, next) => {
    if (prev.age !== next.age || prev.onSelect !== next.onSelect) return false;
    const prevDiff = Math.abs(prev.age - prev.selectedAge);
    const nextDiff = Math.abs(next.age - next.selectedAge);
    const prevRank = prevDiff === 0 ? 0 : prevDiff === 1 ? 1 : prevDiff === 2 ? 2 : 3;
    const nextRank = nextDiff === 0 ? 0 : nextDiff === 1 ? 1 : nextDiff === 2 ? 2 : 3;
    return prevRank === nextRank;
  }
);

export const AgeSelectionScreen: React.FC<AgeSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  onSignIn,
  initialAge = 24,
}) => {
  const [selectedAge, setSelectedAge] = useState<number>(initialAge);
  const scrollViewRef = useRef<ScrollView>(null);
  const isLayoutReadyRef = useRef(false);

  // References for live tracking & web drag support
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startScrollYRef = useRef((initialAge - MIN_AGE) * ITEM_HEIGHT);
  const currentScrollYRef = useRef((initialAge - MIN_AGE) * ITEM_HEIGHT);
  const selectedAgeRef = useRef(initialAge);

  const initialOffset = Math.max(0, (initialAge - MIN_AGE) * ITEM_HEIGHT);

  useEffect(() => {
    selectedAgeRef.current = selectedAge;
  }, [selectedAge]);

  // Sync scroll position if initialAge changes dynamically
  useEffect(() => {
    const targetOffset = Math.max(0, (initialAge - MIN_AGE) * ITEM_HEIGHT);
    currentScrollYRef.current = targetOffset;
    scrollViewRef.current?.scrollTo({ y: targetOffset, animated: false });
    setSelectedAge(initialAge);
  }, [initialAge]);

  const handleLayout = useCallback(() => {
    if (!isLayoutReadyRef.current) {
      isLayoutReadyRef.current = true;
      scrollViewRef.current?.scrollTo({ y: initialOffset, animated: false });
    }
  }, [initialOffset]);

  // Desktop Web: Smooth click-and-drag gesture support
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onGlobalMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current) return;
        const dy = e.clientY - startYRef.current;
        const targetY = Math.max(
          0,
          Math.min((AGES.length - 1) * ITEM_HEIGHT, startScrollYRef.current - dy)
        );
        currentScrollYRef.current = targetY;
        scrollViewRef.current?.scrollTo({ y: targetY, animated: false });

        // Update selected age live during drag
        const liveIndex = Math.round(targetY / ITEM_HEIGHT);
        const clampedIndex = Math.max(0, Math.min(AGES.length - 1, liveIndex));
        const newAge = AGES[clampedIndex];
        if (newAge !== undefined && newAge !== selectedAgeRef.current) {
          setSelectedAge(newAge);
        }
      };

      const onGlobalMouseUp = () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          const snapIndex = Math.round(currentScrollYRef.current / ITEM_HEIGHT);
          const clampedIndex = Math.max(0, Math.min(AGES.length - 1, snapIndex));
          const snapY = clampedIndex * ITEM_HEIGHT;
          scrollViewRef.current?.scrollTo({ y: snapY, animated: true });
          const finalAge = AGES[clampedIndex];
          if (finalAge !== undefined) {
            setSelectedAge(finalAge);
          }
        }
      };

      window.addEventListener('mousemove', onGlobalMouseMove);
      window.addEventListener('mouseup', onGlobalMouseUp);
      return () => {
        window.removeEventListener('mousemove', onGlobalMouseMove);
        window.removeEventListener('mouseup', onGlobalMouseUp);
      };
    }
  }, []);

  const handleMouseDown = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    isDraggingRef.current = true;
    const clientY = e.clientY || (e.nativeEvent && e.nativeEvent.pageY) || 0;
    startYRef.current = clientY;
    startScrollYRef.current = currentScrollYRef.current;
  }, []);

  // Real-time scroll updates: update selected age only when crossing item boundaries
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    currentScrollYRef.current = y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(AGES.length - 1, index));
    const newAge = AGES[clampedIndex];
    if (newAge !== undefined && newAge !== selectedAgeRef.current) {
      setSelectedAge(newAge);
    }
  }, []);

  // When momentum fling completes natively, commit final selected age
  const handleMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(AGES.length - 1, index));
    currentScrollYRef.current = clampedIndex * ITEM_HEIGHT;
    const finalAge = AGES[clampedIndex];
    if (finalAge !== undefined && finalAge !== selectedAgeRef.current) {
      setSelectedAge(finalAge);
    }
  }, []);

  // Handle slow drag release without momentum
  const handleScrollEndDrag = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const velocityY = event.nativeEvent?.velocity?.y ?? 0;
    if (Math.abs(velocityY) < 0.08) {
      const y = event.nativeEvent.contentOffset.y;
      const index = Math.round(y / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(AGES.length - 1, index));
      const snapY = clampedIndex * ITEM_HEIGHT;
      currentScrollYRef.current = snapY;
      const finalAge = AGES[clampedIndex];
      if (finalAge !== undefined && finalAge !== selectedAgeRef.current) {
        setSelectedAge(finalAge);
      }
      if (Platform.OS === 'web') {
        scrollViewRef.current?.scrollTo({ y: snapY, animated: true });
      }
    }
  }, []);

  const handleSelectAge = useCallback((age: number) => {
    const index = age - MIN_AGE;
    const snapY = index * ITEM_HEIGHT;
    currentScrollYRef.current = snapY;
    scrollViewRef.current?.scrollTo({ y: snapY, animated: true });
    setSelectedAge(age);
  }, []);

  const handleContinuePress = () => {
    if (onContinue) onContinue(selectedAge);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {/* Frame 12: Top Header Bar */}
        <OnboardingHeader onBack={onBack} stepText="Step 1 of 5" />

        {/* Title & Cognitive Reassurance Context */}
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>What’s your Age?</Text>
          <Text style={styles.screenSubtitle}>
            Helps calculate your daily metabolic rate and calorie baseline
          </Text>
        </View>

        {/* Frame 10: Smooth Interactive Vertical Scrollable Age Wheel */}
        <View
          style={styles.pickerContainer}
          // @ts-ignore
          onMouseDown={handleMouseDown}
        >
          {/* Static Center Selected Lime Card Background */}
          <View style={styles.selectedBoxBackground} />

          {/* Smooth Scrollable / Draggable Number Track */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.pickerScrollView}
            contentContainerStyle={styles.pickerScrollContent}
            showsVerticalScrollIndicator={false}
            snapToOffsets={SNAP_OFFSETS}
            snapToAlignment="start"
            decelerationRate="fast"
            nestedScrollEnabled={true}
            overScrollMode="never"
            bounces={Platform.OS === 'ios'}
            contentOffset={{ x: 0, y: initialOffset }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            onScrollEndDrag={handleScrollEndDrag}
            onLayout={handleLayout}
          >
            {AGES.map((age) => (
              <AgeItem
                key={age}
                age={age}
                selectedAge={selectedAge}
                onSelect={handleSelectAge}
              />
            ))}
          </ScrollView>
        </View>

        {/* Frame 9: High-Contrast Accessible Continue CTA Button */}
        <View style={styles.footerContainer}>
          <Pressable
            style={({ pressed }) => [styles.continueButton, pressed ? styles.continueButtonPressed : null]}
            onPress={handleContinuePress}
            accessibilityRole="button"
            accessibilityLabel="Continue with selected age"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </Pressable>

          {/* Skip & Sign In Actions */}
          <View style={styles.footerLinksRow}>
            <Pressable
              style={({ pressed }) => [styles.skipContainer, pressed ? styles.btnPressedSubtle : null]}
              onPress={onSkip}
              hitSlop={HIT_SLOP_12}
              accessibilityRole="button"
              accessibilityLabel="Skip age selection"
            >
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            {onSignIn ? (
              <Pressable
                onPress={onSignIn}
                hitSlop={HIT_SLOP_12}
                style={({ pressed }) => [styles.signInBottomBtn, pressed ? styles.btnPressedSubtle : null]}
                accessibilityRole="button"
                accessibilityLabel="Sign in to existing account"
              >
                <Text style={styles.signInLinkText}>
                  Have an account? <Text style={styles.signInLinkBold}>Sign In</Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 440,
    flex: 1,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 24,
    justifyContent: 'space-between',
    // Desktop frame preview shadow
    ...(Platform.OS === 'web'
      ? {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.08,
          shadowRadius: 30,
        }
      : {}),
  },

  // Title: What’s your Age?
  titleContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  screenTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
    lineHeight: 36,
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
  },

  // Frame 10: Age Picker
  pickerContainer: {
    height: CONTAINER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    ...(Platform.OS === 'web'
      ? ({
          userSelect: 'none',
          cursor: 'grab',
        } as any)
      : {}),
  },
  selectedBoxBackground: {
    position: 'absolute',
    top: 158,
    width: 138,
    height: 84,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    alignSelf: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
    pointerEvents: 'none',
    ...(Platform.OS === 'web'
      ? ({
          boxShadow: '0px 8px 24px rgba(244, 117, 81, 0.4)',
        } as any)
      : {}),
  },
  pickerScrollView: {
    width: '100%',
    height: CONTAINER_HEIGHT,
    ...(Platform.OS === 'web'
      ? ({
          scrollSnapType: 'y mandatory',
        } as any)
      : {}),
  },
  pickerScrollContent: {
    paddingTop: PADDING,
    paddingBottom: PADDING,
    alignItems: 'center',
  },
  numberRow: {
    height: ITEM_HEIGHT,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? ({
          scrollSnapAlign: 'center',
          scrollSnapStop: 'always',
        } as any)
      : {}),
  },
  numberRowFar: {
    opacity: 0,
  },
  numberRowPressed: {
    opacity: 0.7,
  },
  btnPressedSubtle: {
    opacity: 0.65,
    transform: [{ scale: 0.96 }],
  },
  selectedAgeText: {
    fontFamily: 'Kurale_400Regular',
    fontSize: 68,
    lineHeight: 80,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  ageTextMid: {
    fontFamily: 'Kurale_400Regular',
    fontSize: 44,
    lineHeight: 80,
    textAlign: 'center',
    color: '#8F8F8F',
    letterSpacing: 0.5,
  },
  ageTextDim: {
    fontFamily: 'Kurale_400Regular',
    fontSize: 34,
    lineHeight: 80,
    textAlign: 'center',
    color: 'rgba(179, 173, 173, 0.45)',
    letterSpacing: 0.5,
  },

  // Footer: Continue & Skip
  footerContainer: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 8,
  },
  continueButton: {
    width: 220,
    height: 52,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  continueButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  continueButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  skipContainer: {
    paddingVertical: 6,
  },
  skipText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    color: '#64748B',
  },
  footerLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 8,
    marginTop: 4,
  },
  signInBottomBtn: {
    paddingVertical: 6,
  },
  signInLinkText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    color: '#64748B',
  },
  signInLinkBold: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#F47551',
  },
});
