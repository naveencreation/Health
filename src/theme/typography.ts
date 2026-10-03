import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export const Fonts = {
  // Editorial Serif font from Figma (used for Welcome, diet journey title, chart axis)
  kurale: isWeb
    ? 'Kurale_400Regular, Kurale, Georgia, serif'
    : 'Kurale_400Regular',

  // Modernist Geometric Sans font (Core brand typography for cards, numbers, macros, and headings)
  urbanist: {
    regular: isWeb
      ? 'Urbanist_400Regular, Urbanist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Urbanist_400Regular',
    medium: isWeb
      ? 'Urbanist_500Medium, Urbanist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Urbanist_500Medium',
    semiBold: isWeb
      ? 'Urbanist_600SemiBold, Urbanist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Urbanist_600SemiBold',
    bold: isWeb
      ? 'Urbanist_700Bold, Urbanist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Urbanist_700Bold',
    extraBold: isWeb
      ? 'Urbanist_800ExtraBold, Urbanist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Urbanist_800ExtraBold',
  },

  // Backward-compatible mapping so all existing components seamlessly adopt Urbanist
  poppins: {
    regular: isWeb
      ? 'Urbanist_400Regular, Urbanist, Poppins_400Regular, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Urbanist_400Regular',
    medium: isWeb
      ? 'Urbanist_500Medium, Urbanist, Poppins_500Medium, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Urbanist_500Medium',
    semiBold: isWeb
      ? 'Urbanist_600SemiBold, Urbanist, Poppins_600SemiBold, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Urbanist_600SemiBold',
    bold: isWeb
      ? 'Urbanist_700Bold, Urbanist, Poppins_700Bold, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Urbanist_700Bold',
    extraBold: isWeb
      ? 'Urbanist_800ExtraBold, Urbanist, Poppins_700Bold, Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'Urbanist_800ExtraBold',
  },
};

