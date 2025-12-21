/**
 * LetsMake.Music Brand Colors
 * Based on Brand Identity Guidelines v2.0
 *
 * Primary: Vibrant Teal
 * Secondary: Deep Magenta
 * Accent: Rich Purple
 */

export const BRAND_COLORS = {
  // Primary - Vibrant Teal
  primary: {
    50: '#E0F2F1',
    100: '#B2DFDB',
    200: '#80CBC4',
    300: '#4DB6AC',
    400: '#20B2AA',
    500: '#1F979E', // Main
    600: '#00897B',
    700: '#00796B',
    800: '#00695C',
    900: '#004D40',
  },

  // Secondary - Deep Magenta
  secondary: {
    50: '#FCE4EC',
    100: '#F8BBD0',
    200: '#F48FB1',
    300: '#F06292',
    400: '#D81B60',
    500: '#C12D79', // Main
    600: '#AD1457',
    700: '#880E4F',
    800: '#6A1B9A',
    900: '#4A148C',
  },

  // Accent - Rich Purple
  accent: {
    50: '#F3E5F5',
    100: '#E1BEE7',
    200: '#CE93D8',
    300: '#BA68C8',
    400: '#AB47BC',
    500: '#9C27B0', // Main
    600: '#8E24AA',
    700: '#7B1FA2',
    800: '#6A1B9A',
    900: '#4A148C',
  },

  // Neutrals
  neutral: {
    50: { light: '#F8F9FA', dark: '#121212' },
    100: { light: '#F1F3F5', dark: '#1E1E1E' },
    200: { light: '#E9ECEF', dark: '#2C2C2C' },
    300: { light: '#DEE2E6', dark: '#3E3E3E' },
    400: { light: '#CED4DA', dark: '#505050' },
    500: { light: '#ADB5BD', dark: '#707070' },
    600: { light: '#868E96', dark: '#A0A0A0' },
    700: { light: '#495057', dark: '#C2C2C2' },
    800: { light: '#343A40', dark: '#E0E0E0' },
    900: { light: '#212529', dark: '#F5F5F5' },
  },

  // System Colors
  success: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50', // Main
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20',
  },

  error: {
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#F44336', // Main
    600: '#E53935',
    700: '#D32F2F',
    800: '#C62828',
    900: '#B71C1C',
  },

  warning: {
    50: '#FFF8E1',
    100: '#FFECB3',
    200: '#FFE082',
    300: '#FFD54F',
    400: '#FFCA28',
    500: '#FFC107', // Main
    600: '#FFB300',
    700: '#FFA000',
    800: '#FF8F00',
    900: '#FF6F00',
  },
}

// Theme-aware color getters
export const getThemeColors = (isDark) => ({
  // Primary colors
  primary: isDark ? BRAND_COLORS.primary[400] : BRAND_COLORS.primary[500],
  primaryLight: isDark ? BRAND_COLORS.primary[300] : BRAND_COLORS.primary[100],
  primaryDark: isDark ? BRAND_COLORS.primary[600] : BRAND_COLORS.primary[700],

  // Secondary colors
  secondary: isDark ? BRAND_COLORS.secondary[400] : BRAND_COLORS.secondary[500],
  secondaryLight: isDark ? BRAND_COLORS.secondary[300] : BRAND_COLORS.secondary[100],
  secondaryDark: isDark ? BRAND_COLORS.secondary[600] : BRAND_COLORS.secondary[700],

  // Accent colors
  accent: isDark ? BRAND_COLORS.accent[400] : BRAND_COLORS.accent[500],
  accentLight: isDark ? BRAND_COLORS.accent[300] : BRAND_COLORS.accent[100],

  // Background colors
  background: isDark ? BRAND_COLORS.neutral[50].dark : BRAND_COLORS.neutral[50].light,
  surface: isDark ? BRAND_COLORS.neutral[100].dark : '#FFFFFF',
  surfaceElevated: isDark ? BRAND_COLORS.neutral[200].dark : BRAND_COLORS.neutral[50].light,

  // Text colors
  text: isDark ? BRAND_COLORS.neutral[900].dark : BRAND_COLORS.neutral[900].light,
  textSecondary: isDark ? BRAND_COLORS.neutral[600].dark : BRAND_COLORS.neutral[600].light,
  textMuted: isDark ? BRAND_COLORS.neutral[500].dark : BRAND_COLORS.neutral[500].light,

  // Border colors
  border: isDark ? BRAND_COLORS.neutral[200].dark : BRAND_COLORS.neutral[200].light,
  borderLight: isDark ? BRAND_COLORS.neutral[300].dark : BRAND_COLORS.neutral[100].light,

  // System colors
  success: BRAND_COLORS.success[500],
  error: BRAND_COLORS.error[500],
  warning: BRAND_COLORS.warning[500],
})

// Gradient definition for LinearGradient components
export const BRAND_GRADIENT = {
  colors: ['#1F979E', '#8E5185', '#C12D79'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
}

export default BRAND_COLORS
