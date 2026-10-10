// Global test setup for Calorify

// Mock react-native-reanimated for Jest environments where native worklets are not available
jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
      Text: ReactNative.Text,
      ScrollView: ReactNative.ScrollView,
    },
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (factory) => (typeof factory === 'function' ? factory() : {}),
    withTiming: (value) => value,
    withSpring: (value) => value,
    withRepeat: (value) => value,
    withSequence: (...values) => values[0],
    withDelay: (_delay, value) => value,
    cancelAnimation: () => {},
    runOnJS: (fn) => fn,
    interpolate: (_value, _input, output) => output?.[0] ?? 0,
    Extrapolate: { CLAMP: 'clamp' },
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
    FadeOut: { duration: () => ({ delay: () => ({}) }) },
    FadeInDown: { duration: () => ({ delay: () => ({ springify: () => ({}) }) }) },
    FadeOutDown: { duration: () => ({ delay: () => ({}) }) },
    SlideInRight: { duration: () => ({}) },
    SlideOutRight: { duration: () => ({}) },
    Easing: {
      out: (fn) => (t) => (typeof fn === 'function' ? 1 - fn(1 - t) : t),
      inOut: (fn) => (t) =>
        typeof fn === 'function' ? (t < 0.5 ? fn(t * 2) / 2 : 1 - fn((1 - t) * 2) / 2) : t,
      in: (fn) => (t) => (typeof fn === 'function' ? fn(t) : t),
      cubic: (t) => t * t * t,
      quad: (t) => t * t,
      linear: (t) => t,
      bezier: () => ({ factory: () => (t) => t }),
    },
  };
});
