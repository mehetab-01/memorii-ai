import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, ThemeColors, ColorScheme } from './colors';

interface ThemeContextValue {
  theme: ThemeColors;
  isDarkMode: boolean;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: colors.light,
  isDarkMode: false,
  colorScheme: 'light',
  toggleTheme: () => {},
  setColorScheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem('theme_preference');
      if (saved === 'light' || saved === 'dark') {
        setColorSchemeState(saved);
      } else if (systemScheme) {
        setColorSchemeState(systemScheme as ColorScheme);
      }
    } catch {
      // Default to light
    } finally {
      setIsLoaded(true);
    }
  };

  const toggleTheme = useCallback(async () => {
    const newScheme = colorScheme === 'light' ? 'dark' : 'light';
    setColorSchemeState(newScheme);
    try {
      await AsyncStorage.setItem('theme_preference', newScheme);
    } catch {}
  }, [colorScheme]);

  const setColorScheme = useCallback(async (scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    try {
      await AsyncStorage.setItem('theme_preference', scheme);
    } catch {}
  }, []);

  const isDarkMode = colorScheme === 'dark';
  const theme = isDarkMode ? colors.dark : colors.light;

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, colorScheme, toggleTheme, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
