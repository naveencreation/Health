import { Platform } from 'react-native';

export const Fonts = {
  // Editorial Serif font from Figma (used for Welcome, Akshay Rajput, Track your diet journey, Chart axis)
  kurale: Platform.select({
    web: "'Kurale', Georgia, serif",
    ios: 'Kurale_400Regular',
    android: 'Kurale_400Regular',
    default: 'serif',
  }),

  // Modern Geometric Humanist Sans font from Figma (used for Today Calorie, Date Picker, Macros, Meals)
  poppins: {
    regular: Platform.select({
      web: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
      ios: 'Poppins_400Regular',
      android: 'Poppins_400Regular',
      default: 'sans-serif',
    }),
    medium: Platform.select({
      web: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
      ios: 'Poppins_500Medium',
      android: 'Poppins_500Medium',
      default: 'sans-serif-medium',
    }),
    semiBold: Platform.select({
      web: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
      ios: 'Poppins_600SemiBold',
      android: 'Poppins_600SemiBold',
      default: 'sans-serif-medium',
    }),
    bold: Platform.select({
      web: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
      ios: 'Poppins_700Bold',
      android: 'Poppins_700Bold',
      default: 'sans-serif',
    }),
  },
};
