import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const Fonts = {
  // Editorial Serif font from Figma (used for Welcome, diet journey title, chart axis)
  kurale: isWeb
    ? 'Kurale_400Regular, Kurale, Georgia, serif'
    : 'Kurale_400Regular',

  // Modern Geometric Humanist Sans font from Figma (used for Today Calorie, Date Picker, Macros, Meals)
  poppins: {
    regular: isWeb
      ? 'Poppins_400Regular, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Poppins_400Regular',
    medium: isWeb
      ? 'Poppins_500Medium, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Poppins_500Medium',
    semiBold: isWeb
      ? 'Poppins_600SemiBold, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Poppins_600SemiBold',
    bold: isWeb
      ? 'Poppins_700Bold, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Poppins_700Bold',
  },
};

