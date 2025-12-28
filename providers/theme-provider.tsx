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
  card: string;
  text: string;
  textSecondary: string;
  border: string;
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
  primary: '#10b981',
  secondary: '#64748b',
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
  text: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#10b981',
  inputBackground: '#f1f5f9',
  tabBar: '#ffffff',
  header: '#ffffff',
  shadow: '#000000',
};

const darkColors: ThemeColors = {
  primary: '#10b981',
  secondary: '#A6A6A6',
  background: '#000000', // Pitch Black Background
  surface: '#0A0A0A',    // Very Dark Surface
  card: '#1B2020',       // DM Card
  text: '#F5F5F5',       // DM Text Main
  textSecondary: '#A6A6A6', // DM Text Soft
  border: '#2C3333',     // DM Border
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#10b981',
  inputBackground: '#1B2020',
  tabBar: '#121212',
  header: '#000000',
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
