/**
 * Memorii Light Theme
 * Built with @shopify/restyle for type-safe design tokens.
 */
import { createTheme } from '@shopify/restyle';

const palette = {
  // Warm neutrals
  parchment: '#F5F0E8',
  parchmentAlt: '#EDE8DE',
  white: '#FFFFFF',
  borderLight: '#D8D2C8',

  // Primary (calm trustworthy blue)
  primary500: '#4A6FA5',
  primary400: '#7B9FCF',
  primary600: '#2E4D7B',

  // Accent (warm amber)
  accent500: '#E8935A',
  accent400: '#F2B48A',

  // Semantics
  success: '#6BAF7E',
  warning: '#F0C040',
  danger: '#D95F5F',
  dangerLight: '#F28080',

  // Text
  ink: '#2A2A3C',
  inkSecondary: '#6B6B82',
  inkMuted: '#A0A0B8',

  // Transparent
  shadowBlue: 'rgba(74, 111, 165, 0.12)',
  transparent: 'transparent',
} as const;

const theme = createTheme({
  colors: {
    // Surfaces
    background: palette.parchment,
    surface: palette.white,
    surfaceAlt: palette.parchmentAlt,

    // Brand
    primary: palette.primary500,
    primaryLight: palette.primary400,
    primaryDark: palette.primary600,

    // Accent
    accent: palette.accent500,
    accentLight: palette.accent400,

    // Semantics
    success: palette.success,
    warning: palette.warning,
    danger: palette.danger,
    dangerLight: palette.dangerLight,

    // Text
    text: palette.ink,
    textSecondary: palette.inkSecondary,
    textMuted: palette.inkMuted,
    textOnPrimary: palette.white,

    // Borders & shadows
    border: palette.borderLight,
    shadow: palette.shadowBlue,

    // Misc
    transparent: palette.transparent,
    white: palette.white,
  },

  spacing: {
    xs: 4,
    s: 8,
    sm: 12,
    m: 16,
    md: 20,
    l: 24,
    xl: 32,
    xxl: 40,
    xxxl: 48,
  },

  borderRadii: {
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    full: 9999,
  },

  textVariants: {
    // Nunito font scale
    hero: {
      fontFamily: 'Nunito_800ExtraBold',
      fontSize: 38,
      lineHeight: 46,
      color: 'text',
    },
    xxl: {
      fontFamily: 'Nunito_700Bold',
      fontSize: 30,
      lineHeight: 40,
      color: 'text',
    },
    xl: {
      fontFamily: 'Nunito_700Bold',
      fontSize: 24,
      lineHeight: 32,
      color: 'text',
    },
    lg: {
      fontFamily: 'Nunito_600SemiBold',
      fontSize: 20,
      lineHeight: 30,
      color: 'text',
    },
    md: {
      fontFamily: 'Nunito_400Regular',
      fontSize: 17,
      lineHeight: 27,
      color: 'text',
    },
    mdBold: {
      fontFamily: 'Nunito_700Bold',
      fontSize: 17,
      lineHeight: 27,
      color: 'text',
    },
    sm: {
      fontFamily: 'Nunito_400Regular',
      fontSize: 15,
      lineHeight: 24,
      color: 'textSecondary',
    },
    smBold: {
      fontFamily: 'Nunito_600SemiBold',
      fontSize: 15,
      lineHeight: 24,
      color: 'text',
    },
    xs: {
      fontFamily: 'Nunito_400Regular',
      fontSize: 13,
      lineHeight: 20,
      color: 'textMuted',
    },
    label: {
      fontFamily: 'Nunito_600SemiBold',
      fontSize: 13,
      lineHeight: 18,
      color: 'textSecondary',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    defaults: {
      fontFamily: 'Nunito_400Regular',
      fontSize: 17,
      lineHeight: 27,
      color: 'text',
    },
  },

  breakpoints: {},
});

export type Theme = typeof theme;
export default theme;
