import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

export const AgeSelectionScreen: React.FC<AgeSelectionScreenProps> = ({
  onBack,
  onContinue,
  onSkip,
  onSignIn,
  initialAge = 24,
}) => {
  const [selectedAge, setSelectedAge] = useState<number>(initialAge);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollTimeoutRef = useRef<any>(null);

  // References for live tracking & web drag support
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startScrollYRef = useRef((initialAge - MIN_AGE) * ITEM_HEIGHT);
  const currentScrollYRef = useRef((initialAge - MIN_AGE) * ITEM_HEIGHT);

  // Initialize scroll position to initialAge
  useEffect(() => {
    const initialOffset = Math.max(0, (initialAge - MIN_AGE) * ITEM_HEIGHT);
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: initialOffset, animated: false });
      currentScrollYRef.current = initialOffset;
    }, 60);
    return () => clearTimeout(timer);
  }, [initialAge]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

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
        setSelectedAge(AGES[clampedIndex]);
      };

      const onGlobalMouseUp = () => {
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          const snapIndex = Math.round(currentScrollYRef.current / ITEM_HEIGHT);
          const clampedIndex = Math.max(0, Math.min(AGES.length - 1, snapIndex));
          const snapY = clampedIndex * ITEM_HEIGHT;
          scrollViewRef.current?.scrollTo({ y: snapY, animated: true });
          setSelectedAge(AGES[clampedIndex]);
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

  const handleMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    isDraggingRef.current = true;
    const clientY = e.clientY || (e.nativeEvent && e.nativeEvent.pageY) || 0;
    startYRef.current = clientY;
    startScrollYRef.current = currentScrollYRef.current;
  };

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    currentScrollYRef.current = y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(AGES.length - 1, index));
    const newAge = AGES[clampedIndex];
    if (newAge !== selectedAge) {
      setSelectedAge(newAge);
    }

    // Auto-snap debounce: smoothly center number after scrolling ceases
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (!isDraggingRef.current) {
        const snapY = clampedIndex * ITEM_HEIGHT;
        if (Math.abs(currentScrollYRef.current - snapY) > 1) {
          scrollViewRef.current?.scrollTo({ y: snapY, animated: true });
        }
      }
    }, 80);
  };

  const handleScrollEnd = (event: any) => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(AGES.length - 1, index));
    const snapY = clampedIndex * ITEM_HEIGHT;
    scrollViewRef.current?.scrollTo({ y: snapY, animated: true });
    setSelectedAge(AGES[clampedIndex]);
  };

  const handleSelectAge = (age: number) => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    const index = age - MIN_AGE;
    scrollViewRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    setSelectedAge(age);
  };

  const handleContinuePress = () => {
    if (onContinue) onContinue(selectedAge);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.phoneFrame}>
        {/* Frame 12: Top Header Bar */}
        <View style={styles.headerBar}>
          {/* Back Action */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color="#1C274C" />
          </TouchableOpacity>

          {/* Center Brand Badge */}
          <View style={styles.logoBadgeContainer}>
            <View style={styles.logoDot} />
            <Text style={styles.logoBadgeText}>Calori</Text>
          </View>

          {/* Step Indicator: Step 1 of 4 */}
          <View style={styles.stepBadge}>
            <Text style={styles.stepIndicatorText}>Step 1 of 4</Text>
          </View>
        </View>

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
          <View style={styles.selectedBoxBackground} pointerEvents="none" />

          {/* Smooth Scrollable / Draggable Number Track */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.pickerScrollView}
            contentContainerStyle={styles.pickerScrollContent}
            showsVerticalScrollIndicator={false}
            snapToInterval={ITEM_HEIGHT}
            snapToAlignment="center"
            decelerationRate="fast"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleScrollEnd}
            onScrollEndDrag={handleScrollEnd}
            bounces={true}
          >
            {AGES.map((age) => {
              const diff = Math.abs(age - selectedAge);
              let textStyle = styles.ageTextDim;
              if (diff === 0) {
                textStyle = styles.selectedAgeText;
              } else if (diff === 1) {
                textStyle = styles.ageTextMid;
              }
              const isFar = diff > 2;

              return (
                <TouchableOpacity
                  key={age}
                  activeOpacity={0.8}
                  style={[styles.numberRow, isFar && { opacity: 0 }]}
                  onPress={() => handleSelectAge(age)}
                  disabled={isFar}
                >
                  <Text style={textStyle}>{age}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Frame 9: High-Contrast Accessible Continue CTA Button */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinuePress}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Continue with selected age"
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#0F172A" />
          </TouchableOpacity>

          {/* Skip & Sign In Actions */}
          <View style={styles.footerLinksRow}>
            <TouchableOpacity
              style={styles.skipContainer}
              onPress={onSkip}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Skip age selection"
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            {onSignIn && (
              <TouchableOpacity
                onPress={onSignIn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.signInBottomBtn}
                accessibilityRole="button"
                accessibilityLabel="Sign in to existing account"
              >
                <Text style={styles.signInLinkText}>
                  Have an account? <Text style={styles.signInLinkBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            )}
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
    maxWidth: 375,
    minHeight: 740,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
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

  // Frame 12: Header
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  logoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CDE26D',
  },
  logoBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#0F172A',
  },
  stepBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepIndicatorText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#64748B',
    letterSpacing: 0.2,
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
    backgroundColor: '#CDE26D',
    borderRadius: 20,
    alignSelf: 'center',
    shadowColor: '#CDE26D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 6,
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
    backgroundColor: '#CDE26D',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#CDE26D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  continueButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    color: '#0F172A',
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
