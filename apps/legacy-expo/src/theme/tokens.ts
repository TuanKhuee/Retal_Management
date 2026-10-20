import { colors } from './colors';

export const tokens = {
  colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    base: 16,
    lg: 20,
    xl: 24,
    '2xl': 32,
    '3xl': 40,
    '4xl': 48,
    // DESIGN.md named spacing
    gutter: 16,
    margin: 16,
    'space-xs': 4,
    'space-sm': 8,
    'space-md': 12,
    'space-lg': 16,
    'space-xl': 24,
    'space-2xl': 32,
  },
  radii: {
    xs: 4,
    sm: 4,
    DEFAULT: 8,
    md: 8, // Controls & Form Elements: 8px
    lg: 12, // Containers & Surfaces: 12px
    xl: 16, // Cards: 16px
    '2xl': 24,
    full: 9999,
  },
  typography: {
    display: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.6,
    },
    titleMd: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
      letterSpacing: -0.4,
    },
    titleSm: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: -0.2,
    },
    bodyBase: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodyBaseMedium: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 24,
    },
    bodyBaseSemiBold: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    bodySm: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    bodySmMedium: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
    tabularAmount: {
      fontSize: 18,
      fontWeight: '700' as const,
      lineHeight: 24,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#141b2b',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#141b2b',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    lg: {
      shadowColor: '#141b2b',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
  },
} as const;

export type ThemeTokens = typeof tokens;
