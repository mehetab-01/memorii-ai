/**
 * Theme barrel export + Restyle typed component factories.
 *
 * Usage:
 *   import { Box, Text, useTheme } from '@/theme';
 */
export { default as theme } from './theme';
export { default as darkTheme } from './darkTheme';
export type { Theme } from './theme';

// Re-export legacy context so existing code keeps working unchanged
export { ThemeProvider, useTheme } from './ThemeContext';

import { createBox, createText, createRestyleComponent, useTheme as useRestyleTheme } from '@shopify/restyle';
import type { Theme } from './theme';

export const Box = createBox<Theme>();
export const Text = createText<Theme>();

// Typed hook alias
export const useRestyleColors = () => useRestyleTheme<Theme>();
