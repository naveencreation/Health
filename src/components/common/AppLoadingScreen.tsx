import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { BouncingDotsLoader } from './BouncingDotsLoader';

interface AppLoadingScreenProps {
  message?: string;
  subMessage?: string;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  message = 'Starting Calorify...',
  subMessage = 'Preparing your nutrition companion',
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    // Pulse animation
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    pulseLoop.start();

    // Continuous subtle rotation for outer glow ring
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );
    rotateLoop.start();

    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
    };
  }, [pulseAnim, rotateAnim, fadeAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        {/* Animated Brand Emblem */}
        <Animated.View
          style={[
            styles.emblemContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {/* Outer Decorative Ring */}
          <Animated.View
            style={[
              styles.outerRing,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          />

          {/* Core Brand Circle */}
          <View style={styles.innerCircle}>
            <MaterialCommunityIcons name="fire" size={44} color="#F47551" />
          </View>
        </Animated.View>

        {/* Brand Title */}
        <Text style={styles.brandTitle}>Calorify</Text>

        {/* Bouncing Dots & Dynamic Status Message */}
        <View style={styles.statusBox}>
          <BouncingDotsLoader color="#F47551" size={6} gap={4} style={styles.dots} />
          <Text style={styles.statusMessage}>{message}</Text>
        </View>

        {/* Subtitle */}
        {subMessage ? <Text style={styles.subMessage}>{subMessage}</Text> : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  outerRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2.5,
    borderColor: '#CDE26D',
    borderStyle: 'dashed',
    opacity: 0.8,
  },
  innerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
      },
    }),
  },
  brandTitle: {
    fontFamily: Fonts.kurale || 'System',
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    marginBottom: 8,
  },
  dots: {
    marginRight: 8,
  },
  statusMessage: {
    fontFamily: Fonts.poppins.medium || 'System',
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  subMessage: {
    fontFamily: Fonts.poppins.regular || 'System',
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
});
