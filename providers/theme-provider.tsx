import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceGlass: string;
  card: string;
  cardGlass: string;
  text: string;
  textSecondary: string;
  border: string;
  borderGlass: string;
  glassHighlight: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  inputBackground: string;
  tabBar: string;
  header: string;
  shadow: string;
}

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  deviceFont: string;
  setDeviceFont: (font: string) => void;
}

const lightColors: ThemeColors = {
  primary: '#10B981',
  secondary: '#64748B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceGlass: '#FFFFFF',
  card: '#FFFFFF',
  cardGlass: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  borderGlass: '#E2E8F0',
  glassHighlight: 'rgba(255, 255, 255, 0.95)',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#0EA5E9',
  inputBackground: '#F1F5F9',
  tabBar: '#FFFFFF',
  header: '#F8FAFC',
  shadow: '#000000',
};

const darkColors: ThemeColors = {
  primary: '#10B981',
  secondary: '#9C9992',
  background: '#141412',
  surface: '#1E1E1C',
  surfaceGlass: 'rgba(26, 26, 24, 0.92)',
  card: 'rgba(26, 26, 24, 0.88)',
  cardGlass: 'rgba(26, 26, 24, 0.82)',
  text: '#F3F1ED',
  textSecondary: '#9C9992',
  border: 'rgba(255, 255, 255, 0.12)',
  borderGlass: 'rgba(255, 255, 255, 0.10)',
  glassHighlight: 'rgba(255, 255, 255, 0.08)',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#38BDF8',
  inputBackground: 'rgba(255, 255, 255, 0.06)',
  tabBar: '#141412',
  header: '#141412',
  shadow: '#000000',
};

export const [ThemeProvider, useTheme] = createContextHook((): ThemeState => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<Theme>('dark');
  const [deviceFont, setDeviceFont] = useState('Default');

  // Load saved theme and font on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        const savedFont = await AsyncStorage.getItem('deviceFont');

        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          setThemeState(savedTheme as Theme);
        } else if (savedTheme === 'system') {
          // Migrate system theme users to dark (branding choice)
          setThemeState('dark');
          await AsyncStorage.setItem('theme', 'dark');
        }
        if (savedFont) {
          setDeviceFont(savedFont);
        }
      } catch (error) {
        console.error('Error loading theme settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Determine if we should use dark mode
  const isDark = theme === 'dark';

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const setTheme = useCallback(async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
  }, [isDark, setTheme]);

  const saveFont = useCallback(async (newFont: string) => {
    try {
      setDeviceFont(newFont);
      await AsyncStorage.setItem('deviceFont', newFont);
    } catch (error) {
      console.error('Error saving font:', error);
    }
  }, []);

  return {
    theme,
    isDark,
    colors,
    toggleTheme,
    setTheme,
    deviceFont,
    setDeviceFont: saveFont,
  };
});
