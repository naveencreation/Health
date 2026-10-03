import { Platform, TextStyle, ViewStyle } from 'react-native';

const isWeb = Platform.OS === 'web';

export const Fonts = {
  // Brand Serif font (Restricted exclusively to solitary logo mark per DESIGN.md)
  kurale: isWeb
    ? 'Kurale_400Regular, Kurale, Georgia, serif'
    : 'Kurale_400Regular',

  // Modernist Geometric Sans font (100% Core brand typography for all screens, telemetry, headings, body)
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

/**
 * Standardized Typographic Architecture from DESIGN.md
 */
export const Typography = {
  // Telemetry Scale (The Numbers Hierarchy)
  telemetryHero: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.8,
  } as TextStyle,
  telemetryCard: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  } as TextStyle,
  telemetryMacro: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 22,
    lineHeight: 28,
  } as TextStyle,
  telemetryUnit: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  } as TextStyle,

  // Headlines
  displayLg: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
  } as TextStyle,
  headlineLg: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  } as TextStyle,
  headlineMd: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  } as TextStyle,
  headlineSm: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.2,
  } as TextStyle,

  // Body & Labels
  bodyLg: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,
  bodyMd: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,
  bodySm: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,
  labelLg: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 15,
    lineHeight: 20,
  } as TextStyle,
  labelMd: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 13,
    lineHeight: 18,
  } as TextStyle,
  labelSm: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
  } as TextStyle,
};

/**
 * Standard Architectural Card & Surface Tokens from DESIGN.md
 */
export const ArchitecturalSurfaces = {
  // Standard 10px Flat Squircle Card (Zero Float Shadow)
  card: {
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  // Timeframe / Segmented Tab Switcher Track
  segmentTrack: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 2.5,
    flexDirection: 'row',
  } as ViewStyle,

  // Timeframe Active Pill
  segmentPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowOpacity: 0,
    elevation: 0,
  } as ViewStyle,

  // Circular Action Trigger / Back Button (38x38)
  circularAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,

  // Primary 52px CTA Button
  primaryButton: {
    height: 52,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#F47551',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0,
    elevation: 0,
  } as ViewStyle,
};


