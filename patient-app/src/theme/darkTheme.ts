/**
 * Memorii Dark Theme
 * Overrides color tokens; all spacing/radius/typography stays identical.
 */
import { createTheme } from '@shopify/restyle';
import theme from './theme';

const darkTheme = createTheme({
  ...theme,
  colors: {
    // Surfaces
    background: '#1C1E2E',
    surface: '#262840',
    surfaceAlt: '#2E3050',

    // Brand
    primary: '#7B9FCF',
    primaryLight: '#A8C4E8',
    primaryDark: '#4A6FA5',

    // Accent
    accent: '#F2B48A',
    accentLight: '#F5C9A8',

    // Semantics
    success: '#6BAF7E',
    warning: '#F0C040',
    danger: '#D95F5F',
    dangerLight: '#F28080',

    // Text
    text: '#EDE8E0',
    textSecondary: '#A0A0B8',
    textMuted: '#686880',
    textOnPrimary: '#FFFFFF',

    // Borders & shadows
    border: '#3A3C54',
    shadow: 'rgba(0, 0, 0, 0.35)',

    // Misc
    transparent: 'transparent',
    white: '#FFFFFF',
  },
});

export type DarkTheme = typeof darkTheme;
export default darkTheme;
