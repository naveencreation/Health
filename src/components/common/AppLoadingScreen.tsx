import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Fonts } from '@/theme/typography';
import { BouncingDotsLoader } from './BouncingDotsLoader';

interface AppLoadingScreenProps {
  message?: string;
  fadeAnim?: SharedValue<number>;
  pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto';
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({
  message = 'Personalizing your data...',
  fadeAnim,
  pointerEvents = 'auto',
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim ? fadeAnim.value : 1,
  }));

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents={pointerEvents}
    >
      {/* 1. Anchored Brand Centerpiece: Logo + App Name (1:1 with Native Splash) */}
      <Image
        source={require('../../../assets/splash-icon.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />

      {/* 2. Simple & Elegant Jumping Dots + Status Text */}
      <View style={styles.loaderStack}>
        <BouncingDotsLoader color="#F47551" size={6} gap={5} />
        <Text style={styles.statusText}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FAF9F6',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 9999,
  },
  logoImage: {
    width: 280,
    height: 106,
  },
  loaderStack: {
    alignItems: 'center',
    marginTop: 28,
    gap: 8,
  },
  statusText: {
    fontFamily: Fonts.poppins.regular || 'System',
    fontSize: 13,
    color: '#64748B',
    letterSpacing: -0.1,
    includeFontPadding: false,
  },
});
